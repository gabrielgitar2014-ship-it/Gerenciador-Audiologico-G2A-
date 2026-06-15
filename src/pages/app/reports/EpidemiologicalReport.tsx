import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Title, Text, Button, Paper, Group, ActionIcon, Tooltip, Select, LoadingOverlay, ThemeIcon } from '@mantine/core';
import { IconArrowLeft, IconRobot, IconDownload, IconHeartbeat } from '@tabler/icons-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import { generateProfessionalReport } from '../../../utils/professionalPdfGenerator';
import { useAuth } from '../../../contexts/AuthContext';
import { G2A_BRAIN_URL } from '../../../lib/g2aBrain';

export function EpidemiologicalReport() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState<string>('todos');
  const [reportContent, setReportContent] = useState<string | null>(null);

  const currentYear = dayjs().year();
  const yearsData = [
    { value: 'todos', label: 'Todos os Anos' },
    ...Array.from({ length: 25 }, (_, i) => {
      const y = (currentYear - i).toString();
      return { value: y, label: y };
    })
  ];

  const generateReport = async () => {
    setLoading(true);
    setReportContent(null);
    try {
      const profId = user?.id || '';
      const response = await fetch(`${G2A_BRAIN_URL}/api/v1/reports/epidemiological?company_id=${companyId}&year=${year}&professional_id=${profId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar o relatório pela IA.');
      }

      const data = await response.json();
      setReportContent(data.report);
      
      if (data.cached) {
        toast.info('Carregado relatório salvo anteriormente.');
      } else {
        toast.success('Relatório gerado e salvo com sucesso!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao comunicar com o G2A Brain.');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!reportContent) return;

    const profName = user?.user_metadata?.full_name || 'Profissional Responsável';
    const profDoc = user?.user_metadata?.document || 'CRFa / CRM - A Definir';

    // Limpeza básica do markdown para texto corrido
    const cleanContent = reportContent.replace(/###\s/g, '').replace(/\*\*/g, '').replace(/-\s/g, '');

    generateProfessionalReport({
      title: `Relatório Epidemiológico PCA`,
      meta: {
        'Ano de Referência': year === 'todos' ? 'Histórico Completo' : year,
        'Data de Emissão': dayjs().format('DD/MM/YYYY'),
        // Nota: O nome da empresa não está disponível neste componente.
        // O ideal seria buscá-lo ou recebê-lo como propriedade.
        'Empresa': 'Nome da Empresa (Placeholder)',
      },
      sections: [
        {
          title: 'Parecer Técnico e Análise Epidemiológica',
          content: cleanContent,
        },
      ],
      signature: {
        name: profName,
        document: profDoc,
      },
    });
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 animate-fade-in pb-16 relative">
      <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} loaderProps={{ type: 'bars' }} />

      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <Tooltip label="Voltar para Central" position="bottom" withArrow>
          <ActionIcon variant="light" size="lg" radius="md" onClick={() => navigate(-1)}>
            <IconArrowLeft size={20} />
          </ActionIcon>
        </Tooltip>
        <div>
          <Title order={2} className="text-slate-800">Relatório Epidemiológico</Title>
          <Text size="sm" c="dimmed">Geração de parecer anual focado em saúde ocupacional com IA</Text>
        </div>
      </div>

      <Paper p="lg" radius="md" withBorder className="bg-white">
        <Group align="flex-end" mb="md">
          <Select
            label="Ano Base"
            data={yearsData}
            value={year}
            onChange={(val) => setYear(val || 'todos')}
            className="w-48"
          />
          <Button 
            leftSection={<IconRobot size={18} />} 
            onClick={generateReport}
            color="indigo"
          >
            Gerar Relatório com G2A Brain
          </Button>
        </Group>

        <Text size="sm" c="dimmed">
          O G2A Brain irá analisar o banco de dados da empresa no período selecionado, cruzando os exames de audiometria com os setores e funções para identificar setores de risco, listar os funcionários que precisam de atenção, e elaborar recomendações sobre EPIs e treinamentos.
        </Text>
      </Paper>

      {reportContent && (
        <Paper p="xl" radius="md" withBorder className="bg-white shadow-sm">
          <Group justify="space-between" mb="xl" className="border-b border-slate-100 pb-4">
            <Group>
              <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
                <IconHeartbeat size={20} />
              </ThemeIcon>
              <Title order={3}>Parecer Epidemiológico - {year === 'todos' ? 'Histórico Completo' : year}</Title>
            </Group>
            <Button variant="light" leftSection={<IconDownload size={16} />} onClick={exportToPDF}>
              Exportar PDF Profissional
            </Button>
          </Group>

          <div className="prose prose-slate max-w-none prose-h3:text-indigo-800 prose-h2:text-slate-800 prose-a:text-blue-600 prose-p:leading-relaxed">
            <ReactMarkdown>{reportContent}</ReactMarkdown>
          </div>
        </Paper>
      )}
    </div>
  );
}
 
