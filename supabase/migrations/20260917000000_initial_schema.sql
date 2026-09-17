-- RH Sheila Morais - schema inicial
-- Convenção: snake_case, uuid pk (gen_random_uuid()), FKs com ON DELETE CASCADE
-- para dados que não fazem sentido sem o pai (ex.: benefício sem folha).
-- RLS habilitado em todas as tabelas, sem policies: só a service role key
-- (usada exclusivamente no backend do app) acessa os dados; a API do Next.js
-- é o único ponto de acesso, então RLS aqui é uma trava extra de defesa em
-- profundidade, não o mecanismo de autorização em si (isso é feito em
-- lib/auth/rbac.ts, checando o papel do usuário logado antes de cada mutação).

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- Base
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'rh_padrao')),
  created_at timestamptz not null default now()
);

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  manager_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger branches_set_updated_at before update on branches
  for each row execute function set_updated_at();

create table job_positions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  salary_min numeric(12,2) not null,
  salary_mid numeric(12,2) not null,
  salary_max numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger job_positions_set_updated_at before update on job_positions
  for each row execute function set_updated_at();

create table employees (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  position_id uuid references job_positions(id),
  name text not null,
  hire_date date not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index employees_branch_id_idx on employees(branch_id);
create index employees_position_id_idx on employees(position_id);
create trigger employees_set_updated_at before update on employees
  for each row execute function set_updated_at();

-- ============================================================
-- Módulo 2 — Ponto / banco de horas
-- ============================================================

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  entry_date date not null,
  hours_worked numeric(5,2) not null default 0,
  overtime_hours numeric(5,2) not null default 0,
  source text not null default 'manual' check (source in ('manual', 'import')),
  notes text,
  created_at timestamptz not null default now(),
  unique (employee_id, entry_date)
);
create index time_entries_employee_id_idx on time_entries(employee_id);
create index time_entries_entry_date_idx on time_entries(entry_date);

-- ============================================================
-- Módulo 3 — Férias
-- ============================================================

create table vacation_periods (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  days_available numeric(5,1) not null default 30,
  days_taken numeric(5,1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vacation_periods_employee_id_idx on vacation_periods(employee_id);
create trigger vacation_periods_set_updated_at before update on vacation_periods
  for each row execute function set_updated_at();

create table vacation_bookings (
  id uuid primary key default gen_random_uuid(),
  vacation_period_id uuid not null references vacation_periods(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  days numeric(5,1) not null,
  created_at timestamptz not null default now()
);
create index vacation_bookings_employee_id_idx on vacation_bookings(employee_id);
create index vacation_bookings_period_id_idx on vacation_bookings(vacation_period_id);

-- ============================================================
-- Módulo 4 — Folha
-- ============================================================

create table payroll_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  base_salary numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, period_year, period_month)
);
create index payroll_records_employee_id_idx on payroll_records(employee_id);
create index payroll_records_period_idx on payroll_records(period_year, period_month);
create trigger payroll_records_set_updated_at before update on payroll_records
  for each row execute function set_updated_at();

create table payroll_benefits (
  id uuid primary key default gen_random_uuid(),
  payroll_record_id uuid not null references payroll_records(id) on delete cascade,
  name text not null,
  value numeric(12,2) not null
);
create index payroll_benefits_record_id_idx on payroll_benefits(payroll_record_id);

create table payroll_deductions (
  id uuid primary key default gen_random_uuid(),
  payroll_record_id uuid not null references payroll_records(id) on delete cascade,
  name text not null,
  value numeric(12,2) not null
);
create index payroll_deductions_record_id_idx on payroll_deductions(payroll_record_id);

-- ============================================================
-- Módulo 5 — Desempenho
-- ============================================================

create table performance_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  review_date date not null,
  score numeric(5,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index performance_reviews_employee_id_idx on performance_reviews(employee_id);
create trigger performance_reviews_set_updated_at before update on performance_reviews
  for each row execute function set_updated_at();

-- ============================================================
-- Módulo 6 — Compliance e segurança
-- ============================================================

create table attestations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null default 'pendente' check (status in ('aprovado', 'pendente', 'rejeitado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index attestations_employee_id_idx on attestations(employee_id);
create trigger attestations_set_updated_at before update on attestations
  for each row execute function set_updated_at();

create table ppe_deliveries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  item text not null,
  delivery_date date not null,
  expiry_date date,
  confirmed boolean not null default false,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index ppe_deliveries_employee_id_idx on ppe_deliveries(employee_id);

create table safety_trainings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  training_name text not null,
  completed_at date not null,
  expires_at date not null,
  created_at timestamptz not null default now()
);
create index safety_trainings_employee_id_idx on safety_trainings(employee_id);

create table compliance_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  document_type text not null,
  expires_at date not null,
  created_at timestamptz not null default now()
);
create index compliance_documents_employee_id_idx on compliance_documents(employee_id);

-- ============================================================
-- Módulo 7 — Indicadores estratégicos
-- ============================================================

create table absence_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  absence_date date not null,
  justified boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);
create index absence_records_employee_id_idx on absence_records(employee_id);
create index absence_records_date_idx on absence_records(absence_date);

create table other_costs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  category text not null,
  amount numeric(12,2) not null,
  notes text,
  created_at timestamptz not null default now()
);
create index other_costs_branch_id_idx on other_costs(branch_id);
create index other_costs_period_idx on other_costs(period_year, period_month);

