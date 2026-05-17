import {
  ActionIcon,
  AppShell,
  Burger,
  Group,
  rem,
  ScrollArea,
  Text,
  Tooltip,
  UnstyledButton
} from '@mantine/core';
import {
  IconBuilding,
  IconDashboard,
  IconFileText,
  IconLogout,
  IconMenu2 // Novo ícone para reabrir
  ,
  IconSettings,
  IconTerminal,
  IconUsers,
  IconStethoscope,
  IconChartBar,
  IconFlask
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Configuração dos links
const navData = [
  { link: 'dashboard', label: 'Dashboard', icon: IconDashboard },
  { link: 'pacientes', label: 'Pacientes', icon: IconUsers },
  { link: 'exames', label: 'Exames', icon: IconFileText },
  { link: 'pca', label: 'Monitoriamento do PCA', icon: IconStethoscope },
  { link: 'relatorios', label: 'Relatórios', icon: IconChartBar },
 
];

export function AppLayout() {
  // Controle Mobile
  const [mobileOpened, setMobileOpened] = useState(false);
  // Controle Desktop (Começa aberto, mas pode fechar TOTALMENTE)
  const [desktopOpened, setDesktopOpened] = useState(true);
  const [companyName, setCompanyName] = useState('');

  const { companyId } = useParams();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Busca o nome da empresa
  useEffect(() => {
    if (companyId) {
      supabase.from('companies').select('nome_fantasia').eq('id', companyId).single().then(({ data }) => {
        if (data) setCompanyName(data.nome_fantasia);
      });
    }
  }, [companyId]);

  // Verifica qual aba está ativa para pintar de azul
  const getActiveState = (link: string) => location.pathname.includes(link);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleDesktop = () => setDesktopOpened((o) => !o);
  const toggleMobile = () => setMobileOpened((o) => !o);

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 260, // Largura fixa quando aberto
        breakpoint: 'sm',
        // AQUI ESTÁ A MÁGICA: Fecha totalmente no desktop se !desktopOpened
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
      className="bg-[#f2f4f7] transition-all duration-300 min-h-screen"
    >
      {/* HEADER FIXO COM EFEITO APPLE LIQUID GLASS */}
      <AppShell.Header className="backdrop-blur-2xl bg-white/50 border-b border-white/60 flex items-center px-6 shadow-[0_4px_30px_rgba(0,0,0,0.03)] z-50">
        <Group justify="space-between" className="w-full">
          
          <Group>
            {/* Botão Mobile */}
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            
            {/* Botão Desktop: Alterna entre Aberto e FECHADO TOTALMENTE */}
            <ActionIcon 
              variant="subtle" 
              color="gray" 
              size="lg" 
              visibleFrom="sm" 
              onClick={toggleDesktop}
              title={desktopOpened ? "Fechar Menu" : "Abrir Menu"}
              className="hover:bg-white/40 rounded-xl"
            >
              <IconMenu2 stroke={1.5} />
            </ActionIcon>

            {/* Logo / Nome do Sistema */}
            <div className="flex items-center gap-4 select-none cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/portal')}>
               <img src="/logo.png" alt="G2A Logo" className="w-9 h-9 object-contain drop-shadow-sm" />
               <div className="hidden sm:flex flex-col justify-center">
                 <Text fw={700} size="lg" className="tracking-tight text-slate-800 leading-tight">
                   {companyName || "G2A Health"}
                 </Text>
                 <Text size="xs" c="dimmed" fw={500} className="tracking-wide">
                   Gerenciador de Informações Audiológicas
                 </Text>
               </div>
            </div>
          </Group>

          {/* Ações do Usuário */}
          <Group>
            <Tooltip label="Trocar Empresa">
              <ActionIcon variant="light" color="blue" radius="xl" size="lg" onClick={() => navigate('/portal')} className="bg-white/60 hover:bg-white/80 shadow-sm">
                 <IconBuilding size={20} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      {/* SIDEBAR (NAVBAR) COM EFEITO LIQUID GLASS */}
      <AppShell.Navbar p="md" className="backdrop-blur-2xl bg-white/40 border-r border-white/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <AppShell.Section grow component={ScrollArea}>
          <div className="space-y-2 mt-2">
            {navData.map((item) => (
              <UnstyledButton
                key={item.label}
                onClick={() => {
                  navigate(item.link); // Navegação relativa (dashboard, pacientes...)
                  if (window.innerWidth < 768) setMobileOpened(false); // Fecha mobile ao clicar
                }}
                className={`
                  w-full flex items-center h-12 rounded-xl px-4 transition-all duration-200 group
                  ${getActiveState(item.link)
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 font-semibold' 
                    : 'text-slate-600 hover:bg-white/80 hover:text-blue-600 hover:pl-6'}
                `}
              >
                <item.icon style={{ width: rem(22), height: rem(22) }} stroke={1.5} />
                <Text ml="md" size="sm">{item.label}</Text>
              </UnstyledButton>
            ))}
          </div>
        </AppShell.Section>

        {/* Rodapé da Sidebar */}
        <AppShell.Section className="border-t border-slate-200/50 pt-4 mt-4">
          <UnstyledButton 
            className="w-full flex items-center h-12 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl px-4 transition-all"
            onClick={handleLogout}
          >
            <IconLogout size={22} stroke={1.5} />
            <Text ml="md" size="sm" fw={500}>Sair do Sistema</Text>
          </UnstyledButton>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* CONTEÚDO PRINCIPAL (Main) */}
      <AppShell.Main className="relative overflow-hidden">
        {/* Background Liquid Blobs para o visual Glass */}
        <div className="absolute top-[-10%] left-[-5%] w-[40vh] h-[40vh] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[50vh] h-[50vh] bg-indigo-400/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute top-[40%] left-[20%] w-[30vh] h-[30vh] bg-teal-400/10 rounded-full blur-[80px] pointer-events-none -z-10"></div>

        {/* Container que centraliza o conteúdo e dá limite de largura em telas gigantes */}
        <div className="w-full max-w-[1920px] mx-auto min-h-[calc(100vh-80px)] p-2 sm:p-4 fade-in z-10">
          <Outlet /> {/* Aqui renderizam as páginas internas */}
        </div>
      </AppShell.Main>

    </AppShell>
  );
}
