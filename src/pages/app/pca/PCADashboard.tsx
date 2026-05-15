import { useParams, useNavigate } from 'react-router-dom';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { PCADashboardTable, PCAWorker } from '../../../components/PCA/PCADashboardTable';
import { supabase } from '../../../lib/supabase';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

export function PCADashboard() {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [workers, setWorkers] = useState<PCAWorker[]>([]);
  const [loading, setLoading] = useState(true);

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
              pcaStatus: status
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

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 animate-fade-in pb-16">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <Tooltip label="Voltar" position="bottom" withArrow>
          <ActionIcon variant="light" size="lg" radius="md" onClick={() => navigate(-1)}>
            <IconArrowLeft size={20} />
          </ActionIcon>
        </Tooltip>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Monitoramento do PCA</h1>
          <p className="text-sm text-slate-500">Monitoramento ocupacional e detecção de PAINPSE</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="text-center p-10 text-slate-500">Carregando dados da triagem...</div>
        ) : (
          <PCADashboardTable data={workers} onViewRecord={handleViewRecord} />
        )}
      </div>
    </div>
  );
}