create table training_investments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  name text not null,
  cost numeric(12,2) not null,
  training_date date not null,
  roi_score numeric(4,2),
  roi_notes text,
  created_at timestamptz not null default now()
);
create index training_investments_branch_id_idx on training_investments(branch_id);

create table enps_surveys (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  created_at timestamptz not null default now()
);
create index enps_surveys_branch_id_idx on enps_surveys(branch_id);

create table enps_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references enps_surveys(id) on delete cascade,
  employee_id uuid references employees(id) on delete set null,
  score int not null check (score between 0 and 10),
  created_at timestamptz not null default now()
);
create index enps_responses_survey_id_idx on enps_responses(survey_id);

-- ============================================================
-- Módulo 8 — Ciclo da pessoa
-- ============================================================

create table onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  task_name text not null,
  done boolean not null default false,
  done_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index onboarding_tasks_employee_id_idx on onboarding_tasks(employee_id);

create table terminations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references employees(id) on delete cascade,
  termination_date date not null,
  reason_type text not null check (reason_type in ('voluntario', 'involuntario')),
  reason_notes text,
  created_at timestamptz not null default now()
);

create table exit_interview_answers (
  id uuid primary key default gen_random_uuid(),
  termination_id uuid not null references terminations(id) on delete cascade,
  question text not null,
  answer text,
  created_at timestamptz not null default now()
);
create index exit_interview_answers_termination_id_idx on exit_interview_answers(termination_id);

-- ============================================================
-- Configuração (Módulo 1 - regras de alerta)
-- ============================================================

create table app_settings (
  id smallint primary key default 1 check (id = 1),
  hour_bank_limit_hours numeric(5,2) not null default 10,
  hour_bank_attention_pct numeric(5,2) not null default 80,
  vacation_alert_days int not null default 30,
  compliance_alert_days int not null default 30,
  performance_scale_min numeric(5,2) not null default 0,
  performance_scale_max numeric(5,2) not null default 10,
  payroll_variation_alert_pct numeric(5,2) not null default 10,
  updated_at timestamptz not null default now()
);
create trigger app_settings_set_updated_at before update on app_settings
  for each row execute function set_updated_at();

insert into app_settings (id) values (1);

-- ============================================================
-- RLS — habilitado em tudo, sem policies (só service_role acessa;
-- a API do Next.js roda sempre com a service role key no servidor)
-- ============================================================

alter table profiles enable row level security;
alter table branches enable row level security;
alter table job_positions enable row level security;
alter table employees enable row level security;
alter table time_entries enable row level security;
alter table vacation_periods enable row level security;
alter table vacation_bookings enable row level security;
alter table payroll_records enable row level security;
alter table payroll_benefits enable row level security;
alter table payroll_deductions enable row level security;
alter table performance_reviews enable row level security;
alter table attestations enable row level security;
alter table ppe_deliveries enable row level security;
alter table safety_trainings enable row level security;
alter table compliance_documents enable row level security;
alter table absence_records enable row level security;
alter table other_costs enable row level security;
alter table training_investments enable row level security;
alter table enps_surveys enable row level security;
alter table enps_responses enable row level security;
alter table onboarding_tasks enable row level security;
alter table terminations enable row level security;
alter table exit_interview_answers enable row level security;
alter table app_settings enable row level security;
