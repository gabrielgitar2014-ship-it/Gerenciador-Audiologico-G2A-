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
  Select,
  Tooltip,
  Badge,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useEffect } from 'react';

const companySchema = z.object({
  razao_social: z.string().min(3, 'Razão Social é obrigatória.'),
  nome_fantasia: z.string().min(3, 'Nome Fantasia é obrigatório.'),
  cnpj: z.string().length(14, 'CNPJ deve ter 14 dígitos.'),
  cep: z.string().optional().nullable(),
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  cnae: z.string().optional().nullable(),
  segmento: z.string().optional().nullable(),
  grau_risco: z.number().int().min(1).max(4).optional().nullable(),
  email_contato: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  status: z.enum(['ativo', 'inativo', 'suspenso']).optional(),
  medico_coordenador_nome: z.string().optional().nullable(),
  medico_coordenador_crm: z.string().optional().nullable(),
  medico_coordenador_uf: z.string().optional().nullable(),
});

type Company = z.infer<typeof companySchema>;

const GRAU_RISCO_LABEL: Record<number, string> = {
  1: 'Grau 1 — Risco baixo (escritórios, comércio)',
  2: 'Grau 2 — Risco médio (transportes, serviços)',
  3: 'Grau 3 — Risco alto (indústria, construção)',
  4: 'Grau 4 — Risco máximo (mineração, siderurgia)',
};

const STATUS_COLOR: Record<string, string> = {
  ativo: 'teal',
  inativo: 'gray',
  suspenso: 'red',
};

export function CompanyProfile() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<Company>({
    resolver: zodResolver(companySchema),
  });

  const grauRisco = watch('grau_risco');
  const status = watch('status');

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

  useEffect(() => {
    if (company) {
      reset(company);
    }
  }, [company, reset]);

  const mutation = useMutation({
    mutationFn: async (companyData: Company) => {
      if (!companyId) throw new Error('ID da empresa não encontrado.');
      const payload = {
        ...companyData,
        email_contato: companyData.email_contato || null,
        grau_risco: companyData.grau_risco || null,
      };
      const { error } = await supabase
        .from('companies')
        .update(payload)
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
      <LoadingOverlay visible={isLoading} overlayProps={{ radius: 'sm', blur: 2 }} />

      <Group justify="space-between" align="center" mb="xl">
        <Title order={3} c="slate.700">Dados da Empresa</Title>
        {status && (
          <Badge size="lg" color={STATUS_COLOR[status] ?? 'gray'} variant="light">
            {status.toUpperCase()}
          </Badge>
        )}
      </Group>

      {isError && <Text c="red">Erro ao carregar os dados da empresa.</Text>}

      {!isLoading && company && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Title order={5} c="slate.600" mb="sm">Identificação</Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput label="Razão Social" {...register('razao_social')} error={errors.razao_social?.message} required />
            <TextInput label="Nome Fantasia" {...register('nome_fantasia')} error={errors.nome_fantasia?.message} required />
            <TextInput label="CNPJ" {...register('cnpj')} error={errors.cnpj?.message} required />
            <TextInput label="E-mail de Contato" type="email" {...register('email_contato')} error={errors.email_contato?.message} />
            <TextInput
              label="CNAE Principal"
              placeholder="Ex: 8610-1/01"
              {...register('cnae')}
              error={errors.cnae?.message}
            />
            <TextInput label="Segmento / Ramo" placeholder="Ex: Saúde Ocupacional" {...register('segmento')} error={errors.segmento?.message} />
            <Select
              label={
                <Group gap={4} component="span">
                  <span>Grau de Risco</span>
                  <Tooltip
                    multiline
                    w={260}
                    label="Conforme NR-04: 1 (baixo) a 4 (máximo). Define dimensionamento do SESMT."
                    withArrow
                  >
                    <IconInfoCircle size={14} className="text-slate-400 cursor-help" />
                  </Tooltip>
                </Group>
              }
              placeholder="Selecione o grau"
              data={[1, 2, 3, 4].map((g) => ({ value: String(g), label: GRAU_RISCO_LABEL[g] }))}
              value={grauRisco ? String(grauRisco) : null}
              onChange={(v) => setValue('grau_risco', v ? (Number(v) as 1 | 2 | 3 | 4) : null, { shouldDirty: true })}
              error={errors.grau_risco?.message}
              clearable
            />
            <Select
              label="Status da Empresa"
              data={[
                { value: 'ativo', label: 'Ativo' },
                { value: 'inativo', label: 'Inativo' },
                { value: 'suspenso', label: 'Suspenso' },
              ]}
              value={status ?? 'ativo'}
              onChange={(v) => setValue('status', (v as 'ativo' | 'inativo' | 'suspenso') ?? 'ativo', { shouldDirty: true })}
            />
          </SimpleGrid>

          <Title order={5} c="slate.600" mt="xl" mb="sm">Endereço</Title>
          <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
            <TextInput label="CEP" {...register('cep')} />
            <TextInput label="Logradouro" {...register('logradouro')} />
            <TextInput label="Número" {...register('numero')} />
            <TextInput label="Complemento" {...register('complemento')} />
            <TextInput label="Bairro" {...register('bairro')} />
            <TextInput label="Cidade" {...register('cidade')} />
            <TextInput label="Estado (UF)" maxLength={2} {...register('estado')} />
          </SimpleGrid>

          <Title order={5} c="slate.600" mt="xl" mb="sm">Médico Coordenador (PCMSO)</Title>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <TextInput label="Nome do Médico" {...register('medico_coordenador_nome')} />
            <TextInput label="CRM" {...register('medico_coordenador_crm')} />
            <TextInput label="UF do CRM" maxLength={2} {...register('medico_coordenador_uf')} />
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
