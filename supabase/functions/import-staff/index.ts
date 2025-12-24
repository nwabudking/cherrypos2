import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffMember {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  username: string;
  isActive: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { staffList, bypassAuth }: { staffList: StaffMember[], bypassAuth?: boolean } = await req.json();

    // If not bypassing auth, verify the requesting user
    if (!bypassAuth) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "No authorization header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !requestingUser) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if requesting user has admin privileges
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", requestingUser.id)
        .single();

      const allowedRoles = ["super_admin", "manager"];
      if (!roleData || !allowedRoles.includes(roleData.role)) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!staffList || !Array.isArray(staffList)) {
      return new Response(JSON.stringify({ error: "Staff list required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { success: string[]; failed: { name: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    for (const staff of staffList) {
      try {
        const fullName = `${staff.firstName} ${staff.lastName}`.trim();
        
        // Generate email if not provided or use a placeholder
        let email = staff.email;
        if (!email || !email.includes("@")) {
          // Create email from username
          email = `${staff.username.toLowerCase().replace(/\s+/g, "")}@cherrydining.local`;
        }

        // Generate a temporary password
        const tempPassword = `Cherry${Math.random().toString(36).slice(-8)}2025!`;

        // Create user with admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { 
            full_name: fullName,
            phone: staff.phone,
            address: staff.address,
            imported_from: "openpos",
          },
        });

        if (createError) {
          // Check if user already exists
          if (createError.message.includes("already")) {
            results.failed.push({ name: fullName, error: "User already exists" });
          } else {
            results.failed.push({ name: fullName, error: createError.message });
          }
          continue;
        }

        // Create profile
        await supabaseAdmin.from("profiles").upsert({
          id: newUser.user.id,
          email,
          full_name: fullName,
        });

        // Assign default role (cashier for imported staff)
        await supabaseAdmin.from("user_roles").upsert({
          user_id: newUser.user.id,
          role: "cashier",
        });

        results.success.push(fullName);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        results.failed.push({ 
          name: `${staff.firstName} ${staff.lastName}`, 
          error: errorMessage 
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      imported: results.success.length,
      failed: results.failed.length,
      details: results
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
