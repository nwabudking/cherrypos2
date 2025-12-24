import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MigrationResult {
  categories: number;
  menuItems: number;
  errors: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is super_admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "super_admin") {
      throw new Error("Only super_admin can run migrations");
    }

    // Connect to MySQL using environment variables
    const mysqlClient = await new Client().connect({
      hostname: Deno.env.get("MIGRATION_MYSQL_HOST") || "suenox.ng",
      username: Deno.env.get("MIGRATION_MYSQL_USER") || "suenoxng_cherrypos",
      db: Deno.env.get("MIGRATION_MYSQL_DB") || "suenoxng_cherrypos",
      password: Deno.env.get("MIGRATION_MYSQL_PASSWORD") || "suenoxng_cherrypos",
      port: parseInt(Deno.env.get("MIGRATION_MYSQL_PORT") || "3306"),
    });

    const result: MigrationResult = {
      categories: 0,
      menuItems: 0,
      errors: [],
    };

    console.log("Connected to MySQL database");

    // Step 1: Fetch and migrate categories
    const categories = await mysqlClient.query(
      "SELECT category_id, name FROM ospos_categories WHERE deleted = 0 ORDER BY category_id"
    );
    console.log(`Found ${categories.length} categories`);

    // Map old category IDs to new UUIDs
    const categoryMap = new Map<number, string>();

    for (const cat of categories) {
      // Check if category already exists
      const { data: existing } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("name", cat.name)
        .maybeSingle();

      if (existing) {
        categoryMap.set(cat.category_id, existing.id);
        continue;
      }

      const { data: newCat, error } = await supabase
        .from("menu_categories")
        .insert({
          name: cat.name,
          is_active: true,
          sort_order: cat.category_id,
        })
        .select("id")
        .single();

      if (error) {
        result.errors.push(`Category ${cat.name}: ${error.message}`);
      } else {
        categoryMap.set(cat.category_id, newCat.id);
        result.categories++;
      }
    }

    // Step 2: Fetch and migrate menu items
    const items = await mysqlClient.query(`
      SELECT 
        i.item_id,
        i.name,
        i.description,
        i.category,
        i.cost_price,
        i.unit_price,
        i.deleted
      FROM ospos_items i
      WHERE i.deleted = 0
      ORDER BY i.item_id
    `);
    console.log(`Found ${items.length} items`);

    for (const item of items) {
      // Check if item already exists by name
      const { data: existing } = await supabase
        .from("menu_items")
        .select("id")
        .eq("name", item.name)
        .maybeSingle();

      if (existing) {
        continue; // Skip existing items
      }

      // Get category UUID from map
      const categoryId = item.category ? categoryMap.get(item.category) : null;

      const { error } = await supabase.from("menu_items").insert({
        name: item.name,
        description: item.description || null,
        category_id: categoryId,
        price: parseFloat(item.unit_price) || 0,
        cost_price: parseFloat(item.cost_price) || null,
        is_active: true,
        is_available: true,
      });

      if (error) {
        result.errors.push(`Item ${item.name}: ${error.message}`);
      } else {
        result.menuItems++;
      }
    }

    // Close MySQL connection
    await mysqlClient.close();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Migration completed",
        result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
