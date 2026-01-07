import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useInventoryItems,
  useLowStockItems,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useAddStock,
  useRemoveStock,
  useAdjustStock,
  InventoryItem as HookInventoryItem,
  Supplier as HookSupplier,
} from "@/hooks/useInventory";
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
  const { role } = useAuth();
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

  const { data: items = [], isLoading } = useInventoryItems();
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();

  const createItemMutation = useCreateInventoryItem();
  const updateItemMutation = useUpdateInventoryItem();
  const deleteItemMutation = useDeleteInventoryItem();
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();
  const addStockMutation = useAddStock();
  const removeStockMutation = useRemoveStock();
  const adjustStockMutation = useAdjustStock();

  const itemCategories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];
  const categories = [...new Set([...itemCategories, ...customCategories])];

  const lowStockItems = items.filter((i) => i.current_stock <= i.min_stock_level);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesLowStock = !showLowStock || item.current_stock <= item.min_stock_level;
    return matchesSearch && matchesCategory && matchesLowStock;
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

  const handleSaveItem = (data: Partial<InventoryItem> & { id?: string }) => {
    if (data.id) {
      updateItemMutation.mutate(
        { id: data.id, data },
        {
          onSuccess: () => {
            setIsItemDialogOpen(false);
            setSelectedItem(null);
          },
        }
      );
    } else {
      createItemMutation.mutate(data, {
        onSuccess: () => {
          setIsItemDialogOpen(false);
          setSelectedItem(null);
        },
      });
    }
  };

  const handleAddCategory = (category: string) => {
    setCustomCategories((prev) => [...prev, category]);
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

  const handleSaveSupplier = (data: Partial<Supplier> & { id?: string }) => {
    if (data.id) {
      updateSupplierMutation.mutate(
        { id: data.id, data },
        {
          onSuccess: () => {
            setIsSupplierDialogOpen(false);
            setSelectedSupplier(null);
          },
        }
      );
    } else {
      createSupplierMutation.mutate(data, {
        onSuccess: () => {
          setIsSupplierDialogOpen(false);
          setSelectedSupplier(null);
        },
      });
    }
  };

  const handleStockMovementSubmit = (
    type: MovementType,
    quantity: number,
    notes?: string
  ) => {
    if (!movementItem) return;

    if (type === "in") {
      addStockMutation.mutate(
        { itemId: movementItem.id, quantity, notes },
        {
          onSuccess: () => {
            setIsMovementDialogOpen(false);
            setMovementItem(null);
          },
        }
      );
    } else if (type === "out") {
      removeStockMutation.mutate(
        { itemId: movementItem.id, quantity, notes },
        {
          onSuccess: () => {
            setIsMovementDialogOpen(false);
            setMovementItem(null);
          },
        }
      );
    } else {
      adjustStockMutation.mutate(
        { itemId: movementItem.id, newStock: quantity, notes },
        {
          onSuccess: () => {
            setIsMovementDialogOpen(false);
            setMovementItem(null);
          },
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="items" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground">
              Track stock levels, manage inventory and suppliers
            </p>
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
                <p className="text-sm text-muted-foreground">
                  Manage your inventory suppliers
                </p>
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
        onSave={handleSaveItem}
        isSaving={createItemMutation.isPending || updateItemMutation.isPending}
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
        onSave={handleSaveSupplier}
        isSaving={createSupplierMutation.isPending || updateSupplierMutation.isPending}
      />

      <StockMovementDialog
        item={movementItem}
        open={isMovementDialogOpen}
        onOpenChange={setIsMovementDialogOpen}
        onSubmit={handleStockMovementSubmit}
        isSubmitting={
          addStockMutation.isPending ||
          removeStockMutation.isPending ||
          adjustStockMutation.isPending
        }
      />
    </div>
  );
};

export default Inventory;
