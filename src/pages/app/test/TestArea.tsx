import { useState, useEffect } from 'react';
import { Button, Card, Group, Select, Switch, Text, Title, Paper, Code, Loader } from '@mantine/core';
import { IconFlask, IconCheck, IconSettings } from '@tabler/icons-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useParams } from 'react-router-dom';

export function TestArea() {
  const { companyId } = useParams();
  const [examType, setExamType] = useState<string | null>('admissional');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patients, setPatients] = useState<{value: string, label: string}[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isAltered, setIsAltered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function fetchPatients() {
      if (!companyId) return;
      setIsLoadingPatients(true);
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, full_name, cpf')
          .eq('company_id', companyId);

        if (error) throw error;

        if (data) {
          setPatients(data.map(p => ({
            value: p.id,
            label: `${p.full_name} (${p.cpf || 'Sem CPF'})`
          })));
        }
      } catch (error) {
        console.error("Erro ao buscar pacientes:", error);
        toast.error("Erro ao carregar lista de pacientes");
      } finally {
        setIsLoadingPatients(false);
      }
    }

    fetchPatients();
  }, [companyId]);

  const handleGenerate = async () => {
    if (!patientId) {
      toast.error('Selecione um trabalhador primeiro!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/test-agent/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: patientId,
          company_id: companyId,
          exam_type: examType,
          is_altered: isAltered
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar dados');
      }

      const data = await response.json();
      setResult(data);
      toast.success('Audiometria gerada e processada com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao conectar com o agente de testes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
          <IconFlask size={28} stroke={1.5} />
        </div>
        <div>
          <Title order={2} className="text-slate-800">Área de Testes (Agente Gerador)</Title>
          <Text c="dimmed" size="sm">
            Gere dados fictícios para validar o processamento da engine. Esta área será removida em produção.
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card shadow="sm" p="lg" radius="md" withBorder className="border-purple-200 bg-purple-50/30">
          <Card.Section withBorder inheritPadding py="xs" className="bg-purple-50">
            <Group>
              <IconSettings size={18} className="text-purple-600" />
              <Text fw={600} className="text-purple-900">Parâmetros do Teste</Text>
            </Group>
          </Card.Section>

          <div className="space-y-4 mt-4">
            <Select
              label="Trabalhador"
              placeholder={isLoadingPatients ? "Carregando..." : "Selecione o trabalhador"}
              data={patients}
              value={patientId}
              onChange={setPatientId}
              searchable
              disabled={isLoadingPatients}
              rightSection={isLoadingPatients ? <Loader size="xs" /> : null}
              required
            />

            <Select
              label="Motivo do Exame"
              placeholder="Selecione o tipo"
              data={[
                { value: 'admissional', label: 'Admissional' },
                { value: 'periodico', label: 'Periódico' },
                { value: 'demissional', label: 'Demissional' },
                { value: 'reteste', label: 'Reteste' },
                { value: 'mudanca_funcao', label: 'Mudança de Função' },
                { value: 'retorno_trabalho', label: 'Retorno ao Trabalho' },
              ]}
              value={examType}
              onChange={setExamType}
              required
            />

            <Switch
              label="Gerar exame alterado (Anormal)"
              description="Se ativado, o agente criará um cenário de audiometria com perda auditiva."
              checked={isAltered}
              onChange={(event) => setIsAltered(event.currentTarget.checked)}
              color="purple"
              size="md"
            />

            <Button 
              fullWidth 
              color="purple" 
              mt="xl" 
              onClick={handleGenerate} 
              loading={loading}
              leftSection={<IconCheck size={18} />}
            >
              Gerar e Processar
            </Button>
          </div>
        </Card>

        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Text fw={600} mb="md">Resultado do Agente</Text>
          {result ? (
            <Paper withBorder p="md" bg="gray.0" className="h-[300px] overflow-auto">
              <Code block className="bg-transparent">{JSON.stringify(result, null, 2)}</Code>
            </Paper>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400 border border-dashed rounded-lg">
              Nenhum dado gerado ainda.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
