import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type Profile = Tables<'profiles'>;
export type UserRole = Tables<'user_roles'>;

export interface StaffMember extends Profile {
  role?: string;
}

// Query keys
export const staffKeys = {
  all: ['staff'] as const,
  list: () => [...staffKeys.all, 'list'] as const,
  activeList: () => [...staffKeys.list(), 'active'] as const,
  detail: (id: string) => [...staffKeys.all, 'detail', id] as const,
};

// Staff hooks
export function useStaff() {
  return useQuery({
    queryKey: staffKeys.list(),
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (profilesError) throw profilesError;
      
      // Get roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;
      
      // Combine profiles with roles
      const staffWithRoles = profiles.map(profile => ({
        ...profile,
        role: roles.find(r => r.user_id === profile.id)?.role || 'cashier',
      }));
      
      return staffWithRoles;
    },
  });
}

export function useActiveStaff() {
  return useQuery({
    queryKey: staffKeys.activeList(),
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (profilesError) throw profilesError;
      
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;
      
      const staffWithRoles = profiles.map(profile => ({
        ...profile,
        role: roles.find(r => r.user_id === profile.id)?.role || 'cashier',
      }));
      
      return staffWithRoles;
    },
  });
}

export function useStaffMember(id: string) {
  return useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (profileError) throw profileError;
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', id)
        .maybeSingle();
      
      return {
        ...profile,
        role: roleData?.role || 'cashier',
      };
    },
    enabled: !!id,
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { full_name?: string; email?: string; avatar_url?: string } }) => {
      const { data: result, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success('Staff member updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update staff member');
    },
  });
}

export function useUpdateStaffRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      // Check if role exists
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', id)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: role as any })
          .eq('user_id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: id, role: role as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success('Staff role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update staff role');
    },
  });
}

// Note: Creating and deleting staff requires admin functions since it involves auth.users
// These would need to be handled via Edge Functions for security
export function useDeleteStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // This would typically call an edge function to delete the user
      // For now, just mark as inactive or delete profile
      toast.info('Staff deletion requires admin privileges');
      throw new Error('Staff deletion must be done through admin panel');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete staff member');
    },
  });
}
