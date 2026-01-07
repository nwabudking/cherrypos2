import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type MenuCategory = Tables<'menu_categories'>;
export type MenuItem = Tables<'menu_items'>;

// Query keys
export const menuKeys = {
  all: ['menu'] as const,
  categories: () => [...menuKeys.all, 'categories'] as const,
  activeCategories: () => [...menuKeys.categories(), 'active'] as const,
  items: () => [...menuKeys.all, 'items'] as const,
  activeItems: () => [...menuKeys.items(), 'active'] as const,
  itemsByCategory: (categoryId: string) => [...menuKeys.items(), 'category', categoryId] as const,
  item: (id: string) => [...menuKeys.items(), id] as const,
};

// Categories hooks
export function useMenuCategories() {
  return useQuery({
    queryKey: menuKeys.categories(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useActiveMenuCategories() {
  return useQuery({
    queryKey: menuKeys.activeCategories(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: TablesInsert<'menu_categories'>) => {
      const { data: result, error } = await supabase
        .from('menu_categories')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create category');
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TablesUpdate<'menu_categories'> }) => {
      const { data: result, error } = await supabase
        .from('menu_categories')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update category');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });
}

// Menu items hooks
export function useMenuItems(categoryId?: string) {
  return useQuery({
    queryKey: categoryId ? menuKeys.itemsByCategory(categoryId) : menuKeys.items(),
    queryFn: async () => {
      let query = supabase
        .from('menu_items')
        .select('*, menu_categories(name)')
        .order('name');
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useActiveMenuItems(categoryId?: string) {
  return useQuery({
    queryKey: categoryId 
      ? [...menuKeys.activeItems(), 'category', categoryId] 
      : menuKeys.activeItems(),
    queryFn: async () => {
      let query = supabase
        .from('menu_items')
        .select('*, menu_categories(name)')
        .eq('is_active', true)
        .eq('is_available', true)
        .order('name');
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useMenuItem(id: string) {
  return useQuery({
    queryKey: menuKeys.item(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*, menu_categories(name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: TablesInsert<'menu_items'>) => {
      const { data: result, error } = await supabase
        .from('menu_items')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.items() });
      toast.success('Menu item created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create menu item');
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TablesUpdate<'menu_items'> }) => {
      const { data: result, error } = await supabase
        .from('menu_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.items() });
      toast.success('Menu item updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update menu item');
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.items() });
      toast.success('Menu item deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete menu item');
    },
  });
}
