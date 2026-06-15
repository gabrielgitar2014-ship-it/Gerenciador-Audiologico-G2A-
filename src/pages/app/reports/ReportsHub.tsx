import { Title, Text, SimpleGrid, Card, Group, ThemeIcon, Button } from '@mantine/core';
import { IconHeartbeat, IconFileAnalytics, IconStethoscope } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

export function ReportsHub() {
  const navigate = useNavigate();
  const { companyId } = useParams();

  const reports = [
    {
      title: 'Relatório Epidemiológico (Anual)',
      description: 'Visão macro da saúde auditiva da empresa. Análise por setores, funções, EPIs e detecção de riscos com insights de IA.',
      icon: <IconHeartbeat size={24} />,
      color: 'red',
      link: `/app/${companyId}/relatorios/epidemiologico`,
      available: true
    },
    {
      title: 'Relatório de Absenteísmo',
      description: 'Impacto das alterações de saúde no absenteísmo da empresa. (Em breve)',
      icon: <IconFileAnalytics size={24} />,
      color: 'gray',
      link: '#',
      available: false
    },
    {
      title: 'PCA Individual',
      description: 'Exportação em lote dos prontuários de PCA por trabalhador. (Em breve)',
      icon: <IconStethoscope size={24} />,
      color: 'gray',
      link: '#',
      available: false
    }
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 animate-fade-in pb-16">
      <div className="border-b border-slate-200 pb-4">
        <Title order={2} className="text-slate-800">Central de Relatórios</Title>
        <Text size="sm" c="dimmed">Gere relatórios inteligentes com a IA da G2A</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        {reports.map((report, idx) => (
          <Card key={idx} withBorder shadow="sm" radius="md" className={!report.available ? 'opacity-60 grayscale' : ''}>
            <Group mb="md">
              <ThemeIcon size="xl" radius="md" color={report.color} variant="light">
                {report.icon}
              </ThemeIcon>
              <Text fw={600} size="md" style={{ flex: 1 }}>{report.title}</Text>
            </Group>
            <Text size="sm" c="dimmed" mb="xl" style={{ minHeight: 60 }}>
              {report.description}
            </Text>
            <Button 
              fullWidth 
              variant={report.available ? 'light' : 'subtle'} 
              color={report.color}
              disabled={!report.available}
              onClick={() => report.available && navigate(report.link)}
            >
              {report.available ? 'Acessar Relatório' : 'Em breve'}
            </Button>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  );
}
