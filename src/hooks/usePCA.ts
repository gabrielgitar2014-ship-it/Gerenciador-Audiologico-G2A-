import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { AcaoPCA, MedicaoRuido, ProgramaPCA } from '../types';

// ============================================================================
// PROGRAMAS PCA
// ============================================================================

const PROGRAMAS_KEY = (companyId: string) => ['programas-pca', companyId] as const;
const PROGRAMA_KEY = (pcaId: string) => ['programa-pca', pcaId] as const;

export function useProgramasPCA(companyId: string | null | undefined) {
  return useQuery<ProgramaPCA[]>({
    queryKey: companyId ? PROGRAMAS_KEY(companyId) : ['programas-pca-disabled'],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programas_pca')
        .select('*')
        .eq('company_id', companyId!)
        .order('ano', { ascending: false })
        .order('versao', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProgramaPCA[];
    },
  });
}

export function useProgramaPCA(pcaId: string | null | undefined) {
  return useQuery<ProgramaPCA | null>({
    queryKey: pcaId ? PROGRAMA_KEY(pcaId) : ['programa-pca-disabled'],
    enabled: !!pcaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programas_pca')
        .select('*')
        .eq('id', pcaId!)
        .single();
      if (error) throw error;
      return data as ProgramaPCA;
    },
  });
}

export type CreateProgramaPCAInput = Omit<
  ProgramaPCA,
  'id' | 'criado_em' | 'atualizado_em' | 'versao'
> & {
  versao?: number;
};

export function useCreateProgramaPCA(companyId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProgramaPCAInput) => {
      const { data, error } = await supabase
        .from('programas_pca')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ProgramaPCA;
    },
    onSuccess: () => {
      if (companyId) queryClient.invalidateQueries({ queryKey: PROGRAMAS_KEY(companyId) });
    },
  });
}

export function useUpdateProgramaPCA(companyId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ProgramaPCA> }) => {
      const { data, error } = await supabase
        .from('programas_pca')
        .update({ ...patch, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProgramaPCA;
    },
    onSuccess: (data) => {
      if (companyId) queryClient.invalidateQueries({ queryKey: PROGRAMAS_KEY(companyId) });
      queryClient.invalidateQueries({ queryKey: PROGRAMA_KEY(data.id) });
    },
  });
}

export function useDeleteProgramaPCA(companyId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('programas_pca').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (companyId) queryClient.invalidateQueries({ queryKey: PROGRAMAS_KEY(companyId) });
    },
  });
}

// ============================================================================
// MEDIÇÕES DE RUÍDO
// ============================================================================

const MEDICOES_KEY = (pcaId: string) => ['medicoes-ruido', pcaId] as const;

export function useMedicoesRuido(pcaId: string | null | undefined) {
  return useQuery<MedicaoRuido[]>({
    queryKey: pcaId ? MEDICOES_KEY(pcaId) : ['medicoes-ruido-disabled'],
    enabled: !!pcaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicoes_ruido')
        .select('*')
        .eq('pca_id', pcaId!)
        .order('data_medicao', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MedicaoRuido[];
    },
  });
}

export type CreateMedicaoRuidoInput = Omit<MedicaoRuido, 'id' | 'criado_em'>;

export function useCreateMedicaoRuido(pcaId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMedicaoRuidoInput) => {
      const { data, error } = await supabase
        .from('medicoes_ruido')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as MedicaoRuido;
    },
    onSuccess: () => {
      if (pcaId) queryClient.invalidateQueries({ queryKey: MEDICOES_KEY(pcaId) });
    },
  });
}

export function useDeleteMedicaoRuido(pcaId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('medicoes_ruido').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (pcaId) queryClient.invalidateQueries({ queryKey: MEDICOES_KEY(pcaId) });
    },
  });
}

// ============================================================================
// AÇÕES PCA
// ============================================================================

const ACOES_KEY = (pcaId: string) => ['acoes-pca', pcaId] as const;

export function useAcoesPCA(pcaId: string | null | undefined) {
  return useQuery<AcaoPCA[]>({
    queryKey: pcaId ? ACOES_KEY(pcaId) : ['acoes-pca-disabled'],
    enabled: !!pcaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('acoes_pca')
        .select('*')
        .eq('pca_id', pcaId!)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AcaoPCA[];
    },
  });
}

export type CreateAcaoPCAInput = Omit<AcaoPCA, 'id' | 'criado_em' | 'atualizado_em'>;

export function useCreateAcaoPCA(pcaId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAcaoPCAInput) => {
      const { data, error } = await supabase
        .from('acoes_pca')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as AcaoPCA;
    },
    onSuccess: () => {
      if (pcaId) queryClient.invalidateQueries({ queryKey: ACOES_KEY(pcaId) });
    },
  });
}

export function useUpdateAcaoPCA(pcaId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AcaoPCA> }) => {
      const { data, error } = await supabase
        .from('acoes_pca')
        .update({ ...patch, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AcaoPCA;
    },
    onSuccess: () => {
      if (pcaId) queryClient.invalidateQueries({ queryKey: ACOES_KEY(pcaId) });
    },
  });
}

export function useDeleteAcaoPCA(pcaId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('acoes_pca').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (pcaId) queryClient.invalidateQueries({ queryKey: ACOES_KEY(pcaId) });
    },
  });
}
