import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import {
  IconChartBar,
  IconEye,
  IconPencil,
  IconPlus,
  IconStethoscope,
  IconTrash,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import {
  useCreateProgramaPCA,
  useDeleteProgramaPCA,
  useProgramasPCA,
  useUpdateProgramaPCA,
} from '../../../hooks/usePCA';
import { usePermissions } from '../../../hooks/usePermissions';
import type { ProgramaPCA, ProgramaPCAStatus } from '../../../types';

const STATUS_COLOR: Record<ProgramaPCAStatus, string> = {
  ativo: 'teal',
  inativo: 'gray',
  arquivado: 'dark',
};

interface FormValues {
  ano: number;
  responsavel_tecnico_id: string | null;
  data_inicio: Date | null;
  data_revisao_prevista: Date | null;
  status: ProgramaPCAStatus;
  diagnostico_situacao: string;
  objetivos: string;
}

export function PCAManager() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { canManagePCA } = usePermissions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPca, setEditingPca] = useState<ProgramaPCA | null>(null);

  const { data: programas = [], isLoading } = useProgramasPCA(companyId);
  const createMutation = useCreateProgramaPCA(companyId);
  const updateMutation = useUpdateProgramaPCA(companyId);
  const deleteMutation = useDeleteProgramaPCA(companyId);

  // Lista de profissionais para "Responsável Técnico"
  const { data: profissionais = [] } = useQuery<{ id: string; full_name: string }[]>({
    queryKey: ['profissionais', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['fonoaudiologo', 'medico', 'admin'])
        .order('full_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const form = useForm<FormValues>({
    initialValues: {
      ano: new Date().getFullYear(),
      responsavel_tecnico_id: null,
      data_inicio: null,
      data_revisao_prevista: null,
      status: 'ativo',
      diagnostico_situacao: '',
      objetivos: '',
    },
    validate: {
      ano: (v) => (v < 2000 || v > 2100 ? 'Ano inválido' : null),
    },
  });

  const openCreate = () => {
    setEditingPca(null);
    form.setValues({
      ano: new Date().getFullYear(),
      responsavel_tecnico_id: null,
      data_inicio: new Date(),
      data_revisao_prevista: null,
      status: 'ativo',
      diagnostico_situacao: '',
      objetivos: '',
    });
    setModalOpen(true);
  };

  const openEdit = (pca: ProgramaPCA) => {
    setEditingPca(pca);
    form.setValues({
      ano: pca.ano,
      responsavel_tecnico_id: pca.responsavel_tecnico_id,
      data_inicio: pca.data_inicio ? new Date(pca.data_inicio) : null,
      data_revisao_prevista: pca.data_revisao_prevista ? new Date(pca.data_revisao_prevista) : null,
      status: pca.status,
      diagnostico_situacao: pca.diagnostico_situacao ?? '',
      objetivos: pca.objetivos ?? '',
    });
    setModalOpen(true);
  };

  const close = () => {
    setModalOpen(false);
    setEditingPca(null);
    form.reset();
  };

  const handleSubmit = async (values: FormValues) => {
    if (!companyId) return;
    const payload = {
      company_id: companyId,
      ano: values.ano,
      responsavel_tecnico_id: values.responsavel_tecnico_id,
      data_inicio: values.data_inicio ? dayjs(values.data_inicio).format('YYYY-MM-DD') : null,
      data_revisao_prevista: values.data_revisao_prevista
        ? dayjs(values.data_revisao_prevista).format('YYYY-MM-DD')
        : null,
      data_revisao_realizada: editingPca?.data_revisao_realizada ?? null,
      status: values.status,
      diagnostico_situacao: values.diagnostico_situacao || null,
      objetivos: values.objetivos || null,
      ia_resumo: editingPca?.ia_resumo ?? null,
    };

    try {
      if (editingPca) {
        await updateMutation.mutateAsync({ id: editingPca.id, patch: payload });
        toast.success('PCA atualizado!');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('PCA criado!');
      }
      close();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este programa PCA? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('PCA excluído.');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  return (
    <Paper shadow="sm" p="lg" withBorder pos="relative">
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />

      <Group justify="space-between" mb="lg">
        <Group gap={8}>
          <IconStethoscope size={22} className="text-teal-600" />
          <Title order={3} c="slate.700">Programas PCA</Title>
        </Group>
        {canManagePCA && (
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate} color="teal">
            Novo PCA
          </Button>
        )}
      </Group>

      {!isLoading && programas.length === 0 && (
        <Stack align="center" py="xl" gap={4}>
          <IconChartBar size={40} className="text-slate-300" />
          <Text c="dimmed">Nenhum programa PCA cadastrado.</Text>
          {canManagePCA && (
            <Button variant="subtle" mt="sm" leftSection={<IconPlus size={14} />} onClick={openCreate}>
              Criar primeiro PCA
            </Button>
          )}
        </Stack>
      )}

      {programas.length > 0 && (
        <Table.ScrollContainer minWidth={760}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Ano</Table.Th>
                <Table.Th>Versão</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Início</Table.Th>
                <Table.Th>Revisão prevista</Table.Th>
                <Table.Th>Responsável Técnico</Table.Th>
                <Table.Th ta="right">Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {programas.map((pca) => {
                const responsavel = profissionais.find((p) => p.id === pca.responsavel_tecnico_id)?.full_name;
                return (
                  <Table.Tr key={pca.id}>
                    <Table.Td><Text fw={700}>{pca.ano}</Text></Table.Td>
                    <Table.Td>v{pca.versao}</Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLOR[pca.status]} variant="light">{pca.status}</Badge>
                    </Table.Td>
                    <Table.Td>{pca.data_inicio ? dayjs(pca.data_inicio).format('DD/MM/YYYY') : '—'}</Table.Td>
                    <Table.Td>
                      {pca.data_revisao_prevista ? dayjs(pca.data_revisao_prevista).format('DD/MM/YYYY') : '—'}
                    </Table.Td>
                    <Table.Td>{responsavel ?? <Text size="xs" c="dimmed">—</Text>}</Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end">
                        <Tooltip label="Abrir detalhe">
                          <ActionIcon variant="subtle" color="teal" onClick={() => navigate(`../pca/detalhe/${pca.id}`)}>
                            <IconEye size={18} />
                          </ActionIcon>
                        </Tooltip>
                        {canManagePCA && (
                          <>
                            <Tooltip label="Editar">
                              <ActionIcon variant="subtle" onClick={() => openEdit(pca)}>
                                <IconPencil size={18} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Excluir">
                              <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(pca.id)}>
                                <IconTrash size={18} />
                              </ActionIcon>
                            </Tooltip>
                          </>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {/* Modal CRUD */}
      <Modal
        opened={modalOpen}
        onClose={close}
        title={editingPca ? `Editar PCA ${editingPca.ano} (v${editingPca.versao})` : 'Novo Programa PCA'}
        centered
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Group grow>
              <NumberInput
                label="Ano de Referência"
                min={2000}
                max={2100}
                required
                {...form.getInputProps('ano')}
              />
              <Select
                label="Status"
                data={[
                  { value: 'ativo', label: 'Ativo' },
                  { value: 'inativo', label: 'Inativo' },
                  { value: 'arquivado', label: 'Arquivado' },
                ]}
                {...form.getInputProps('status')}
              />
            </Group>

            <Select
              label="Responsável Técnico"
              placeholder="Selecione um profissional"
              data={profissionais.map((p) => ({ value: p.id, label: p.full_name }))}
              searchable
              clearable
              {...form.getInputProps('responsavel_tecnico_id')}
            />

            <Group grow>
              <DateInput
                label="Data de Início"
                placeholder="DD/MM/AAAA"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('data_inicio')}
              />
              <DateInput
                label="Data de Revisão Prevista"
                placeholder="DD/MM/AAAA"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('data_revisao_prevista')}
              />
            </Group>

            <Textarea
              label="Diagnóstico da situação"
              placeholder="Resumo do cenário identificado na empresa"
              autosize
              minRows={2}
              {...form.getInputProps('diagnostico_situacao')}
            />

            <Textarea
              label="Objetivos"
              placeholder="Metas do programa para o ano"
              autosize
              minRows={2}
              {...form.getInputProps('objetivos')}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={close}>Cancelar</Button>
              <Button type="submit" color="teal" loading={createMutation.isPending || updateMutation.isPending}>
                {editingPca ? 'Salvar' : 'Criar PCA'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Paper>
  );
}
