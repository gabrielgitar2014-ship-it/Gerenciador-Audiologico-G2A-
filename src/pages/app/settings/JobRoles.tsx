import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDebouncedValue } from '@mantine/hooks';
import { supabase } from '../../../lib/supabase';
import {
  Table,
  Button,
  Modal,
  TextInput,
  Select,
  Group,
  ActionIcon,
  Text,
  LoadingOverlay,
  Paper,
  Title,
  Tooltip
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';

// Esquema de validação com Zod
const jobRoleSchema = z.object({
  name: z.string().min(3, { message: 'O nome do cargo deve ter pelo menos 3 caracteres.' }),
  cbo: z.string().optional(),
});

// Tipagem do Cargo
type JobRole = {
  id: string;
  name: string;
  cbo?: string;
  company_id: string;
};

// Tipagem para o formulário
type JobRoleFormData = z.infer<typeof jobRoleSchema>;

export function JobRoles() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingJobRole, setEditingJobRole] = useState<JobRole | null>(null);

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<JobRoleFormData>({
    resolver: zodResolver(jobRoleSchema),
  });

  // Busca de CBO (server-side na tabela `cbo`)
  const [cboSearch, setCboSearch] = useState('');
  const [debouncedCbo] = useDebouncedValue(cboSearch, 250);

  const { data: cboOptions, isFetching: cboLoading } = useQuery<{ value: string; label: string }[]>({
    queryKey: ['cbo-search', debouncedCbo],
    queryFn: async () => {
      const term = debouncedCbo.trim().replace(/[,()%*]/g, '');
      if (term.length < 2) return [];
      const { data, error } = await supabase
        .from('cbo')
        .select('codigo, codigo_formatado, titulo')
        .ilike('termos_busca', `%${term}%`)
        .order('titulo', { ascending: true })
        .limit(20);
      if (error) throw new Error(error.message);
      return (data || []).map((c) => ({
        value: c.codigo_formatado,
        label: `${c.codigo_formatado} — ${c.titulo}`,
      }));
    },
    enabled: debouncedCbo.trim().length >= 2,
  });

  // 1. BUSCAR DADOS (READ)
  const { data: jobRoles, isLoading, isError } = useQuery<JobRole[]>({
    queryKey: ['jobRoles', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_roles')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!companyId,
  });

  // 2. CRIAR/ATUALIZAR DADOS (CREATE/UPDATE)
  const mutation = useMutation({
    mutationFn: async (jobRoleData: JobRoleFormData) => {
      if (!companyId) throw new Error('ID da empresa não encontrado.');
      
      const dataToSave = {
        ...jobRoleData,
        company_id: companyId,
      };

      let error;
      if (editingJobRole) {
        ({ error } = await supabase.from('job_roles').update(dataToSave).eq('id', editingJobRole.id));
      } else {
        ({ error } = await supabase.from('job_roles').insert(dataToSave));
      }

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobRoles', companyId] });
      toast.success(editingJobRole ? 'Cargo atualizado com sucesso!' : 'Cargo criado com sucesso!');
      closeModal();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // 3. DELETAR DADOS (DELETE)
  const deleteMutation = useMutation({
    mutationFn: async (jobRoleId: string) => {
      const { error } = await supabase.from('job_roles').delete().eq('id', jobRoleId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobRoles', companyId] });
      toast.success('Cargo deletado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao deletar: ${error.message}`);
    },
  });

  const openModal = (jobRole: JobRole | null = null) => {
    setEditingJobRole(jobRole);
    setCboSearch('');
    if (jobRole) {
      setValue('name', jobRole.name);
      setValue('cbo', jobRole.cbo);
    } else {
      reset({ name: '', cbo: '' });
    }
    setModalOpened(true);
  };

  const closeModal = () => {
    setModalOpened(false);
    setEditingJobRole(null);
    setCboSearch('');
    reset();
  };

  const onSubmit = (data: JobRoleFormData) => {
    mutation.mutate(data);
  };

  const handleDelete = (jobRoleId: string) => {
    if (window.confirm('Tem certeza que deseja deletar este cargo?')) {
      deleteMutation.mutate(jobRoleId);
    }
  };
  
  return (
    <Paper shadow="sm" p="lg" withBorder>
        <Group justify="space-between" mb="xl">
            <Title order={3} c="slate.700">Gestão de Cargos</Title>
            <Button leftSection={<IconPlus size={16} />} onClick={() => openModal()}>
            Novo Cargo
            </Button>
        </Group>

        <LoadingOverlay visible={isLoading || mutation.isPending || deleteMutation.isPending} overlayProps={{ radius: "sm", blur: 2 }} />

        {isError && <Text c="red">Erro ao carregar os cargos.</Text>}

        {!isLoading && !isError && jobRoles?.length === 0 && (
            <Text c="dimmed" ta="center" mt="xl">Nenhum cargo encontrado.</Text>
        )}

        {jobRoles && jobRoles.length > 0 && (
            <Table.ScrollContainer minWidth={600}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                  <Table.Tr>
                  <Table.Th>Nome do Cargo</Table.Th>
                  <Table.Th>CBO</Table.Th>
                  <Table.Th ta="right">Ações</Table.Th>
                  </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                  {jobRoles.map((jobRole) => (
                  <Table.Tr key={jobRole.id}>
                      <Table.Td>{jobRole.name}</Table.Td>
                      <Table.Td>{jobRole.cbo || 'N/A'}</Table.Td>
                      <Table.Td>
                      <Group gap="xs" justify="flex-end">
                          <Tooltip label="Editar">
                              <ActionIcon variant="subtle" onClick={() => openModal(jobRole)}>
                                  <IconPencil size={18} />
                              </ActionIcon>
                          </Tooltip>
                           <Tooltip label="Excluir">
                              <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(jobRole.id)}>
                                  <IconTrash size={18} />
                              </ActionIcon>
                          </Tooltip>
                      </Group>
                      </Table.Td>
                  </Table.Tr>
                  ))}
              </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
        )}

        <Modal opened={modalOpened} onClose={closeModal} title={editingJobRole ? 'Editar Cargo' : 'Novo Cargo'} centered>
            <form onSubmit={handleSubmit(onSubmit)}>
            <TextInput
                label="Nome do Cargo"
                placeholder="Ex: Desenvolvedor de Software"
                {...register('name')}
                error={errors.name?.message}
                required
            />
            <Controller
                name="cbo"
                control={control}
                render={({ field }) => {
                    const options = [...(cboOptions || [])];
                    if (field.value && !options.some((o) => o.value === field.value)) {
                        options.unshift({ value: field.value, label: field.value });
                    }
                    return (
                        <Select
                            label="CBO"
                            placeholder="Busque por cargo ou código (ex: enfermeiro ou 2235)"
                            mt="md"
                            searchable
                            clearable
                            data={options}
                            value={field.value || null}
                            onChange={(v) => field.onChange(v || undefined)}
                            searchValue={cboSearch}
                            onSearchChange={setCboSearch}
                            filter={({ options }) => options}
                            nothingFoundMessage={
                                cboLoading ? 'Buscando…'
                                : cboSearch.trim().length < 2 ? 'Digite ao menos 2 caracteres'
                                : 'Nenhum CBO encontrado'
                            }
                            error={errors.cbo?.message}
                        />
                    );
                }}
            />
            <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" loading={mutation.isPending}>
                {editingJobRole ? 'Salvar' : 'Criar'}
                </Button>
            </Group>
            </form>
        </Modal>
    </Paper>
  );
}
