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
  Tooltip
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconBuilding } from '@tabler/icons-react';
import { Toaster, toast } from 'sonner';

// Esquema de validação com Zod
const sectorSchema = z.object({
  name: z.string().min(3, { message: 'O nome do setor deve ter pelo menos 3 caracteres.' }),
});

// Tipagem do Setor
type Sector = {
  id: string;
  name: string;
  company_id: string;
};

// Tipagem para o formulário
type SectorFormData = z.infer<typeof sectorSchema>;

export function Sectors() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<SectorFormData>({
    resolver: zodResolver(sectorSchema),
  });

  // 1. BUSCAR DADOS (READ)
  const { data: sectors, isLoading, isError } = useQuery<Sector[]>({
    queryKey: ['sectors', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sectors')
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
    mutationFn: async (sectorData: SectorFormData) => {
      if (!companyId) throw new Error('ID da empresa não encontrado.');
      
      const dataToSave = {
        ...sectorData,
        company_id: companyId,
      };

      let error;
      if (editingSector) {
        // ATUALIZAR
        ({ error } = await supabase.from('sectors').update(dataToSave).eq('id', editingSector.id));
      } else {
        // CRIAR
        ({ error } = await supabase.from('sectors').insert(dataToSave));
      }

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors', companyId] });
      toast.success(editingSector ? 'Setor atualizado com sucesso!' : 'Setor criado com sucesso!');
      closeModal();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // 3. DELETAR DADOS (DELETE)
  const deleteMutation = useMutation({
    mutationFn: async (sectorId: string) => {
      const { error } = await supabase.from('sectors').delete().eq('id', sectorId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors', companyId] });
      toast.success('Setor deletado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao deletar: ${error.message}`);
    },
  });

  const openModal = (sector: Sector | null = null) => {
    setEditingSector(sector);
    if (sector) {
      setValue('name', sector.name);
    } else {
      reset({ name: '' });
    }
    setModalOpened(true);
  };

  const closeModal = () => {
    setModalOpened(false);
    setEditingSector(null);
    reset();
  };

  const onSubmit = (data: SectorFormData) => {
    mutation.mutate(data);
  };

  const handleDelete = (sectorId: string) => {
    if (window.confirm('Tem certeza que deseja deletar este setor?')) {
      deleteMutation.mutate(sectorId);
    }
  };
  
  return (
    <Paper shadow="sm" p="lg" withBorder>
        <Group justify="space-between" mb="xl">
            <Title order={3} c="slate.700">Gestão de Setores</Title>
            <Button leftSection={<IconPlus size={16} />} onClick={() => openModal()}>
            Novo Setor
            </Button>
        </Group>

        <LoadingOverlay visible={isLoading || mutation.isPending || deleteMutation.isPending} overlayProps={{ radius: "sm", blur: 2 }} />

        {isError && <Text c="red">Erro ao carregar os setores.</Text>}

        {!isLoading && !isError && sectors?.length === 0 && (
            <Text c="dimmed" ta="center" mt="xl">Nenhum setor encontrado.</Text>
        )}

        {sectors && sectors.length > 0 && (
            <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
                <Table.Tr>
                <Table.Th>Nome do Setor</Table.Th>
                <Table.Th ta="right">Ações</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {sectors.map((sector) => (
                <Table.Tr key={sector.id}>
                    <Table.Td>{sector.name}</Table.Td>
                    <Table.Td>
                    <Group gap="xs" justify="flex-end">
                        <Tooltip label="Editar">
                            <ActionIcon variant="subtle" onClick={() => openModal(sector)}>
                                <IconPencil size={18} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Excluir">
                            <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(sector.id)}>
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

        <Modal opened={modalOpened} onClose={closeModal} title={editingSector ? 'Editar Setor' : 'Novo Setor'} centered>
            <form onSubmit={handleSubmit(onSubmit)}>
            <TextInput
                label="Nome do Setor"
                placeholder="Ex: Administrativo"
                {...register('name')}
                error={errors.name?.message}
                required
            />
            <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" loading={mutation.isPending}>
                {editingSector ? 'Salvar' : 'Criar'}
                </Button>
            </Group>
            </form>
        </Modal>
    </Paper>
  );
}
