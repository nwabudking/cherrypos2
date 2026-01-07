import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

export type RestaurantSettings = Tables<'restaurant_settings'>;

// Query keys
export const settingsKeys = {
  all: ['settings'] as const,
  restaurant: () => [...settingsKeys.all, 'restaurant'] as const,
};

// Settings hooks
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.restaurant(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: TablesUpdate<'restaurant_settings'>) => {
      // Get existing settings
      const { data: existing } = await supabase
        .from('restaurant_settings')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (existing) {
        const { data: result, error } = await supabase
          .from('restaurant_settings')
          .update(data)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('restaurant_settings')
          .insert(data as any)
          .select()
          .single();
        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      toast.success('Settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);
      
      // Update settings with new logo URL
      const { data: existing } = await supabase
        .from('restaurant_settings')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from('restaurant_settings')
          .update({ logo_url: publicUrl })
          .eq('id', existing.id);
      }
      
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      toast.success('Logo uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload logo');
    },
  });
}
