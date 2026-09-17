-- Reformulação de Treinamentos de SST: catálogo de treinamentos com
-- periodicidade obrigatória e cargos exigidos, sessões agendadas/realizadas
-- e lista de presença (fonte da "última realização" de cada colaborador).
-- Substitui a tabela simples `safety_trainings` (sem dados até aqui).

drop table if exists safety_trainings;

create table training_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  periodicity text not null check (periodicity in ('semanal', 'mensal', 'semestral', 'anual')),
  applies_to_all_positions boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger training_programs_set_updated_at before update on training_programs
  for each row execute function set_updated_at();

create table training_program_positions (
  id uuid primary key default gen_random_uuid(),
  training_program_id uuid not null references training_programs(id) on delete cascade,
  position_id uuid not null references job_positions(id) on delete cascade,
  unique (training_program_id, position_id)
);
create index training_program_positions_program_idx on training_program_positions(training_program_id);

create table training_sessions (
  id uuid primary key default gen_random_uuid(),
  training_program_id uuid not null references training_programs(id) on delete cascade,
  session_date date not null,
  location text,
  instructor text,
  notes text,
  created_at timestamptz not null default now()
);
create index training_sessions_program_idx on training_sessions(training_program_id);
create index training_sessions_date_idx on training_sessions(session_date);

create table training_session_attendees (
  id uuid primary key default gen_random_uuid(),
  training_session_id uuid not null references training_sessions(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  attended boolean not null default true,
  created_at timestamptz not null default now(),
  unique (training_session_id, employee_id)
);
create index training_session_attendees_session_idx on training_session_attendees(training_session_id);
create index training_session_attendees_employee_idx on training_session_attendees(employee_id);

alter table training_programs enable row level security;
alter table training_program_positions enable row level security;
alter table training_sessions enable row level security;
alter table training_session_attendees enable row level security;
