import {
  Avatar,
  Badge,
  Button,
  Container,
  Divider,
  Group,
  Loader,
  LoadingOverlay,
  Menu,
  Modal,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconArrowRight,
  IconBuilding,
  IconBuildingCommunity,
  IconChevronDown,
  IconId,
  IconLogout,
  IconMapPin,
  IconPlus,
  IconSearch,
  IconShieldCheck,
  IconStethoscope,
  IconWaveSine,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export function CompanySelection() {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [search, setSearch] = useState('');

  // 1. Configuração do Formulário
  const form = useForm({
    initialValues: {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      cep: '',
      logradouro: '',
      cidade: '',
      estado: '',
    },
    validate: {
      razaoSocial: (val) => (val.length < 3 ? 'Nome muito curto' : null),
      cnpj: (val) => (val.replace(/\D/g, '').length !== 14 ? 'CNPJ deve ter 14 dígitos' : null),
    },
  });

  // 2. Busca automática via Brasil API
  const fetchCnpjData = async (value: string) => {
    const cleanCnpj = value.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setSearchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) throw new Error();
      
      const data = await response.json();
      
      form.setFieldValue('razaoSocial', data.razao_social || '');
      form.setFieldValue('nomeFantasia', data.nome_fantasia || data.razao_social || '');
      form.setFieldValue('cep', data.cep || '');
      form.setFieldValue('logradouro', data.logradouro || '');
      form.setFieldValue('cidade', data.municipio || '');
      form.setFieldValue('estado', data.uf || '');
      
      toast.success('Dados da empresa localizados!');
    } catch (error) {
      toast.error('CNPJ não encontrado ou API indisponível', {
        description: 'Por favor, preencha os dados manualmente.'
      });
    } finally {
      setSearchingCnpj(false);
    }
  };

  // 3. Busca inicial das empresas no Supabase
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('nome_fantasia');

      if (error) throw error;
      setCompanies(data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar lista de empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // 4. Salvar Empresa no Banco
  const handleCreateCompany = async (values: typeof form.values) => {
    setCreating(true);
    try {
      const { error } = await supabase.from('companies').insert([
        {
          owner_id: user?.id,
          razao_social: values.razaoSocial,
          nome_fantasia: values.nomeFantasia,
          cnpj: values.cnpj.replace(/\D/g, ''),
          cep: values.cep,
          logradouro: values.logradouro,
          cidade: values.cidade,
          estado: values.estado,
        }
      ]);

      if (error) throw error;

      toast.success('Empresa cadastrada com sucesso!');
      setModalOpen(false);
      form.reset();
      fetchCompanies();
    } catch (err: any) {
      toast.error('Falha ao salvar no banco de dados');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // --- DERIVADOS DE UI (apenas apresentação, não tocam os dados) ---
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const firstName =
    profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'colega';

  const initials = (profile?.full_name ?? user?.email ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) =>
      [c.nome_fantasia, c.razao_social, c.cidade, c.cnpj]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q)),
    );
  }, [companies, search]);

  const formatCnpj = (value?: string) => {
    if (!value) return null;
    const d = String(value).replace(/\D/g, '');
    if (d.length !== 14) return value;
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-50 animate-fade-in">

      {/* Fundo: mesh sutil + grid técnico (acabamento profissional, sem "blob soup") */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_-10%,rgba(13,148,136,0.12),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_40%_at_100%_0%,rgba(6,182,212,0.10),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(75%_55%_at_50%_0%,black,transparent)]" />

      {/* ═══════════════ TOP APP BAR ═══════════════ */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
        <Container size="xl" className="!px-4 sm:!px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/30">
                <IconWaveSine size={22} stroke={2} />
              </div>
              <div className="leading-tight">
                <Text fw={800} className="text-slate-800 tracking-tight">
                  G2A <span className="text-cyan-600">Health</span>
                </Text>
                <Text size="xs" c="dimmed" className="hidden sm:block">
                  Gestão Audiológica Ocupacional
                </Text>
              </div>
            </div>

            <Menu position="bottom-end" radius="lg" shadow="lg" width={220} withArrow>
              <Menu.Target>
                <UnstyledButton
                  aria-label="Menu do usuário"
                  className="flex items-center gap-2.5 rounded-full border border-slate-200/70 bg-white/70 py-1 pl-1 pr-3 transition-colors hover:border-cyan-200 hover:bg-white"
                >
                  <Avatar
                    size={34}
                    radius="xl"
                    variant="gradient"
                    gradient={{ from: 'teal', to: 'cyan', deg: 135 }}
                  >
                    {initials}
                  </Avatar>
                  <div className="hidden text-left leading-tight sm:block">
                    <Text size="sm" fw={700} className="text-slate-800">
                      {firstName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {profile?.role ?? 'Profissional'}
                    </Text>
                  </div>
                  <IconChevronDown size={16} className="text-slate-400" />
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{profile?.full_name ?? user?.email}</Menu.Label>
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={16} />}
                  onClick={handleLogout}
                >
                  Sair da conta
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </Container>
      </header>

      {/* ═══════════════ CONTEÚDO ═══════════════ */}
      <main className="relative z-10 flex-1">
        <Container size="xl" className="!px-4 sm:!px-8 py-10 sm:py-14">

          {/* Hero */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Badge
                variant="light"
                color="cyan"
                radius="sm"
                mb="sm"
                leftSection={<IconStethoscope size={12} />}
                styles={{ label: { textTransform: 'none', fontWeight: 700 } }}
              >
                Portal de Unidades
              </Badge>
              <Title
                order={1}
                className="!text-3xl sm:!text-4xl !font-bold !leading-tight !tracking-tight text-slate-900"
              >
                {greeting},{' '}
                <span className="bg-gradient-to-r from-teal-600 via-cyan-700 to-sky-700 bg-clip-text text-transparent">
                  {firstName}
                </span>
              </Title>
              <Text c="dimmed" size="lg" mt={6} className="max-w-xl">
                Selecione a unidade de atendimento para gerenciar audiometrias,
                PCA e relatórios ocupacionais.
              </Text>
            </div>

            {/* Stat real */}
            <Paper
              radius="lg"
              className="shrink-0 border border-slate-200/70 bg-white/80 px-5 py-4 shadow-[0_10px_40px_-18px_rgba(15,23,42,0.12)] backdrop-blur-xl"
            >
              <Group gap="md" wrap="nowrap">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <IconBuildingCommunity size={24} stroke={1.6} />
                </div>
                <div>
                  <Text size="1.75rem" fw={800} className="leading-none text-slate-800">
                    {companies.length}
                  </Text>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase" className="tracking-wider">
                    {companies.length === 1 ? 'Unidade' : 'Unidades'} ativas
                  </Text>
                </div>
              </Group>
            </Paper>
          </div>

          {/* Toolbar: busca + ação */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TextInput
              placeholder="Buscar por nome, CNPJ ou cidade..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              radius="xl"
              size="md"
              className="w-full sm:max-w-md"
              aria-label="Buscar unidade"
            />
            <Button
              leftSection={<IconPlus size={18} />}
              radius="xl"
              size="md"
              onClick={() => setModalOpen(true)}
              className="bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600 shadow-lg shadow-cyan-500/25 transition-all hover:from-teal-700 hover:to-sky-700"
            >
              Nova Empresa
            </Button>
          </div>

          {/* Cabeçalho de seção */}
          <div className="mt-10 mb-5 flex items-center gap-4">
            <Text size="xs" fw={800} tt="uppercase" className="tracking-widest text-slate-500">
              Unidades de atendimento
            </Text>
            <Divider className="flex-1 opacity-70" />
            <Badge variant="default" radius="sm" color="gray">
              {filteredCompanies.length}
            </Badge>
          </div>

          {/* Grid / Skeleton / Vazio */}
          {loading ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
              {Array.from({ length: 6 }).map((_, i) => (
                <Paper
                  key={i}
                  radius="2rem"
                  className="border border-slate-200/60 bg-white/70 p-7"
                >
                  <Group justify="space-between" mb="lg">
                    <Skeleton height={56} width={56} radius="1rem" />
                    <Skeleton height={26} width={64} radius="md" />
                  </Group>
                  <Skeleton height={20} width="70%" mb={10} />
                  <Skeleton height={13} width="55%" mb={8} />
                  <Skeleton height={13} width="42%" />
                  <Divider my="md" />
                  <Skeleton height={14} width="40%" />
                </Paper>
              ))}
            </SimpleGrid>
          ) : filteredCompanies.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
              {filteredCompanies.map((company) => (
                <Paper
                  key={company.id}
                  radius="2rem"
                  className="
                    group relative flex h-full cursor-pointer flex-col overflow-hidden
                    border border-slate-200/60 bg-white/80 backdrop-blur-xl
                    shadow-[0_10px_40px_-15px_rgba(15,23,42,0.08)]
                    transition-all duration-300
                    hover:-translate-y-1.5 hover:border-cyan-300/70 hover:shadow-[0_28px_60px_-18px_rgba(8,145,178,0.35)]
                  "
                  onClick={() => navigate(`/app/${company.id}/dashboard`)}
                >
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 opacity-80 transition-opacity group-hover:opacity-100" />
                  <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex h-full flex-col p-7">
                    <div className="mb-5 flex items-start justify-between">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-2xl bg-cyan-400/40 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
                        <Avatar
                          size={56}
                          radius="1rem"
                          variant="gradient"
                          gradient={{ from: 'teal', to: 'cyan', deg: 135 }}
                          className="relative shadow-lg shadow-cyan-500/30 transition-transform duration-300 group-hover:scale-105"
                        >
                          <IconBuilding size={28} />
                        </Avatar>
                      </div>
                      <Badge
                        variant="light"
                        color="teal"
                        size="lg"
                        radius="md"
                        leftSection={
                          <span className="inline-block h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                        }
                        styles={{ label: { fontWeight: 700, letterSpacing: '0.02em' } }}
                      >
                        Ativo
                      </Badge>
                    </div>

                    <Title
                      order={3}
                      className="mb-0.5 truncate text-xl text-slate-800 transition-colors group-hover:text-cyan-700"
                    >
                      {company.nome_fantasia}
                    </Title>
                    {company.razao_social &&
                      company.razao_social !== company.nome_fantasia && (
                        <Text size="xs" c="dimmed" className="mb-3 truncate">
                          {company.razao_social}
                        </Text>
                      )}

                    <Stack gap={7} mt={4} mb="lg">
                      <Group gap={7} wrap="nowrap">
                        <IconMapPin size={15} className="shrink-0 text-cyan-500" />
                        <Text size="sm" c="dimmed" className="truncate">
                          {company.cidade
                            ? `${company.cidade} - ${company.estado}`
                            : 'Local não informado'}
                        </Text>
                      </Group>
                      {company.cnpj && (
                        <Group gap={7} wrap="nowrap">
                          <IconId size={15} className="shrink-0 text-cyan-500" />
                          <Text size="xs" c="dimmed" className="font-mono tracking-tight">
                            {formatCnpj(company.cnpj)}
                          </Text>
                        </Group>
                      )}
                    </Stack>

                    <div className="mt-auto flex items-center justify-between border-t border-slate-200/60 pt-4">
                      <Text size="xs" fw={800} className="uppercase tracking-widest text-cyan-600">
                        Acessar painel
                      </Text>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-50 text-cyan-600 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-teal-500 group-hover:to-cyan-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-cyan-500/40">
                        <IconArrowRight
                          size={18}
                          className="transition-transform duration-300 group-hover:translate-x-0.5"
                        />
                      </div>
                    </div>
                  </div>
                </Paper>
              ))}
            </SimpleGrid>
          ) : search ? (
            <Paper
              radius="2rem"
              p={56}
              className="border border-dashed border-slate-300/70 bg-white/60 text-center shadow-[0_10px_40px_-15px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            >
              <IconSearch size={48} className="mx-auto mb-5 text-slate-300" />
              <Title order={4} c="slate.7" mb="xs">
                Nenhuma unidade encontrada
              </Title>
              <Text c="dimmed" mb="lg">
                Não há resultados para “{search}”. Tente outro termo.
              </Text>
              <Button variant="light" color="gray" radius="xl" onClick={() => setSearch('')}>
                Limpar busca
              </Button>
            </Paper>
          ) : (
            <Paper
              radius="2rem"
              p={60}
              className="border border-dashed border-cyan-200/70 bg-white/60 text-center shadow-[0_10px_40px_-15px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-500">
                <IconBuildingCommunity size={40} stroke={1.4} />
              </div>
              <Title order={3} c="slate.7" mb="xs">
                Nenhuma unidade cadastrada
              </Title>
              <Text c="dimmed" mb="xl" className="mx-auto max-w-sm">
                Comece adicionando seu primeiro cliente para gerenciar audiometrias e
                programas de conservação auditiva.
              </Text>
              <Button
                leftSection={<IconPlus size={18} />}
                radius="xl"
                size="md"
                onClick={() => setModalOpen(true)}
                className="bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600 shadow-lg shadow-cyan-500/25"
              >
                Cadastrar primeira unidade
              </Button>
            </Paper>
          )}
        </Container>
      </main>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="relative z-10 border-t border-slate-200/70 bg-white/40 backdrop-blur-sm">
        <Container size="xl" className="!px-4 sm:!px-8">
          <div className="flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between">
            <Group gap={8}>
              <IconShieldCheck size={16} className="text-teal-500" />
              <Text size="xs" c="dimmed">
                Conformidade NR-07 · Programa de Conservação Auditiva (PCA)
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              © {new Date().getFullYear()} G2A Health · Gestão Audiológica Ocupacional
            </Text>
          </div>
        </Container>
      </footer>

      {/* Modal Liquid Glass de Cadastro */}
      <Modal 
        opened={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={<Text fw={800} size="xl" className="text-slate-800">Cadastrar Cliente</Text>}
        radius="2rem"
        size="md"
        centered
        overlayProps={{ backgroundOpacity: 0.4, blur: 8 }}
        classNames={{ content: 'backdrop-blur-2xl bg-white/80 border border-white' }}
      >
        <form onSubmit={form.onSubmit(handleCreateCompany)} className="space-y-4">
          <LoadingOverlay visible={creating} overlayProps={{ radius: "xl", blur: 2 }} />
          
          <TextInput 
            label="CNPJ" 
            placeholder="00.000.000/0000-00" 
            radius="md"
            required 
            {...form.getInputProps('cnpj')}
            onBlur={(e) => fetchCnpjData(e.target.value)}
            rightSection={searchingCnpj ? <Loader size="xs" /> : <IconSearch size={16} className="text-slate-400" />}
          />

          <TextInput 
            label="Razão Social" 
            placeholder="Preenchido automaticamente" 
            radius="md"
            required 
            {...form.getInputProps('razaoSocial')} 
          />

          <TextInput 
            label="Nome Fantasia" 
            placeholder="Como quer ver no sistema" 
            radius="md"
            required 
            {...form.getInputProps('nomeFantasia')} 
          />

          <div className="grid grid-cols-2 gap-4">
            <TextInput label="Cidade" disabled radius="md" {...form.getInputProps('cidade')} />
            <TextInput label="Estado (UF)" disabled radius="md" {...form.getInputProps('estado')} />
          </div>

          <Button
            fullWidth
            mt="xl"
            size="lg"
            radius="xl"
            type="submit"
            className="bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600 shadow-xl shadow-cyan-500/25"
          >
            Confirmar e Cadastrar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
