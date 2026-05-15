import { useParams, useNavigate } from 'react-router-dom';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { AudiologicalRecordView } from '../../../components/PCA/AudiologicalRecordView';

export function PCAProntuario() {
  const { workerId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 animate-fade-in pb-16">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <Tooltip label="Voltar para Triagem" position="bottom" withArrow>
          <ActionIcon variant="light" size="lg" radius="md" onClick={() => navigate(-1)}>
            <IconArrowLeft size={20} />
          </ActionIcon>
        </Tooltip>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Prontuário Clínico</h1>
          <p className="text-sm text-slate-500">Visualização detalhada e evolução audiométrica</p>
        </div>
      </div>

      <AudiologicalRecordView workerId={workerId} />
    </div>
  );
}
