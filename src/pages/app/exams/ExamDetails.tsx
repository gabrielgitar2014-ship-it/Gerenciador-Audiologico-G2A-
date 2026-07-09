import { useEffect, useState } from 'react';
import { 
  Title, Paper, Grid, Group, Text, LoadingOverlay, Badge, Avatar, 
  ActionIcon, ThemeIcon, Divider, Button, Alert, Card, Stack
} from '@mantine/core';
import {
  IconArrowLeft, IconEar, IconPrinter, IconCalendarEvent,
  IconAlertCircle, IconBrain, IconStethoscope, IconFileDescription,
  IconPencil, IconClipboardHeart, IconEarOff, IconClock, IconSparkles
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { AudiogramGraph } from '../../../components/Audiogram/AudiogramGraph';
import { AuditLogPanel } from '../../../components/AuditLogPanel';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { G2A_BRAIN_URL } from '../../../lib/g2aBrain';
import dayjs from 'dayjs';

// Mapeia os limiares salvos no Supabase (chaves "250".."8000"/"500".."4000")
// para o formato LimiaresOrelha esperado pelo G2A Brain (hz_250.."co_4000").
const FREQ_AIR_MAP: Record<string, string> = {
  '250': 'hz_250', '500': 'hz_500', '1000': 'hz_1000', '2000': 'hz_2000',
  '3000': 'hz_3000', '4000': 'hz_4000', '6000': 'hz_6000', '8000': 'hz_8000',
};
const FREQ_BONE_MAP: Record<string, string> = {
  '500': 'co_500', '1000': 'co_1000', '2000': 'co_2000', '4000': 'co_4000',
};

function montarLimiares(thresholdsAir: Record<string, number> | null, thresholdsBone: Record<string, number> | null) {
  const limiares: Record<string, number> = {};
  Object.entries(thresholdsAir || {}).forEach(([freq, valor]) => {
    const campo = FREQ_AIR_MAP[freq];
    if (campo && valor !== null && valor !== undefined) limiares[campo] = Number(valor);
  });
  Object.entries(thresholdsBone || {}).forEach(([freq, valor]) => {
    const campo = FREQ_BONE_MAP[freq];
    if (campo && valor !== null && valor !== undefined) limiares[campo] = Number(valor);
  });
  return limiares;
}

export function ExamDetails() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingLaudo, setGeneratingLaudo] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('audiometric_exams')
          .select(`
            *,
            employee:employee_id (full_name, birth_date, gender, cpf),
            professional:professional_id (full_name, crfa_numero, crfa_regiao),
            editor:last_edited_by (full_name),
            pca:pca_id (id, ano, versao, status)
          `)
          .eq('id', examId)
          .single();

        if (fetchError) throw fetchError;
        setExamData(data);

        if (data.diagnosis_text) {
          try {
            let parsed = JSON.parse(data.diagnosis_text);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            setDiagnosis(parsed);
          } catch (e) {
            console.error("Erro ao enviar dados, procure pela assistência.", e);
          }
        }
      } catch (err: any) {
        setError('Erro ao carregar os dados. Verifique a conexão.');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId]);

  const handlePrint = () => {
    window.print();
  };

  const handleGerarLaudoIA = async () => {
    if (!examData || !diagnosis) return;
    setGeneratingLaudo(true);
    try {
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*, sectors(name), job_roles(name), companies(nome_fantasia), ghe(has_noise_risk)')
        .eq('id', examData.employee_id)
        .single();

      if (employeeError) throw employeeError;

      const trabalhador = {
        funcionario_id: employee.id,
        nome: employee.full_name,
        data_nascimento: employee.birth_date,
        sexo: employee.gender,
        cargo: employee.job_roles?.name ?? null,
        setor: employee.sectors?.name ?? null,
        empresa: employee.companies?.nome_fantasia ?? null,
        data_admissao: employee.admission_date,
        exposto_ruido: employee.exposto_ruido ?? employee.ghe?.has_noise_risk ?? false,
        anos_exposicao_ruido: employee.anos_exposicao_ruido,
        usa_epi_auditivo: employee.usa_epi_auditivo,
      };

      const exame_atual = {
        audiometria_id: examData.id,
        data_exame: examData.exam_date,
        tipo: examData.exam_type,
        orelha_direita: montarLimiares(examData.thresholds_od_air, examData.thresholds_od_bone),
        orelha_esquerda: montarLimiares(examData.thresholds_oe_air, examData.thresholds_oe_bone),
        repouso_auditivo_horas: examData.repouso_auditivo_horas ?? null,
        uso_epi_no_dia: examData.uso_epi_no_dia ?? null,
      };

      const response = await fetch(`${G2A_BRAIN_URL}/gerar/laudo-individual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_dados: {
            trabalhador,
            exame_atual,
            exame_referencia: null,
            historico_exames: [],
          },
          resultado_ocupacional: diagnosis.ocupacional,
          resultado_clinico: diagnosis.clinico,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar laudo (${response.status})`);
      }

      const result = await response.json();
      const janela = window.open('', '_blank');
      if (janela) {
        janela.document.write(result.conteudo_html);
        janela.document.close();
      }
    } catch (err: any) {
      toast.error('Erro ao gerar laudo com IA: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setGeneratingLaudo(false);
    }
  };

  if (loading) return <LoadingOverlay visible overlayProps={{ blur: 2 }} />;
  if (error) return <Alert color="red" icon={<IconAlertCircle />}>{error}</Alert>;
  if (!examData) return null;

  const employeeName = examData.employee?.full_name || '---';
  const employeeCpf = examData.employee?.cpf || '---';
  const employeeAge = examData.employee?.birth_date ? dayjs().diff(examData.employee.birth_date, 'year') : '--';
  const examDate = examData.exam_date ? dayjs(examData.exam_date).format('DD/MM/YYYY') : '--';
  
  const fonoName = examData.professional?.full_name || 'Profissional não identificado';
  const fonoCRFa = examData.professional?.crfa_numero ? `CRFa: ${examData.professional.crfa_numero}` : 'CRFa: ---';
  const fonoRegiao = examData.professional?.crfa_regiao ? ` - ${examData.professional.crfa_regiao}ª Região` : '';

  const ocupacional = diagnosis?.ocupacional || {};
  const orelhaResumo = (orelha: any) => ({
    mediaOms: orelha?.media_tritonal_conversacao,
    mediaPca346: orelha?.media_tritonal_pca,
    grauOms: orelha?.classificacao_conversacao,
    tipoPerda: orelha?.entalhe_acustico_detectado
      ? 'Entalhe acústico (3k-6k)'
      : (orelha?.classificacao_pca ?? 'Sem entalhe característico'),
  });
  const od = orelhaResumo(ocupacional.orelha_direita);
  const oe = orelhaResumo(ocupacional.orelha_esquerda);
  const aiInsights = diagnosis?.ai_insights || "Processando análise...";
  const isNormal = examData.result_status === 'normal';

  // Dados de edição
  const wasEdited = !!examData.last_edited_at;
  const editorName = examData.editor?.full_name || 'Profissional não identificado';
  const editedAt = examData.last_edited_at ? dayjs(examData.last_edited_at).format('DD/MM/YYYY [às] HH:mm') : '';
  const editReason = examData.edit_reason || '';

  const toPoints = (data: any) => data ? Object.entries(data)
    .filter(([_, d]) => d !== null && d !== undefined && d !== '')
    .map(([f, d]) => ({ freq: Number(f), db: Number(d) }))
    .filter(p => !isNaN(p.db)) : [];

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20">
      
      {/* 1. BARRA DE AÇÕES (OCULTA NO PDF) */}
      <div className="print:hidden bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
        <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={18}/>} onClick={() => navigate(-1)}>
          Voltar
        </Button>
        <Group>
          <Badge size="lg" color={isNormal ? 'teal' : 'orange'}>
            Status: {examData.result_status?.toUpperCase()}
          </Badge>
          {wasEdited && (
            <Badge size="lg" color="orange" variant="light" leftSection={<IconPencil size={14} />}
              styles={{ label: { textTransform: 'none' } }}>
              Editado
            </Badge>
          )}
          <Button
            color="violet"
            variant="light"
            leftSection={<IconSparkles size={18}/>}
            onClick={handleGerarLaudoIA}
            loading={generatingLaudo}
          >
            Gerar Laudo Completo (IA)
          </Button>
          <Button color="blue" leftSection={<IconPrinter size={18}/>} onClick={handlePrint}>
            Gerar PDF do Laudo
          </Button>
        </Group>
      </div>

      {/* 2. O LAUDO PARA IMPRESSÃO */}
      <Paper id="printable-laudo" p="xl" radius="md" withBorder className="bg-white shadow-sm print:border-none print:shadow-none print:p-0">
        
        <div className="text-center mb-8">
          <Title order={2} className="text-slate-800 uppercase tracking-tight">Relatório de Avaliação Audiométrica</Title>
          <Text size="sm" c="dimmed">Documento Gerado via G2a</Text>
          <Text size="xs" c="dimmed" mt="xs">ID do Registro: {examId}</Text>
        </div>

        <Divider mb="xl" label="Identificação do Paciente" labelPosition="center" />

        <Grid mb="xl">
          <Grid.Col span={6}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Nome do Colaborador</Text>
            <Text fw={600} size="md">{employeeName}</Text>
          </Grid.Col>
          <Grid.Col span={3}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>CPF</Text>
            <Text fw={600}>{employeeCpf}</Text>
          </Grid.Col>
          <Grid.Col span={3}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Data do Exame</Text>
            <Text fw={600}>{examDate}</Text>
          </Grid.Col>
        </Grid>

        {/* Alerta de edição — aparece no laudo impresso também */}
        {wasEdited && (
          <div className="mb-6 p-4 rounded-lg border border-orange-200 bg-orange-50 print:bg-transparent print:border-orange-300">
            <Group gap={8} mb={4}>
              <IconPencil size={16} className="text-orange-600" />
              <Text size="sm" fw={700} c="orange.8">Registro de Edição</Text>
            </Group>
            <Text size="sm" c="dark">
              Este laudo foi editado por <strong>{editorName}</strong> em <strong>{editedAt}</strong>.
            </Text>
            {editReason && (
              <Text size="sm" c="dimmed" mt={4} fs="italic">
                Motivo: {editReason}
              </Text>
            )}
          </div>
        )}

        {/* Dados Clínicos Complementares (queixa, reteste, PCA) */}
        {(examData.queixa_auditiva || examData.reteste_indicado || examData.pca) && (
          <div className="mb-8">
            <Group mb="sm" gap={8}>
              <ThemeIcon size="md" radius="md" color="teal" variant="light">
                <IconClipboardHeart size={16} />
              </ThemeIcon>
              <Title order={5} className="m-0">Dados Clínicos Complementares</Title>
            </Group>

            <Stack gap="xs">
              {examData.pca && (
                <Group gap={8}>
                  <Badge color="teal" variant="light" size="md">
                    PCA {examData.pca.ano} (v{examData.pca.versao}) · {examData.pca.status}
                  </Badge>
                  <Text size="sm" c="dimmed">Exame vinculado ao programa de conservação auditiva</Text>
                </Group>
              )}

              {examData.queixa_auditiva && (
                <Alert color="yellow" variant="light" icon={<IconEarOff size={18} />}
                  title="Queixa auditiva relatada">
                  {examData.queixa_descricao || 'Sem descrição registrada.'}
                </Alert>
              )}

              {examData.reteste_indicado && (
                <Alert color="orange" variant="light" icon={<IconClock size={18} />}
                  title={
                    <Group gap={8}>
                      <Text fw={700} size="sm">Reteste indicado</Text>
                      {examData.prazo_reteste && (
                        <Badge color="orange" size="sm" variant="filled"
                          leftSection={<IconCalendarEvent size={12} />}>
                          Até {dayjs(examData.prazo_reteste).format('DD/MM/YYYY')}
                        </Badge>
                      )}
                    </Group>
                  }
                >
                  {examData.motivo_reteste || 'Sem motivo registrado.'}
                </Alert>
              )}
            </Stack>
          </div>
        )}

        {/* Análise da IA */}
        <div className="mb-10 bg-slate-50 p-6 rounded-xl border border-slate-100 print:bg-transparent print:border-slate-200">
          <Group mb="md">
            <IconBrain className="text-blue-600 print:hidden" size={24} />
            <Title order={4}>Sugestão Fonoaudiológica </Title>
          </Group>
          <article className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
            <ReactMarkdown>{aiInsights}</ReactMarkdown>
          </article>
        </div>

        <Title order={4} mb="md" className="flex items-center gap-2">
          <IconStethoscope size={20} className="text-slate-400" /> Resultados Quantitativos
        </Title>

        <Grid mb="xl">
          <Grid.Col span={6}>
            <Card withBorder radius="md">
              <Text fw={700} c="red.8" mb="xs">Orelha Direita (OD)</Text>
              <Text size="sm">Média Tritonal (Silman e Silverman 1997): <b>{od.mediaOms ?? '--'} dB</b></Text>
              <Text size="sm">Média PCA (3k, 4k, 6k): <b>{od.mediaPca346 ?? '--'} dB</b></Text>
              <Text size="sm" mt="xs">Grau: <b>{od.grauOms ?? '--'}</b></Text>
              <Text size="sm">Configuração: <b>{od.tipoPerda}</b></Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={6}>
            <Card withBorder radius="md">
              <Text fw={700} c="blue.8" mb="xs">Orelha Esquerda (OE)</Text>
              <Text size="sm">Média Tritonal (Silman e Silverman): <b>{oe.mediaOms ?? '--'} dB</b></Text>
              <Text size="sm">Média PCA (3k, 4k, 6k): <b>{oe.mediaPca346 ?? '--'} dB</b></Text>
              <Text size="sm" mt="xs">Grau: <b>{oe.grauOms ?? '--'}</b></Text>
              <Text size="sm">Configuração: <b>{oe.tipoPerda}</b></Text>
            </Card>
          </Grid.Col>
        </Grid>

        <Grid mb={50}>
          <Grid.Col span={6}>
             <Paper withBorder p="xs" radius="md">
                <Text size="xs" fw={700} ta="center" mb={5}>AUDIOGRAMA OD</Text>
                <AudiogramGraph ear="right" airPoints={toPoints(examData.thresholds_od_air)} bonePoints={toPoints(examData.thresholds_od_bone)} readonly />
             </Paper>
          </Grid.Col>
          <Grid.Col span={6}>
             <Paper withBorder p="xs" radius="md">
                <Text size="xs" fw={700} ta="center" mb={5}>AUDIOGRAMA OE</Text>
                <AudiogramGraph ear="left" airPoints={toPoints(examData.thresholds_oe_air)} bonePoints={toPoints(examData.thresholds_oe_bone)} readonly />
             </Paper>
          </Grid.Col>
        </Grid>

        {/* RODAPÉ DE ASSINATURA */}
        <div className="mt-20 flex flex-col items-center">
          <div className="w-64 border-t border-slate-400 mb-2"></div>
          <Text fw={700} size="md">{fonoName}</Text>
          <Text size="sm" c="dimmed">{fonoCRFa}{fonoRegiao}</Text>
          <Text size="xs" c="dimmed" mt={4}>Fonoaudiólogo(a) Responsável</Text>
        </div>

      </Paper>

      {/* AUDITORIA — fora do laudo impresso */}
      <div className="print:hidden">
        {examId && (
          <AuditLogPanel
            entidade="audiometric_exams"
            entidadeId={examId}
            title="Histórico de alterações do exame"
          />
        )}
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .mantine-AppShell-main { padding: 0 !important; }
          nav, header, footer, .print\\:hidden { display: none !important; }
          #printable-laudo { border: none !important; margin: 0 !important; padding: 0 !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

    </div>
  );
}
