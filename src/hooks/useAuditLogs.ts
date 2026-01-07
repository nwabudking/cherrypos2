import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  original_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  reason: string | null;
  performed_by: string | null;
  created_at: string | null;
  performer?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export const auditLogsKeys = {
  all: ['audit-logs'] as const,
  list: (filters?: { actionType?: string; entityType?: string }) => 
    [...auditLogsKeys.all, 'list', filters] as const,
  entity: (entityType: string, entityId: string) => 
    [...auditLogsKeys.all, 'entity', entityType, entityId] as const,
};

export function useAuditLogs(filters?: { actionType?: string; entityType?: string; limit?: number }) {
  return useQuery({
    queryKey: auditLogsKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.actionType) {
        query = query.eq('action_type', filters.actionType);
      }
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

export function useEntityAuditLogs(entityType: string, entityId: string) {
  return useQuery({
    queryKey: auditLogsKeys.entity(entityType, entityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!entityType && !!entityId,
  });
}
