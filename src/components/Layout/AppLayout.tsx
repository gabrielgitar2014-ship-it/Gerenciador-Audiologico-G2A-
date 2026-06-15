import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Burger,
  Divider,
  Group,
  Menu,
  rem,
  ScrollArea,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  type Icon,
  IconBuilding,
  IconChartBar,
  IconChevronRight,
  IconClipboardList,
  IconDashboard,
  IconFileText,
  IconLogout,
  IconMenu2,
  IconSettings,
  IconShieldCheck,
  IconStethoscope,
  IconUser,
  IconUserCircle,
  IconUsers,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { NotificationBell } from './NotificationBell';
import { useNotificacoesRealtime } from '../../hooks/useNotificacoesRealtime';
import type { ProfileRole } from '../../types';

// ============================================================================
// MENU DATA — agrupado por seção
// ============================================================================

type NavGroup = {
  title: string;
  items: { link: string; label: string; icon: Icon; }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Operacional',
    items: [
      { link: 'dashboard', label: 'Dashboard', icon: IconDashboard },
      { link: 'pacientes', label: 'Pacientes', icon: IconUsers },
      { link: 'exames', label: 'Exames', icon: IconFileText },
    ],
  },
  {
    title: 'Saúde Ocupacional',
    items: [
      { link: 'pca', label: 'Monitoramento PCA', icon: IconStethoscope },
      { link: 'pca/gerenciar', label: 'Programas PCA', icon: IconClipboardList },
      { link: 'epi', label: 'EPIs', icon: IconShieldCheck },
    ],
  },
  {
    title: 'Análise',
    items: [
      { link: 'relatorios', label: 'Relatórios', icon: IconChartBar },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { link: 'configuracoes', label: 'Configurações', icon: IconSettings },
    ],
  },
];

// ============================================================================
// ROLE LABEL HELPERS
// ============================================================================

const ROLE_LABEL: Record<ProfileRole, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'red' },
  medico: { label: 'Médico(a)', color: 'blue' },
  fonoaudiologo: { label: 'Fonoaudiólogo(a)', color: 'teal' },
  professional: { label: 'Profissional', color: 'gray' },
};

// ============================================================================
// APP LAYOUT
// ============================================================================

