import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Card,
  Group,
  LoadingOverlay,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconChartHistogram,
  IconChecks,
  IconClipboardList,
  IconSchool,
  IconShieldCheck,
  IconStethoscope,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useProgramaPCA } from '../../../hooks/usePCA';
import { usePermissions } from '../../../hooks/usePermissions';
import { MedicoesRuidoTable } from '../../../components/PCA/MedicoesRuidoTable';
import { AcoesPCATable } from '../../../components/PCA/AcoesPCATable';
import { TreinamentosTable } from '../../../components/PCA/TreinamentosTable';
import type { ProgramaPCAStatus } from '../../../types';

const STATUS_COLOR: Record<ProgramaPCAStatus, string> = {
  ativo: 'teal',
  inativo: 'gray',
  arquivado: 'dark',
};

export function PCADetalhe() {
  const { pcaId, companyId } = useParams<{ pcaId: string; companyId: string }>();
  const navigate = useNavigate();
  const { canManagePCA } = usePermissions();

  const { data: pca, isLoading } = useProgramaPCA(pcaId);

  if (isLoading || !pca) {
    return (
      <Paper p="lg" withBorder pos="relative" mih={300}>
        <LoadingOverlay visible overlayProps={{ blur: 2 }} />
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {/* Header */}
      <Paper p="lg" withBorder shadow="sm">
        <Group justify="space-between" align="flex-start">
          <Group>
            <ActionIcon variant="subtle" size="lg" onClick={() => navigate(-1)}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Group gap={8}>
                <IconStethoscope className="text-teal-600" size={22} />
                <Title order={3} c="slate.700" lh={1.1}>
                  PCA {pca.ano}
                </Title>
                <Badge variant="light" color={STATUS_COLOR[pca.status]} size="lg">
                  {pca.status}
                </Badge>
                <Badge variant="outline" color="gray" size="lg">v{pca.versao}</Badge>
              </Group>
              <Text size="sm" c="dimmed" mt={4}>
                Programa de Conservação Auditiva — gestão integrada por ano de referência
              </Text>
            </div>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 4 }} mt="lg" spacing="md">
          <InfoStat label="Data de Início" value={pca.data_inicio ? dayjs(pca.data_inicio).format('DD/MM/YYYY') : '—'} />
          <InfoStat
            label="Revisão Prevista"
            value={pca.data_revisao_prevista ? dayjs(pca.data_revisao_prevista).format('DD/MM/YYYY') : '—'}
          />
          <InfoStat
            label="Revisão Realizada"
            value={pca.data_revisao_realizada ? dayjs(pca.data_revisao_realizada).format('DD/MM/YYYY') : '—'}
          />
          <InfoStat label="Criado em" value={dayjs(pca.criado_em).format('DD/MM/YYYY')} />
        </SimpleGrid>
      </Paper>

      {/* Tabs */}
      <Paper p="lg" withBorder shadow="sm">
        <Tabs defaultValue="overview" variant="outline" radius="md">
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconClipboardList size={16} />}>
              Visão Geral
            </Tabs.Tab>
            <Tabs.Tab value="medicoes" leftSection={<IconChartHistogram size={16} />}>
              Medições de Ruído
            </Tabs.Tab>
            <Tabs.Tab value="acoes" leftSection={<IconChecks size={16} />}>
              Ações
            </Tabs.Tab>
            <Tabs.Tab value="treinamentos" leftSection={<IconSchool size={16} />}>
              Treinamentos
            </Tabs.Tab>
            <Tabs.Tab value="epis" leftSection={<IconShieldCheck size={16} />}>
              EPIs
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="lg">
            <Stack gap="lg">
              <Card withBorder radius="md">
                <Title order={5} c="slate.600" mb={6}>Diagnóstico da situação</Title>
                <Text size="sm" c={pca.diagnostico_situacao ? undefined : 'dimmed'}>
                  {pca.diagnostico_situacao ?? 'Não preenchido.'}
                </Text>
              </Card>
              <Card withBorder radius="md">
                <Title order={5} c="slate.600" mb={6}>Objetivos</Title>
                <Text size="sm" c={pca.objetivos ? undefined : 'dimmed'} style={{ whiteSpace: 'pre-wrap' }}>
                  {pca.objetivos ?? 'Não preenchidos.'}
                </Text>
              </Card>
              {pca.ia_resumo && (
                <Card withBorder radius="md" className="bg-teal-50/40 border-teal-200">
                  <Title order={5} c="teal.7" mb={6}>Resumo (IA)</Title>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{pca.ia_resumo}</Text>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="medicoes" pt="lg">
            {companyId && (
              <MedicoesRuidoTable pcaId={pca.id} companyId={companyId} canEdit={canManagePCA} />
            )}
          </Tabs.Panel>

          <Tabs.Panel value="acoes" pt="lg">
            <AcoesPCATable pcaId={pca.id} canEdit={canManagePCA} />
          </Tabs.Panel>

          <Tabs.Panel value="treinamentos" pt="lg">
            {companyId && (
              <TreinamentosTable pcaId={pca.id} companyId={companyId} canEdit={canManagePCA} />
            )}
          </Tabs.Panel>

          <Tabs.Panel value="epis" pt="lg">
            <PlaceholderTab
              icon={<IconShieldCheck size={28} className="text-slate-300" />}
              title="EPIs do programa"
              description="Use o módulo EPIs no menu principal para registrar entregas. Em breve aqui aparecerá a visão agrupada por funcionário."
            />
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Stack>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={2}>{label}</Text>
      <Text size="sm" fw={600}>{value}</Text>
    </div>
  );
}

function PlaceholderTab({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Stack align="center" py="xl" gap={6}>
      {icon}
      <Text fw={700}>{title}</Text>
      <Text size="sm" c="dimmed" maw={360} ta="center">{description}</Text>
    </Stack>
  );
}
