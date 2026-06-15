import { Badge, Group, Paper, Stack, Text, Timeline, Title } from '@mantine/core';
import { IconShieldCheck, IconShieldOff } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEPIsByEmployee } from '../../hooks/useEPI';

interface Props {
  employeeId: string;
}

export function EPIHistoricoTab({ employeeId }: Props) {
  const { data: entregas = [], isLoading } = useEPIsByEmployee(employeeId);

  return (
    <Paper p="lg" withBorder shadow="sm">
      <Group justify="space-between" mb="md">
        <Group gap={6}>
          <IconShieldCheck size={18} className="text-blue-600" />
          <Title order={5} c="slate.700">Histórico de EPIs</Title>
        </Group>
        <Badge variant="light" color="blue">{entregas.length} entrega{entregas.length !== 1 ? 's' : ''}</Badge>
      </Group>

      {isLoading && <Text size="sm" c="dimmed">Carregando…</Text>}

      {!isLoading && entregas.length === 0 && (
        <Stack align="center" py="xl" gap={4}>
          <IconShieldOff size={32} className="text-slate-300" />
          <Text size="sm" c="dimmed">Sem entregas registradas para este funcionário.</Text>
        </Stack>
      )}

      {entregas.length > 0 && (
        <Timeline active={entregas.length} bulletSize={20} lineWidth={2}>
          {entregas.map((e) => (
            <Timeline.Item
              key={e.id}
              bullet={<IconShieldCheck size={12} />}
              color={e.employee_assinou ? 'teal' : 'orange'}
              title={
                <Group gap={6}>
                  <Text fw={700} size="sm">{e.tipo_epi}</Text>
                  <Text size="xs" c="dimmed">· {dayjs(e.data_entrega).format('DD/MM/YYYY')}</Text>
                  {!e.employee_assinou && (
                    <Badge size="xs" color="orange" variant="light">Sem assinatura</Badge>
                  )}
                </Group>
              }
            >
              <Stack gap={2} mt={2}>
                {(e.marca || e.modelo) && (
                  <Text size="xs" c="dimmed">
                    {[e.marca, e.modelo].filter(Boolean).join(' · ')}
                  </Text>
                )}
                <Group gap={12}>
                  {e.ca_numero && <Text size="xs" c="dimmed">CA {e.ca_numero}</Text>}
                  {e.nrr !== null && e.nrr !== undefined && <Text size="xs" c="dimmed">NRR {e.nrr}</Text>}
                  <Text size="xs" c="dimmed">Qtd {e.quantidade}</Text>
                  {e.responsavel_entrega && (
                    <Text size="xs" c="dimmed">por {e.responsavel_entrega}</Text>
                  )}
                </Group>
              </Stack>
            </Timeline.Item>
          ))}
        </Timeline>
      )}
    </Paper>
  );
}
