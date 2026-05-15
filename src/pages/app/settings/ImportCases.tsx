import { Button, Paper, Title, Text, Group, FileInput, Progress, Accordion, Badge, ThemeIcon } from '@mantine/core';
import { IconUpload, IconDatabaseImport, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

export function ImportCases() {
  const { companyId } = useParams();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{ file: string; status: 'success' | 'error'; message: string }[]>([]);

  const handleImport = async () => {
    if (!files || files.length === 0) return;
    
    setLoading(true);
    setProgress(0);
    setLogs([]);

    const totalFiles = files.length;
    const currentLogs: { file: string; status: 'success' | 'error'; message: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Simula o progresso enquanto a requisição não termina
      const simInterval = setInterval(() => {
        setProgress((prev) => {
          const baseProgress = (i / totalFiles) * 100;
          const maxSimProgress = baseProgress + (90 / totalFiles);
          return prev < maxSimProgress ? prev + (5 / totalFiles) : prev;
        });
      }, 500);

      try {
        const formData = new FormData();
        if (companyId) {
          formData.append('company_id', companyId);
        }
        formData.append('files', file);

        // Supondo que a API Python esteja rodando na mesma origem mas na porta 8000
        // Ajuste o IP/Porta conforme o seu ambiente
        const response = await fetch('http://localhost:8000/api/v1/import-legacy', {
          method: 'POST',
          body: formData,
        });

        clearInterval(simInterval);

        if (!response.ok) {
          throw new Error('Falha ao processar a importação pelo servidor.');
        }

        const result = await response.json();
        if (result.logs) {
          currentLogs.push(...result.logs);
        }
        
      } catch (err: any) {
        clearInterval(simInterval);
        currentLogs.push({
          file: file.name,
          status: 'error',
          message: err.message || 'Erro desconhecido',
        });
        toast.error(`Erro ao processar ${file.name}: ${err.message}`);
      } finally {
        clearInterval(simInterval);
        const processed = i + 1;
        setProgress((processed / totalFiles) * 100);
        setLogs([...currentLogs]);
      }
    }

    setLoading(false);
    toast.success('Processo de importação finalizado!');
  };

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
              onClick={handleImport}
              loading={loading}
              fullWidth
            >
              Iniciar Importação para o Banco de Dados
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