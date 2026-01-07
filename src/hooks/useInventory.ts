import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type InventoryItem = Tables<'inventory_items'>;
export type StockMovement = Tables<'stock_movements'>;
export type Supplier = Tables<'suppliers'>;

// Query keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  items: () => [...inventoryKeys.all, 'items'] as const,
  activeItems: () => [...inventoryKeys.items(), 'active'] as const,
  lowStockItems: () => [...inventoryKeys.items(), 'low-stock'] as const,
  item: (id: string) => [...inventoryKeys.items(), id] as const,
  movements: (itemId?: string) => [...inventoryKeys.all, 'movements', itemId] as const,
  suppliers: () => [...inventoryKeys.all, 'suppliers'] as const,
  activeSuppliers: () => [...inventoryKeys.suppliers(), 'active'] as const,
  supplier: (id: string) => [...inventoryKeys.suppliers(), id] as const,
};

// Inventory Items hooks
export function useInventoryItems() {
  return useQuery({
    queryKey: inventoryKeys.items(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, suppliers(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useActiveInventoryItems() {
  return useQuery({
    queryKey: inventoryKeys.activeItems(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, suppliers(name)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: inventoryKeys.lowStockItems(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('is_active', true)
        .filter('current_stock', 'lte', 'min_stock_level');
      if (error) throw error;
      // Filter in JS since Supabase can't compare columns directly
      return (data || []).filter(item => item.current_stock <= item.min_stock_level);
    },
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: inventoryKeys.item(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, suppliers(name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: TablesInsert<'inventory_items'>) => {
      const { data: result, error } = await supabase
        .from('inventory_items')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      toast.success('Inventory item created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create inventory item');
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TablesUpdate<'inventory_items'> }) => {
      const { data: result, error } = await supabase
        .from('inventory_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      toast.success('Inventory item updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update inventory item');
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      toast.success('Inventory item deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete inventory item');
    },
  });
}

// Stock movements hooks
export function useStockMovements(itemId?: string) {
  return useQuery({
    queryKey: inventoryKeys.movements(itemId),
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select('*, inventory_items(name)')
        .order('created_at', { ascending: false });
      
      if (itemId) {
        query = query.eq('inventory_item_id', itemId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAddStock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, quantity, notes }: { itemId: string; quantity: number; notes?: string }) => {
      // Get current stock
      const { data: item, error: fetchError } = await supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('id', itemId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const previousStock = item.current_stock;
      const newStock = previousStock + quantity;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update inventory
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ current_stock: newStock })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      // Create movement record
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          inventory_item_id: itemId,
          movement_type: 'in',
          quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          notes,
          created_by: user?.id,
        });
      
      if (movementError) throw movementError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() });
      toast.success('Stock added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add stock');
    },
  });
}

export function useRemoveStock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, quantity, notes }: { itemId: string; quantity: number; notes?: string }) => {
      // Get current stock
      const { data: item, error: fetchError } = await supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('id', itemId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const previousStock = item.current_stock;
      const newStock = Math.max(0, previousStock - quantity);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update inventory
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ current_stock: newStock })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      // Create movement record
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          inventory_item_id: itemId,
          movement_type: 'out',
          quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          notes,
          created_by: user?.id,
        });
      
      if (movementError) throw movementError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() });
      toast.success('Stock removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove stock');
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, newStock, notes }: { itemId: string; newStock: number; notes?: string }) => {
      // Get current stock
      const { data: item, error: fetchError } = await supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('id', itemId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const previousStock = item.current_stock;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update inventory
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ current_stock: newStock })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      // Create movement record
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          inventory_item_id: itemId,
          movement_type: 'adjustment',
          quantity: Math.abs(newStock - previousStock),
          previous_stock: previousStock,
          new_stock: newStock,
          notes,
          created_by: user?.id,
        });
      
      if (movementError) throw movementError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() });
      toast.success('Stock adjusted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to adjust stock');
    },
  });
}

// Suppliers hooks
export function useSuppliers() {
  return useQuery({
    queryKey: inventoryKeys.suppliers(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useActiveSuppliers() {
  return useQuery({
    queryKey: inventoryKeys.activeSuppliers(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: inventoryKeys.supplier(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: TablesInsert<'suppliers'>) => {
      const { data: result, error } = await supabase
        .from('suppliers')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.suppliers() });
      toast.success('Supplier created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create supplier');
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TablesUpdate<'suppliers'> }) => {
      const { data: result, error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.suppliers() });
      toast.success('Supplier updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update supplier');
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.suppliers() });
      toast.success('Supplier deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete supplier');
    },
  });
}
