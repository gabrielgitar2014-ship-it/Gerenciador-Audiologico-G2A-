import { Button, Paper, Title, Text, Group, FileInput, Progress, Accordion, Badge, ThemeIcon, Card, ActionIcon, ScrollArea } from '@mantine/core';
import { IconUpload, IconDatabaseImport, IconCheck, IconAlertTriangle, IconEye, IconTrash, IconDeviceFloppy } from '@tabler/icons-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';

export function ImportCases() {
  const { companyId } = useParams();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{ file: string; status: 'success' | 'error'; message: string }[]>([]);
  
  // Novo estado para revisão
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleParse = async () => {
    if (!files || files.length === 0) return;
    
    setLoading(true);
    setProgress(0);
    setLogs([]);
    setParsedData([]);

    let allParsed: any[] = [];
    const currentLogs: { file: string; status: 'success' | 'error'; message: string }[] = [];
    const totalFiles = files.length;

    try {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        const simInterval = setInterval(() => {
            setProgress((prev) => (prev < 90 ? prev + 10 : prev));
        }, 500);

        const response = await fetch('http://localhost:8000/api/v1/import-legacy/parse', {
            method: 'POST',
            body: formData,
        });

        clearInterval(simInterval);
        setProgress(100);

        if (!response.ok) {
            throw new Error('Falha ao processar a importação pelo servidor.');
        }

        const result = await response.json();
        
        if (result.parsed_data) {
            allParsed = result.parsed_data;
            setParsedData(allParsed);
            setIsReviewing(true);
        }

        if (result.logs) {
            currentLogs.push(...result.logs);
        }
        
    } catch (err: any) {
        toast.error(`Erro ao processar arquivos: ${err.message}`);
        currentLogs.push({
            file: "Geral",
            status: 'error',
            message: err.message || 'Erro desconhecido',
        });
    } finally {
        setLogs(currentLogs);
        setLoading(false);
    }
  };

  const handleSaveToDatabase = async () => {
      setSaving(true);
      try {
          // Busca a sessão do Supabase localmente no cliente React
          // Isso nos garante o ID do usuário (Fono/Médico logado)
          const { data: { session } } = await supabase.auth.getSession();
          const professionalId = session?.user?.id;

          const payload = {
              company_id: companyId,
              professional_id: professionalId,
              data: parsedData
          };

          const response = await fetch('http://localhost:8000/api/v1/import-legacy/save', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload),
          });

          if (!response.ok) {
              throw new Error('Erro ao salvar no banco de dados');
          }

          const result = await response.json();
          toast.success('Importação e análise G2A Brain concluídas com sucesso!');
          
          // Reset
          setIsReviewing(false);
          setFiles([]);
          setParsedData([]);
          if (result.logs) setLogs(result.logs);

      } catch(err: any) {
          toast.error(`Erro ao salvar: ${err.message}`);
      } finally {
          setSaving(false);
      }
  };

  const handleRemoveItem = (index: number) => {
      setParsedData(prev => prev.filter((_, i) => i !== index));
      if (parsedData.length <= 1) {
          setIsReviewing(false);
      }
  };

  if (isReviewing) {
      return (
          <div className="w-full max-w-[1000px] mx-auto space-y-6 animate-fade-in pb-16">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                      <Title order={2} className="text-slate-800">Revisão de Importação</Title>
                      <Text size="sm" c="dimmed">Revise os dados estruturados pela IA antes de salvar no banco</Text>
                  </div>
                  <Button variant="default" onClick={() => setIsReviewing(false)}>Voltar</Button>
              </div>

              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-md border border-blue-100">
                  <Text fw={600} c="blue.9">{parsedData.length} funcionário(s) pronto(s) para importação</Text>
                  <Button 
                      color="blue" 
                      leftSection={<IconDeviceFloppy size={18} />} 
                      onClick={handleSaveToDatabase}
                      loading={saving}
                  >
                      Salvar e Analisar (G2A Brain)
                  </Button>
              </div>

              <ScrollArea h={600} offsetScrollbars>
                  <div className="space-y-4 pr-4">
                      {parsedData.map((item, index) => (
                          <Card key={index} shadow="sm" padding="lg" radius="md" withBorder>
                              <Group justify="space-between" mb="xs">
                                  <div>
                                      <Text fw={600} size="lg">{item.employee?.full_name}</Text>
                                      <Group gap="sm">
                                        {item.employee?.matricula && <Badge variant="light">Mat: {item.employee?.matricula}</Badge>}
                                        {item.employee?.job_role && <Badge color="gray" variant="light">{item.employee?.job_role}</Badge>}
                                      </Group>
                                  </div>
                                  <ActionIcon color="red" variant="light" onClick={() => handleRemoveItem(index)}>
                                      <IconTrash size={18} />
                                  </ActionIcon>
                              </Group>

                              <Text size="sm" fw={500} mt="md" mb="xs">Exames ({item.exams?.length || 0}):</Text>
                              <div className="space-y-2">
                                  {item.exams?.map((exam: any, idx: number) => (
                                      <div key={idx} className="bg-slate-50 p-3 rounded-md border border-slate-200 flex justify-between items-center">
                                          <Group>
                                              <Badge color={exam.exam_type === 'admissional' ? 'green' : 'blue'}>
                                                  {exam.exam_type || 'Exame'}
                                              </Badge>
                                              <Text size="sm" fw={500}>{exam.exam_date}</Text>
                                              {exam.is_reference && <Badge color="grape" variant="dot">Ref</Badge>}
                                          </Group>
                                          <Badge variant="outline" color="gray">
                                              VA: {exam.thresholds_od_air ? 'Sim' : 'Não'} / VO: {exam.thresholds_od_bone ? 'Sim' : 'Não'}
                                          </Badge>
                                      </div>
                                  ))}
                              </div>
                          </Card>
                      ))}
                  </div>
              </ScrollArea>
          </div>
      );
  }

  return (
    <div className="w-full max-w-[1000px] mx-auto space-y-6 animate-fade-in pb-16">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <Title order={2} className="text-slate-800">Importador de Legado (.xls)</Title>
          <Text size="sm" c="dimmed">Converta os históricos em Excel</Text>
        </div>
      </div>

      <Paper p="xl" radius="md" withBorder className="bg-white">
        <Group justify="space-between" mb="lg">
          <Text fw={500}>1. Selecione os arquivos do formato antigo</Text>
          <Badge color="blue" variant="light">Multi-seleção permitida</Badge>
        </Group>

        <FileInput
          placeholder="Clique para selecionar ou arraste os arquivos .xls"
          multiple
          value={files}
          onChange={setFiles}
          accept=".xls,.xlsx"
          leftSection={<IconUpload size={20} />}
          size="lg"
          mb="xl"
          clearable
        />

        {files.length > 0 && (
          <div className="space-y-4">
            <Text fw={600}>{files.length} arquivo(s) preparado(s) para importação</Text>
            
            <Button 
              size="lg" 
              color="blue" 
              leftSection={<IconDatabaseImport size={20} />}
              onClick={handleParse}
              loading={loading}
              fullWidth
            >
              Interpretar com IA (G2A Brain)
            </Button>

            {loading && (
              <div className="mt-4">
                <Group justify="space-between" mb={8}>
                  <Text size="sm" fw={500} c="blue">
                    Importando... Por favor, aguarde.
                  </Text>
                  <Text size="sm" fw={700} c="blue">
                    {Math.round(progress)}%
                  </Text>
                </Group>
                <Progress value={progress} size="xl" radius="xl" striped animated />
              </div>
            )}
          </div>
        )}
      </Paper>

      {logs.length > 0 && (
        <Paper p="md" radius="md" withBorder className="bg-slate-50">
          <Title order={4} mb="md">Logs da Importação</Title>
          <Accordion variant="separated">
            {logs.map((log, idx) => (
              <Accordion.Item key={idx} value={`item-${idx}`} className="bg-white">
                <Accordion.Control icon={
                  log.status === 'success' 
                    ? <ThemeIcon color="teal" radius="xl" size="sm"><IconCheck size={12} /></ThemeIcon>
                    : <ThemeIcon color="red" radius="xl" size="sm"><IconAlertTriangle size={12} /></ThemeIcon>
                }>
                  <Text size="sm" fw={500}>{log.file}</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" c={log.status === 'success' ? 'dimmed' : 'red'}>
                    {log.message}
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Paper>
      )}
    </div>
  );
}