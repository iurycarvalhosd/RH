-- Dados pessoais e contratuais do colaborador, necessários para gerar o
-- contrato individual de trabalho (CLT) padronizado no onboarding.

alter table employees
  add column cpf text,
  add column rg text,
  add column birth_date date,
  add column nationality text not null default 'Brasileira',
  add column marital_status text check (marital_status in ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel')),
  add column address text,
  add column ctps_number text,
  add column ctps_series text,
  add column pis_pasep text,
  add column base_salary numeric(12, 2),
  add column work_schedule text,
  add column contract_type text not null default 'indeterminado' check (contract_type in ('experiencia', 'indeterminado')),
  add column experience_end_date date;
