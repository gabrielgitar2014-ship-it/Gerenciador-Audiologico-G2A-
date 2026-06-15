// Tipos baseados no schema real do Supabase (migration aplicada em 2026-06).

// ============================================================================
// PROFILE
// ============================================================================

export type ProfileRole = 'fonoaudiologo' | 'medico' | 'admin' | 'professional';
export type ProfileStatus = 'ativo' | 'inativo' | 'bloqueado';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  updated_at: string | null;
  crfa_numero: string | null;
  crfa_regiao: string | null;
  role: ProfileRole;
  tenant_id: string | null;
  status: ProfileStatus;
  crm_numero: string | null;
  crm_regiao: string | null;
  specialization: string | null;
  created_at: string;
}

// ============================================================================
// COMPANY
// ============================================================================

export type CompanyStatus = 'ativo' | 'inativo' | 'suspenso';
export type GrauRisco = 1 | 2 | 3 | 4;

export interface Company {
  id: string;
  owner_id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  medico_coordenador_nome: string | null;
  medico_coordenador_crm: string | null;
  medico_coordenador_uf: string | null;
  cnae: string | null;
  segmento: string | null;
  grau_risco: GrauRisco | null;
  email_contato: string | null;
  status: CompanyStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SECTOR / JOB ROLE
// ============================================================================

export interface Sector {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
}

export interface JobRole {
  id: string;
  company_id: string;
  name: string;
  cbo: string | null;
  created_at: string;
}

// ============================================================================
// GHE
// ============================================================================

export interface GHE {
  id: string;
  company_id: string;
  setor_id: string | null;
  name: string;
  descricao: string | null;
  has_noise_risk: boolean;
  has_chemical_risk: boolean;
  has_biologico_risk: boolean;
  has_ergonomico_risk: boolean;
  has_fisico_risk: boolean;
  noise_level_db: number | null;
  nivel_ruido_maximo_db: number | null;
  epi_ca: string | null;
  epi_nrrsf: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// EMPLOYEE
// ============================================================================

export type EmployeeStatus = 'ativo' | 'afastado' | 'demitido';
export type Gender = 'M' | 'F' | 'O';

export interface Employee {
  id: string;
  company_id: string;
  full_name: string;
  cpf: string | null;
  rg: string | null;
  matricula: string | null;
  birth_date: string | null;
  gender: Gender | null;
  sector_id: string | null;
  job_role_id: string | null;
  ghe_id: string | null;
  admission_date: string | null;
  demission_date: string | null;
  is_active: boolean;
  exposto_ruido: boolean;
  anos_exposicao_ruido: number | null;
  usa_epi_auditivo: boolean;
  status: EmployeeStatus;
  created_at: string;
}

export interface EmployeeAddress {
  employee_id: string;
  cep: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
}

// ============================================================================
// AUDIOMETRIC EXAM
// ============================================================================

export type ExamType =
  | 'admissional'
  | 'periodico'
  | 'demissional'
  | 'mudanca_risco'
  | 'retorno_trabalho'
  | 'reteste';

export type ExamResult = 'normal' | 'alterado' | 'painpse' | 'agravamento';

export type AudioThresholds = Record<string, number> | null;

export interface AudiometricExam {
  id: string;
  employee_id: string;
  company_id: string;
  professional_id: string | null;
  exam_date: string;
  exam_type: ExamType;
  is_reference: boolean;
  rest_hours_ok: boolean;
  meatoscopy_ok: boolean;
  thresholds_od_air: AudioThresholds;
  thresholds_oe_air: AudioThresholds;
  thresholds_od_bone: AudioThresholds;
  thresholds_oe_bone: AudioThresholds;
  speech_srt_od: number | null;
  speech_srt_oe: number | null;
  speech_iprf_od: number | null;
  speech_iprf_oe: number | null;
  result_status: ExamResult;
  diagnosis_text: string | null;
  last_edited_at: string | null;
  last_edited_by: string | null;
  edit_reason: string | null;
  tenant_id: string | null;
  pca_id: string | null;
  reteste_indicado: boolean;
  motivo_reteste: string | null;
  prazo_reteste: string | null;
  queixa_auditiva: boolean;
  queixa_descricao: string | null;
  created_at: string;
}

// ============================================================================
// CLINICAL EVOLUTIONS
// ============================================================================

export interface ClinicalEvolution {
  id: string;
  employee_id: string;
  professional_id: string;
  content: string;
  created_at: string;
}

// ============================================================================
// PCA — Programa
// ============================================================================

export type ProgramaPCAStatus = 'ativo' | 'inativo' | 'arquivado';

export interface ProgramaPCA {
  id: string;
  company_id: string;
  ano: number;
  versao: number;
  responsavel_tecnico_id: string | null;
  data_inicio: string | null;
  data_revisao_prevista: string | null;
  data_revisao_realizada: string | null;
  diagnostico_situacao: string | null;
  objetivos: string | null;
  ia_resumo: string | null;
  status: ProgramaPCAStatus;
  criado_em: string;
  atualizado_em: string;
}

// ============================================================================
// PCA — Medição de Ruído
// ============================================================================

export interface MedicaoRuido {
  id: string;
  pca_id: string;
  ghe_id: string | null;
  data_medicao: string;
  nivel_ruido_db: number;
  twa: number | null;
  dose_percentual: number | null;
  metodologia: string | null;
  equipamento: string | null;
  numero_serie_equip: string | null;
  calibracao_equip: string | null;
  tecnico_responsavel: string | null;
  laudo_url: string | null;
  observacoes: string | null;
  criado_em: string;
}

// ============================================================================
// PCA — Ações
// ============================================================================

export type AcaoPCAStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';

export interface AcaoPCA {
  id: string;
  pca_id: string;
  tipo: string;
  descricao: string;
  responsavel: string | null;
  prazo: string | null;
  data_conclusao: string | null;
  evidencia_url: string | null;
  observacoes: string | null;
  status: AcaoPCAStatus;
  criado_em: string;
  atualizado_em: string;
}

// ============================================================================
// EPI — Entrega
// ============================================================================

export interface EPIEntrega {
  id: string;
  employee_id: string;
  company_id: string;
  data_entrega: string;
  tipo_epi: string;
  marca: string | null;
  modelo: string | null;
  ca_numero: string | null;
  nrr: number | null;
  responsavel_entrega: string | null;
  assinatura_url: string | null;
  quantidade: number;
  employee_assinou: boolean;
  criado_em: string;
}

// ============================================================================
// TREINAMENTOS
// ============================================================================

export interface TreinamentoPCA {
  id: string;
  pca_id: string;
  company_id: string;
  titulo: string;
  data: string;
  carga_horaria: number | null;
  instrutor: string | null;
  conteudo: string | null;
  local: string | null;
  lista_presenca_url: string | null;
  criado_em: string;
}

export interface TreinamentoParticipante {
  id: string;
  treinamento_id: string;
  employee_id: string;
  compareceu: boolean;
  criado_em: string;
}

// ============================================================================
// NOTIFICAÇÕES
// ============================================================================

export type NotificacaoTipo =
  | 'reteste'
  | 'epi_vencimento'
  | 'exame_vencido'
  | 'resultado_alterado'
  | 'acao_pca_prazo'
  | 'sistema';

export type NotificacaoEntidadeTipo =
  | 'exam'
  | 'employee'
  | 'epi'
  | 'pca'
  | 'acao_pca';

export interface Notificacao {
  id: string;
  company_id: string;
  destinatario_id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  entidade_tipo: NotificacaoEntidadeTipo | null;
  entidade_id: string | null;
  lida: boolean;
  lida_em: string | null;
  criado_em: string;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export type AuditAcao = 'INSERT' | 'UPDATE' | 'DELETE' | string;

export interface AuditLog {
  id: string;
  company_id: string | null;
  usuario_id: string | null;
  usuario_email: string | null;
  usuario_role: string | null;
  acao: AuditAcao;
  entidade: string;
  entidade_id: string | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  motivo: string | null;
  ip_address: string | null;
  user_agent: string | null;
  criado_em: string;
}

// ============================================================================
// REPORTS (AI)
// ============================================================================

export type AIReportType = 'individual' | 'epidemiological' | 'annual';

export interface AIOccupationalReport {
  id: string;
  employee_id: string | null;
  company_id: string | null;
  exam_id: string | null;
  report_text: string;
  generated_by: string | null;
  report_type: AIReportType;
  created_at: string;
}

export interface EpidemiologicalReport {
  id: string;
  company_id: string | null;
  year: string;
  report_text: string;
  generated_by: string | null;
  report_type: string;
  created_at: string;
}

// ============================================================================
// PROCESSING LOGS
// ============================================================================

export type ProcessingLogStatus = 'in_progress' | 'completed' | 'failed';

export interface ProcessingLog {
  id: number;
  exam_id: string;
  agent_name: string;
  step_name: string;
  details: Record<string, unknown> | null;
  start_time: string;
  end_time: string | null;
  duration_ms: number | null;
  status: ProcessingLogStatus;
  error_message: string | null;
  created_at: string;
}
