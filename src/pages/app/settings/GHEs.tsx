import { useState } from 'react';
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
  Group,
  ActionIcon,
  Text,
  LoadingOverlay,
  Paper,
  Title,
  Tooltip,
  Checkbox,
  NumberInput,
  SimpleGrid,
  Badge
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';

// Esquema de validação com Zod
const gheSchema = z.object({
  name: z.string().min(3, { message: 'O nome do GHE deve ter pelo menos 3 caracteres.' }),
  has_noise_risk: z.boolean(),
  noise_level_db: z.number().nullable().optional(),
  has_chemical_risk: z.boolean(),
  epi_ca: z.string().nullable().optional(),
  epi_nrrsf: z.number().nullable().optional(),
});

// Tipagem do GHE
type GHE = {
  id: string;
  name: string;
  has_noise_risk: boolean;
  noise_level_db?: number | null;
  has_chemical_risk: boolean;
  epi_ca?: string | null;
  epi_nrrsf?: number | null;
  company_id: string;
};

// Tipagem para o formulário
type GHEFormData = z.infer<typeof gheSchema>;

export function GHEs() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingGHE, setEditingGHE] = useState<GHE | null>(null);

  const { register, handleSubmit, reset, setValue, control, watch, formState: { errors } } = useForm<GHEFormData>({
    resolver: zodResolver(gheSchema),
    defaultValues: {
        has_noise_risk: false,
        has_chemical_risk: false,
    }
  });

  const watchNoiseRisk = watch('has_noise_risk');

  // 1. BUSCAR DADOS (READ)
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

  // 2. CRIAR/ATUALIZAR DADOS (CREATE/UPDATE)
  const mutation = useMutation({
    mutationFn: async (gheData: GHEFormData) => {
      if (!companyId) throw new Error('ID da empresa não encontrado.');
      
      const dataToSave = {
        ...gheData,
        company_id: companyId,
        noise_level_db: gheData.has_noise_risk ? gheData.noise_level_db : null,
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

  // 3. DELETAR DADOS (DELETE)
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
        setValue('name', ghe.name);
        setValue('has_noise_risk', ghe.has_noise_risk);
        setValue('noise_level_db', ghe.noise_level_db);
        setValue('has_chemical_risk', ghe.has_chemical_risk);
        setValue('epi_ca', ghe.epi_ca);
        setValue('epi_nrrsf', ghe.epi_nrrsf);
    } else {
      reset();
    }
    setModalOpened(true);
  };

  const closeModal = () => {
    setModalOpened(false);
    setEditingGHE(null);
    reset();
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

        <LoadingOverlay visible={isLoading || mutation.isPending || deleteMutation.isPending} overlayProps={{ radius: "sm", blur: 2 }} />

        {isError && <Text c="red">Erro ao carregar os GHEs.</Text>}

        {!isLoading && !isError && ghes?.length === 0 && (
            <Text c="dimmed" ta="center" mt="xl">Nenhum GHE encontrado.</Text>
        )}

        {ghes && ghes.length > 0 && (
            <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
                <Table.Tr>
                <Table.Th>Nome do GHE</Table.Th>
                <Table.Th>Riscos</Table.Th>
                <Table.Th ta="right">Ações</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {ghes.map((ghe) => (
                <Table.Tr key={ghe.id}>
                    <Table.Td>{ghe.name}</Table.Td>
                    <Table.Td>
                        <Group gap="xs">
                            {ghe.has_noise_risk && <Badge color="orange">Ruído ({ghe.noise_level_db} dB)</Badge>}
                            {ghe.has_chemical_risk && <Badge color="grape">Químico</Badge>}
                        </Group>
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
                ))}
            </Table.Tbody>
            </Table>
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

            <SimpleGrid cols={2} mt="md">
                <Checkbox
                    label="Risco de Ruído"
                    {...register('has_noise_risk')}
                />
                <Checkbox
                    label="Risco Químico"
                    {...register('has_chemical_risk')}
                />
            </SimpleGrid>

            {watchNoiseRisk && (
                <TextInput
                    label="Nível de Ruído (dB)"
                    placeholder="Ex: 85"
                    type="number"
                    {...register('noise_level_db', { valueAsNumber: true })}
                    error={errors.noise_level_db?.message}
                    mt="md"
                    />
            )}
            
            <SimpleGrid cols={2} mt="md">
                <TextInput
                    label="CA do EPI"
                    placeholder="Ex: 12345"
                    {...register('epi_ca')}
                />
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
