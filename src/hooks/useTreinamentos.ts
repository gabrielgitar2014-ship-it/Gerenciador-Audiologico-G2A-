import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { TreinamentoPCA, TreinamentoParticipante } from '../types';

const TREINAMENTOS_KEY = (pcaId: string) => ['treinamentos-pca', pcaId] as const;
const PARTICIPANTES_KEY = (treinamentoId: string) =>
  ['treinamento-participantes', treinamentoId] as const;

export function useTreinamentosByPCA(pcaId: string | null | undefined) {
  return useQuery<(TreinamentoPCA & { participantes_count: number })[]>({
    queryKey: pcaId ? TREINAMENTOS_KEY(pcaId) : ['treinamentos-pca-disabled'],
    enabled: !!pcaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treinamentos_pca')
        .select('*, treinamento_participantes(count)')
        .eq('pca_id', pcaId!)
        .order('data', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        participantes_count: t.treinamento_participantes?.[0]?.count ?? 0,
      })) as (TreinamentoPCA & { participantes_count: number })[];
    },
  });
}

export type CreateTreinamentoInput = Omit<TreinamentoPCA, 'id' | 'criado_em'>;

export function useCreateTreinamento(pcaId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTreinamentoInput) => {
      const { data, error } = await supabase
        .from('treinamentos_pca')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as TreinamentoPCA;
    },
    onSuccess: () => {
      if (pcaId) queryClient.invalidateQueries({ queryKey: TREINAMENTOS_KEY(pcaId) });
    },
  });
}

export function useDeleteTreinamento(pcaId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('treinamentos_pca').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (pcaId) queryClient.invalidateQueries({ queryKey: TREINAMENTOS_KEY(pcaId) });
    },
  });
}

export function useParticipantes(treinamentoId: string | null | undefined) {
  return useQuery<TreinamentoParticipante[]>({
    queryKey: treinamentoId
      ? PARTICIPANTES_KEY(treinamentoId)
      : ['treinamento-participantes-disabled'],
    enabled: !!treinamentoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treinamento_participantes')
        .select('*')
        .eq('treinamento_id', treinamentoId!);
      if (error) throw error;
      return (data ?? []) as TreinamentoParticipante[];
    },
  });
}

interface SaveParticipantesInput {
  treinamentoId: string;
  /** Map of employeeId → compareceu */
  presencas: Record<string, boolean>;
  /** Existing participantes already on DB (to know what to update vs insert) */
  existentes: Pick<TreinamentoParticipante, 'id' | 'employee_id' | 'compareceu'>[];
}

export function useSaveParticipantes(pcaId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ treinamentoId, presencas, existentes }: SaveParticipantesInput) => {
      const existentesMap = new Map(existentes.map((p) => [p.employee_id, p]));
      const ops: PromiseLike<unknown>[] = [];

      for (const [employeeId, compareceu] of Object.entries(presencas)) {
        const existente = existentesMap.get(employeeId);
        if (existente) {
          if (existente.compareceu !== compareceu) {
            ops.push(
              supabase
                .from('treinamento_participantes')
                .update({ compareceu })
                .eq('id', existente.id)
                .then(({ error }) => {
                  if (error) throw error;
                })
            );
          }
        } else {
          ops.push(
            supabase
              .from('treinamento_participantes')
              .insert({ treinamento_id: treinamentoId, employee_id: employeeId, compareceu })
              .then(({ error }) => {
                if (error) throw error;
              })
          );
        }
      }

      // Remove entries no longer in presencas
      for (const existente of existentes) {
        if (!(existente.employee_id in presencas)) {
          ops.push(
            supabase
              .from('treinamento_participantes')
              .delete()
              .eq('id', existente.id)
              .then(({ error }) => {
                if (error) throw error;
              })
          );
        }
      }

      await Promise.all(ops);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: PARTICIPANTES_KEY(variables.treinamentoId) });
      if (pcaId) queryClient.invalidateQueries({ queryKey: TREINAMENTOS_KEY(pcaId) });
    },
  });
}
