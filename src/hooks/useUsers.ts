import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile, ProfileRole, ProfileStatus } from '../types';

const USERS_KEY = ['users-profiles'] as const;

/**
 * Lista todos os profiles do sistema.
 *
 * NOTA: o schema atual não tem `company_id` em `profiles` — só `tenant_id`,
 * cuja semântica ainda não está totalmente definida no projeto. Por enquanto
 * a listagem é global. Quando `tenant_id` virar uma chave clara de empresa,
 * adicionar o filtro aqui.
 */
export function useUsers() {
  return useQuery<Profile[]>({
    queryKey: USERS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: ProfileRole }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: ProfileStatus }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}
