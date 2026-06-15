import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types';

const AUDIT_KEY = (entidade: string, entidadeId: string) =>
  ['audit-logs', entidade, entidadeId] as const;

interface UseAuditLogParams {
  entidade: string;
  entidadeId: string | null | undefined;
  limit?: number;
}

export function useAuditLog({ entidade, entidadeId, limit = 50 }: UseAuditLogParams) {
  return useQuery<AuditLog[]>({
    queryKey: entidadeId ? AUDIT_KEY(entidade, entidadeId) : ['audit-logs-disabled'],
    enabled: !!entidadeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entidade', entidade)
        .eq('entidade_id', entidadeId!)
        .order('criado_em', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });
}