export function AppLayout() {
  const [mobileOpened, setMobileOpened] = useState(false);
  const [desktopOpened, setDesktopOpened] = useState(true);
  const [companyName, setCompanyName] = useState('');

  const { companyId } = useParams();
  const { signOut, profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (companyId) {
      supabase
        .from('companies')
        .select('nome_fantasia')
        .eq('id', companyId)
        .single()
        .then(({ data }) => {
          if (data) setCompanyName(data.nome_fantasia);
        });
    }
  }, [companyId]);

  useNotificacoesRealtime(companyId);

  // Active state: usa segmento exato após /app/:companyId/
  const getActiveState = (link: string) => {
    const match = location.pathname.match(/\/app\/[^/]+\/(.*)$/);
    const after = match?.[1] ?? '';
    if (link === 'pca') {
      return after === 'pca' || after.startsWith('pca/prontuario');
    }
    if (link === 'pca/gerenciar') {
      return after.startsWith('pca/gerenciar') || after.startsWith('pca/detalhe');
    }
    return after === link || after.startsWith(`${link}/`);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleDesktop = () => setDesktopOpened((o) => !o);
  const toggleMobile = () => setMobileOpened((o) => !o);

  const role = profile?.role;
  const roleInfo = role ? ROLE_LABEL[role] : { label: 'Profissional', color: 'gray' };
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Profissional';
  const userInitial = (profile?.full_name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
      className="min-h-screen transition-all duration-300"
      styles={{
        main: {
          background:
            'linear-gradient(135deg, #f0fdfa 0%, #ecfeff 35%, #f8fafc 100%)',
        },
      }}
    >
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <AppShell.Header
        className="z-50 flex items-center border-b border-cyan-100/60 bg-white/70 px-4 shadow-[0_4px_30px_-12px_rgba(8,145,178,0.15)] backdrop-blur-2xl sm:px-6"
      >
        <Group justify="space-between" className="w-full" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
              color="#0e7490"
            />

            <Tooltip label={desktopOpened ? 'Fechar menu' : 'Abrir menu'} position="bottom">
              <ActionIcon
                variant="subtle"
                color="cyan"
                size="lg"
                visibleFrom="sm"
                onClick={toggleDesktop}
                className="rounded-xl hover:bg-cyan-50"
              >
                <IconMenu2 stroke={1.5} />
              </ActionIcon>
            </Tooltip>

            {/* Brand */}
            <UnstyledButton
              onClick={() => navigate('/portal')}
              className="flex select-none items-center gap-3 transition-all hover:opacity-90"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 opacity-40 blur-md" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-md">
                  <img
                    src="/logo.png"
                    alt="G2A"
                    className="h-7 w-7 object-contain drop-shadow"
                  />
                </div>
              </div>
              <div className="hidden flex-col justify-center sm:flex">
                <Text
                  fw={800}
                  size="md"
                  className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text leading-tight tracking-tight text-transparent"
                >
                  {companyName || 'G2A Health'}
                </Text>
                <Text size="xs" c="dimmed" fw={500} className="tracking-wide">
                  Gestão Audiológica Ocupacional
                </Text>
              </div>
            </UnstyledButton>
          </Group>

          {/* Ações */}
          <Group gap="xs" wrap="nowrap">
            <NotificationBell companyId={companyId} />

            <Tooltip label="Trocar empresa" position="bottom">
              <ActionIcon
                variant="light"
                color="cyan"
                radius="xl"
                size="lg"
                onClick={() => navigate('/portal')}
                className="shadow-sm"
              >
                <IconBuilding size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>

            {/* Profile Menu */}
            <Menu shadow="lg" width={240} position="bottom-end" radius="lg" withArrow>
              <Menu.Target>
                <UnstyledButton className="flex items-center gap-2 rounded-full border border-cyan-100/60 bg-white/60 px-1 py-1 shadow-sm transition-all hover:bg-white hover:shadow-md sm:px-2">
                  <Avatar
                    size="sm"
                    radius="xl"
                    color={roleInfo.color}
                    src={profile?.avatar_url ?? undefined}
                  >
                    {userInitial}
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <Text size="xs" fw={700} c="slate.8" lh={1.1}>
                      {firstName}
                    </Text>
                    <Text size="10px" c="dimmed" lh={1.1}>
                      {roleInfo.label}
                    </Text>
                  </div>
                  <IconChevronRight
                    size={14}
                    className="hidden text-slate-400 sm:block"
                  />
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>
                  <Group gap={6}>
                    <IconUserCircle size={12} />
                    <Text size="xs" tt="uppercase" fw={700}>Sua Conta</Text>
                  </Group>
                </Menu.Label>
                <div className="px-2 pb-2 pt-1">
                  <Text size="sm" fw={700} c="slate.8" lineClamp={1}>
                    {profile?.full_name ?? user?.email}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {user?.email}
                  </Text>
                  <Badge size="xs" color={roleInfo.color} variant="light" mt={4}>
                    {roleInfo.label}
                  </Badge>
                </div>

                <Menu.Divider />

                <Menu.Item
                  leftSection={<IconUser size={14} />}
                  onClick={() => navigate(`/app/${companyId}/configuracoes`)}
                >
                  Meu Perfil
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconSettings size={14} />}
                  onClick={() => navigate(`/app/${companyId}/configuracoes`)}
                >
                  Configurações
                </Menu.Item>

                <Menu.Divider />

                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={handleLogout}
                >
                  Sair do Sistema
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      {/* ═══════════════════ SIDEBAR ═══════════════════ */}
      <AppShell.Navbar
        p={0}
        className="border-r border-cyan-100/60 bg-white/70 shadow-[4px_0_24px_-12px_rgba(8,145,178,0.12)] backdrop-blur-2xl"
      >
        {/* Profile Card */}
        <div className="px-4 pt-4 pb-3">
          <div className="relative overflow-hidden rounded-2xl border border-cyan-100/80 bg-gradient-to-br from-cyan-50 via-white to-teal-50/60 p-3 shadow-sm">
            <div className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-cyan-200/30 blur-2xl" />
            <Group gap="sm" wrap="nowrap">
              <Avatar
                size="md"
                radius="xl"
                color={roleInfo.color}
                src={profile?.avatar_url ?? undefined}
                className="shadow-sm"
              >
                {userInitial}
              </Avatar>
              <div className="min-w-0 flex-1">
                <Text size="sm" fw={700} c="slate.8" lineClamp={1}>
                  {firstName}
                </Text>
                <Badge
                  size="xs"
                  variant="light"
                  color={roleInfo.color}
                  className="mt-1"
                >
                  {roleInfo.label}
                </Badge>
              </div>
            </Group>
          </div>
        </div>

        <AppShell.Section grow component={ScrollArea} className="px-3">
          <div className="space-y-1 py-2">
            {NAV_GROUPS.map((group, gIdx) => (
              <div key={group.title} className={gIdx > 0 ? 'mt-4' : ''}>
                <Text
                  size="10px"
                  fw={700}
                  tt="uppercase"
                  c="cyan.7"
                  className="mb-1.5 px-3 tracking-[0.12em]"
                >
                  {group.title}
                </Text>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = getActiveState(item.link);
                    const Icon = item.icon;
                    return (
                      <UnstyledButton
                        key={item.label}
                        onClick={() => {
                          navigate(item.link);
                          if (window.innerWidth < 768) setMobileOpened(false);
                        }}
                        className={`
                          group relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-xl px-3 transition-all duration-200
                          ${
                            isActive
                              ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-[0_8px_20px_-8px_rgba(8,145,178,0.4)]'
                              : 'text-slate-600 hover:bg-cyan-50/80 hover:text-cyan-700'
                          }
                        `}
                      >
                        {/* Indicador lateral */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white/80 shadow-sm" />
                        )}

                        {/* Glow no hover (não-active) */}
                        {!isActive && (
                          <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-cyan-100/0 via-cyan-100/60 to-cyan-100/0 transition-transform duration-500 group-hover:translate-x-full" />
                        )}

                        <Icon
                          size={20}
                          stroke={isActive ? 2 : 1.5}
                        />
                        <Text size="sm" fw={isActive ? 700 : 500} className="relative z-10">
                          {item.label}
                        </Text>
                      </UnstyledButton>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </AppShell.Section>

        {/* Footer */}
        <AppShell.Section className="px-3 pb-3">
          <Divider color="cyan.1" mb="xs" />
          <UnstyledButton
            onClick={handleLogout}
            className="group flex h-11 w-full items-center gap-3 rounded-xl px-3 text-slate-500 transition-all hover:bg-red-50 hover:text-red-600"
          >
            <IconLogout size={20} stroke={1.5} />
            <Text size="sm" fw={500}>Sair do Sistema</Text>
          </UnstyledButton>

          <Text
            size="10px"
            c="dimmed"
            ta="center"
            mt="sm"
            className="tracking-wider"
          >
            G2A Health · v1.0
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <AppShell.Main className="relative overflow-hidden">
        {/* Background blobs — paleta médica */}
        <div className="pointer-events-none absolute left-[-5%] top-[-10%] -z-10 h-[40vh] w-[40vh] rounded-full bg-cyan-300/15 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-[10%] right-[-5%] -z-10 h-[50vh] w-[50vh] rounded-full bg-teal-300/15 blur-[120px]" />
        <div className="pointer-events-none absolute left-[20%] top-[40%] -z-10 h-[30vh] w-[30vh] rounded-full bg-emerald-300/10 blur-[80px]" />

        {/* Container */}
        <div className="z-10 mx-auto min-h-[calc(100vh-80px)] w-full max-w-[1920px] p-2 sm:p-4">
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
