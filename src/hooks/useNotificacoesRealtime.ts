import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Notificacao } from '../types';

export function useNotificacoesRealtime(companyId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const destinatarioId = user?.id ?? null;

  useEffect(() => {
    if (!companyId || !destinatarioId) return;

    const channelName = `notificacoes:${companyId}:${destinatarioId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `destinatario_id=eq.${destinatarioId}`,
        },
        (payload) => {
          const novaNotif = payload.new as Notificacao;
          if (novaNotif.company_id !== companyId) return;

          queryClient.invalidateQueries({
            queryKey: ['notificacoes', companyId, destinatarioId],
          });
          queryClient.invalidateQueries({
            queryKey: ['notificacoes-unread', companyId, destinatarioId],
          });

          toast(novaNotif.titulo, {
            description: novaNotif.mensagem,
            duration: 6000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, destinatarioId, queryClient]);
}
