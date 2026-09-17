-- Cadastro de setores (departamentos) e vínculo do colaborador ao seu setor,
-- para permitir recortes por setor nas análises/métricas além de filial/rede.

create table sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger sectors_set_updated_at before update on sectors
  for each row execute function set_updated_at();

alter table employees
  add column sector_id uuid references sectors(id);
create index employees_sector_id_idx on employees(sector_id);

alter table sectors enable row level security;
