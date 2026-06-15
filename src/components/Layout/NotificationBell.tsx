import {
  ActionIcon,
  Badge,
  Divider,
  Group,
  Indicator,
  Menu,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBell,
  IconBellRinging,
  IconChecks,
  IconClock,
  IconEar,
  IconShieldCheck,
  IconStethoscope,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';
import { useNavigate } from 'react-router-dom';
import {
  useMarcarNotificacaoLida,
  useMarcarTodasNotificacoesLidas,
  useNotificacoes,
  useNotificacoesUnreadCount,
} from '../../hooks/useNotificacoes';
import type { Notificacao, NotificacaoTipo } from '../../types';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

interface NotificationBellProps {
  companyId: string | null | undefined;
}

const TIPO_ICON: Record<NotificacaoTipo, React.ReactNode> = {
  reteste: <IconClock size={16} className="text-orange-500" />,
  epi_vencimento: <IconShieldCheck size={16} className="text-blue-500" />,
  exame_vencido: <IconAlertTriangle size={16} className="text-red-500" />,
  resultado_alterado: <IconEar size={16} className="text-yellow-600" />,
  acao_pca_prazo: <IconStethoscope size={16} className="text-teal-500" />,
  sistema: <IconBellRinging size={16} className="text-slate-500" />,
};

function tipoIcon(tipo: string) {
  return TIPO_ICON[tipo as NotificacaoTipo] ?? <IconBellRinging size={16} className="text-slate-500" />;
}

export function NotificationBell({ companyId }: NotificationBellProps) {
  const navigate = useNavigate();
  const { data: notifs = [], isLoading } = useNotificacoes({ companyId, limit: 5 });
  const { data: unreadCount = 0 } = useNotificacoesUnreadCount(companyId);
  const marcarLida = useMarcarNotificacaoLida(companyId);
  const marcarTodas = useMarcarTodasNotificacoesLidas(companyId);

  const handleClickNotif = (notif: Notificacao) => {
    if (!notif.lida) marcarLida.mutate(notif.id);
  };

  const goToAll = () => {
    if (companyId) navigate(`/app/${companyId}/notificacoes`);
  };

  return (
    <Menu position="bottom-end" width={360} shadow="lg" radius="md" closeOnItemClick={false}>
      <Menu.Target>
        <Tooltip label="Notificações">
          <Indicator
            label={unreadCount > 9 ? '9+' : unreadCount}
            size={16}
            color="red"
            disabled={unreadCount === 0}
            offset={6}
          >
            <ActionIcon
              variant="light"
              color="blue"
              radius="xl"
              size="lg"
              className="bg-white/60 hover:bg-white/80 shadow-sm"
            >
              <IconBell size={20} stroke={1.5} />
            </ActionIcon>
          </Indicator>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Group justify="space-between" px="xs" py={6}>
          <Group gap={6}>
            <Text fw={700} size="sm">Notificações</Text>
            {unreadCount > 0 && (
              <Badge size="xs" color="red" variant="filled" radius="sm">
                {unreadCount} nova{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </Group>
          {unreadCount > 0 && (
            <UnstyledButton
              onClick={() => marcarTodas.mutate()}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <IconChecks size={12} />
              Marcar todas
            </UnstyledButton>
          )}
        </Group>
        <Divider />

        <ScrollArea.Autosize mah={420}>
          {isLoading && (
            <Text size="sm" c="dimmed" ta="center" p="md">Carregando…</Text>
          )}
          {!isLoading && notifs.length === 0 && (
            <Stack align="center" p="lg" gap={4}>
              <IconBell size={28} className="text-slate-300" />
              <Text size="sm" c="dimmed">Sem notificações por enquanto</Text>
            </Stack>
          )}
          {!isLoading && notifs.map((notif) => (
            <UnstyledButton
              key={notif.id}
              onClick={() => handleClickNotif(notif)}
              className={`w-full px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 ${
                notif.lida ? 'opacity-70' : 'bg-blue-50/40'
              }`}
            >
              <Group align="flex-start" gap={10} wrap="nowrap">
                <div className="mt-0.5">{tipoIcon(notif.tipo)}</div>
                <div className="flex-1 min-w-0">
                  <Group justify="space-between" gap={4} wrap="nowrap">
                    <Text size="sm" fw={notif.lida ? 500 : 700} lineClamp={1}>
                      {notif.titulo}
                    </Text>
                    {!notif.lida && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
                  </Group>
                  <Text size="xs" c="dimmed" lineClamp={2} mt={2}>
                    {notif.mensagem}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    {dayjs(notif.criado_em).fromNow()}
                  </Text>
                </div>
              </Group>
            </UnstyledButton>
          ))}
        </ScrollArea.Autosize>

        <Divider />
        <UnstyledButton
          onClick={goToAll}
          className="w-full px-3 py-2 text-center text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium"
        >
          Ver todas
        </UnstyledButton>
      </Menu.Dropdown>
    </Menu>
  );
}
