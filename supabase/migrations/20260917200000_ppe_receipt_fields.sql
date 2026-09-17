-- Campos necessários para o recibo de entrega de EPI (NR-6): número do CA
-- do equipamento, e CNPJ da filial para identificar o empregador no recibo.

alter table ppe_deliveries add column ca_number text not null default '';
alter table ppe_deliveries alter column ca_number drop default;

alter table branches add column cnpj text;
