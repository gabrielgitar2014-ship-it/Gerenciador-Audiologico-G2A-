import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  ScrollArea,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import {
  IconChecks,
  IconPlus,
  IconSchool,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import {
  useCreateTreinamento,
  useDeleteTreinamento,
  useParticipantes,
  useSaveParticipantes,
  useTreinamentosByPCA,
} from '../../hooks/useTreinamentos';
import type { TreinamentoPCA } from '../../types';

interface Props {
  pcaId: string;
  companyId: string;
  canEdit: boolean;
}

interface FormValues {
  titulo: string;
  data: Date | null;
  carga_horaria: number | null;
  instrutor: string;
  local: string;
  conteudo: string;
}

const DEFAULTS: FormValues = {
  titulo: '',
  data: new Date(),
  carga_horaria: null,
  instrutor: '',
  local: '',
  conteudo: '',
};

export function TreinamentosTable({ pcaId, companyId, canEdit }: Props) {
  const { data: treinamentos = [], isLoading } = useTreinamentosByPCA(pcaId);
  const createMutation = useCreateTreinamento(pcaId);
  const deleteMutation = useDeleteTreinamento(pcaId);

  const [modalOpen, setModalOpen] = useState(false);
  const [presencaModal, setPresencaModal] = useState<TreinamentoPCA | null>(null);

  const form = useForm<FormValues>({
    initialValues: DEFAULTS,
    validate: {
      titulo: (v) => (v.trim().length < 3 ? 'Informe o título' : null),
      data: (v) => (v ? null : 'Data obrigatória'),
    },
  });

  const handleSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        pca_id: pcaId,
        company_id: companyId,
        titulo: values.titulo,
        data: dayjs(values.data!).format('YYYY-MM-DD'),
        carga_horaria: values.carga_horaria,
        instrutor: values.instrutor || null,
        local: values.local || null,
        conteudo: values.conteudo || null,
        lista_presenca_url: null,
      });
      toast.success('Treinamento registrado');
      setModalOpen(false);
      form.reset();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleDelete = async (t: TreinamentoPCA) => {
    if (!window.confirm(`Excluir o treinamento "${t.titulo}"?`)) return;
    try {
      await deleteMutation.mutateAsync(t.id);
      toast.success('Treinamento excluído');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  return (
    <>
      <Group justify="space-between" mb="sm">
        <Group gap={6}>
          <IconSchool size={18} className="text-indigo-500" />
          <Text fw={700}>Treinamentos</Text>
          <Badge size="sm" variant="light" color="gray">{treinamentos.length}</Badge>
        </Group>
        {canEdit && (
          <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setModalOpen(true)}>
            Novo Treinamento
          </Button>
        )}
      </Group>

      {!isLoading && treinamentos.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="md">Sem treinamentos registrados.</Text>
      )}

      {treinamentos.length > 0 && (
        <Table.ScrollContainer minWidth={680}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Título</Table.Th>
                <Table.Th>Data</Table.Th>
                <Table.Th>Carga (h)</Table.Th>
                <Table.Th>Instrutor</Table.Th>
                <Table.Th>Local</Table.Th>
                <Table.Th>Presentes</Table.Th>
                <Table.Th ta="right">Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {treinamentos.map((t) => (
                <Table.Tr key={t.id}>
                  <Table.Td maw={260}>
                    <Text size="sm" fw={600} lineClamp={1}>{t.titulo}</Text>
                  </Table.Td>
                  <Table.Td>{dayjs(t.data).format('DD/MM/YYYY')}</Table.Td>
                  <Table.Td>{t.carga_horaria ?? '—'}</Table.Td>
                  <Table.Td>{t.instrutor ?? '—'}</Table.Td>
                  <Table.Td>{t.local ?? '—'}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="indigo" leftSection={<IconUsers size={12} />}>
                      {t.participantes_count}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end">
                      <Tooltip label="Gerenciar presença">
                        <ActionIcon variant="subtle" color="indigo" onClick={() => setPresencaModal(t)}>
                          <IconChecks size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip label="Excluir">
                          <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(t)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {/* Modal criação */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Treinamento"
        centered
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Título"
              placeholder="Ex: Treinamento NR-15 / EPI auditivo"
              required
              {...form.getInputProps('titulo')}
            />
            <Group grow>
              <DateInput
                label="Data"
                placeholder="DD/MM/AAAA"
                valueFormat="DD/MM/YYYY"
                required
                {...form.getInputProps('data')}
              />
              <NumberInput
                label="Carga horária (h)"
                min={0}
                {...form.getInputProps('carga_horaria')}
              />
            </Group>
            <Group grow>
              <TextInput
                label="Instrutor"
                {...form.getInputProps('instrutor')}
              />
              <TextInput
                label="Local"
                placeholder="Ex: Sala de treinamento"
                {...form.getInputProps('local')}
              />
            </Group>
            <Textarea
              label="Conteúdo"
              placeholder="Resumo do conteúdo abordado"
              autosize
              minRows={2}
              {...form.getInputProps('conteudo')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={createMutation.isPending}>Criar</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal presença */}
      {presencaModal && (
        <PresencaModal
          treinamento={presencaModal}
          companyId={companyId}
          pcaId={pcaId}
          canEdit={canEdit}
          onClose={() => setPresencaModal(null)}
        />
      )}
    </>
  );
}

// ============================================================================
// MODAL DE PRESENÇA
// ============================================================================

interface PresencaProps {
  treinamento: TreinamentoPCA;
  companyId: string;
  pcaId: string;
  canEdit: boolean;
  onClose: () => void;
}

function PresencaModal({ treinamento, companyId, pcaId, canEdit, onClose }: PresencaProps) {
  const { data: participantes = [], isLoading: loadingParts } = useParticipantes(treinamento.id);
  const saveMutation = useSaveParticipantes(pcaId);

  const { data: employees = [], isLoading: loadingEmps } = useQuery<{ id: string; full_name: string }[]>({
    queryKey: ['employees-for-presenca', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // presencas: map employee_id → compareceu
  const [presencas, setPresencas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const p of participantes) {
      initial[p.employee_id] = p.compareceu;
    }
    setPresencas(initial);
  }, [participantes]);

  const toggle = (employeeId: string) => {
    setPresencas((prev) => {
      const has = employeeId in prev;
      if (has) {
        const next = { ...prev };
        delete next[employeeId];
        return next;
      }
      return { ...prev, [employeeId]: true };
    });
  };

  const setCompareceu = (employeeId: string, compareceu: boolean) => {
    setPresencas((prev) => ({ ...prev, [employeeId]: compareceu }));
  };

  const selectedCount = Object.keys(presencas).length;
  const presentCount = useMemo(
    () => Object.values(presencas).filter(Boolean).length,
    [presencas],
  );

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        treinamentoId: treinamento.id,
        presencas,
        existentes: participantes.map((p) => ({
          id: p.id,
          employee_id: p.employee_id,
          compareceu: p.compareceu,
        })),
      });
      toast.success('Presença salva');
      onClose();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={
        <Stack gap={2}>
          <Text fw={700}>Presença · {treinamento.titulo}</Text>
          <Text size="xs" c="dimmed">{dayjs(treinamento.data).format('DD/MM/YYYY')}</Text>
        </Stack>
      }
      centered
      size="lg"
    >
      <LoadingOverlay visible={loadingEmps || loadingParts} overlayProps={{ blur: 2 }} />

      <Group justify="space-between" mb="sm">
        <Group gap={6}>
          <Badge color="indigo" variant="light">
            {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
          </Badge>
          <Badge color="teal" variant="light">
            {presentCount} presente{presentCount !== 1 ? 's' : ''}
          </Badge>
        </Group>
        {canEdit && (
          <Button size="xs" variant="subtle" onClick={() => {
            const all: Record<string, boolean> = {};
            for (const e of employees) all[e.id] = true;
            setPresencas(all);
          }}>
            Marcar todos como presentes
          </Button>
        )}
      </Group>

      <ScrollArea.Autosize mah={420}>
        <Stack gap={2}>
          {employees.map((e) => {
            const selected = e.id in presencas;
            const compareceu = presencas[e.id];
            return (
              <Group
                key={e.id}
                justify="space-between"
                wrap="nowrap"
                px="xs"
                py={6}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <Group gap="sm" wrap="nowrap">
                  <Checkbox
                    checked={selected}
                    onChange={() => canEdit && toggle(e.id)}
                    disabled={!canEdit}
                  />
                  <Text size="sm">{e.full_name}</Text>
                </Group>
                {selected && (
                  <Group gap={4}>
                    <Button
                      size="compact-xs"
                      variant={compareceu ? 'filled' : 'subtle'}
                      color="teal"
                      disabled={!canEdit}
                      onClick={() => setCompareceu(e.id, true)}
                    >
                      Presente
                    </Button>
                    <Button
                      size="compact-xs"
                      variant={!compareceu ? 'filled' : 'subtle'}
                      color="red"
                      disabled={!canEdit}
                      onClick={() => setCompareceu(e.id, false)}
                    >
                      Ausente
                    </Button>
                  </Group>
                )}
              </Group>
            );
          })}
        </Stack>
      </ScrollArea.Autosize>

      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>Fechar</Button>
        {canEdit && (
          <Button onClick={handleSave} loading={saveMutation.isPending}>
            Salvar Presença
          </Button>
        )}
      </Group>
    </Modal>
  );
}
