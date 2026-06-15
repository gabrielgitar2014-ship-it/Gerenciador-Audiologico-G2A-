import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { EPIEntrega } from '../types';

const EPI_KEY = (companyId: string) => ['epis-entrega', companyId] as const;
const EPI_BY_EMPLOYEE_KEY = (employeeId: string) => ['epis-entrega-employee', employeeId] as const;

interface UseEPIsParams {
  companyId: string | null | undefined;
  employeeId?: string | null;
}

export function useEPIsEntrega({ companyId, employeeId }: UseEPIsParams) {
  return useQuery<(EPIEntrega & { employee?: { full_name: string } })[]>({
    queryKey: companyId
      ? [...EPI_KEY(companyId), employeeId ?? 'all']
      : ['epis-entrega-disabled'],
    enabled: !!companyId,
    queryFn: async () => {
      let query = supabase
        .from('epis_entrega')
        .select('*, employee:employee_id (full_name)')
        .eq('company_id', companyId!)
        .order('data_entrega', { ascending: false });
      if (employeeId) query = query.eq('employee_id', employeeId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as (EPIEntrega & { employee?: { full_name: string } })[];
    },
  });
}

export function useEPIsByEmployee(employeeId: string | null | undefined) {
  return useQuery<EPIEntrega[]>({
    queryKey: employeeId ? EPI_BY_EMPLOYEE_KEY(employeeId) : ['epis-entrega-employee-disabled'],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epis_entrega')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('data_entrega', { ascending: false });
      if (error) throw error;
      return (data ?? []) as EPIEntrega[];
    },
  });
}

export type CreateEPIEntregaInput = Omit<EPIEntrega, 'id' | 'criado_em'>;

export function useCreateEPIEntrega(companyId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEPIEntregaInput) => {
      const { data, error } = await supabase
        .from('epis_entrega')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as EPIEntrega;
    },
    onSuccess: (_data, variables) => {
      if (companyId) queryClient.invalidateQueries({ queryKey: EPI_KEY(companyId) });
      if (variables.employee_id) {
        queryClient.invalidateQueries({ queryKey: EPI_BY_EMPLOYEE_KEY(variables.employee_id) });
      }
    },
  });
}

export function useDeleteEPIEntrega(companyId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase.from('epis_entrega').delete().eq('id', id);
      if (error) throw error;
      return { id, employeeId };
    },
    onSuccess: ({ employeeId }) => {
      if (companyId) queryClient.invalidateQueries({ queryKey: EPI_KEY(companyId) });
      queryClient.invalidateQueries({ queryKey: EPI_BY_EMPLOYEE_KEY(employeeId) });
    },
  });
}
