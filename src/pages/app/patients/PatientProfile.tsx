import { useEffect, useState } from 'react';
import { 
  Title, 
  Text, 
  Button, 
  Paper, 
  Group, 
  Avatar, 
  Tabs, 
  Timeline, 
  Textarea, 
  Badge, 
  Grid, 
  LoadingOverlay, 
  ThemeIcon,
  Divider,
  ActionIcon,
  Tooltip,
  Menu,
  Modal
} from '@mantine/core';
import { 
  IconArrowLeft, 
  IconActivity, 
  IconFileText, 
  IconId, 
  IconEar, 
  IconSend, 
  IconClock, 
  IconUser,
  IconBuildingFactory, 
  IconBriefcase,
  IconCheck,
  IconAlertTriangle,
  IconEye,
  IconPlayerPlay,
  IconBrain,
  IconStethoscope,
  IconActivityHeartbeat
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../../lib/supabase';
import { G2A_BRAIN_URL } from '../../../lib/g2aBrain';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { EPIHistoricoTab } from '../../../components/EPI/EPIHistoricoTab';
import { AuditLogPanel } from '../../../components/AuditLogPanel';
import { IconShieldCheck, IconHistory } from '@tabler/icons-react';

// Configura o DayJS para português
dayjs.locale('pt-br');

export function PatientProfile() {
  const { companyId, patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estados
  const [patient, setPatient] = useState<any>(null);
  const [evolutions, setEvolutions] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEvolution, setNewEvolution] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // States para a Análise Individual G2A Brain
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analysisContent, setAnalysisContent] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<'dossie' | 'predictive' | 'occupational'>('dossie');
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // 1. Função de Busca de Dados
  const fetchData = async () => {
    if (!patientId) return;
    setLoading(true);
    
    try {
      // A. Busca Dados do Paciente
      const { data: pData, error: pError } = await supabase
        .from('employees')
        .select(`*, sectors (name), job_roles (name), ghe (name)`)
        .eq('id', patientId)
        .single();
      
      if (pError) throw pError;
      setPatient(pData);

      // B. Busca Evoluções Clínicas
      const { data: eData } = await supabase
        .from('clinical_evolutions')
        .select(`*, profiles:professional_id (full_name)`)
        .eq('employee_id', patientId)
        .order('created_at', { ascending: false });

      if (eData) setEvolutions(eData);

      // C. Busca Histórico de Exames (Audiometrias)
      const { data: exData, error: exError } = await supabase
        .from('audiometric_exams')
        .select('*')
        .eq('employee_id', patientId)
        .order('exam_date', { ascending: false });

      if (exError) console.error(exError);
      if (exData) setExams(exData);

    } catch (err: any) {
      console.error('Erro ao carregar perfil:', err);
      toast.error('Falha ao carregar dados do paciente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [patientId]);

  // 2. Função para Salvar Nova Evolução
  const handleAddEvolution = async () => {
    if (!newEvolution.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('clinical_evolutions').insert([
        {
          employee_id: patientId,
          professional_id: user?.id,
          content: newEvolution
        }
      ]);

      if (error) throw error;
      
      toast.success('Evolução registrada');
      setNewEvolution('');
      fetchData(); 
    } catch (err: any) {
      toast.error('Erro ao salvar evolução');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Função de Navegação Inteligente (Visualizar ou Realizar)
  const handleExamNavigation = (exam: any) => {
    // Verifica se o exame já tem dados de limiares salvos
    const hasData = exam.thresholds_od_air && Object.keys(exam.thresholds_od_air).length > 0;
    
    if (hasData) {
      // Se tem dados -> Vai para tela de Visualização (Read Only)
      navigate(`/app/${companyId}/exames/${exam.id}/visualizar`);
    } else {
      // Se não tem dados -> Vai para tela de Realização (Edição)
      navigate(`/app/${companyId}/exames/${exam.id}/realizar`);
    }
  };

  const handleNewExam = async () => {
    try {
      const toastId = toast.loading('Criando nova audiometria...');
      const { data, error } = await supabase
        .from('audiometric_exams')
        .insert({
          employee_id: patientId,
          company_id: companyId,
          exam_date: new Date().toISOString().split('T')[0],
          exam_type: 'periodico',
          is_reference: false,
          rest_hours_ok: true,
          meatoscopy_ok: true
        })
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success('Exame iniciado', { id: toastId });
      navigate(`/app/${companyId}/exames/${data.id}/realizar`);
    } catch (err: any) {
      toast.error('Erro ao iniciar nova audiometria: ' + err.message);
    }
  };

  const handleAnalyzePatient = async (type: 'dossie' | 'predictive' | 'occupational' = 'dossie') => {
    setAnalysisType(type);
    setAnalysisModalOpen(true);
    setAnalysisLoading(true);
    setAnalysisContent(null);
    try {
      if (type === 'occupational') {
        const { data: latestExam, error } = await supabase
          .from('audiometric_exams')
          .select('diagnosis_text, id')
          .eq('employee_id', patientId)
          .order('exam_date', { ascending: false })
          .limit(1)
          .single();
          
        if (error || !latestExam || !latestExam.diagnosis_text) {
          throw new Error('Nenhum exame recente com laudo da IA encontrado para este funcionário.');
        }

        let aiInsights = '';
        try {
          const parsed = typeof latestExam.diagnosis_text === 'string' ? JSON.parse(latestExam.diagnosis_text) : latestExam.diagnosis_text;
          aiInsights = parsed.ai_insights || 'Laudo não encontrado no formato esperado.';
        } catch(e) {
          aiInsights = 'Erro ao processar o formato do laudo.';
        }

        setAnalysisContent(`**Parecer Ocupacional (Último Exame):**\n\n${aiInsights}`);
        
        await supabase.from('ai_occupational_reports').insert({
          employee_id: patientId,
          company_id: companyId,
          exam_id: latestExam.id,
          report_text: aiInsights,
          generated_by: user?.id
        });
        
      } else {
        const endpoint = type === 'predictive' ? 'predictive-risk' : 'analysis';
        const response = await fetch(`${G2A_BRAIN_URL}/api/v1/patients/${patientId}/${endpoint}?company_id=${companyId}`);
        if (!response.ok) throw new Error('Falha ao gerar análise.');
        const result = await response.json();
        
        if (type === 'predictive') {
          const { risco, justificativa } = result;
          setAnalysisContent(`**Nível de Risco PAINPSE:** ${risco}\n\n**Justificativa Preditiva:**\n${justificativa}`);
        } else {
          setAnalysisContent(result.analysis);
        }
      }
    } catch (err: any) {
      toast.error('Erro na análise da IA: ' + err.message);
      setAnalysisModalOpen(false);
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading) return <LoadingOverlay visible overlayProps={{ blur: 2 }} />;

  if (!patient && !loading) return (
    <div className="text-center p-10">
      <Text c="red">Paciente não encontrado.</Text>
      <Button mt="md" onClick={() => navigate(-1)}>Voltar</Button>
    </div>
  );

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20">
      
      {/* HEADER NAVEGAÇÃO */}
      <Button 
        variant="subtle" 
        color="gray" 
        size="sm" 
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate(`/app/${companyId}/pacientes`)}
      >
        Voltar para Lista
      </Button>

      {/* HERO CARD */}
      <Paper 
        p="xl" 
        radius="xl" 
        className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center lg:items-start">
          <div className="flex flex-col items-center">
            <Avatar size={120} radius="100%" className="border-4 border-white/30 shadow-lg bg-white/10 text-white text-4xl mb-3">
              {patient.full_name.charAt(0)}
            </Avatar>
            <Badge variant="filled" color={patient.is_active ? 'teal' : 'red'} size="lg" className="shadow-sm">
              {patient.is_active ? 'ATIVO' : 'INATIVO'}
            </Badge>
          </div>
          
          <div className="flex-1 text-center lg:text-left space-y-4">
            <div>
              <Title order={2} className="text-white text-3xl font-bold tracking-tight mb-1">
                {patient.full_name}
              </Title>
              {/* Correção de Responsividade do Group */}
              <Group justify="center" gap="xs" className="text-blue-100/90" style={{ justifyContent: 'var(--justify)' }}>
                 <div className="flex flex-wrap justify-center lg:justify-start gap-3 items-center">
                    <IconId size={18} />
                    <Text size="md" fw={500}>{patient.cpf || 'Sem CPF'}</Text>
                    <Divider orientation="vertical" color="white" className="opacity-30 h-4 mx-2 hidden sm:block" />
                    <Text size="md">{dayjs().diff(patient.birth_date, 'year')} anos</Text>
                 </div>
              </Group>
            </div>

            {/* Chips de Informação Corrigidos */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 min-w-[120px]">
                <Group gap={6} mb={2} className="opacity-80">
                  <IconBuildingFactory size={14} />
                  <Text size="xs" tt="uppercase" fw={700}>Setor</Text>
                </Group>
                <Text size="sm" fw={600} className="truncate">{patient.sectors?.name || '---'}</Text>
              </div>

              <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 min-w-[120px]">
                <Group gap={6} mb={2} className="opacity-80">
                  <IconBriefcase size={14} />
                  <Text size="xs" tt="uppercase" fw={700}>Função</Text>
                </Group>
                <Text size="sm" fw={600} className="truncate">{patient.job_roles?.name || '---'}</Text>
              </div>

              <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 min-w-[120px]">
                <Group gap={6} mb={2} className="opacity-80">
                  <IconActivity size={14} />
                  <Text size="xs" tt="uppercase" fw={700}>GHE</Text>
                </Group>
                <Text size="sm" fw={600} className="truncate">{patient.ghe?.name || 'Padrão'}</Text>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-auto min-w-[220px]">
             <Button 
               fullWidth 
               variant="white" 
               color="blue" 
               radius="xl" 
               size="md"
               leftSection={<IconEar size={20} />}
               className="shadow-xl hover:scale-105 transition-transform font-bold text-blue-700"
               onClick={handleNewExam}
             >
               Nova Audiometria
             </Button>

             <Menu shadow="md" width={250} position="bottom-end" radius="md">
               <Menu.Target>
                 <Button fullWidth variant="outline" color="white" radius="xl" className="border-white/40 text-white hover:bg-white/10">
                   Gerar Documentos
                 </Button>
               </Menu.Target>
               <Menu.Dropdown>
                 <Menu.Label>Documentos e IA (G2A Brain)</Menu.Label>
                 <Menu.Item 
                   color="indigo"
                   leftSection={<IconFileText size={16} />} 
                   onClick={() => handleAnalyzePatient('dossie')}
                 >
                   Emitir Relatório Individual.
                 </Menu.Item>
                 <Menu.Item 
                   color="teal"
                   leftSection={<IconStethoscope size={16} />} 
                   onClick={() => handleAnalyzePatient('occupational')}
                 >
                   Emitir Laudo Ocupacional.
                 </Menu.Item>
                 <Menu.Item 
                   color="grape"
                   leftSection={<IconActivityHeartbeat size={16} />} 
                   onClick={() => handleAnalyzePatient('predictive')}
                 >
                   Análise de Risco PAINPSE
                 </Menu.Item>
               </Menu.Dropdown>
             </Menu>
          </div>
        </div>
      </Paper>

      {/* TABS */}
      <Tabs defaultValue="exams" radius="lg" variant="pills" classNames={{ list: 'mb-6 space-x-2' }}>
        <Tabs.List>
          <Tabs.Tab value="evolution" leftSection={<IconActivity size={18} />}>
            Evolução Clínica
          </Tabs.Tab>
          <Tabs.Tab value="exams" leftSection={<IconFileText size={18} />}>
            Histórico de Exames
          </Tabs.Tab>
          <Tabs.Tab value="data" leftSection={<IconUser size={18} />}>
            Dados Cadastrais
          </Tabs.Tab>
          <Tabs.Tab value="epi" leftSection={<IconShieldCheck size={18} />}>
            EPI
          </Tabs.Tab>
          <Tabs.Tab value="audit" leftSection={<IconHistory size={18} />}>
            Auditoria
          </Tabs.Tab>
        </Tabs.List>

        {/* 1. ABA EVOLUÇÃO */}
        <Tabs.Panel value="evolution">
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="lg" radius="xl" className="bg-white border border-slate-200 shadow-sm h-full sticky top-4">
                <Title order={5} mb="md" className="flex items-center gap-2 text-slate-700">
                  <ThemeIcon variant="light" size="md" radius="md" color="blue"><IconFileText size={16}/></ThemeIcon>
                  Nova Anotação
                </Title>
                <Textarea
                  placeholder="Descreva queixas, orientações ou observações do atendimento..."
                  minRows={6}
                  autosize
                  radius="md"
                  variant="filled"
                  value={newEvolution}
                  onChange={(e) => setNewEvolution(e.currentTarget.value)}
                  className="mb-4"
                />
                <Button fullWidth radius="xl" leftSection={<IconSend size={16} />} onClick={handleAddEvolution} loading={submitting}>
                  Registrar
                </Button>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 8 }}>
              <Paper p="xl" radius="xl" className="bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm min-h-[500px]">
                <Title order={5} mb="xl" className="text-slate-700 flex items-center justify-between">
                  <span>Histórico Clínico</span>
                  <Badge variant="light" color="gray">{evolutions.length} registros</Badge>
                </Title>
                
                {evolutions.length > 0 ? (
                  <Timeline active={-1} bulletSize={36} lineWidth={2} color="blue">
                    {evolutions.map((ev) => (
                      <Timeline.Item 
                        key={ev.id} 
                        bullet={<IconClock size={18} />} 
                        title={
                          <Text size="sm" fw={700} className="text-slate-800">
                            {dayjs(ev.created_at).format('DD [de] MMMM, YYYY')}
                            <span className="text-slate-400 font-normal ml-2">às {dayjs(ev.created_at).format('HH:mm')}</span>
                          </Text>
                        }
                      >
                        <Text c="dimmed" size="xs" mb={8} fw={500} className="uppercase tracking-wide text-blue-600">
                          {ev.profiles?.full_name || 'Profissional Desconhecido'}
                        </Text>
                        <Paper p="md" radius="lg" bg="gray.0" className="border border-gray-100/50 shadow-sm">
                          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{ev.content}</Text>
                        </Paper>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                    <IconActivity size={48} className="mb-4 opacity-20" />
                    <Text fw={500}>Nenhuma evolução registrada.</Text>
                  </div>
                )}
              </Paper>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* 2. ABA EXAMES - LISTA COM NAVEGAÇÃO INTELIGENTE */}
        <Tabs.Panel value="exams">
          {exams.length > 0 ? (
            <div className="space-y-4">
              {exams.map((exam) => {
                const isNormal = exam.result_status === 'normal';
                const hasData = exam.thresholds_od_air && Object.keys(exam.thresholds_od_air).length > 0;
                
                return (
                  <Paper key={exam.id} p="lg" radius="xl" withBorder className="hover:shadow-md transition-shadow">
                    <Group justify="space-between">
                      <Group>
                        <ThemeIcon size="xl" radius="md" color={hasData ? (isNormal ? 'teal' : 'red') : 'gray'} variant="light">
                          {hasData ? (isNormal ? <IconCheck size={24}/> : <IconAlertTriangle size={24}/>) : <IconClock size={24}/>}
                        </ThemeIcon>
                        <div>
                          <Group gap="xs">
                            <Badge variant="outline" color={exam.exam_type === 'reteste' ? 'red' : 'blue'} size="sm" tt="uppercase">
                              {exam.exam_type.replace('_', ' ')}
                            </Badge>
                            {exam.is_reference && (
                              <Badge size="sm" color="teal" variant="light">
                                REFERÊNCIA
                              </Badge>
                            )}
                          </Group>
                          <Text size="sm" c="dimmed">
                            Realizado em {dayjs(exam.exam_date).format('DD/MM/YYYY')}
                          </Text>
                        </div>
                      </Group>

                      <Group>
                        {hasData ? (
                          <Badge size="lg" color={isNormal ? 'teal' : 'red'} variant="light">
                            {isNormal ? 'Normal' : 'Alterado'}
                          </Badge>
                        ) : (
                          <Badge size="lg" color="gray" variant="light">Aguardando</Badge>
                        )}
                        
                        <Tooltip label={hasData ? "Visualizar Laudo" : "Realizar Exame"}>
                          <ActionIcon 
                            size="xl" 
                            variant={hasData ? "subtle" : "filled"} 
                            color={hasData ? "blue" : "blue"} 
                            radius="xl"
                            onClick={() => handleExamNavigation(exam)}
                          >
                            {hasData ? <IconEye size={24} /> : <IconPlayerPlay size={20} />}
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Paper>
                );
              })}
            </div>
          ) : (
            <Paper p={60} radius="xl" className="text-center border border-dashed border-slate-300 bg-slate-50/50">
               <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4">
                  <IconEar size={48} className="text-blue-200" />
               </div>
               <Title order={4} className="text-slate-600 mb-2">Nenhum Exame Encontrado</Title>
               <Text c="dimmed" mb="xl" className="max-w-md mx-auto">
                 Este paciente ainda não possui audiometrias cadastradas.
               </Text>
               <Button 
                  variant="outline" 
                  radius="xl" 
                  color="blue"
                  onClick={() => navigate(`/app/${companyId}/exames`)}
                >
                  Ir para Hub de Exames
               </Button>
            </Paper>
          )}
        </Tabs.Panel>

        {/* 3. ABA DADOS CADASTRAIS */}
        <Tabs.Panel value="data">
          <Paper p="xl" radius="xl" className="bg-white border border-slate-200 shadow-sm">
             <Grid gutter="xl">
               <Grid.Col span={12}><Text size="sm" fw={700} tt="uppercase" c="dimmed">Dados Pessoais</Text></Grid.Col>
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">Nome Completo</Text>
                 <Text fw={500}>{patient?.full_name}</Text>
               </Grid.Col>
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">CPF</Text>
                 <Text fw={500}>{patient?.cpf || '-'}</Text>
               </Grid.Col>
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">RG</Text>
                 <Text fw={500}>{patient?.rg || '-'}</Text>
               </Grid.Col>
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">Data de Nascimento</Text>
                 <Text fw={500}>{dayjs(patient?.birth_date).format('DD/MM/YYYY')}</Text>
               </Grid.Col>
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">Gênero</Text>
                 <Text fw={500}>{patient?.gender === 'M' ? 'Masculino' : 'Feminino'}</Text>
               </Grid.Col>
               <Grid.Col span={12}><Divider my="xs" /></Grid.Col>
               <Grid.Col span={12}><Text size="sm" fw={700} tt="uppercase" c="dimmed">Dados Profissionais</Text></Grid.Col>
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">Matrícula</Text>
                 <Text fw={500}>{patient?.matricula || '-'}</Text>
               </Grid.Col>
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">Admissão</Text>
                 <Text fw={500}>{patient?.admission_date ? dayjs(patient.admission_date).format('DD/MM/YYYY') : '-'}</Text>
               </Grid.Col>
             </Grid>
          </Paper>
        </Tabs.Panel>

        {/* TAB EPI */}
        <Tabs.Panel value="epi">
          {patientId && <EPIHistoricoTab employeeId={patientId} />}
        </Tabs.Panel>

        {/* TAB AUDITORIA */}
        <Tabs.Panel value="audit">
          {patientId && (
            <AuditLogPanel
              entidade="employees"
              entidadeId={patientId}
              title="Histórico do funcionário"
            />
          )}
        </Tabs.Panel>

      </Tabs>

      {/* MODAL DA ANÁLISE INDIVIDUAL G2A */}
      <Modal
        opened={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        title={
          <Group>
            <IconBrain size={24} color={analysisType === 'predictive' ? "#e8590c" : analysisType === 'occupational' ? "#0ca678" : "#4f46e5"} />
            <Text fw={700} size="lg">
              {analysisType === 'predictive' ? 'G2A Preditivo' : analysisType === 'occupational' ? 'Laudo Ocupacional G2A' : 'Dossiê Ocupacional'} : {patient?.full_name}
            </Text>
          </Group>
        }
        size="xl"
        radius="md"
      >
        <div className="relative min-h-[200px]">
          <LoadingOverlay visible={analysisLoading} overlayProps={{ blur: 2 }} loaderProps={{ type: 'bars' }} />
          {analysisContent && (
            <div className="prose prose-sm max-w-none prose-h3:text-indigo-800 prose-h2:text-slate-800 prose-a:text-blue-600">
              <ReactMarkdown>{analysisContent}</ReactMarkdown>
            </div>
          )}
        </div>
        {!analysisLoading && (
          <Group justify="right" mt="xl">
            <Button variant="light" onClick={() => setAnalysisModalOpen(false)}>Fechar</Button>
          </Group>
        )}
      </Modal>

    </div>
  );
}
