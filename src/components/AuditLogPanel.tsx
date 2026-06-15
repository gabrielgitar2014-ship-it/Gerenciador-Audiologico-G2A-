import { useState } from 'react';
import {
  Badge,
  Code,
  Collapse,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Timeline,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconHistory,
  IconPlus,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useAuditLog } from '../hooks/useAuditLog';
import type { AuditLog } from '../types';

interface Props {
  entidade: string;
  entidadeId: string;
  title?: string;
}

const ACAO_COLOR: Record<string, string> = {
  INSERT: 'teal',
  UPDATE: 'blue',
  DELETE: 'red',
};

const ACAO_LABEL: Record<string, string> = {
  INSERT: 'Criado',
  UPDATE: 'Atualizado',
  DELETE: 'Excluído',
};

function acaoIcon(acao: string) {
  switch (acao) {
    case 'INSERT':
      return <IconPlus size={12} />;
    case 'UPDATE':
      return <IconEdit size={12} />;
    case 'DELETE':
      return <IconTrash size={12} />;
    default:
      return <IconHistory size={12} />;
  }
}

export function AuditLogPanel({ entidade, entidadeId, title = 'Histórico de Alterações' }: Props) {
  const { data: logs = [], isLoading } = useAuditLog({ entidade, entidadeId });

  return (
    <Paper p="md" radius="lg" withBorder shadow="sm">
      <Group justify="space-between" mb="sm">
        <Group gap={6}>
          <IconHistory size={18} className="text-slate-500" />
          <Title order={5} c="slate.700">{title}</Title>
        </Group>
        <Badge variant="light" color="gray">{logs.length}</Badge>
      </Group>

      {isLoading && <Text size="sm" c="dimmed">Carregando…</Text>}

      {!isLoading && logs.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="sm">Sem alterações registradas.</Text>
      )}

      {logs.length > 0 && (
        <ScrollArea.Autosize mah={420}>
          <Timeline active={logs.length} bulletSize={20} lineWidth={2}>
            {logs.map((log) => (
              <LogEntry key={log.id} log={log} />
            ))}
          </Timeline>
        </ScrollArea.Autosize>
      )}
    </Paper>
  );
}

function LogEntry({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!(log.dados_anteriores || log.dados_novos || log.motivo);

  return (
    <Timeline.Item
      bullet={acaoIcon(log.acao)}
      color={ACAO_COLOR[log.acao] ?? 'gray'}
      title={
        <Group gap={6} wrap="nowrap">
          <Badge size="xs" variant="filled" color={ACAO_COLOR[log.acao] ?? 'gray'}>
            {ACAO_LABEL[log.acao] ?? log.acao}
          </Badge>
          <Text size="xs" c="dimmed">{dayjs(log.criado_em).format('DD/MM/YYYY HH:mm')}</Text>
        </Group>
      }
    >
      <Stack gap={4} mt={2}>
        <Group gap={6}>
          <IconUser size={12} className="text-slate-400" />
          <Text size="xs" c="dimmed">
            {log.usuario_email ?? 'Sistema'}
            {log.usuario_role && ` · ${log.usuario_role}`}
          </Text>
        </Group>

        {log.motivo && (
          <Text size="xs" fs="italic" c="slate.7">"{log.motivo}"</Text>
        )}

        {hasDetails && (
          <>
            <UnstyledButton
              onClick={() => setExpanded((e) => !e)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              {expanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
              {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
            </UnstyledButton>

            <Collapse in={expanded}>
              <Stack gap={6} mt={4}>
                {log.dados_anteriores && (
                  <div>
                    <Text size="xs" fw={700} c="dimmed">Antes:</Text>
                    <Code block style={{ fontSize: 11, maxHeight: 160, overflow: 'auto' }}>
                      {JSON.stringify(log.dados_anteriores, null, 2)}
                    </Code>
                  </div>
                )}
                {log.dados_novos && (
                  <div>
                    <Text size="xs" fw={700} c="dimmed">Depois:</Text>
                    <Code block style={{ fontSize: 11, maxHeight: 160, overflow: 'auto' }}>
                      {JSON.stringify(log.dados_novos, null, 2)}
                    </Code>
                  </div>
                )}
              </Stack>
            </Collapse>
          </>
        )}
      </Stack>
    </Timeline.Item>
  );
}
