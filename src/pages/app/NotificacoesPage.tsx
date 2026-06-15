import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Group,
  LoadingOverlay,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBell,
  IconBellRinging,
  IconChecks,
  IconClock,
  IconEar,
  IconSearch,
  IconShieldCheck,
  IconStethoscope,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';
import {
  useMarcarNotificacaoLida,
  useMarcarTodasNotificacoesLidas,
  useNotificacoes,
} from '../../hooks/useNotificacoes';
import type { Notificacao, NotificacaoTipo } from '../../types';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const TIPO_ICON: Record<NotificacaoTipo, React.ReactNode> = {
  reteste: <IconClock size={16} className="text-orange-500" />,
  epi_vencimento: <IconShieldCheck size={16} className="text-blue-500" />,
  exame_vencido: <IconAlertTriangle size={16} className="text-red-500" />,
  resultado_alterado: <IconEar size={16} className="text-yellow-600" />,
  acao_pca_prazo: <IconStethoscope size={16} className="text-teal-500" />,
  sistema: <IconBellRinging size={16} className="text-slate-500" />,
};

const TIPO_LABEL: Record<NotificacaoTipo, string> = {
  reteste: 'Reteste',
  epi_vencimento: 'EPI vencendo',
  exame_vencido: 'Exame vencido',
  resultado_alterado: 'Resultado alterado',
  acao_pca_prazo: 'Ação PCA',
  sistema: 'Sistema',
};

type FilterStatus = 'todas' | 'nao_lidas' | 'lidas';

export function NotificacoesPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const { data: notifs = [], isLoading } = useNotificacoes({ companyId, limit: 200 });
  const marcarLida = useMarcarNotificacaoLida(companyId);
  const marcarTodas = useMarcarTodasNotificacoesLidas(companyId);

  const [status, setStatus] = useState<FilterStatus>('todas');
  const [tipo, setTipo] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return notifs.filter((n) => {
      if (status === 'nao_lidas' && n.lida) return false;
      if (status === 'lidas' && !n.lida) return false;
      if (tipo && n.tipo !== tipo) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!n.titulo.toLowerCase().includes(q) && !n.mensagem.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [notifs, status, tipo, query]);

  const unreadCount = useMemo(() => notifs.filter((n) => !n.lida).length, [notifs]);

  return (
    <Paper shadow="sm" p="lg" withBorder pos="relative">
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />

      <Group justify="space-between" mb="lg" wrap="wrap">
        <Group gap={8}>
          <IconBell size={22} className="text-blue-600" />
          <Title order={3} c="slate.700">Notificações</Title>
          {unreadCount > 0 && (
            <Badge size="lg" color="red" variant="filled">{unreadCount} não lidas</Badge>
          )}
        </Group>
        {unreadCount > 0 && (
          <Button
            leftSection={<IconChecks size={16} />}
            variant="light"
            color="blue"
            onClick={() => marcarTodas.mutate()}
            loading={marcarTodas.isPending}
          >
            Marcar todas como lidas
          </Button>
        )}
      </Group>

      <Group justify="space-between" mb="md" wrap="wrap">
        <SegmentedControl
          value={status}
          onChange={(v) => setStatus(v as FilterStatus)}
          data={[
            { value: 'todas', label: 'Todas' },
            { value: 'nao_lidas', label: 'Não lidas' },
            { value: 'lidas', label: 'Lidas' },
          ]}
        />
        <Group>
          <Select
            placeholder="Filtrar por tipo"
            data={(Object.entries(TIPO_LABEL) as [NotificacaoTipo, string][]).map(([value, label]) => ({
              value,
              label,
            }))}
            value={tipo}
            onChange={setTipo}
            clearable
            w={200}
          />
          <TextInput
            placeholder="Buscar por título ou mensagem"
            leftSection={<IconSearch size={14} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            w={280}
          />
        </Group>
      </Group>

      {!isLoading && filtered.length === 0 && (
        <Stack align="center" py="xl" gap={4}>
          <IconBell size={36} className="text-slate-300" />
          <Text c="dimmed">Nenhuma notificação encontrada.</Text>
        </Stack>
      )}

      {filtered.length > 0 && (
        <Table.ScrollContainer minWidth={620}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={36} />
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Título / Mensagem</Table.Th>
                <Table.Th w={130}>Quando</Table.Th>
                <Table.Th w={120} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((n) => (
                <NotifRow key={n.id} notif={n} onMarcarLida={() => marcarLida.mutate(n.id)} />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Paper>
  );
}

function NotifRow({ notif, onMarcarLida }: { notif: Notificacao; onMarcarLida: () => void }) {
  return (
    <Table.Tr style={{ backgroundColor: notif.lida ? undefined : 'rgba(59, 130, 246, 0.04)' }}>
      <Table.Td>
        {TIPO_ICON[notif.tipo as NotificacaoTipo] ?? <IconBellRinging size={16} className="text-slate-400" />}
      </Table.Td>
      <Table.Td>
        <Badge size="xs" variant="dot" color="gray">
          {TIPO_LABEL[notif.tipo as NotificacaoTipo] ?? notif.tipo}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Stack gap={2}>
          <Group gap={6}>
            <Text fw={notif.lida ? 500 : 700} size="sm" lineClamp={1}>{notif.titulo}</Text>
            {!notif.lida && <div className="w-2 h-2 rounded-full bg-blue-500" />}
          </Group>
          <Text size="xs" c="dimmed" lineClamp={2}>{notif.mensagem}</Text>
        </Stack>
      </Table.Td>
      <Table.Td>
        <Stack gap={0}>
          <Text size="xs">{dayjs(notif.criado_em).fromNow()}</Text>
          <Text size="xs" c="dimmed">{dayjs(notif.criado_em).format('DD/MM HH:mm')}</Text>
        </Stack>
      </Table.Td>
      <Table.Td>
        {!notif.lida && (
          <UnstyledButton
            onClick={onMarcarLida}
            className="text-xs text-blue-600 hover:underline"
          >
            Marcar como lida
          </UnstyledButton>
        )}
      </Table.Td>
    </Table.Tr>
  );
}
