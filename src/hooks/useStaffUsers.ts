import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface StaffUser {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string | null;
  last_login_at: string | null;
}

export const staffUsersKeys = {
  all: ["staff-users"] as const,
  active: () => [...staffUsersKeys.all, "active"] as const,
};

export function useStaffUsers() {
  return useQuery({
    queryKey: staffUsersKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_users")
        .select("id, username, full_name, email, role, is_active, created_at, last_login_at")
        .order("full_name");
      
      if (error) throw error;
      return data as StaffUser[];
    },
  });
}

export function useActiveStaffUsers() {
  return useQuery({
    queryKey: staffUsersKeys.active(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_users")
        .select("id, username, full_name, email, role, is_active, created_at, last_login_at")
        .eq("is_active", true)
        .order("full_name");
      
      if (error) throw error;
      return data as StaffUser[];
    },
  });
}

export function useCreateStaffUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      full_name: string;
      email?: string;
      role: AppRole;
    }) => {
      const { data: result, error } = await supabase.rpc("create_staff_user", {
        p_username: data.username,
        p_password: data.password,
        p_full_name: data.full_name,
        p_email: data.email || null,
        p_role: data.role,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffUsersKeys.all });
      toast.success("Staff user created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create staff user");
    },
  });
}

export function useUpdateStaffUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StaffUser> }) => {
      const { error } = await supabase
        .from("staff_users")
        .update({
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          is_active: data.is_active,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffUsersKeys.all });
      toast.success("Staff user updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update staff user");
    },
  });
}

export function useResetStaffPassword() {
  return useMutation({
    mutationFn: async ({ staffId, newPassword }: { staffId: string; newPassword: string }) => {
      const { data, error } = await supabase.rpc("update_staff_password", {
        p_staff_id: staffId,
        p_new_password: newPassword,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Password reset successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reset password");
    },
  });
}

export function useDeleteStaffUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_users")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffUsersKeys.all });
      toast.success("Staff user deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete staff user");
    },
  });
}
