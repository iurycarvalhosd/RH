-- Permite encerrar uma entrega de EPI (substituída por outra ou dispensada
-- porque o colaborador não precisa mais) sem apagar o histórico. Itens
-- inativos saem do cálculo de status/alerta de vencimento.

alter table ppe_deliveries add column active boolean not null default true;
alter table ppe_deliveries add column closed_reason text
  check (closed_reason in ('substituido', 'dispensado'));
alter table ppe_deliveries add column closed_at timestamptz;
