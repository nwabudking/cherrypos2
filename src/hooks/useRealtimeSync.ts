import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { inventoryKeys } from './useInventory';
import { menuKeys } from './useMenu';
import { barsKeys } from './useBars';
import { settingsKeys } from './useSettings';
import { staffKeys } from './useStaff';
import { staffUsersKeys } from './useStaffUsers';

/**
 * Global realtime sync hook that subscribes to database changes
 * and automatically invalidates relevant React Query caches.
 * Uses debouncing to prevent excessive cache invalidations.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Debounced invalidation to prevent rapid-fire cache clears
  const debouncedInvalidate = useCallback((key: string, queryKeys: QueryKey[]) => {
    const existing = debounceTimers.current.get(key);
    if (existing) clearTimeout(existing);
    
    debounceTimers.current.set(key, setTimeout(() => {
      queryKeys.forEach(qk => queryClient.invalidateQueries({ queryKey: qk }));
      debounceTimers.current.delete(key);
    }, 300));
  }, [queryClient]);

  useEffect(() => {
    // Single channel for all table subscriptions (more efficient than multiple channels)
    const channel = supabase
      .channel('global-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        () => debouncedInvalidate('inventory', [[...inventoryKeys.items()], ['inventory-items-active']])
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => debouncedInvalidate('menu', [[...menuKeys.items()], ['menu-items'], ['menu-items-all']])
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_categories' },
        () => debouncedInvalidate('categories', [[...menuKeys.categories()], ['menu-categories']])
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => debouncedInvalidate('orders', [['orders'], ['kitchen-orders'], ['bar-orders'], ['order-history']])
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bar_inventory' },
        () => debouncedInvalidate('bar-inventory', [[...barsKeys.all]])
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bar_to_bar_transfers' },
        () => debouncedInvalidate('transfers', [[...barsKeys.barToBarTransfers()], [...barsKeys.all]])
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => debouncedInvalidate('profiles', [[...staffKeys.all], ['profiles']])
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_users' },
        () => debouncedInvalidate('staff-users', [[...staffUsersKeys.all]])
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_settings' },
        () => debouncedInvalidate('settings', [[...settingsKeys.all]])
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suppliers' },
        () => debouncedInvalidate('suppliers', [[...inventoryKeys.suppliers()]])
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cashier_bar_assignments' },
        () => debouncedInvalidate('assignments', [['cashier-assignments']])
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      // Clear any pending debounce timers
      debounceTimers.current.forEach(timer => clearTimeout(timer));
      debounceTimers.current.clear();
      supabase.removeChannel(channel);
    };
  }, [queryClient, debouncedInvalidate]);
}
