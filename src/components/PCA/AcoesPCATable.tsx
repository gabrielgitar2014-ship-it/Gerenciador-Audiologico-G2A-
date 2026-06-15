import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconChecks, IconPlus, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import {
  useAcoesPCA,
  useCreateAcaoPCA,
  useDeleteAcaoPCA,
  useUpdateAcaoPCA,
} from '../../hooks/usePCA';
import type { AcaoPCA, AcaoPCAStatus } from '../../types';

interface Props {
  pcaId: string;
  canEdit: boolean;
}

const STATUS_COLOR: Record<AcaoPCAStatus, string> = {
  pendente: 'gray',
  em_andamento: 'blue',
  concluida: 'teal',
  cancelada: 'red',
};

const STATUS_LABEL: Record<AcaoPCAStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const TIPO_OPTIONS = [
  { value: 'engenharia', label: 'Medida de Engenharia' },
  { value: 'administrativa', label: 'Medida Administrativa' },
  { value: 'epi', label: 'Fornecimento de EPI' },
  { value: 'treinamento', label: 'Treinamento' },
  { value: 'monitoramento', label: 'Monitoramento Audiológico' },
  { value: 'outro', label: 'Outro' },
];

interface FormValues {
  tipo: string;
  descricao: string;
  responsavel: string;
  prazo: Date | null;
  observacoes: string;
}

export function AcoesPCATable({ pcaId, canEdit }: Props) {
  const { data: acoes = [], isLoading } = useAcoesPCA(pcaId);
  const createMutation = useCreateAcaoPCA(pcaId);
  const updateMutation = useUpdateAcaoPCA(pcaId);
  const deleteMutation = useDeleteAcaoPCA(pcaId);
  const [modalOpen, setModalOpen] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      tipo: 'engenharia',
      descricao: '',
      responsavel: '',
      prazo: null,
      observacoes: '',
    },
    validate: {
      descricao: (v) => (v.trim().length < 3 ? 'Descreva a ação' : null),
    },
  });

  const handleSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        pca_id: pcaId,
        tipo: values.tipo,
        descricao: values.descricao,
        responsavel: values.responsavel || null,
        prazo: values.prazo ? dayjs(values.prazo).format('YYYY-MM-DD') : null,
        data_conclusao: null,
        evidencia_url: null,
        observacoes: values.observacoes || null,
        status: 'pendente',
      });
      toast.success('Ação criada');
      setModalOpen(false);
      form.reset();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleStatusChange = async (acao: AcaoPCA, status: AcaoPCAStatus) => {
    try {
      const patch: Partial<AcaoPCA> = { status };
      if (status === 'concluida' && !acao.data_conclusao) {
        patch.data_conclusao = dayjs().format('YYYY-MM-DD');
      }
      await updateMutation.mutateAsync({ id: acao.id, patch });
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleDelete = async (acao: AcaoPCA) => {
    if (!window.confirm('Excluir esta ação?')) return;
    try {
      await deleteMutation.mutateAsync(acao.id);
      toast.success('Ação excluída');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  return (
    <>
      <Group justify="space-between" mb="sm">
        <Group gap={6}>
          <IconChecks size={18} className="text-teal-500" />
          <Text fw={700}>Ações do PCA</Text>
          <Badge size="sm" variant="light" color="gray">{acoes.length}</Badge>
        </Group>
        {canEdit && (
          <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setModalOpen(true)}>
            Nova Ação
          </Button>
        )}
      </Group>

      {!isLoading && acoes.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="md">Sem ações cadastradas.</Text>
      )}

      {acoes.length > 0 && (
        <Table.ScrollContainer minWidth={680}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Descrição</Table.Th>
                <Table.Th>Responsável</Table.Th>
                <Table.Th>Prazo</Table.Th>
                <Table.Th>Status</Table.Th>
                {canEdit && <Table.Th />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {acoes.map((acao) => (
                <Table.Tr key={acao.id}>
                  <Table.Td>
                    <Badge variant="dot" color="indigo">
                      {TIPO_OPTIONS.find((t) => t.value === acao.tipo)?.label ?? acao.tipo}
                    </Badge>
                  </Table.Td>
                  <Table.Td maw={320}>
                    <Text size="sm" lineClamp={2}>{acao.descricao}</Text>
                  </Table.Td>
                  <Table.Td>{acao.responsavel ?? '—'}</Table.Td>
                  <Table.Td>{acao.prazo ? dayjs(acao.prazo).format('DD/MM/YYYY') : '—'}</Table.Td>
                  <Table.Td>
                    {canEdit ? (
                      <Select
                        size="xs"
                        data={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                        value={acao.status}
                        onChange={(v) => v && handleStatusChange(acao, v as AcaoPCAStatus)}
                        comboboxProps={{ withinPortal: true }}
                        styles={{
                          input: { fontWeight: 600 },
                        }}
                      />
                    ) : (
                      <Badge color={STATUS_COLOR[acao.status]} variant="light">
                        {STATUS_LABEL[acao.status]}
                      </Badge>
                    )}
                  </Table.Td>
                  {canEdit && (
                    <Table.Td>
                      <Tooltip label="Excluir">
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(acao)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova Ação do PCA"
        centered
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Select
              label="Tipo"
              data={TIPO_OPTIONS}
              {...form.getInputProps('tipo')}
            />
            <Textarea
              label="Descrição"
              placeholder="Ex: Instalar enclausuramento na linha de produção 2"
              autosize
              minRows={2}
              required
              {...form.getInputProps('descricao')}
            />
            <Group grow>
              <TextInput
                label="Responsável"
                placeholder="Nome do responsável"
                {...form.getInputProps('responsavel')}
              />
              <DateInput
                label="Prazo"
                placeholder="DD/MM/AAAA"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('prazo')}
              />
            </Group>
            <Textarea
              label="Observações"
              autosize
              minRows={2}
              {...form.getInputProps('observacoes')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={createMutation.isPending}>Criar Ação</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
