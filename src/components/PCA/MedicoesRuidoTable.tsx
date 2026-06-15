import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
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
import { IconPlus, IconTrash, IconVolume } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  useCreateMedicaoRuido,
  useDeleteMedicaoRuido,
  useMedicoesRuido,
} from '../../hooks/usePCA';
import type { GHE, MedicaoRuido } from '../../types';

interface Props {
  pcaId: string;
  companyId: string;
  canEdit: boolean;
}

function ruidoBadgeColor(db: number) {
  if (db >= 85) return 'red';
  if (db >= 80) return 'orange';
  return 'teal';
}

interface FormValues {
  ghe_id: string | null;
  data_medicao: Date | null;
  nivel_ruido_db: number | null;
  twa: number | null;
  dose_percentual: number | null;
  metodologia: string;
  equipamento: string;
  numero_serie_equip: string;
  calibracao_equip: Date | null;
  tecnico_responsavel: string;
  observacoes: string;
}

export function MedicoesRuidoTable({ pcaId, companyId, canEdit }: Props) {
  const { data: medicoes = [], isLoading } = useMedicoesRuido(pcaId);
  const createMutation = useCreateMedicaoRuido(pcaId);
  const deleteMutation = useDeleteMedicaoRuido(pcaId);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: ghes = [] } = useQuery<Pick<GHE, 'id' | 'name'>[]>({
    queryKey: ['ghes-select', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ghe')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const form = useForm<FormValues>({
    initialValues: {
      ghe_id: null,
      data_medicao: new Date(),
      nivel_ruido_db: null,
      twa: null,
      dose_percentual: null,
      metodologia: '',
      equipamento: '',
      numero_serie_equip: '',
      calibracao_equip: null,
      tecnico_responsavel: '',
      observacoes: '',
    },
    validate: {
      nivel_ruido_db: (v) => (v === null || v < 0 ? 'Informe o nível em dB' : null),
      data_medicao: (v) => (v ? null : 'Data obrigatória'),
    },
  });

  const handleSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        pca_id: pcaId,
        ghe_id: values.ghe_id,
        data_medicao: dayjs(values.data_medicao!).format('YYYY-MM-DD'),
        nivel_ruido_db: values.nivel_ruido_db!,
        twa: values.twa,
        dose_percentual: values.dose_percentual,
        metodologia: values.metodologia || null,
        equipamento: values.equipamento || null,
        numero_serie_equip: values.numero_serie_equip || null,
        calibracao_equip: values.calibracao_equip
          ? dayjs(values.calibracao_equip).format('YYYY-MM-DD')
          : null,
        tecnico_responsavel: values.tecnico_responsavel || null,
        laudo_url: null,
        observacoes: values.observacoes || null,
      });
      toast.success('Medição registrada');
      setModalOpen(false);
      form.reset();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleDelete = async (m: MedicaoRuido) => {
    if (!window.confirm(`Excluir medição de ${dayjs(m.data_medicao).format('DD/MM/YYYY')}?`)) return;
    try {
      await deleteMutation.mutateAsync(m.id);
      toast.success('Medição excluída');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  return (
    <>
      <Group justify="space-between" mb="sm">
        <Group gap={6}>
          <IconVolume size={18} className="text-orange-500" />
          <Text fw={700}>Medições de Ruído</Text>
          <Badge size="sm" variant="light" color="gray">{medicoes.length}</Badge>
        </Group>
        {canEdit && (
          <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setModalOpen(true)}>
            Nova Medição
          </Button>
        )}
      </Group>

      {!isLoading && medicoes.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="md">Sem medições registradas.</Text>
      )}

      {medicoes.length > 0 && (
        <Table.ScrollContainer minWidth={620}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Data</Table.Th>
                <Table.Th>GHE</Table.Th>
                <Table.Th>Nível (dB)</Table.Th>
                <Table.Th>TWA</Table.Th>
                <Table.Th>Dose %</Table.Th>
                <Table.Th>Equipamento</Table.Th>
                <Table.Th>Técnico</Table.Th>
                {canEdit && <Table.Th />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {medicoes.map((m) => {
                const ghe = ghes.find((g) => g.id === m.ghe_id);
                return (
                  <Table.Tr key={m.id}>
                    <Table.Td>{dayjs(m.data_medicao).format('DD/MM/YYYY')}</Table.Td>
                    <Table.Td>{ghe?.name ?? <Text size="xs" c="dimmed">—</Text>}</Table.Td>
                    <Table.Td>
                      <Badge color={ruidoBadgeColor(m.nivel_ruido_db)} variant="filled">
                        {m.nivel_ruido_db} dB
                      </Badge>
                    </Table.Td>
                    <Table.Td>{m.twa ?? '—'}</Table.Td>
                    <Table.Td>{m.dose_percentual ?? '—'}</Table.Td>
                    <Table.Td>{m.equipamento ?? '—'}</Table.Td>
                    <Table.Td>{m.tecnico_responsavel ?? '—'}</Table.Td>
                    {canEdit && (
                      <Table.Td>
                        <Tooltip label="Excluir">
                          <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(m)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    )}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova Medição de Ruído"
        centered
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Group grow>
              <Select
                label="GHE"
                placeholder="Selecione o GHE"
                data={ghes.map((g) => ({ value: g.id, label: g.name }))}
                searchable
                clearable
                {...form.getInputProps('ghe_id')}
              />
              <DateInput
                label="Data da Medição"
                placeholder="DD/MM/AAAA"
                valueFormat="DD/MM/YYYY"
                required
                {...form.getInputProps('data_medicao')}
              />
            </Group>

            <Group grow>
              <NumberInput
                label="Nível de Ruído (dB)"
                min={0}
                max={150}
                required
                {...form.getInputProps('nivel_ruido_db')}
              />
              <NumberInput
                label="TWA"
                description="Time Weighted Average"
                min={0}
                max={150}
                {...form.getInputProps('twa')}
              />
              <NumberInput
                label="Dose %"
                min={0}
                {...form.getInputProps('dose_percentual')}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Equipamento"
                placeholder="Ex: Dosímetro Quest"
                {...form.getInputProps('equipamento')}
              />
              <TextInput
                label="Número de Série"
                {...form.getInputProps('numero_serie_equip')}
              />
              <DateInput
                label="Calibração"
                placeholder="DD/MM/AAAA"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('calibracao_equip')}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Metodologia"
                placeholder="Ex: NHO-01 FUNDACENTRO"
                {...form.getInputProps('metodologia')}
              />
              <TextInput
                label="Técnico Responsável"
                {...form.getInputProps('tecnico_responsavel')}
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
              <Button type="submit" loading={createMutation.isPending}>Salvar Medição</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
