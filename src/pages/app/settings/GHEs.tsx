import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../../lib/supabase';
import {
  Table,
  Button,
  Modal,
  TextInput,
  Textarea,
  Group,
  ActionIcon,
  Text,
  LoadingOverlay,
  Paper,
  Title,
  Tooltip,
  Checkbox,
  SimpleGrid,
  Badge,
  Select,
  Divider,
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';

const gheSchema = z.object({
  name: z.string().min(3, { message: 'O nome do GHE deve ter pelo menos 3 caracteres.' }),
  descricao: z.string().nullable().optional(),
  setor_id: z.string().nullable().optional(),
  has_noise_risk: z.boolean(),
  has_chemical_risk: z.boolean(),
  has_biologico_risk: z.boolean(),
  has_ergonomico_risk: z.boolean(),
  has_fisico_risk: z.boolean(),
  noise_level_db: z.number().nullable().optional(),
  nivel_ruido_maximo_db: z.number().nullable().optional(),
  epi_ca: z.string().nullable().optional(),
  epi_nrrsf: z.number().nullable().optional(),
});

type GHE = {
  id: string;
  company_id: string;
  setor_id: string | null;
  name: string;
  descricao: string | null;
  has_noise_risk: boolean;
  has_chemical_risk: boolean;
  has_biologico_risk: boolean;
  has_ergonomico_risk: boolean;
  has_fisico_risk: boolean;
  noise_level_db: number | null;
  nivel_ruido_maximo_db: number | null;
  epi_ca: string | null;
  epi_nrrsf: number | null;
};

type GHEFormData = z.infer<typeof gheSchema>;

const DEFAULT_VALUES: GHEFormData = {
  name: '',
  descricao: null,
  setor_id: null,
  has_noise_risk: false,
  has_chemical_risk: false,
  has_biologico_risk: false,
  has_ergonomico_risk: false,
  has_fisico_risk: false,
  noise_level_db: null,
  nivel_ruido_maximo_db: null,
  epi_ca: null,
  epi_nrrsf: null,
};

export function GHEs() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingGHE, setEditingGHE] = useState<GHE | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<GHEFormData>({
    resolver: zodResolver(gheSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchNoiseRisk = watch('has_noise_risk');
  const setorId = watch('setor_id');

  // Lista de setores para o Select
  const { data: sectors = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['sectors', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sectors')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: ghes, isLoading, isError } = useQuery<GHE[]>({
    queryKey: ['ghes', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ghe')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!companyId,
  });

  const mutation = useMutation({
    mutationFn: async (gheData: GHEFormData) => {
      if (!companyId) throw new Error('ID da empresa não encontrado.');

      const dataToSave = {
        ...gheData,
        company_id: companyId,
        // Só persiste níveis se o risco de ruído estiver marcado
        noise_level_db: gheData.has_noise_risk ? gheData.noise_level_db : null,
        nivel_ruido_maximo_db: gheData.has_noise_risk ? gheData.nivel_ruido_maximo_db : null,
      };

      let error;
      if (editingGHE) {
        ({ error } = await supabase.from('ghe').update(dataToSave).eq('id', editingGHE.id));
      } else {
        ({ error } = await supabase.from('ghe').insert(dataToSave));
      }

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghes', companyId] });
      toast.success(editingGHE ? 'GHE atualizado com sucesso!' : 'GHE criado com sucesso!');
      closeModal();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (gheId: string) => {
      const { error } = await supabase.from('ghe').delete().eq('id', gheId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghes', companyId] });
      toast.success('GHE deletado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao deletar: ${error.message}`);
    },
  });

  const openModal = (ghe: GHE | null = null) => {
    setEditingGHE(ghe);
    if (ghe) {
      reset({
        name: ghe.name,
        descricao: ghe.descricao,
        setor_id: ghe.setor_id,
        has_noise_risk: ghe.has_noise_risk,
        has_chemical_risk: ghe.has_chemical_risk,
        has_biologico_risk: ghe.has_biologico_risk ?? false,
        has_ergonomico_risk: ghe.has_ergonomico_risk ?? false,
        has_fisico_risk: ghe.has_fisico_risk ?? false,
        noise_level_db: ghe.noise_level_db,
        nivel_ruido_maximo_db: ghe.nivel_ruido_maximo_db,
        epi_ca: ghe.epi_ca,
        epi_nrrsf: ghe.epi_nrrsf,
      });
    } else {
      reset(DEFAULT_VALUES);
    }
    setModalOpened(true);
  };

  const closeModal = () => {
    setModalOpened(false);
    setEditingGHE(null);
    reset(DEFAULT_VALUES);
  };

  const onSubmit = (data: GHEFormData) => {
    mutation.mutate(data);
  };

  const handleDelete = (gheId: string) => {
    if (window.confirm('Tem certeza que deseja deletar este GHE?')) {
      deleteMutation.mutate(gheId);
    }
  };

  return (
    <Paper shadow="sm" p="lg" withBorder>
      <Group justify="space-between" mb="xl">
        <Title order={3} c="slate.700">Gestão de GHEs</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => openModal()}>
          Novo GHE
        </Button>
      </Group>

      <LoadingOverlay visible={isLoading || mutation.isPending || deleteMutation.isPending} overlayProps={{ radius: 'sm', blur: 2 }} />

      {isError && <Text c="red">Erro ao carregar os GHEs.</Text>}

      {!isLoading && !isError && ghes?.length === 0 && (
        <Text c="dimmed" ta="center" mt="xl">Nenhum GHE encontrado.</Text>
      )}

      {ghes && ghes.length > 0 && (
        <Table.ScrollContainer minWidth={720}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome do GHE</Table.Th>
                <Table.Th>Riscos</Table.Th>
                <Table.Th>Setor</Table.Th>
                <Table.Th ta="right">Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ghes.map((ghe) => {
                const setorNome = sectors.find((s) => s.id === ghe.setor_id)?.name;
                return (
                  <Table.Tr key={ghe.id}>
                    <Table.Td>{ghe.name}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {ghe.has_noise_risk && <Badge color="orange">Ruído ({ghe.noise_level_db ?? '?'} dB)</Badge>}
                        {ghe.has_fisico_risk && <Badge color="red" variant="light">Físico</Badge>}
                        {ghe.has_chemical_risk && <Badge color="grape">Químico</Badge>}
                        {ghe.has_biologico_risk && <Badge color="green">Biológico</Badge>}
                        {ghe.has_ergonomico_risk && <Badge color="blue">Ergonômico</Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {setorNome ? <Badge variant="light" color="gray">{setorNome}</Badge> : <Text size="xs" c="dimmed">—</Text>}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <Tooltip label="Editar">
                          <ActionIcon variant="subtle" onClick={() => openModal(ghe)}>
                            <IconPencil size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Excluir">
                          <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(ghe.id)}>
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Modal opened={modalOpened} onClose={closeModal} title={editingGHE ? 'Editar GHE' : 'Novo GHE'} centered size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextInput
            label="Nome do GHE"
            placeholder="Ex: Operadores de Máquina"
            {...register('name')}
            error={errors.name?.message}
            required
          />

          <Textarea
            mt="md"
            label="Descrição"
            placeholder="Caracterização do grupo (atividade, exposição, etc.)"
            autosize
            minRows={2}
            {...register('descricao')}
          />

          <Select
            mt="md"
            label="Setor vinculado"
            placeholder={sectors.length > 0 ? 'Selecione o setor' : 'Nenhum setor cadastrado'}
            data={sectors.map((s) => ({ value: s.id, label: s.name }))}
            value={setorId ?? null}
            onChange={(v) => setValue('setor_id', v, { shouldDirty: true })}
            clearable
            searchable
            disabled={sectors.length === 0}
          />

          <Divider my="md" label="Riscos Ocupacionais" labelPosition="left" />

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Checkbox label="Risco Físico" {...register('has_fisico_risk')} />
            <Checkbox label="Risco de Ruído" {...register('has_noise_risk')} />
            <Checkbox label="Risco Químico" {...register('has_chemical_risk')} />
            <Checkbox label="Risco Biológico" {...register('has_biologico_risk')} />
            <Checkbox label="Risco Ergonômico" {...register('has_ergonomico_risk')} />
          </SimpleGrid>

          {watchNoiseRisk && (
            <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md">
              <TextInput
                label="Nível de Ruído atual (dB)"
                placeholder="Ex: 85"
                type="number"
                {...register('noise_level_db', { valueAsNumber: true })}
                error={errors.noise_level_db?.message}
              />
              <TextInput
                label="Nível máximo de ruído (dB)"
                placeholder="Limite NR-15 / pico"
                type="number"
                {...register('nivel_ruido_maximo_db', { valueAsNumber: true })}
                error={errors.nivel_ruido_maximo_db?.message}
              />
            </SimpleGrid>
          )}

          <Divider my="md" label="EPI Auditivo" labelPosition="left" />

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="CA do EPI" placeholder="Ex: 12345" {...register('epi_ca')} />
            <TextInput
              label="NRRsf do EPI"
              placeholder="Ex: 18"
              type="number"
              {...register('epi_nrrsf', { valueAsNumber: true })}
            />
          </SimpleGrid>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" loading={mutation.isPending}>
              {editingGHE ? 'Salvar' : 'Criar'}
            </Button>
          </Group>
        </form>
      </Modal>
    </Paper>
  );
}
