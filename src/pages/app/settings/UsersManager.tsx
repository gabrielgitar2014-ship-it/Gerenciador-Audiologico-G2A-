import { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Group,
  LoadingOverlay,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconSearch, IconUsers } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  useUpdateUserRole,
  useUpdateUserStatus,
  useUsers,
} from '../../../hooks/useUsers';
import type { Profile, ProfileRole, ProfileStatus } from '../../../types';

const ROLE_OPTIONS: { value: ProfileRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Administrador', color: 'red' },
  { value: 'medico', label: 'Médico', color: 'blue' },
  { value: 'fonoaudiologo', label: 'Fonoaudiólogo(a)', color: 'teal' },
  { value: 'professional', label: 'Profissional', color: 'gray' },
];

const STATUS_OPTIONS: { value: ProfileStatus; label: string; color: string }[] = [
  { value: 'ativo', label: 'Ativo', color: 'teal' },
  { value: 'inativo', label: 'Inativo', color: 'gray' },
  { value: 'bloqueado', label: 'Bloqueado', color: 'red' },
];

const roleColor = (role: ProfileRole) =>
  ROLE_OPTIONS.find((r) => r.value === role)?.color ?? 'gray';

const statusColor = (status: ProfileStatus) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.color ?? 'gray';

export function UsersManager() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const { data: users = [], isLoading } = useUsers();
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.trim().toLowerCase();
    return users.filter((u) => u.full_name?.toLowerCase().includes(q));
  }, [users, query]);

  if (!isAdmin) {
    return (
      <Paper p="lg" withBorder>
        <Alert color="orange" variant="light" icon={<IconAlertCircle />}>
          Apenas administradores podem gerenciar usuários.
        </Alert>
      </Paper>
    );
  }

  const handleRoleChange = async (target: Profile, newRole: ProfileRole) => {
    if (target.id === user?.id && target.role === 'admin' && newRole !== 'admin') {
      toast.error('Você não pode remover seu próprio papel de admin. Peça para outro admin.');
      return;
    }
    try {
      await updateRole.mutateAsync({ userId: target.id, role: newRole });
      toast.success(`Papel de ${target.full_name} atualizado para ${newRole}.`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleStatusChange = async (target: Profile, newStatus: ProfileStatus) => {
    if (target.id === user?.id && newStatus !== 'ativo') {
      toast.error('Você não pode bloquear / inativar sua própria conta.');
      return;
    }
    try {
      await updateStatus.mutateAsync({ userId: target.id, status: newStatus });
      toast.success(`Status de ${target.full_name} atualizado para ${newStatus}.`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  return (
    <Paper shadow="sm" p="lg" withBorder pos="relative">
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />

      <Group justify="space-between" mb="md" wrap="wrap">
        <Group gap={8}>
          <IconUsers size={22} className="text-slate-600" />
          <Title order={3} c="slate.700">Usuários do Sistema</Title>
          <Badge variant="light" color="gray">{users.length}</Badge>
        </Group>
        <TextInput
          placeholder="Buscar por nome"
          leftSection={<IconSearch size={14} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          w={280}
        />
      </Group>

      <Alert color="blue" variant="light" mb="md" icon={<IconAlertCircle />}>
        <Text size="sm">
          A configuração de papéis define o que cada usuário pode fazer no sistema.
          <br />
          <strong>Lembre-se:</strong> ainda não há filtro de empresa nos perfis — a lista mostra todos os usuários
          cadastrados no banco. Quando o vínculo profile/empresa for definido, a listagem será restrita.
        </Text>
      </Alert>

      {!isLoading && filtered.length === 0 && (
        <Stack align="center" py="xl" gap={4}>
          <IconUsers size={36} className="text-slate-300" />
          <Text c="dimmed">Nenhum usuário encontrado.</Text>
        </Stack>
      )}

      {filtered.length > 0 && (
        <Table.ScrollContainer minWidth={720}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Usuário</Table.Th>
                <Table.Th>Registro</Table.Th>
                <Table.Th>Papel</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((u) => {
                const isSelf = u.id === user?.id;
                return (
                  <Table.Tr key={u.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar
                          size="sm"
                          radius="xl"
                          color={roleColor(u.role)}
                          src={u.avatar_url ?? undefined}
                        >
                          {u.full_name?.[0]?.toUpperCase() ?? '?'}
                        </Avatar>
                        <div>
                          <Group gap={4}>
                            <Text size="sm" fw={600}>{u.full_name}</Text>
                            {isSelf && (
                              <Badge size="xs" color="blue" variant="dot">Você</Badge>
                            )}
                          </Group>
                          {u.specialization && (
                            <Text size="xs" c="dimmed">{u.specialization}</Text>
                          )}
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={0}>
                        {u.crfa_numero && (
                          <Text size="xs">CRFa {u.crfa_numero}{u.crfa_regiao ? `-${u.crfa_regiao}` : ''}</Text>
                        )}
                        {u.crm_numero && (
                          <Text size="xs">CRM {u.crm_numero}{u.crm_regiao ? `/${u.crm_regiao}` : ''}</Text>
                        )}
                        {!u.crfa_numero && !u.crm_numero && (
                          <Text size="xs" c="dimmed">—</Text>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Select
                        size="xs"
                        data={ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
                        value={u.role}
                        onChange={(v) => v && handleRoleChange(u, v as ProfileRole)}
                        comboboxProps={{ withinPortal: true }}
                        styles={{ input: { fontWeight: 600, color: `var(--mantine-color-${roleColor(u.role)}-7)` } }}
                        disabled={updateRole.isPending}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Select
                        size="xs"
                        data={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                        value={u.status}
                        onChange={(v) => v && handleStatusChange(u, v as ProfileStatus)}
                        comboboxProps={{ withinPortal: true }}
                        styles={{ input: { fontWeight: 600, color: `var(--mantine-color-${statusColor(u.status)}-7)` } }}
                        disabled={updateStatus.isPending}
                      />
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Paper>
  );
}
