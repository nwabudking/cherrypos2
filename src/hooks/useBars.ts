import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Bar {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export interface BarInventoryItem {
  id: string;
  bar_id: string;
  inventory_item_id: string;
  current_stock: number;
  min_stock_level: number;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  inventory_item?: {
    id: string;
    name: string;
    unit: string;
    category: string | null;
    cost_per_unit: number | null;
  };
}

export interface InventoryTransfer {
  id: string;
  source_type: string;
  source_bar_id: string | null;
  destination_bar_id: string;
  inventory_item_id: string;
  quantity: number;
  status: string;
  notes: string | null;
  transferred_by: string | null;
  created_at: string | null;
  completed_at: string | null;
  destination_bar?: Bar;
  inventory_item?: {
    id: string;
    name: string;
    unit: string;
  };
}

// Query keys
export const barsKeys = {
  all: ['bars'] as const,
  list: () => [...barsKeys.all, 'list'] as const,
  active: () => [...barsKeys.all, 'active'] as const,
  detail: (id: string) => [...barsKeys.all, 'detail', id] as const,
  inventory: (barId: string) => [...barsKeys.all, 'inventory', barId] as const,
  transfers: () => [...barsKeys.all, 'transfers'] as const,
};

// Bars hooks
export function useBars() {
  return useQuery({
    queryKey: barsKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bars')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Bar[];
    },
  });
}

export function useActiveBars() {
  return useQuery({
    queryKey: barsKeys.active(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bars')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Bar[];
    },
  });
}

export function useBar(id: string) {
  return useQuery({
    queryKey: barsKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bars')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Bar;
    },
    enabled: !!id,
  });
}

export function useCreateBar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: result, error } = await supabase
        .from('bars')
        .insert({
          name: data.name,
          description: data.description,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return result as Bar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: barsKeys.all });
      toast.success('Bar created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create bar');
    },
  });
}

export function useUpdateBar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Bar> }) => {
      const { data: result, error } = await supabase
        .from('bars')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result as Bar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: barsKeys.all });
      toast.success('Bar updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update bar');
    },
  });
}

export function useDeleteBar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bars')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: barsKeys.all });
      toast.success('Bar deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete bar');
    },
  });
}

// Bar Inventory hooks
export function useBarInventory(barId: string) {
  return useQuery({
    queryKey: barsKeys.inventory(barId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bar_inventory')
        .select(`
          *,
          inventory_item:inventory_items(id, name, unit, category, cost_per_unit)
        `)
        .eq('bar_id', barId);
      if (error) throw error;
      return data as BarInventoryItem[];
    },
    enabled: !!barId,
  });
}

export function useLowStockBarInventory(barId: string) {
  return useQuery({
    queryKey: [...barsKeys.inventory(barId), 'low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bar_inventory')
        .select(`
          *,
          inventory_item:inventory_items(id, name, unit, category)
        `)
        .eq('bar_id', barId)
        .lte('current_stock', supabase.rpc as any); // We'll filter in JS for now
      
      if (error) throw error;
      
      // Filter to low stock items
      return (data as BarInventoryItem[]).filter(
        item => item.current_stock <= item.min_stock_level
      );
    },
    enabled: !!barId,
  });
}

// Transfer inventory from store to bar
export function useTransferToBar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      barId,
      inventoryItemId,
      quantity,
      notes,
    }: {
      barId: string;
      inventoryItemId: string;
      quantity: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('transfer_store_to_bar', {
        p_bar_id: barId,
        p_inventory_item_id: inventoryItemId,
        p_quantity: quantity,
        p_notes: notes,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: barsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory transferred successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to transfer inventory');
    },
  });
}

// Get transfer history
export function useInventoryTransfers() {
  return useQuery({
    queryKey: barsKeys.transfers(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transfers')
        .select(`
          *,
          destination_bar:bars!destination_bar_id(id, name),
          inventory_item:inventory_items(id, name, unit)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as InventoryTransfer[];
    },
  });
}

// Check bar stock for a menu item
export function useCheckBarStock() {
  return useMutation({
    mutationFn: async ({
      barId,
      inventoryItemId,
      quantity,
    }: {
      barId: string;
      inventoryItemId: string;
      quantity: number;
    }) => {
      const { data, error } = await supabase.rpc('check_bar_stock', {
        p_bar_id: barId,
        p_inventory_item_id: inventoryItemId,
        p_quantity: quantity,
      });
      
      if (error) throw error;
      return data as boolean;
    },
  });
}
