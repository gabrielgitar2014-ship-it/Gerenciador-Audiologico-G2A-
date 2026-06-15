import { useParams, useNavigate } from 'react-router-dom';
import { ActionIcon, Badge, Text, Title, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconClipboardHeart } from '@tabler/icons-react';
import { AudiologicalRecordView } from '../../../components/PCA/AudiologicalRecordView';

export function PCAProntuario() {
  const { workerId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-8 animate-fade-in px-2 pb-16 sm:px-4">
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section
        className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-teal-600 via-cyan-700 to-sky-800 px-8 py-8 text-white shadow-[0_24px_60px_-20px_rgba(8,145,178,0.45)]"
        aria-label="Prontuário Clínico"
      >
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center">
          <Tooltip label="Voltar para Triagem" position="bottom" withArrow>
            <ActionIcon
              variant="white"
              color="cyan.8"
              size="lg"
              radius="xl"
              onClick={() => navigate(-1)}
              className="shadow-md"
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
          </Tooltip>
          <div className="space-y-2">
            <Badge
              variant="white"
              color="cyan"
              radius="sm"
              leftSection={<IconClipboardHeart size={12} />}
              styles={{ label: { textTransform: 'none', fontWeight: 700 } }}
            >
              Saúde Ocupacional · Prontuário
            </Badge>
            <Title order={1} className="!text-white !text-3xl md:!text-4xl !font-bold !tracking-tight !leading-tight">
              Prontuário Clínico
            </Title>
            <Text size="sm" className="opacity-90 max-w-md">
              Visualização detalhada e evolução audiométrica — análise ocupacional NR-07.
            </Text>
          </div>
        </div>
      </section>

      <AudiologicalRecordView workerId={workerId} />
    </div>
  );
}
