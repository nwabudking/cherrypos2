import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { InventoryHeader } from "@/components/inventory/InventoryHeader";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { InventoryItemDialog } from "@/components/inventory/InventoryItemDialog";
import { StockMovementDialog } from "@/components/inventory/StockMovementDialog";
import { LowStockAlert } from "@/components/inventory/LowStockAlert";
import { AddCategoryDialog } from "@/components/inventory/AddCategoryDialog";
import { SupplierDialog, type Supplier } from "@/components/inventory/SupplierDialog";
import { SuppliersTable } from "@/components/inventory/SuppliersTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Truck } from "lucide-react";

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  cost_per_unit: number | null;
  supplier: string | null;
  supplier_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export type MovementType = "in" | "out" | "adjustment";

const Inventory = () => {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Supplier[];
    },
  });

  const itemCategories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];
  const categories = [...new Set([...itemCategories, ...customCategories])];

  const lowStockItems = items.filter((i) => i.current_stock <= i.min_stock_level);

  const filteredItems = items.filter((item) => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesLowStock = !showLowStock || item.current_stock <= item.min_stock_level;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const saveItemMutation = useMutation({
    mutationFn: async (item: Partial<InventoryItem> & { id?: string }) => {
      if (item.id) {
        const { id, ...updateData } = item;
        const { error } = await supabase
          .from("inventory_items")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { id, ...insertData } = item;
        const { error } = await supabase.from("inventory_items").insert(insertData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Inventory item saved." });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setIsItemDialogOpen(false);
      setSelectedItem(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save item.", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inventory_items")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Item removed from inventory." });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    },
  });

  const saveSupplierMutation = useMutation({
    mutationFn: async (supplier: Partial<Supplier> & { id?: string }) => {
      if (supplier.id) {
        const { id, ...updateData } = supplier;
        const { error } = await supabase
          .from("suppliers")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { id, ...insertData } = supplier;
        const { error } = await supabase.from("suppliers").insert(insertData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Supplier saved." });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setIsSupplierDialogOpen(false);
      setSelectedSupplier(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save supplier.", variant: "destructive" });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("suppliers")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Supplier removed." });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete supplier.", variant: "destructive" });
    },
  });

  const stockMovementMutation = useMutation({
    mutationFn: async ({
      itemId,
      type,
      quantity,
      notes,
    }: {
      itemId: string;
      type: MovementType;
      quantity: number;
      notes?: string;
    }) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) throw new Error("Item not found");

      let newStock: number;
      if (type === "in") {
        newStock = item.current_stock + quantity;
      } else if (type === "out") {
        newStock = item.current_stock - quantity;
      } else {
        newStock = quantity;
      }

      const { error: movementError } = await supabase.from("stock_movements").insert({
        inventory_item_id: itemId,
        movement_type: type,
        quantity,
        previous_stock: item.current_stock,
        new_stock: newStock,
        notes,
        created_by: user?.id,
      });

      if (movementError) throw movementError;

      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ current_stock: newStock })
        .eq("id", itemId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({ title: "Stock Updated", description: "Stock movement recorded." });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setIsMovementDialogOpen(false);
      setMovementItem(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update stock.", variant: "destructive" });
    },
  });

  const canManage = role === "super_admin" || role === "manager" || role === "inventory_officer";

  const handleAddItem = () => {
    setSelectedItem(null);
    setIsItemDialogOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsItemDialogOpen(true);
  };

  const handleStockMovement = (item: InventoryItem) => {
    setMovementItem(item);
    setIsMovementDialogOpen(true);
  };

  const handleAddCategory = (category: string) => {
    setCustomCategories(prev => [...prev, category]);
    toast({ title: "Category Added", description: `"${category}" is now available for items.` });
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setIsSupplierDialogOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsSupplierDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="items" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground">Track stock levels, manage inventory and suppliers</p>
          </div>
          <TabsList>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="items" className="space-y-6">
          <InventoryHeader
            totalItems={items.length}
            lowStockCount={lowStockItems.length}
            onAddItem={handleAddItem}
            onAddCategory={() => setIsCategoryDialogOpen(true)}
            canManage={canManage}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            categories={categories}
            showLowStock={showLowStock}
            setShowLowStock={setShowLowStock}
          />

          {lowStockItems.length > 0 && (
            <LowStockAlert items={lowStockItems} onViewItem={handleStockMovement} />
          )}

          <InventoryTable
            items={filteredItems}
            isLoading={isLoading}
            onEdit={handleEditItem}
            onDelete={(id) => deleteItemMutation.mutate(id)}
            onStockMovement={handleStockMovement}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold">{suppliers.length} Suppliers</p>
                <p className="text-sm text-muted-foreground">Manage your inventory suppliers</p>
              </div>
            </div>
            {canManage && (
              <Button onClick={handleAddSupplier}>
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            )}
          </div>

          <SuppliersTable
            suppliers={suppliers}
            isLoading={suppliersLoading}
            onEdit={handleEditSupplier}
            onDelete={(id) => deleteSupplierMutation.mutate(id)}
            canManage={canManage}
          />
        </TabsContent>
      </Tabs>

      <InventoryItemDialog
        item={selectedItem}
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        onSave={(data) => saveItemMutation.mutate(data)}
        isSaving={saveItemMutation.isPending}
        categories={categories}
        suppliers={suppliers}
      />

      <AddCategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        existingCategories={categories}
        onAddCategory={handleAddCategory}
      />

      <SupplierDialog
        supplier={selectedSupplier}
        open={isSupplierDialogOpen}
        onOpenChange={setIsSupplierDialogOpen}
        onSave={(data) => saveSupplierMutation.mutate(data)}
        isSaving={saveSupplierMutation.isPending}
      />

      <StockMovementDialog
        item={movementItem}
        open={isMovementDialogOpen}
        onOpenChange={setIsMovementDialogOpen}
        onSubmit={(type, quantity, notes) =>
          movementItem && stockMovementMutation.mutate({
            itemId: movementItem.id,
            type,
            quantity,
            notes,
          })
        }
        isSubmitting={stockMovementMutation.isPending}
      />
    </div>
  );
};

export default Inventory;
