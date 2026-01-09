import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CashierBarAssignment {
  id: string;
  user_id: string;
  bar_id: string;
  assigned_by: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  bar?: { id: string; name: string };
  profile?: { id: string; full_name: string | null; email: string | null };
}

export const cashierAssignmentKeys = {
  all: ['cashier-assignments'] as const,
  list: () => [...cashierAssignmentKeys.all, 'list'] as const,
  byUser: (userId: string) => [...cashierAssignmentKeys.all, 'user', userId] as const,
  byBar: (barId: string) => [...cashierAssignmentKeys.all, 'bar', barId] as const,
};

export function useCashierAssignments() {
  return useQuery({
    queryKey: cashierAssignmentKeys.list(),
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from('cashier_bar_assignments')
        .select(`
          *,
          bar:bars(id, name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = assignments.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      // Combine assignments with profiles
      const result = assignments.map(a => ({
        ...a,
        profile: profiles?.find(p => p.id === a.user_id) || undefined,
      }));
      
      return result as CashierBarAssignment[];
    },
  });
}

export function useCashierAssignment(userId: string) {
  return useQuery({
    queryKey: cashierAssignmentKeys.byUser(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cashier_bar_assignments')
        .select(`
          *,
          bar:bars(id, name)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as CashierBarAssignment | null;
    },
    enabled: !!userId,
  });
}

export function useAssignCashierToBar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, barId }: { userId: string; barId: string }) => {
      // Deactivate existing assignments
      await supabase
        .from('cashier_bar_assignments')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create new assignment
      const { data, error } = await supabase
        .from('cashier_bar_assignments')
        .upsert({
          user_id: userId,
          bar_id: barId,
          assigned_by: user?.id,
          is_active: true,
        }, { onConflict: 'user_id,bar_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashierAssignmentKeys.all });
      toast.success('Cashier assigned to bar successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign cashier');
    },
  });
}

export function useUnassignCashier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('cashier_bar_assignments')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashierAssignmentKeys.all });
      toast.success('Cashier unassigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unassign cashier');
    },
  });
}
