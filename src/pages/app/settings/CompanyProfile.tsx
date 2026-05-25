import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../../lib/supabase';
import {
  TextInput,
  Button,
  Group,
  Paper,
  Title,
  LoadingOverlay,
  SimpleGrid,
  Text,
} from '@mantine/core';
import { toast } from 'sonner';
import { useEffect } from 'react';

// Esquema de validação com Zod
const companySchema = z.object({
  razao_social: z.string().min(3, 'Razão Social é obrigatória.'),
  nome_fantasia: z.string().min(3, 'Nome Fantasia é obrigatório.'),
  cnpj: z.string().length(14, 'CNPJ deve ter 14 dígitos.'),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  medico_coordenador_nome: z.string().optional(),
  medico_coordenador_crm: z.string().optional(),
  medico_coordenador_uf: z.string().optional(),
});

// Tipagem da Empresa
type Company = z.infer<typeof companySchema>;

export function CompanyProfile() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Company>({
    resolver: zodResolver(companySchema),
  });

  // 1. BUSCAR DADOS (READ)
  const { data: company, isLoading, isError } = useQuery<Company>({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!companyId,
  });
  
  // Efeito para popular o formulário quando os dados são carregados
  useEffect(() => {
    if (company) {
      reset(company);
    }
  }, [company, reset]);

  // 2. ATUALIZAR DADOS (UPDATE)
  const mutation = useMutation({
    mutationFn: async (companyData: Company) => {
      if (!companyId) throw new Error('ID da empresa não encontrado.');
      
      const { error } = await supabase
        .from('companies')
        .update(companyData)
        .eq('id', companyId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      toast.success('Dados da empresa atualizados com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const onSubmit = (data: Company) => {
    mutation.mutate(data);
  };
  
  return (
    <Paper shadow="sm" p="lg" withBorder pos="relative">
        <LoadingOverlay visible={isLoading} overlayProps={{ radius: "sm", blur: 2 }} />
        <Title order={3} c="slate.700" mb="xl">Dados da Empresa</Title>

        {isError && <Text c="red">Erro ao carregar os dados da empresa.</Text>}
        
        {!isLoading && company && (
             <form onSubmit={handleSubmit(onSubmit)}>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput label="Razão Social" {...register('razao_social')} error={errors.razao_social?.message} required />
                    <TextInput label="Nome Fantasia" {...register('nome_fantasia')} error={errors.nome_fantasia?.message} required />
                    <TextInput label="CNPJ" {...register('cnpj')} error={errors.cnpj?.message} required />
                    <TextInput label="CEP" {...register('cep')} error={errors.cep?.message} />
                    <TextInput label="Logradouro" {...register('logradouro')} error={errors.logradouro?.message} />
                    <TextInput label="Cidade" {...register('cidade')} error={errors.cidade?.message} />
                    <TextInput label="Estado" {...register('estado')} error={errors.estado?.message} />
                </SimpleGrid>

                <Title order={4} c="slate.600" mt="xl" mb="md">Médico Coordenador (PCMSO)</Title>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <TextInput label="Nome do Médico" {...register('medico_coordenador_nome')} />
                    <TextInput label="CRM" {...register('medico_coordenador_crm')} />
                    <TextInput label="UF do CRM" {...register('medico_coordenador_uf')} />
                </SimpleGrid>

                <Group justify="flex-end" mt="xl">
                    <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
                        Salvar Alterações
                    </Button>
                </Group>
             </form>
        )}
    </Paper>
  );
}
