-- Fechamento da folha por filial/período: enquanto aberta, RH padrão pode
-- lançar/editar/excluir; uma vez fechada, só admin pode alterar.

create table payroll_closures (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  closed_at timestamptz not null default now(),
  closed_by uuid references profiles(id) on delete set null,
  unique (branch_id, period_year, period_month)
);
create index payroll_closures_period_idx on payroll_closures(period_year, period_month);

alter table payroll_closures enable row level security;
