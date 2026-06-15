import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Grid,
  Group,
  LoadingOverlay,
  Paper,
  Progress,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowUpRight,
  IconCalendarStats,
  IconChartHistogram,
  IconClipboardHeart,
  IconClock,
  IconDotsVertical,
  IconEar,
  IconFileText,
  IconPlayerPlay,
  IconPlus,
  IconShieldCheck,
  IconStethoscope,
  IconTrendingDown,
  IconTrendingUp,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

export function Dashboard() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE DADOS (mantidos do original) ---
  const [stats, setStats] = useState({
    totalLives: 0,
    examsMonth: 0,
    examsMonthDiff: 0,
    scheduledToday: 0,
    alteredMonth: 0,
  });

  const [todayMetrics, setTodayMetrics] = useState({
    periodico: { total: 0, done: 0 },
    admissional: { total: 0, done: 0 },
    demissional: { total: 0, done: 0 },
  });

  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [queueToday, setQueueToday] = useState<any[]>([]);

  // --- BUSCA DE DADOS (mantida 100% do original) ---
  useEffect(() => {
    if (companyId) fetchDashboardData();
  }, [companyId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
      const startOfLastMonth = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
      const endOfLastMonth = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
      const todayDate = dayjs().format('YYYY-MM-DD');

      const { count: totalLives } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true);

      const { data: monthExams } = await supabase
        .from('audiometric_exams')
        .select('result_status')
        .eq('company_id', companyId)
        .gte('exam_date', startOfMonth)
        .lte('exam_date', endOfMonth);

      const examsMonthCount = monthExams?.length || 0;
      const alteredCount =
        monthExams?.filter(
          (e) => e.result_status && e.result_status.trim().toLowerCase() !== 'normal',
        ).length || 0;

      const { count: examsLastMonth } = await supabase
        .from('audiometric_exams')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('exam_date', startOfLastMonth)
        .lte('exam_date', endOfLastMonth);

      let diffPercent = 0;
      if (examsLastMonth && examsLastMonth > 0) {
        diffPercent = Math.round(((examsMonthCount - examsLastMonth) / examsLastMonth) * 100);
      } else if (examsMonthCount > 0) {
        diffPercent = 100;
      }

      const { data: todayData } = await supabase
        .from('audiometric_exams')
        .select(`*, employee:employee_id (full_name)`)
        .eq('company_id', companyId)
        .eq('exam_date', todayDate)
        .order('created_at', { ascending: false });

      const todayList = todayData || [];
      const scheduledCount = todayList.length;

      const pendingList = todayList.filter(
        (e) => !e.thresholds_od_air || Object.keys(e.thresholds_od_air).length === 0,
      );
      const doneList = todayList.filter(
        (e) => e.thresholds_od_air && Object.keys(e.thresholds_od_air).length > 0,
      );

      const metrics = {
        periodico: {
          total: todayList.filter((e) => e.exam_type === 'periodico').length,
          done: doneList.filter((e) => e.exam_type === 'periodico').length,
        },
        admissional: {
          total: todayList.filter((e) => e.exam_type === 'admissional').length,
          done: doneList.filter((e) => e.exam_type === 'admissional').length,
        },
        demissional: {
          total: todayList.filter((e) => e.exam_type === 'demissional').length,
          done: doneList.filter((e) => e.exam_type === 'demissional').length,
        },
      };

      const { data: recentData } = await supabase
        .from('audiometric_exams')
        .select(`*, employee:employee_id (full_name)`)
        .eq('company_id', companyId)
        .not('thresholds_od_air', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(5);

      setStats({
        totalLives: totalLives || 0,
        examsMonth: examsMonthCount,
        examsMonthDiff: diffPercent,
        scheduledToday: scheduledCount,
        alteredMonth: alteredCount,
      });

      setTodayMetrics(metrics);
      setQueueToday(pendingList);
      setRecentExams(recentData || []);
    } catch (err) {
      console.error('Erro crítico no dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const calcProgress = (current: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  };

  const handleExamAction = (examId: string) => {
    navigate(`/app/${companyId}/exames/${examId}/realizar`);
  };

  const alterationRate =
    stats.examsMonth > 0 ? Math.round((stats.alteredMonth / stats.examsMonth) * 100) : 0;

  // --- DERIVADOS PARA O NOVO HERO ---
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Boa madrugada';
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'colega';
  const todayCompletedRatio = calcProgress(
    stats.scheduledToday - queueToday.length,
    stats.scheduledToday,
  );

  return (
    <div className="relative space-y-8 pb-12 animate-fade-in">
      <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section
        className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-teal-600 via-cyan-700 to-sky-800 px-8 py-10 text-white shadow-[0_24px_60px_-20px_rgba(8,145,178,0.45)]"
        aria-label="Saudação e ações principais"
      >
        {/* Blobs decorativos */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3 max-w-xl">
            <Group gap={8}>
              <Badge
                variant="white"
                color="cyan"
                radius="sm"
                leftSection={<IconStethoscope size={12} />}
                styles={{ label: { textTransform: 'none', fontWeight: 700 } }}
              >
                G2A Health · Painel Operacional
              </Badge>
              <Text size="xs" className="opacity-80 capitalize">
                {dayjs().format('dddd, DD [de] MMMM [de] YYYY')}
              </Text>
            </Group>

            <Title order={1} className="!text-white !text-3xl md:!text-4xl !font-bold !tracking-tight !leading-tight">
              {greeting},{' '}
              <span className="bg-gradient-to-r from-white via-cyan-100 to-emerald-100 bg-clip-text text-transparent">
                {firstName}
              </span>
            </Title>
            <Text size="sm" className="opacity-90 max-w-md">
              Aqui está o resumo do atendimento de hoje. {stats.scheduledToday > 0
                ? `${queueToday.length} paciente${queueToday.length !== 1 ? 's' : ''} ${queueToday.length === 1 ? 'aguarda' : 'aguardam'} na fila.`
                : 'Sem agenda para hoje — bom momento para fechar pendências.'}
            </Text>

            <Group gap="sm" mt="md">
              <Button
                size="md"
                radius="xl"
                color="white"
                c="cyan.8"
                leftSection={<IconPlayerPlay size={16} />}
                onClick={() => navigate(`/app/${companyId}/exames`)}
                styles={{ root: { fontWeight: 700 } }}
              >
                Iniciar próximo exame
              </Button>
              <Button
                size="md"
                radius="xl"
                variant="outline"
                color="white"
                leftSection={<IconCalendarStats size={16} />}
                onClick={() => navigate(`/app/${companyId}/exames`)}
                styles={{ root: { borderColor: 'rgba(255,255,255,0.6)' } }}
              >
                Agenda completa
              </Button>
            </Group>
          </div>

          {/* Card de status no hero (desktop) */}
          <div className="hidden md:block">
            <div className="rounded-2xl border border-white/30 bg-white/10 px-6 py-5 backdrop-blur-xl">
              <Text size="xs" className="opacity-80 uppercase tracking-wider" fw={700}>
                Progresso do dia
              </Text>
              <Text size="2.5rem" fw={800} className="leading-none mt-2">
                {todayCompletedRatio}
                <span className="text-lg opacity-70">%</span>
              </Text>
              <Text size="xs" className="opacity-80 mt-1">
                {stats.scheduledToday - queueToday.length} de {stats.scheduledToday} concluídos
              </Text>
              <div className="mt-3 h-2 w-48 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-300 to-cyan-200 transition-all duration-700"
                  style={{ width: `${todayCompletedRatio}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ KPI CARDS ═══════════════════ */}
      <Grid gutter="lg">
        <KpiCard
          icon={<IconUsers size={22} stroke={1.5} />}
          iconColor="cyan"
          label="Total de Vidas"
          value={stats.totalLives}
          subLabel="Funcionários ativos"
          accent="cyan"
          delay={0}
        />
        <KpiCard
          icon={<IconActivity size={22} stroke={1.5} />}
          iconColor="teal"
          label="Exames no Mês"
          value={stats.examsMonth}
          subLabel={
            stats.examsMonthDiff !== 0
              ? `${stats.examsMonthDiff > 0 ? '+' : ''}${stats.examsMonthDiff}% vs mês anterior`
              : 'sem comparativo'
          }
          accent="teal"
          trend={stats.examsMonthDiff > 0 ? 'up' : stats.examsMonthDiff < 0 ? 'down' : undefined}
          delay={70}
        />
        <KpiCard
          icon={<IconCalendarStats size={22} stroke={1.5} />}
          iconColor="indigo"
          label="Agendados Hoje"
          value={stats.scheduledToday}
          subLabel={
            queueToday.length > 0
              ? `${queueToday.length} aguardando`
              : stats.scheduledToday > 0
              ? 'Fila zerada'
              : 'Sem agenda'
          }
          accent="indigo"
          delay={140}
        />
        <KpiCard
          icon={<IconAlertTriangle size={22} stroke={1.5} />}
          iconColor="red"
          label="Exames Alterados"
          value={stats.alteredMonth}
          subLabel={`${alterationRate}% taxa no mês`}
          accent="red"
          delay={210}
          alert
        />
      </Grid>

      {/* ═══════════════════ META DO DIA + ÚLTIMOS ═══════════════════ */}
      <Grid gutter="xl">
        {/* Meta do dia */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Paper
            p="xl"
            radius="2rem"
            className="h-full border border-slate-200/60 bg-white/80 shadow-[0_10px_40px_-15px_rgba(15,23,42,0.08)] backdrop-blur-xl"
          >
            <Group justify="space-between" mb="lg" align="flex-start">
              <div>
                <Group gap={8}>
                  <ThemeIcon size="md" radius="md" variant="light" color="cyan">
                    <IconChartHistogram size={16} />
                  </ThemeIcon>
                  <Title order={4} c="slate.8">Meta de atendimento do dia</Title>
                </Group>
                <Text size="xs" c="dimmed" mt={4}>
                  Acompanhamento por tipo de exame
                </Text>
              </div>
              <Badge
                size="lg"
                color={todayCompletedRatio === 100 ? 'teal' : 'cyan'}
                variant="light"
                radius="md"
              >
                {todayCompletedRatio}% concluído
              </Badge>
            </Group>

            <Stack gap="lg">
              <MetricRow
                color="cyan"
                label="Exames periódicos"
                done={todayMetrics.periodico.done}
                total={todayMetrics.periodico.total}
              />
              <MetricRow
                color="teal"
                label="Exames admissionais"
                done={todayMetrics.admissional.done}
                total={todayMetrics.admissional.total}
              />
              <MetricRow
                color="orange"
                label="Exames demissionais"
                done={todayMetrics.demissional.done}
                total={todayMetrics.demissional.total}
              />
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Últimos finalizados */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Paper
            p="xl"
            radius="2rem"
            className="h-full border border-slate-200/60 bg-white/80 shadow-[0_10px_40px_-15px_rgba(15,23,42,0.08)] backdrop-blur-xl"
          >
            <Group justify="space-between" mb="md">
              <Group gap={8}>
                <ThemeIcon size="md" radius="md" variant="light" color="emerald">
                  <IconEar size={16} />
                </ThemeIcon>
                <Title order={4} c="slate.8">Últimos finalizados</Title>
              </Group>
            </Group>

            <Stack gap="xs">
              {recentExams.length > 0 ? (
                recentExams.map((exam) => (
                  <UnstyledButton
                    key={exam.id}
                    onClick={() =>
                      navigate(`/app/${companyId}/exames/${exam.id}/visualizar`)
                    }
                    className="w-full rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/50 px-3 py-2.5 transition-all hover:border-cyan-200 hover:shadow-[0_8px_20px_-8px_rgba(8,145,178,0.25)] hover:-translate-y-[1px]"
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap">
                        <Avatar
                          color={exam.result_status === 'normal' ? 'teal' : 'red'}
                          radius="xl"
                          size="md"
                        >
                          {exam.employee?.full_name?.[0]?.toUpperCase() ?? '?'}
                        </Avatar>
                        <div className="min-w-0">
                          <Text size="sm" fw={700} className="line-clamp-1">
                            {exam.employee?.full_name}
                          </Text>
                          <Text size="xs" c="dimmed" tt="capitalize">
                            {exam.exam_type?.replace('_', ' ')}
                          </Text>
                        </div>
                      </Group>
                      <Badge
                        color={exam.result_status === 'normal' ? 'teal' : 'red'}
                        variant="light"
                        size="sm"
                        radius="sm"
                      >
                        {exam.result_status === 'normal' ? 'Normal' : 'Alterado'}
                      </Badge>
                    </Group>
                  </UnstyledButton>
                ))
              ) : (
                <Stack align="center" py="xl" gap={6}>
                  <IconStethoscope size={32} className="text-slate-300" />
                  <Text size="sm" c="dimmed">Nenhum exame finalizado ainda.</Text>
                </Stack>
              )}

              <Button
                variant="subtle"
                fullWidth
                color="cyan"
                radius="xl"
                rightSection={<IconArrowUpRight size={14} />}
                onClick={() => navigate(`/app/${companyId}/exames`)}
                mt="xs"
              >
                Ver histórico completo
              </Button>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* ═══════════════════ AÇÕES RÁPIDAS ═══════════════════ */}
      <Grid gutter="lg">
        <QuickAction
          icon={<IconUserPlus size={20} />}
          color="cyan"
          title="Cadastrar Paciente"
          description="Adicionar novo trabalhador à empresa"
          onClick={() => navigate(`/app/${companyId}/pacientes`)}
        />
        <QuickAction
          icon={<IconPlus size={20} />}
          color="teal"
          title="Novo Exame"
          description="Agendar uma nova audiometria"
          onClick={() => navigate(`/app/${companyId}/exames`)}
        />
        <QuickAction
          icon={<IconShieldCheck size={20} />}
          color="indigo"
          title="Programa PCA"
          description="Gerenciar programa de conservação"
          onClick={() => navigate(`/app/${companyId}/pca/gerenciar`)}
        />
        <QuickAction
          icon={<IconFileText size={20} />}
          color="orange"
          title="Relatórios"
          description="Laudos e relatórios epidemiológicos"
          onClick={() => navigate(`/app/${companyId}/relatorios`)}
        />
      </Grid>

      {/* ═══════════════════ FILA DE ATENDIMENTO ═══════════════════ */}
      <Paper
        p="xl"
        radius="2rem"
        className="border border-slate-200/60 bg-white/80 shadow-[0_10px_40px_-15px_rgba(15,23,42,0.08)] backdrop-blur-xl"
      >
        <Group justify="space-between" mb="lg">
          <div>
            <Group gap={8}>
              <ThemeIcon size="md" radius="md" variant="light" color="indigo">
                <IconClock size={16} />
              </ThemeIcon>
              <Title order={4} c="slate.8">Fila de atendimento</Title>
            </Group>
            <Text size="xs" c="dimmed" mt={2}>
              Pacientes aguardando na recepção agora
            </Text>
          </div>
          <Group gap={4}>
            <Badge size="lg" color="cyan" variant="light" radius="md">
              {queueToday.length} aguardando
            </Badge>
            <ActionIcon variant="subtle" color="gray">
              <IconDotsVertical size={18} />
            </ActionIcon>
          </Group>
        </Group>

        {queueToday.length > 0 ? (
          <Table.ScrollContainer minWidth={600}>
            <Table verticalSpacing="md" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Horário</Table.Th>
                  <Table.Th>Paciente</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th ta="right">Ação</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {queueToday.map((exam) => (
                  <Table.Tr key={exam.id}>
                    <Table.Td>
                      <Group gap="xs" c="dimmed">
                        <IconClock size={14} />
                        <Text size="sm">{dayjs(exam.created_at).format('HH:mm')}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar radius="xl" size="sm" color="cyan">
                          {exam.employee?.full_name?.[0]?.toUpperCase() ?? '?'}
                        </Avatar>
                        <Text size="sm" fw={600}>
                          {exam.employee?.full_name}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="outline" color="gray" tt="capitalize" radius="sm">
                        {exam.exam_type.replace('_', ' ')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color="cyan" variant="light" radius="sm">
                        Aguardando
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Button
                        size="compact-xs"
                        variant="filled"
                        color="cyan"
                        radius="xl"
                        leftSection={<IconPlayerPlay size={12} />}
                        onClick={() => handleExamAction(exam.id)}
                      >
                        Chamar
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <Stack align="center" py="xl" gap={6}>
            <IconClipboardHeart size={48} className="text-slate-300" />
            <Text fw={600} c="slate.6">Fila zerada!</Text>
            <Text size="sm" c="dimmed">Aproveite para um café ☕</Text>
          </Stack>
        )}
      </Paper>
    </div>
  );
}

// ============================================================================
// KPI CARD
// ============================================================================

interface KpiCardProps {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: number;
  subLabel: string;
  accent: string;
  delay?: number;
  trend?: 'up' | 'down';
  alert?: boolean;
}

function KpiCard({
  icon,
  iconColor,
  label,
  value,
  subLabel,
  accent,
  delay = 0,
  trend,
  alert,
}: KpiCardProps) {
  const accentBg: Record<string, string> = {
    cyan: 'from-cyan-50 to-white',
    teal: 'from-teal-50 to-white',
    indigo: 'from-indigo-50 to-white',
    red: 'from-red-50 to-white',
  };

  return (
    <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
      <Paper
        p="xl"
        radius="2rem"
        className={`group relative h-full border ${
          alert ? 'border-red-200/70' : 'border-slate-200/60'
        } bg-gradient-to-br ${accentBg[accent] ?? 'from-white to-slate-50'} shadow-[0_10px_40px_-15px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-15px_rgba(8,145,178,0.25)]`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <Group justify="space-between" align="flex-start">
          <ThemeIcon
            size={48}
            radius="xl"
            variant="light"
            color={iconColor}
            className="shadow-sm"
          >
            {icon}
          </ThemeIcon>
          {trend && (
            <Tooltip label={trend === 'up' ? 'Crescimento mensal' : 'Queda mensal'}>
              <ThemeIcon
                size="md"
                radius="xl"
                variant="light"
                color={trend === 'up' ? 'teal' : 'red'}
              >
                {trend === 'up' ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
              </ThemeIcon>
            </Tooltip>
          )}
        </Group>

        <Stack gap={4} mt="lg">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700} className="tracking-wider">
            {label}
          </Text>
          <Text
            size="2.5rem"
            fw={800}
            className={`leading-tight ${alert ? 'text-red-700' : 'text-slate-800'}`}
          >
            {value.toLocaleString('pt-BR')}
          </Text>
          <Text size="xs" c={alert ? 'red.7' : 'dimmed'} fw={500}>
            {subLabel}
          </Text>
        </Stack>
      </Paper>
    </Grid.Col>
  );
}

// ============================================================================
// METRIC ROW
// ============================================================================

function MetricRow({
  color,
  label,
  done,
  total,
}: {
  color: string;
  label: string;
  done: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div>
      <Group justify="space-between" mb={6}>
        <Group gap={6}>
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: `var(--mantine-color-${color}-6)` }}
          />
          <Text size="sm" fw={600}>{label}</Text>
        </Group>
        <Group gap={6}>
          <Text size="xs" c="dimmed">
            {done}/{total} realizados
          </Text>
          <Badge size="xs" variant="light" color={color} radius="sm">
            {pct}%
          </Badge>
        </Group>
      </Group>
      <Progress
        value={pct}
        size="lg"
        radius="xl"
        color={color}
        animated={pct < 100 && total > 0}
        striped={pct < 100 && total > 0}
      />
    </div>
  );
}

// ============================================================================
// QUICK ACTION
// ============================================================================

function QuickAction({
  icon,
  color,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
      <UnstyledButton
        onClick={onClick}
        className="group w-full"
      >
        <Paper
          p="lg"
          radius="2rem"
          className="h-full border border-slate-200/60 bg-white/80 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-1 group-hover:border-cyan-200 group-hover:shadow-[0_16px_40px_-12px_rgba(8,145,178,0.25)]"
        >
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div className="flex-1 min-w-0">
              <ThemeIcon size={40} radius="xl" variant="light" color={color} mb="sm">
                {icon}
              </ThemeIcon>
              <Text fw={700} size="sm" c="slate.8" mb={2}>
                {title}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={2}>
                {description}
              </Text>
            </div>
            <ThemeIcon
              size="sm"
              radius="xl"
              variant="subtle"
              color="gray"
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <IconArrowUpRight size={14} />
            </ThemeIcon>
          </Group>
        </Paper>
      </UnstyledButton>
    </Grid.Col>
  );
}
