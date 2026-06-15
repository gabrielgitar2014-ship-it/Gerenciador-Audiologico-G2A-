import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Checkbox,
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
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconPlus, IconShieldCheck, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import {
  useCreateEPIEntrega,
  useDeleteEPIEntrega,
  useEPIsEntrega,
} from '../../../hooks/useEPI';
import { usePermissions } from '../../../hooks/usePermissions';

interface FormValues {
  employee_id: string | null;
  data_entrega: Date | null;
  tipo_epi: string;
  marca: string;
  modelo: string;
  ca_numero: string;
  nrr: number | null;
  quantidade: number;
  responsavel_entrega: string;
  employee_assinou: boolean;
}

const DEFAULTS: FormValues = {
  employee_id: null,
  data_entrega: new Date(),
  tipo_epi: 'Protetor Auricular',
  marca: '',
  modelo: '',
  ca_numero: '',
  nrr: null,
  quantidade: 1,
  responsavel_entrega: '',
  employee_assinou: false,
};

export function EPIHub() {
  const { companyId } = useParams<{ companyId: string }>();
  const { canManageEPI } = usePermissions();
  const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: entregas = [], isLoading } = useEPIsEntrega({ companyId, employeeId: filterEmployee });
  const createMutation = useCreateEPIEntrega(companyId);
  const deleteMutation = useDeleteEPIEntrega(companyId);

  const { data: employees = [] } = useQuery<{ id: string; full_name: string }[]>({
    queryKey: ['employees-select', companyId],
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
    enabled: !!companyId,
  });

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: e.full_name })),
    [employees],
  );

  const form = useForm<FormValues>({
    initialValues: DEFAULTS,
    validate: {
      employee_id: (v) => (v ? null : 'Selecione o funcionário'),
      data_entrega: (v) => (v ? null : 'Informe a data'),
      tipo_epi: (v) => (v.trim().length < 2 ? 'Informe o tipo de EPI' : null),
      quantidade: (v) => (v < 1 ? 'Quantidade mínima 1' : null),
    },
  });

  const handleSubmit = async (values: FormValues) => {
    if (!companyId) return;
    try {
      await createMutation.mutateAsync({
        company_id: companyId,
        employee_id: values.employee_id!,
        data_entrega: dayjs(values.data_entrega!).format('YYYY-MM-DD'),
        tipo_epi: values.tipo_epi,
        marca: values.marca || null,
        modelo: values.modelo || null,
        ca_numero: values.ca_numero || null,
        nrr: values.nrr,
        responsavel_entrega: values.responsavel_entrega || null,
        assinatura_url: null,
        quantidade: values.quantidade,
        employee_assinou: values.employee_assinou,
      });
      toast.success('Entrega de EPI registrada');
      setModalOpen(false);
      form.reset();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, employeeId: string) => {
    if (!window.confirm('Excluir esta entrega de EPI?')) return;
    try {
      await deleteMutation.mutateAsync({ id, employeeId });
      toast.success('Entrega excluída');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  return (
    <Paper shadow="sm" p="lg" withBorder pos="relative">
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />

      <Group justify="space-between" mb="lg" wrap="wrap">
        <Group gap={8}>
          <IconShieldCheck size={22} className="text-blue-600" />
          <Title order={3} c="slate.700">Controle de EPIs</Title>
        </Group>
        <Group>
          <Select
            placeholder="Filtrar por funcionário"
            data={employeeOptions}
            value={filterEmployee}
            onChange={setFilterEmployee}
            searchable
            clearable
            w={260}
          />
          {canManageEPI && (
            <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)} color="blue">
              Nova Entrega
            </Button>
          )}
        </Group>
      </Group>

      {!isLoading && entregas.length === 0 && (
        <Stack align="center" py="xl" gap={4}>
          <IconShieldCheck size={36} className="text-slate-300" />
          <Text c="dimmed">Nenhuma entrega registrada{filterEmployee ? ' para este funcionário' : ''}.</Text>
        </Stack>
      )}

      {entregas.length > 0 && (
        <Table.ScrollContainer minWidth={820}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Funcionário</Table.Th>
                <Table.Th>Tipo EPI</Table.Th>
                <Table.Th>Marca / Modelo</Table.Th>
                <Table.Th>CA</Table.Th>
                <Table.Th>NRR</Table.Th>
                <Table.Th>Qtd</Table.Th>
                <Table.Th>Data</Table.Th>
                <Table.Th>Assinou</Table.Th>
                {canManageEPI && <Table.Th />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entregas.map((e) => (
                <Table.Tr key={e.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Avatar size="sm" radius="xl" color="blue">
                        {e.employee?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </Avatar>
                      <Text size="sm">{e.employee?.full_name ?? '—'}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>{e.tipo_epi}</Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {[e.marca, e.modelo].filter(Boolean).join(' / ') || '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>{e.ca_numero ?? '—'}</Table.Td>
                  <Table.Td>{e.nrr ?? '—'}</Table.Td>
                  <Table.Td>{e.quantidade}</Table.Td>
                  <Table.Td>{dayjs(e.data_entrega).format('DD/MM/YYYY')}</Table.Td>
                  <Table.Td>
                    {e.employee_assinou ? (
                      <Badge color="teal" variant="light">Assinou</Badge>
                    ) : (
                      <Badge color="gray" variant="light">Pendente</Badge>
                    )}
                  </Table.Td>
                  {canManageEPI && (
                    <Table.Td>
                      <Tooltip label="Excluir">
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(e.id, e.employee_id)}>
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
        title="Nova Entrega de EPI"
        centered
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Group grow>
              <Select
                label="Funcionário"
                placeholder="Selecione"
                data={employeeOptions}
                searchable
                required
                {...form.getInputProps('employee_id')}
              />
              <DateInput
                label="Data da Entrega"
                placeholder="DD/MM/AAAA"
                valueFormat="DD/MM/YYYY"
                required
                {...form.getInputProps('data_entrega')}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Tipo de EPI"
                placeholder="Ex: Protetor Auricular"
                required
                {...form.getInputProps('tipo_epi')}
              />
              <NumberInput
                label="Quantidade"
                min={1}
                {...form.getInputProps('quantidade')}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Marca"
                placeholder="Ex: 3M"
                {...form.getInputProps('marca')}
              />
              <TextInput
                label="Modelo"
                placeholder="Ex: 1100"
                {...form.getInputProps('modelo')}
              />
            </Group>

            <Group grow>
              <TextInput
                label="CA (Certificado de Aprovação)"
                placeholder="Ex: 12345"
                {...form.getInputProps('ca_numero')}
              />
              <NumberInput
                label="NRR"
                description="Noise Reduction Rating"
                min={0}
                {...form.getInputProps('nrr')}
              />
            </Group>

            <TextInput
              label="Responsável pela Entrega"
              placeholder="Nome de quem entregou"
              {...form.getInputProps('responsavel_entrega')}
            />

            <Checkbox
              label="Funcionário assinou o termo de entrega"
              {...form.getInputProps('employee_assinou', { type: 'checkbox' })}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={createMutation.isPending}>Registrar Entrega</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Paper>
  );
}
