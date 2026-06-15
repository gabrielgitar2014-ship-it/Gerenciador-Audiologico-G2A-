import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Chip,
  Group,
  LoadingOverlay,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconActivity,
  IconAlertOctagon,
  IconAlertTriangle,
  IconArrowLeft,
  IconCalendarOff,
  IconCheck,
  IconEar,
  IconSearch,
  IconStethoscope,
  IconUsers,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { supabase } from '../../../lib/supabase';
import { PCADashboardTable, PCAWorker } from '../../../components/PCA/PCADashboardTable';

type StatusFilter = 'all' | PCAWorker['pcaStatus'];

export function PCADashboard() {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [workers, setWorkers] = useState<PCAWorker[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros (UI only)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  // --- BUSCA DE DADOS (mantida 100% do original) ---
  useEffect(() => {
    const fetchPCAData = async () => {
      if (!companyId) return;
      setLoading(true);
      try {
        // Busca todos os funcionários da empresa com seus exames
        const { data, error } = await supabase
          .from('employees')
          .select(`
            id, full_name, matricula,
            job_roles(name),
            audiometric_exams (
              id, exam_date, result_status
            )
          `)
          .eq('company_id', companyId);

        if (error) throw error;

        if (data) {
          const pcaWorkers: PCAWorker[] = data.map((emp: any) => {
            // Pega o exame mais recente
            const sortedExams = (emp.audiometric_exams || []).sort(
              (a: any, b: any) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime()
            );
            const lastExam = sortedExams.length > 0 ? sortedExams[0] : null;

            // Define o status do PCA baseado no result_status do banco
            let status: PCAWorker['pcaStatus'] = 'normal';
            if (lastExam) {
              const dbStatus = lastExam.result_status?.toLowerCase() || 'normal';
              if (dbStatus.includes('sugestivo_painpse') || dbStatus.includes('painpse')) {
                status = 'painpse';
              } else if (dbStatus.includes('alterado')) {
                status = 'alerta_msl';
              }

              // Verifica vencimento (exemplo simples: > 12 meses)
              const examDate = dayjs(lastExam.exam_date);
              const monthsDiff = dayjs().diff(examDate, 'month');
              if (monthsDiff > 12) {
                status = 'vencido';
              }
            } else {
              status = 'vencido'; // Sem exame = vencido/alerta
            }

            return {
              id: emp.id,
              name: emp.full_name || 'Sem nome',
              registration: emp.matricula || 'N/A',
              role: emp.job_roles?.name || 'Não definida',
              lastExamDate: lastExam?.exam_date ? dayjs(lastExam.exam_date).format('DD/MM/YYYY') : 'Sem exame',
              pcaStatus: status,
            };
          });

          setWorkers(pcaWorkers);
        }
      } catch (err) {
        console.error('Erro ao buscar dados PCA:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPCAData();
  }, [companyId]);

  const handleViewRecord = (workerId: string) => {
    navigate(`/app/${companyId}/pca/prontuario/${workerId}`);
  };

  // --- DERIVADOS PARA UI (filtros + stats) ---
  const counts = useMemo(
    () => ({
      total: workers.length,
      normal: workers.filter((w) => w.pcaStatus === 'normal').length,
      alerta_msl: workers.filter((w) => w.pcaStatus === 'alerta_msl').length,
      painpse: workers.filter((w) => w.pcaStatus === 'painpse').length,
      vencido: workers.filter((w) => w.pcaStatus === 'vencido').length,
    }),
    [workers],
  );

  const filtered = useMemo(() => {
    return workers.filter((w) => {
      if (statusFilter !== 'all' && w.pcaStatus !== statusFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return (
          w.name.toLowerCase().includes(q) ||
          w.registration.toLowerCase().includes(q) ||
          w.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [workers, statusFilter, query]);

  const pctSafe = counts.total > 0 ? Math.round((counts.normal / counts.total) * 100) : 0;

  return (
    <div className="relative mx-auto w-full max-w-[1440px] space-y-8 px-2 pb-12 animate-fade-in sm:px-4">
      <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section
        className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-teal-600 via-cyan-700 to-sky-800 px-8 py-8 text-white shadow-[0_24px_60px_-20px_rgba(8,145,178,0.45)]"
        aria-label="Monitoramento PCA"
      >
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Group gap="md" wrap="nowrap" align="flex-start">
            <Tooltip label="Voltar">
              <ActionIcon
                variant="white"
                color="cyan.8"
                size="lg"
                radius="xl"
                onClick={() => navigate(-1)}
                className="shadow-md"
              >
                <IconArrowLeft size={20} />
              </ActionIcon>
            </Tooltip>
            <div className="space-y-2">
              <Badge
                variant="white"
                color="cyan"
                radius="sm"
                leftSection={<IconStethoscope size={12} />}
                styles={{ label: { textTransform: 'none', fontWeight: 700 } }}
              >
                Saúde Ocupacional · PCA
              </Badge>
              <Title order={1} className="!text-white !text-3xl md:!text-4xl !font-bold !tracking-tight !leading-tight">
                Monitoramento do PCA
              </Title>
              <Text size="sm" className="opacity-90 max-w-md">
                Acompanhamento ocupacional baseado em NR-07 — detecção precoce de PAINPSE, alertas
                de MSL e exames vencidos.
              </Text>
            </div>
          </Group>

          {/* Card lateral com % seguros */}
          <div className="hidden md:block">
            <div className="rounded-2xl border border-white/30 bg-white/10 px-6 py-5 backdrop-blur-xl">
              <Text size="xs" className="opacity-80 uppercase tracking-wider" fw={700}>
                Trabalhadores normais
              </Text>
              <Text size="2.5rem" fw={800} className="leading-none mt-2">
                {pctSafe}
                <span className="text-lg opacity-70">%</span>
              </Text>
              <Text size="xs" className="opacity-80 mt-1">
                {counts.normal} de {counts.total} monitorados
              </Text>
              <div className="mt-3 h-2 w-48 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-300 to-cyan-200 transition-all duration-700"
                  style={{ width: `${pctSafe}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ KPI CARDS ═══════════════════ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <PCAStatCard
          icon={<IconUsers size={22} stroke={1.5} />}
          iconColor="cyan"
          label="Total Monitorados"
          value={counts.total}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <PCAStatCard
          icon={<IconCheck size={22} stroke={1.5} />}
          iconColor="teal"
          label="Normal"
          value={counts.normal}
          active={statusFilter === 'normal'}
          onClick={() => setStatusFilter('normal')}
          gradientBg="from-teal-50 to-white"
        />
        <PCAStatCard
          icon={<IconActivity size={22} stroke={1.5} />}
          iconColor="yellow"
          label="Alerta MSL"
          value={counts.alerta_msl}
          active={statusFilter === 'alerta_msl'}
          onClick={() => setStatusFilter('alerta_msl')}
          gradientBg="from-yellow-50 to-white"
        />
        <PCAStatCard
          icon={<IconAlertOctagon size={22} stroke={1.5} />}
          iconColor="red"
          label="PAINPSE"
          value={counts.painpse}
          active={statusFilter === 'painpse'}
          onClick={() => setStatusFilter('painpse')}
          gradientBg="from-red-50 to-white"
          alert
        />
        <PCAStatCard
          icon={<IconCalendarOff size={22} stroke={1.5} />}
          iconColor="gray"
          label="Vencido"
          value={counts.vencido}
          active={statusFilter === 'vencido'}
          onClick={() => setStatusFilter('vencido')}
          gradientBg="from-slate-50 to-white"
        />
      </div>

      {/* ═══════════════════ FILTROS + TABELA ═══════════════════ */}
      <Paper
        p="xl"
        radius="2rem"
        className="border border-slate-200/60 bg-white/80 shadow-[0_10px_40px_-15px_rgba(15,23,42,0.08)] backdrop-blur-xl"
      >
        <Group justify="space-between" mb="lg" wrap="wrap">
          <Group gap={8}>
            <ThemeIcon size="md" radius="md" variant="light" color="cyan">
              <IconEar size={16} />
            </ThemeIcon>
            <div>
              <Title order={4} c="slate.8" lh={1.1}>Trabalhadores Monitorados</Title>
              <Text size="xs" c="dimmed" mt={2}>
                Mostrando {filtered.length} de {counts.total}
                {statusFilter !== 'all' && ` · filtro: ${statusLabel(statusFilter)}`}
              </Text>
            </div>
          </Group>

          <TextInput
            placeholder="Buscar por nome, matrícula ou função"
            leftSection={<IconSearch size={14} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            w={320}
            radius="xl"
          />
        </Group>

        {/* Chips de filtro rápido */}
        <Chip.Group value={statusFilter} onChange={(v) => setStatusFilter((v as StatusFilter) || 'all')}>
          <Group gap={6} mb="md">
            <Chip value="all" color="cyan" variant="light" radius="xl">
              Todos ({counts.total})
            </Chip>
            <Chip value="normal" color="teal" variant="light" radius="xl">
              Normal ({counts.normal})
            </Chip>
            <Chip value="alerta_msl" color="yellow" variant="light" radius="xl">
              Alerta MSL ({counts.alerta_msl})
            </Chip>
            <Chip value="painpse" color="red" variant="light" radius="xl">
              PAINPSE ({counts.painpse})
            </Chip>
            <Chip value="vencido" color="gray" variant="light" radius="xl">
              Vencido ({counts.vencido})
            </Chip>
          </Group>
        </Chip.Group>

        {!loading && filtered.length === 0 && (
          <Stack align="center" py="xl" gap={6}>
            <IconAlertTriangle size={40} className="text-slate-300" />
            <Text c="dimmed">Nenhum trabalhador encontrado com os filtros atuais.</Text>
          </Stack>
        )}

        {filtered.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <PCADashboardTable data={filtered} onViewRecord={handleViewRecord} />
          </div>
        )}
      </Paper>
    </div>
  );
}

// ============================================================================
// STAT CARD (clicável - vira filtro)
// ============================================================================

function PCAStatCard({
  icon,
  iconColor,
  label,
  value,
  active,
  onClick,
  gradientBg = 'from-cyan-50 to-white',
  alert,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  gradientBg?: string;
  alert?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-[1.75rem] border bg-gradient-to-br ${gradientBg}
        p-5 text-left shadow-[0_10px_40px_-15px_rgba(15,23,42,0.08)] transition-all duration-300
        ${active
          ? 'border-cyan-400/80 ring-2 ring-cyan-300/40 -translate-y-0.5 shadow-[0_20px_50px_-15px_rgba(8,145,178,0.35)]'
          : 'border-slate-200/60 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_20px_50px_-15px_rgba(8,145,178,0.2)]'}
        ${alert && !active ? 'border-red-200/70' : ''}
      `}
    >
      {active && (
        <div className="absolute right-3 top-3">
          <Badge size="xs" color="cyan" variant="filled" radius="sm">
            Filtro
          </Badge>
        </div>
      )}
      <ThemeIcon size={44} radius="xl" variant="light" color={iconColor} className="shadow-sm">
        {icon}
      </ThemeIcon>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700} className="tracking-wider mt-4">
        {label}
      </Text>
      <Text
        size="2rem"
        fw={800}
        className={`leading-tight mt-1 ${alert ? 'text-red-700' : 'text-slate-800'}`}
      >
        {value}
      </Text>
    </button>
  );
}

function statusLabel(s: StatusFilter): string {
  switch (s) {
    case 'normal':
      return 'Normal';
    case 'alerta_msl':
      return 'Alerta MSL';
    case 'painpse':
      return 'PAINPSE';
    case 'vencido':
      return 'Vencido';
    default:
      return 'Todos';
  }
}
