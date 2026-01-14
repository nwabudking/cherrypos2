import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { inventoryKeys } from './useInventory';
import { menuKeys } from './useMenu';
import { toast } from 'sonner';

export function usePriceRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to inventory_items price changes
    const inventoryChannel = supabase
      .channel('inventory-price-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventory_items',
        },
        (payload) => {
          const oldData = payload.old as any;
          const newData = payload.new as any;
          
          // Check if price fields changed
          if (
            oldData.cost_per_unit !== newData.cost_per_unit ||
            oldData.selling_price !== newData.selling_price
          ) {
            // Invalidate all inventory and menu queries
            queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
            queryClient.invalidateQueries({ queryKey: menuKeys.items() });
            
            toast.info(`Price updated for ${newData.name}`, {
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to menu_items price changes
    const menuChannel = supabase
      .channel('menu-price-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'menu_items',
        },
        (payload) => {
          const oldData = payload.old as any;
          const newData = payload.new as any;
          
          // Check if price fields changed
          if (
            oldData.cost_price !== newData.cost_price ||
            oldData.price !== newData.price
          ) {
            // Invalidate all inventory and menu queries
            queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
            queryClient.invalidateQueries({ queryKey: menuKeys.items() });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(menuChannel);
    };
  }, [queryClient]);
}
