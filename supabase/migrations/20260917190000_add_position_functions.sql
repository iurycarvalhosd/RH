-- Funções (responsabilidades) associadas a um cargo.

create table position_functions (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references job_positions(id) on delete cascade,
  description text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index position_functions_position_id_idx on position_functions(position_id);

alter table position_functions enable row level security;
