// Tipos de domínio (linhas das tabelas do Supabase/Postgres em snake_case).
// Escritos à mão para não depender do CLI - dá pra trocar por
// `supabase gen types typescript` a qualquer momento, mantendo esses nomes.

export type Role = "admin" | "rh_padrao";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  manager_name: string | null;
  cnpj: string | null;
  created_at: string;
  updated_at: string;
}

export type FunctionCategory = "administrativo" | "comercial" | "producao" | "servicos_gerais";

export interface JobPosition {
  id: string;
  title: string;
  salary_min: number;
  salary_mid: number;
  salary_max: number;
  function_category: FunctionCategory | null;
  created_at: string;
  updated_at: string;
}

export interface PositionFunction {
  id: string;
  position_id: string;
  description: string;
  sort_order: number;
  created_at: string;
}

export type EmployeeStatus = "active" | "inactive";
export type MaritalStatus = "solteiro" | "casado" | "divorciado" | "viuvo" | "uniao_estavel";
export type ContractType = "experiencia" | "indeterminado";

export interface Employee {
  id: string;
  branch_id: string;
  position_id: string | null;
  name: string;
  hire_date: string;
  status: EmployeeStatus;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  nationality: string;
  marital_status: MaritalStatus | null;
  address: string | null;
  ctps_number: string | null;
  ctps_series: string | null;
  pis_pasep: string | null;
  base_salary: number | null;
  work_schedule: string | null;
  contract_type: ContractType;
  experience_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWithRefs extends Employee {
  branch?: Pick<Branch, "id" | "name"> | null;
  position?: Pick<JobPosition, "id" | "title"> | null;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  entry_date: string;
  hours_worked: number;
  overtime_hours: number;
  source: "manual" | "import";
  notes: string | null;
  created_at: string;
}

export interface VacationPeriod {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  due_date: string;
  days_available: number;
  days_taken: number;
  created_at: string;
  updated_at: string;
}

export interface VacationBooking {
  id: string;
  vacation_period_id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  days: number;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  period_year: number;
  period_month: number;
  base_salary: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollClosure {
  id: string;
  branch_id: string;
  period_year: number;
  period_month: number;
  closed_at: string;
  closed_by: string | null;
}

export interface PayrollBenefit {
  id: string;
  payroll_record_id: string;
  name: string;
  value: number;
}

export interface PayrollDeduction {
  id: string;
  payroll_record_id: string;
  name: string;
  value: number;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  review_date: string;
  score: number;
  notes: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceReviewTemplate {
  id: string;
  name: string;
  function_category: FunctionCategory;
  created_at: string;
}

export interface PerformanceReviewTemplateCriterion {
  id: string;
  template_id: string;
  label: string;
  description: string | null;
  sort_order: number;
}

export interface PerformanceReviewCriteriaScore {
  id: string;
  performance_review_id: string;
  label: string;
  score: number;
  comment: string | null;
  sort_order: number;
}

export type AttestationStatus = "aprovado" | "pendente" | "rejeitado";

export interface Attestation {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: AttestationStatus;
  created_at: string;
  updated_at: string;
}

export type PpeClosedReason = "substituido" | "dispensado";

export interface PpeDelivery {
  id: string;
  employee_id: string;
  item: string;
  ca_number: string;
  delivery_date: string;
  expiry_date: string | null;
  confirmed: boolean;
  confirmed_at: string | null;
  active: boolean;
  closed_reason: PpeClosedReason | null;
  closed_at: string | null;
  created_at: string;
}

export type TrainingPeriodicity = "semanal" | "mensal" | "semestral" | "anual";

export interface TrainingProgram {
  id: string;
  name: string;
  periodicity: TrainingPeriodicity;
  applies_to_all_positions: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingSession {
  id: string;
  training_program_id: string;
  session_date: string;
  location: string | null;
  instructor: string | null;
  notes: string | null;
  created_at: string;
}

export interface TrainingSessionAttendee {
  id: string;
  training_session_id: string;
  employee_id: string;
  attended: boolean;
  created_at: string;
}

export type TrainingComplianceStatus = "nunca_realizado" | "atrasado" | "a_vencer" | "valido";

export interface TrainingComplianceRow {
  employee_id: string;
  employee_name: string;
  branch_name: string;
  training_program_id: string;
  training_program_name: string;
  periodicity: TrainingPeriodicity;
  last_session_date: string | null;
  next_due_date: string | null;
  status: TrainingComplianceStatus;
}

export interface ComplianceDocument {
  id: string;
  employee_id: string;
  document_type: string;
  expires_at: string;
  created_at: string;
}

export interface AbsenceRecord {
  id: string;
  employee_id: string;
  absence_date: string;
  justified: boolean;
  reason: string | null;
  created_at: string;
}

export interface OtherCost {
  id: string;
  branch_id: string | null;
  period_year: number;
  period_month: number;
  category: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface TrainingInvestment {
  id: string;
  branch_id: string | null;
  name: string;
  cost: number;
  training_date: string;
  roi_score: number | null;
  roi_notes: string | null;
  created_at: string;
}

export interface EnpsSurvey {
  id: string;
  branch_id: string | null;
  period_year: number;
  period_month: number;
  created_at: string;
}

export interface EnpsResponse {
  id: string;
  survey_id: string;
  employee_id: string | null;
  score: number;
  created_at: string;
}

export interface OnboardingTask {
  id: string;
  employee_id: string;
  task_name: string;
  done: boolean;
  done_at: string | null;
  sort_order: number;
  created_at: string;
}

export type TerminationReason = "voluntario" | "involuntario";

export interface Termination {
  id: string;
  employee_id: string;
  termination_date: string;
  reason_type: TerminationReason;
  reason_notes: string | null;
  created_at: string;
}

export interface ExitInterviewAnswer {
  id: string;
  termination_id: string;
  question: string;
  answer: string | null;
  created_at: string;
}

export interface AppSettings {
  id: 1;
  hour_bank_limit_hours: number;
  hour_bank_attention_pct: number;
  vacation_alert_days: number;
  compliance_alert_days: number;
  performance_scale_min: number;
  performance_scale_max: number;
  payroll_variation_alert_pct: number;
  updated_at: string;
}

export const DEFAULT_ONBOARDING_TASKS = [
  "Assinatura do contrato",
  "Entrega de documentos",
  "Apresentação da equipe",
  "Entrega de EPI/uniforme",
  "Treinamento inicial de SST",
  "Acesso a sistemas internos",
];

export const DEFAULT_EXIT_INTERVIEW_QUESTIONS = [
  "Motivo principal da saída",
  "O que poderia ter sido feito para reter você?",
  "Como você avalia sua liderança direta?",
  "Como você avalia o ambiente de trabalho?",
  "Recomendaria a empresa para outras pessoas?",
];
