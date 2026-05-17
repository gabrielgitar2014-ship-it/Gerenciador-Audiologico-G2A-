import { Paper, Group, Avatar, Text, Badge, Grid, Table, ThemeIcon, ScrollArea, Portal, ActionIcon } from '@mantine/core';
import { IconEarScan, IconShield, IconActivityHeartbeat, IconCalendarTime, IconX } from '@tabler/icons-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';

interface AudiologicalRecordViewProps {
  workerId?: string;
}

const LINE_COLORS = [
  '#e03131', '#1971c2', '#2b8a3e', '#f08c00', '#9c36b5', 
  '#c2255c', '#099268', '#f59f00', '#6741d9', '#e8590c', 
  '#3bc9db', '#f06595'
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-slate-200 rounded shadow-sm text-xs">
        <p className="font-bold mb-1">{label} Hz</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color, margin: 0 }}>
            {entry.name}: {entry.value} dB
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];

export function AudiologicalRecordView({ workerId }: AudiologicalRecordViewProps) {
  const [workerInfo, setWorkerInfo] = useState<any>(null);
  const [chartDataOD, setChartDataOD] = useState<any[]>([]);
  const [chartDataOE, setChartDataOE] = useState<any[]>([]);
  const [allExams, setAllExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurve, setSelectedCurve] = useState<{ exam: any, color: string, ear: 'OD' | 'OE' } | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!workerId) return;
      setLoading(true);
      try {
        // 1. Busca Funcionário
        const { data: empData, error: empError } = await supabase
          .from('employees')
          .select(`id, full_name, job_roles(name), sectors(name), ghe(name), birth_date, admission_date`)
          .eq('id', workerId)
          .single();

        if (empError) throw empError;

        // 2. Busca Exames
        const { data: exams, error: exError } = await supabase
          .from('audiometric_exams')
          .select('*')
          .eq('employee_id', workerId)
          .not('thresholds_od_air', 'is', null) // Traz só exames que tenham dados
          .order('exam_date', { ascending: false });

        if (exError) throw exError;

        setAllExams(exams || []);

        let currentExam: any = null;
        let refExam: any = null;
        let parsedDiagnosis: any = null;

        if (exams && exams.length > 0) {
          currentExam = exams[0]; // Mais recente
          
          if (currentExam.diagnosis_text) {
            try {
              let p = JSON.parse(currentExam.diagnosis_text);
              if (typeof p === 'string') p = JSON.parse(p);
              parsedDiagnosis = p;
            } catch (e) {
              console.error("Erro ao parsear diagnosis_text", e);
            }
          }
          
          // Tenta achar o de referência (is_reference = true) que não seja o current
          refExam = exams.find(e => e.is_reference === true && e.id !== currentExam.id);
          
          // Se não achar um marcado como referência, pega o penúltimo
          if (!refExam && exams.length > 1) {
            refExam = exams[1];
          }
        }

        // 3. Monta info do paciente
        const age = empData.birth_date ? dayjs().diff(dayjs(empData.birth_date), 'year') : null;

        setWorkerInfo({
          name: empData.full_name || 'Sem nome',
          role: Array.isArray(empData.job_roles) ? empData.job_roles[0]?.name : (empData as any).job_roles?.name || 'Não definida',
          sector: Array.isArray(empData.sectors) ? empData.sectors[0]?.name : (empData as any).sectors?.name || 'Não definido',
          age: age ? `${age} anos` : 'Idade não informada',
          admissionDate: empData.admission_date ? dayjs(empData.admission_date).format('DD/MM/YYYY') : 'Não informada',
          ppeInfo: Array.isArray(empData.ghe) ? empData.ghe[0]?.name : (empData as any).ghe?.name || 'Sem GHE/EPI',
          currentStatus: currentExam?.result_status || 'Sem exame',
          diagnosisOD: parsedDiagnosis?.clinico?.od || null,
          diagnosisOE: parsedDiagnosis?.clinico?.oe || null,
          occTritonal: parsedDiagnosis?.ocupacional?.analise_tritonal || null,
          aiInsights: parsedDiagnosis?.ai_insights || null
        });

        // 4. Monta dados do gráfico para Aérea (Todas as Linhas)
        const formatEarData = (examList: any[], earField: string) => {
          return FREQUENCIES.map(freq => {
            const fStr = freq.toString();
            const point: any = { freq: fStr, freqNum: freq };
            examList.forEach(ex => {
               if (ex[earField] && ex[earField][fStr] !== undefined && ex[earField][fStr] !== null && ex[earField][fStr] !== '') {
                 point[ex.id] = Number(ex[earField][fStr]);
               } else {
                 point[ex.id] = null;
               }
            });
            return point;
          });
        };

        setChartDataOD(formatEarData(exams, 'thresholds_od_air'));
        setChartDataOE(formatEarData(exams, 'thresholds_oe_air'));

      } catch (err) {
        console.error('Erro ao buscar prontuário:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [workerId]);

  const isCriticalFreq = (freq: number) => [2000, 4000, 6000].includes(freq);

  if (loading) {
    return <div className="text-center p-10 text-slate-500">Carregando prontuário...</div>;
  }

  if (!workerInfo) {
    return <div className="text-center p-10 text-red-500">Prontuário não encontrado.</div>;
  }

  // Encontra o exame de Referência ativo (O mais recente que seja REF e não seja o exame atual)
  const activeRefId = allExams.find((ex, idx) => idx > 0 && ex.is_reference)?.id;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <Paper p="md" radius="md" withBorder className="bg-white">
        <Group align="flex-start" justify="space-between">
          <Group align="flex-start">
            <Avatar color="blue" size="lg" radius="md">{workerInfo.name.charAt(0)}</Avatar>
            <div>
              <Text fw={700} size="lg">{workerInfo.name}</Text>
              <Group gap="xs" mt={4} mb={8}>
                <Badge color="blue" variant="light">
                  Idade: {workerInfo.age}
                </Badge>
                <Badge color="blue" variant="light">
                  Admissão: {workerInfo.admissionDate}
                </Badge>
              </Group>
              <Group gap="xs" mb={8}>
                <Text size="sm" c="dimmed">
                  <span className="font-semibold">Função:</span> {workerInfo.role}
                </Text>
                <Text size="sm" c="dimmed">•</Text>
                <Text size="sm" c="dimmed">
                  <span className="font-semibold">Setor:</span> {workerInfo.sector}
                </Text>
              </Group>
              <Group gap="xs">
                <Badge color="gray" variant="light" leftSection={<IconShield size={12} />}>
                  EPI/GHE: {workerInfo.ppeInfo}
                </Badge>
                {workerInfo.currentStatus?.toLowerCase().includes('painpse') && (
                  <Badge color="red" variant="light" leftSection={<IconEarScan size={12} />}>
                    Alerta Ocupacional: PAINPSE
                  </Badge>
                )}
                {workerInfo.currentStatus?.toLowerCase().includes('alterado') && !workerInfo.currentStatus?.toLowerCase().includes('painpse') && (
                  <Badge color="yellow" variant="light" leftSection={<IconEarScan size={12} />}>
                    Alerta: Alterado
                  </Badge>
                )}
              </Group>
            </div>
          </Group>
        </Group>
      </Paper>

      {/* HISTÓRICO DE EXAMES (LINHA DO TEMPO) */}
      <Paper p="md" radius="md" withBorder className="bg-white">
        <Group mb="md">
          <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
            <IconCalendarTime size={20} />
          </ThemeIcon>
          <Text fw={600} size="lg">Histórico de Exames ({allExams.length})</Text>
        </Group>

        <ScrollArea>
          <Table verticalSpacing="sm" striped highlightOnHover withTableBorder>
            <Table.Thead className="bg-slate-50">
              <Table.Tr>
                <Table.Th>Data do Exame</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Status Ocupacional</Table.Th>
                <Table.Th>Média Silman e Silverman (OD / OE)</Table.Th>
                <Table.Th>Média PCA (OD / OE)</Table.Th>
                <Table.Th>Análise G2A Brain</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {allExams.map((ex, idx) => {
                let diag = null;
                if (ex.diagnosis_text) {
                  try {
                    diag = typeof ex.diagnosis_text === 'string' ? JSON.parse(ex.diagnosis_text) : ex.diagnosis_text;
                    if (typeof diag === 'string') diag = JSON.parse(diag);
                  } catch (e) {}
                }

                const isRef = ex.is_reference;
                const status = ex.result_status || 'normal';

                return (
                  <Table.Tr key={ex.id}>
                    <Table.Td fw={500}>{dayjs(ex.exam_date).format('DD/MM/YYYY')} {idx === 0 && <Badge size="xs" color="blue" ml={5}>Atual</Badge>}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Badge variant={isRef ? 'outline' : 'outline'} color={ex.exam_type === 'reteste' ? 'red' : 'gray'} size="sm">
                          {ex.exam_type?.toUpperCase()}
                        </Badge>
                        {isRef && (
                          <Badge variant="filled" color="teal" size="sm">
                            REFERÊNCIA
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={status.includes('painpse') ? 'red' : status.includes('alterado') ? 'orange' : 'teal'} 
                        variant="light"
                      >
                        {status.toUpperCase().replace('_', ' ')}
                      </Badge>
                    </Table.Td>
                    <Table.Td className="font-mono text-xs text-slate-600">
                      {diag?.clinico?.od?.media_oms ?? '--'} dB / {diag?.clinico?.oe?.media_oms ?? '--'} dB
                    </Table.Td>
                    <Table.Td className="font-mono text-xs font-semibold text-slate-700">
                      {diag?.clinico?.od?.media_pca_346 ?? '--'} dB / {diag?.clinico?.oe?.media_pca_346 ?? '--'} dB
                    </Table.Td>
                    <Table.Td>
                      {diag?.ai_insights ? (
                        <Badge color="indigo" variant="dot" size="sm">Sim</Badge>
                      ) : (
                        <Text size="xs" c="dimmed">Não processado</Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      {/* ANÁLISE OCUPACIONAL NR-07 (MÉDIAS TRITONAIS E ISOLADAS) */}
      {workerInfo.occTritonal && (workerInfo.occTritonal.OD?.ref_346 !== undefined || workerInfo.occTritonal.OE?.ref_346 !== undefined) && (
        <Paper p="md" radius="md" withBorder className="bg-slate-50 border-blue-200">
          <Group mb="md">
            <ThemeIcon size="lg" radius="md" color="blue" variant="light">
              <IconActivityHeartbeat size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="lg" c="blue.9">Análise de Desencadeamento/Agravamento (NR-07 Anexo II)</Text>
              <Text size="sm" c="dimmed">Comparação do Exame Atual com o de Referência nas frequências críticas.</Text>
            </div>
          </Group>

          <Grid>
            {['OD', 'OE'].map((ear) => {
              const data = workerInfo.occTritonal[ear];
              if (!data || (data.ref_346 === null && data.ref_346 === undefined)) return null;

              const hasPioraIsolada = data.frequencias_isoladas_piora && data.frequencias_isoladas_piora.length > 0;
              const hasPiora346 = data.atual_346 !== undefined && data.atual_346 !== null && data.ref_346 !== undefined && data.ref_346 !== null 
                ? (data.atual_346 - data.ref_346 >= 10) 
                : false;
              const hasPiora512 = data.atual_512 !== null && data.ref_512 !== null && (data.atual_512 - data.ref_512 >= 10);

              return (
                <Grid.Col span={{ base: 12, md: 6 }} key={ear}>
                  <Paper p="sm" withBorder className="bg-white">
                    <Text fw={700} mb="sm" c={ear === 'OD' ? 'red' : 'blue'}>Orelha {ear === 'OD' ? 'Direita' : 'Esquerda'} ({ear})</Text>
                    
                    <Table verticalSpacing="xs" withTableBorder>
                      <Table.Thead className="bg-slate-50">
                        <Table.Tr>
                          <Table.Th>Métrica</Table.Th>
                          <Table.Th>Atual</Table.Th>
                          <Table.Th>Ref</Table.Th>
                          <Table.Th>Variação</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        <Table.Tr>
                          <Table.Td fw={500}>Média 3, 4, 6 kHz</Table.Td>
                          <Table.Td>{data.atual_346} dB</Table.Td>
                          <Table.Td>{data.ref_346} dB</Table.Td>
                          <Table.Td>
                            <Badge color={hasPiora346 ? 'red' : 'gray'} variant="light">
                              {data.atual_346 !== null && data.ref_346 !== null ? `+${(data.atual_346 - data.ref_346).toFixed(1)} dB` : '--'}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td fw={500}>Média 500, 1k, 2k Hz</Table.Td>
                          <Table.Td>{data.atual_512} dB</Table.Td>
                          <Table.Td>{data.ref_512} dB</Table.Td>
                          <Table.Td>
                            <Badge color={hasPiora512 ? 'red' : 'gray'} variant="light">
                              {data.atual_512 !== null && data.ref_512 !== null ? `+${(data.atual_512 - data.ref_512).toFixed(1)} dB` : '--'}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      </Table.Tbody>
                    </Table>

                    <div className="mt-3">
                      <Text size="xs" fw={600} c="dimmed" mb={4}>FREQUÊNCIAS ISOLADAS COM PIORA (≥ 15 dB):</Text>
                      {hasPioraIsolada ? (
                        <Group gap="xs">
                          {data.frequencias_isoladas_piora.map((f: number) => (
                            <Badge key={f} color="red" variant="filled" size="sm">{f} Hz</Badge>
                          ))}
                        </Group>
                      ) : (
                        <Text size="sm" c="teal" fw={500}>Nenhuma frequência com piora ≥ 15 dB</Text>
                      )}
                    </div>
                  </Paper>
                </Grid.Col>
              );
            })}
          </Grid>
        </Paper>
      )}

      {/* CHART & TABLE */}
      <Grid gutter="md">
        {/* Gráfico da Orelha Direita */}
        <Grid.Col span={12}>
          <Paper p="md" radius="md" withBorder className="bg-white">
            <Group justify="space-between" mb="lg">
              <Text fw={600}>Audiograma Clínico - Orelha Direita (OD) (VA)</Text>
              {workerInfo.diagnosisOD && (
                <Group gap="md">
                  <Badge color="red" variant="dot">Silman e Silverman (500,1k,2k): {workerInfo.diagnosisOD.media_oms} dB</Badge>
                  <Badge color="red" variant="filled">PCA (3k,4k,6k): {workerInfo.diagnosisOD.media_pca_346} dB</Badge>
                </Group>
              )}
            </Group>
            <div style={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDataOD} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} />
                  <XAxis 
                    dataKey="freq" 
                    label={{ value: 'Frequência (Hz)', position: 'insideBottom', offset: -10 }} 
                  />
                  <YAxis 
                    domain={[0, 120]} 
                    reversed 
                    tickCount={13} 
                    label={{ value: 'Nível de Audição (dB)', angle: -90, position: 'insideLeft' }} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  {allExams.map((ex, idx) => {
                    const isCurrent = idx === 0;
                    const isRef = ex.id === activeRefId;
                    const isHistorical = !isCurrent && !isRef;
                    
                    const strokeColor = isCurrent ? '#e03131' : (isRef ? '#2b8a3e' : '#cbd5e1');
                    const strokeWidth = isCurrent || isRef ? 3 : 2;
                    const strokeDash = isRef ? "5 5" : (isHistorical ? "3 3" : undefined);

                    return (
                      <Line 
                        key={ex.id}
                        type="linear" 
                        dataKey={ex.id} 
                        name={`${dayjs(ex.exam_date).format('DD/MM/YYYY')}${isCurrent ? ' (ATUAL)' : ''}${ex.is_reference ? ' (REF)' : ''}`} 
                        stroke={strokeColor} 
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDash}
                        strokeOpacity={isHistorical ? 0.6 : 1}
                        dot={isHistorical ? false : { r: 4, fill: strokeColor }} 
                        connectNulls={true}
                        activeDot={{ r: 8, onClick: () => setSelectedCurve({ exam: ex, color: isCurrent ? '#e03131' : LINE_COLORS[idx % LINE_COLORS.length], ear: 'OD' }) }}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* MINIMALIST TABLE */}
            <div className="mt-8 overflow-x-auto">
              <Table verticalSpacing="xs" withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th className="bg-slate-50 w-40">Frequência (Hz)</Table.Th>
                    {FREQUENCIES.map(f => (
                      <Table.Th 
                        key={f} 
                        className={`text-center ${isCriticalFreq(f) ? 'bg-red-50 text-red-700' : 'bg-slate-50'}`}
                      >
                        {f}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {allExams.map((ex, idx) => {
                    const isCurrent = idx === 0;
                    const isRef = ex.id === activeRefId;
                    const isHistorical = !isCurrent && !isRef;
                    const textColor = isCurrent ? '#e03131' : (isRef ? '#2b8a3e' : '#64748b');

                    return (
                      <Table.Tr key={`od-${ex.id}`} className={isHistorical ? "opacity-70" : ""}>
                        <Table.Td fw={isHistorical ? 400 : 700} className="bg-slate-50" style={{ color: textColor }}>
                          {dayjs(ex.exam_date).format('DD/MM/YYYY')} {isCurrent ? '(ATUAL)' : ''} {ex.is_reference ? '(REF)' : ''}
                        </Table.Td>
                        {FREQUENCIES.map(freq => {
                          const val = ex.thresholds_od_air ? ex.thresholds_od_air[freq.toString()] : null;
                          return (
                            <Table.Td 
                              key={`od-${ex.id}-${freq}`} 
                              className={`text-center ${isCriticalFreq(freq) && !isHistorical ? 'bg-red-50 fw-bold' : ''}`}
                              style={{ color: isHistorical ? '#94a3b8' : undefined, fontWeight: isHistorical ? 400 : 600 }}
                            >
                              {val !== null && val !== undefined ? val : '-'}
                            </Table.Td>
                          );
                        })}
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
              <Text size="xs" c="dimmed" mt={4}>
                * Frequências de 3kHz, 4kHz e 6kHz destacadas para análise ocupacional (Anexo I da NR-7).
              </Text>
            </div>
          </Paper>
        </Grid.Col>
        
        {/* Gráfico da Orelha Esquerda */}
        <Grid.Col span={12}>
          <Paper p="md" radius="md" withBorder className="bg-white">
            <Group justify="space-between" mb="lg">
              <Text fw={600}>Audiograma Clínico - Orelha Esquerda (OE) (VA)</Text>
              {workerInfo.diagnosisOE && (
                <Group gap="md">
                  <Badge color="blue" variant="dot">Silman e Silverman (500,1k,2k): {workerInfo.diagnosisOE.media_oms} dB</Badge>
                  <Badge color="blue" variant="filled">PCA (3k,4k,6k): {workerInfo.diagnosisOE.media_pca_346} dB</Badge>
                </Group>
              )}
            </Group>
            <div style={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDataOE} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} />
                  <XAxis 
                    dataKey="freq" 
                    label={{ value: 'Frequência (Hz)', position: 'insideBottom', offset: -10 }} 
                  />
                  <YAxis 
                    domain={[0, 120]} 
                    reversed 
                    tickCount={13} 
                    label={{ value: 'Nível de Audição (dB)', angle: -90, position: 'insideLeft' }} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  {allExams.map((ex, idx) => {
                    const isCurrent = idx === 0;
                    const isRef = ex.id === activeRefId;
                    const isHistorical = !isCurrent && !isRef;
                    
                    const strokeColor = isCurrent ? '#1971c2' : (isRef ? '#2b8a3e' : '#cbd5e1');
                    const strokeWidth = isCurrent || isRef ? 3 : 2;
                    const strokeDash = isRef ? "5 5" : (isHistorical ? "3 3" : undefined);

                    return (
                      <Line 
                        key={ex.id}
                        type="linear" 
                        dataKey={ex.id} 
                        name={`${dayjs(ex.exam_date).format('DD/MM/YYYY')}${isCurrent ? ' (ATUAL)' : ''}${ex.is_reference ? ' (REF)' : ''}`} 
                        stroke={strokeColor} 
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDash}
                        strokeOpacity={isHistorical ? 0.6 : 1}
                        dot={isHistorical ? false : { r: 4, fill: strokeColor }} 
                        connectNulls={true}
                        activeDot={{ r: 8, onClick: () => setSelectedCurve({ exam: ex, color: isCurrent ? '#1971c2' : LINE_COLORS[idx % LINE_COLORS.length], ear: 'OE' }) }}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* MINIMALIST TABLE */}
            <div className="mt-8 overflow-x-auto">
              <Table verticalSpacing="xs" withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th className="bg-slate-50 w-40">Frequência (Hz)</Table.Th>
                    {FREQUENCIES.map(f => (
                      <Table.Th 
                        key={f} 
                        className={`text-center ${isCriticalFreq(f) ? 'bg-blue-50 text-blue-700' : 'bg-slate-50'}`}
                      >
                        {f}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {allExams.map((ex, idx) => {
                    const isCurrent = idx === 0;
                    const isRef = ex.id === activeRefId;
                    const isHistorical = !isCurrent && !isRef;
                    const textColor = isCurrent ? '#1971c2' : (isRef ? '#2b8a3e' : '#64748b');

                    return (
                      <Table.Tr key={`oe-${ex.id}`} className={isHistorical ? "opacity-70" : ""}>
                        <Table.Td fw={isHistorical ? 400 : 700} className="bg-slate-50" style={{ color: textColor }}>
                          {dayjs(ex.exam_date).format('DD/MM/YYYY')} {isCurrent ? '(ATUAL)' : ''} {ex.is_reference ? '(REF)' : ''}
                        </Table.Td>
                        {FREQUENCIES.map(freq => {
                          const val = ex.thresholds_oe_air ? ex.thresholds_oe_air[freq.toString()] : null;
                          return (
                            <Table.Td 
                              key={`oe-${ex.id}-${freq}`} 
                              className={`text-center ${isCriticalFreq(freq) && !isHistorical ? 'bg-blue-50 fw-bold' : ''}`}
                              style={{ color: isHistorical ? '#94a3b8' : undefined, fontWeight: isHistorical ? 400 : 600 }}
                            >
                              {val !== null && val !== undefined ? val : '-'}
                            </Table.Td>
                          );
                        })}
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </div>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* POPUP DE DESTAQUE DA CURVA INDIVIDUAL */}
      <AnimatePresence>
        {selectedCurve && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setSelectedCurve(null)}
            >
              <motion.div
                initial={{ scale: 0.8, y: 50, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.8, y: 50, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                  <div>
                    <Text size="xl" fw={700} c="dark">
                      Curva Isolada: {selectedCurve.ear} - {dayjs(selectedCurve.exam.exam_date).format('DD/MM/YYYY')}
                    </Text>
                    <Group mt="xs" gap="sm">
                      <Badge color={selectedCurve.ear === 'OD' ? 'red' : 'blue'} variant="light">
                        {selectedCurve.exam.is_reference ? 'Exame de Referência (Baseline)' : 'Exame Sequencial'}
                      </Badge>
                      <Badge color="gray" variant="outline">
                        Status Ocupacional: {selectedCurve.exam.result_status?.toUpperCase().replace('_', ' ') || 'NORMAL'}
                      </Badge>
                    </Group>
                  </div>
                  <ActionIcon onClick={() => setSelectedCurve(null)} variant="subtle" color="gray" size="xl" radius="xl">
                    <IconX size={24} />
                  </ActionIcon>
                </div>
                
                <div style={{ height: 400, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={selectedCurve.ear === 'OD' ? chartDataOD : chartDataOE} 
                      margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={true} />
                      <XAxis 
                        dataKey="freq" 
                        label={{ value: 'Frequência (Hz)', position: 'insideBottom', offset: -10 }} 
                      />
                      <YAxis 
                        domain={[0, 120]} 
                        reversed 
                        tickCount={13} 
                        label={{ value: 'Nível de Audição (dB)', angle: -90, position: 'insideLeft' }} 
                      />
                      <Line 
                        type="linear" 
                        dataKey={selectedCurve.exam.id} 
                        stroke={selectedCurve.color} 
                        strokeWidth={4}
                        dot={{ r: 6, fill: selectedCurve.color }} 
                        connectNulls={true}
                        activeDot={{ r: 8 }}
                      >
                        <LabelList 
                          dataKey={selectedCurve.exam.id} 
                          position="top" 
                          offset={15} 
                          style={{ fontWeight: 'bold', fill: selectedCurve.color, fontSize: 14 }} 
                        />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

    </div>
  );
}
