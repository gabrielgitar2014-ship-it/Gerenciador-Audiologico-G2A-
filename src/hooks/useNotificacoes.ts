import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Notificacao } from '../types';

const NOTIF_KEY = (companyId: string, destinatarioId: string) =>
  ['notificacoes', companyId, destinatarioId] as const;

const UNREAD_KEY = (companyId: string, destinatarioId: string) =>
  ['notificacoes-unread', companyId, destinatarioId] as const;

interface UseNotificacoesParams {
  companyId: string | null | undefined;
  /** Limit applied to the listing query (default 50). */
  limit?: number;
}

export function useNotificacoes({ companyId, limit = 50 }: UseNotificacoesParams) {
  const { user } = useAuth();
  const destinatarioId = user?.id ?? null;
  const enabled = !!companyId && !!destinatarioId;

  return useQuery<Notificacao[]>({
    queryKey: enabled ? NOTIF_KEY(companyId!, destinatarioId!) : ['notificacoes-disabled'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('company_id', companyId!)
        .eq('destinatario_id', destinatarioId!)
        .order('criado_em', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Notificacao[];
    },
  });
}

export function useNotificacoesUnreadCount(companyId: string | null | undefined) {
  const { user } = useAuth();
  const destinatarioId = user?.id ?? null;
  const enabled = !!companyId && !!destinatarioId;

  return useQuery<number>({
    queryKey: enabled ? UNREAD_KEY(companyId!, destinatarioId!) : ['notificacoes-unread-disabled'],
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notificacoes')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId!)
        .eq('destinatario_id', destinatarioId!)
        .eq('lida', false);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarcarNotificacaoLida(companyId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const destinatarioId = user?.id ?? null;

  return useMutation({
    mutationFn: async (notificacaoId: string) => {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('id', notificacaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (companyId && destinatarioId) {
        queryClient.invalidateQueries({ queryKey: NOTIF_KEY(companyId, destinatarioId) });
        queryClient.invalidateQueries({ queryKey: UNREAD_KEY(companyId, destinatarioId) });
      }
    },
  });
}

export function useMarcarTodasNotificacoesLidas(companyId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const destinatarioId = user?.id ?? null;

  return useMutation({
    mutationFn: async () => {
      if (!companyId || !destinatarioId) return;
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('destinatario_id', destinatarioId)
        .eq('lida', false);
      if (error) throw error;
    },
    onSuccess: () => {
      if (companyId && destinatarioId) {
        queryClient.invalidateQueries({ queryKey: NOTIF_KEY(companyId, destinatarioId) });
        queryClient.invalidateQueries({ queryKey: UNREAD_KEY(companyId, destinatarioId) });
      }
    },
  });
}
