-- Modelos padronizados de avaliação de desempenho por categoria de função
-- (administrativo, comercial, produção, serviços gerais), com critérios
-- pré-definidos com base em práticas de avaliação por competências
-- amplamente usadas em RH (não há uma "norma" única do governo para
-- avaliação de desempenho, diferente do que ocorre com segurança do
-- trabalho - isso é deixado claro para o usuário no app).

alter table job_positions add column function_category text
  check (function_category in ('administrativo', 'comercial', 'producao', 'servicos_gerais'));

create table performance_review_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  function_category text not null check (function_category in ('administrativo', 'comercial', 'producao', 'servicos_gerais')),
  created_at timestamptz not null default now()
);

create table performance_review_template_criteria (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references performance_review_templates(id) on delete cascade,
  label text not null,
  description text,
  sort_order int not null default 0
);
create index performance_review_template_criteria_template_idx on performance_review_template_criteria(template_id);

alter table performance_reviews add column template_id uuid references performance_review_templates(id) on delete set null;

create table performance_review_criteria_scores (
  id uuid primary key default gen_random_uuid(),
  performance_review_id uuid not null references performance_reviews(id) on delete cascade,
  label text not null,
  score numeric(5,2) not null,
  comment text,
  sort_order int not null default 0
);
create index performance_review_criteria_scores_review_idx on performance_review_criteria_scores(performance_review_id);

alter table performance_review_templates enable row level security;
alter table performance_review_template_criteria enable row level security;
alter table performance_review_criteria_scores enable row level security;

-- Administrativo
with t as (
  insert into performance_review_templates (name, function_category)
  values ('Avaliação de Desempenho - Administrativo', 'administrativo')
  returning id
)
insert into performance_review_template_criteria (template_id, label, description, sort_order)
select t.id, c.label, c.description, c.sort_order
from t, (values
  ('Qualidade e precisão do trabalho', 'Capricho, atenção a detalhes e ausência de erros nas tarefas realizadas.', 0),
  ('Organização e cumprimento de prazos', 'Capacidade de organizar as tarefas e entregar no prazo combinado.', 1),
  ('Domínio das ferramentas e processos do cargo', 'Conhecimento técnico necessário para exercer a função.', 2),
  ('Comunicação e relacionamento interpessoal', 'Clareza na comunicação e boa convivência com a equipe.', 3),
  ('Proatividade e iniciativa', 'Capacidade de antecipar problemas e propor soluções.', 4),
  ('Assiduidade e pontualidade', 'Comparecimento regular e cumprimento de horários.', 5)
) as c(label, description, sort_order);

-- Comercial
with t as (
  insert into performance_review_templates (name, function_category)
  values ('Avaliação de Desempenho - Comercial', 'comercial')
  returning id
)
insert into performance_review_template_criteria (template_id, label, description, sort_order)
select t.id, c.label, c.description, c.sort_order
from t, (values
  ('Atingimento de metas comerciais', 'Resultado de vendas frente às metas definidas no período.', 0),
  ('Relacionamento e atendimento ao cliente', 'Qualidade do atendimento e satisfação percebida do cliente.', 1),
  ('Conhecimento dos produtos e serviços', 'Domínio do catálogo, materiais e diferenciais da marca.', 2),
  ('Capacidade de negociação', 'Condução de negociações favoráveis para cliente e empresa.', 3),
  ('Proatividade na prospecção', 'Busca ativa por novos clientes e oportunidades.', 4),
  ('Assiduidade e pontualidade', 'Comparecimento regular e cumprimento de horários.', 5)
) as c(label, description, sort_order);

-- Produção
with t as (
  insert into performance_review_templates (name, function_category)
  values ('Avaliação de Desempenho - Produção', 'producao')
  returning id
)
insert into performance_review_template_criteria (template_id, label, description, sort_order)
select t.id, c.label, c.description, c.sort_order
from t, (values
  ('Qualidade técnica do trabalho produzido', 'Precisão, acabamento e conformidade das peças/produtos.', 0),
  ('Produtividade e cumprimento de metas de produção', 'Volume produzido dentro do esperado para o período.', 1),
  ('Cumprimento das normas de segurança e uso de EPI', 'Adesão aos procedimentos de segurança e uso correto dos equipamentos.', 2),
  ('Cuidado com equipamentos, materiais e insumos', 'Zelo e uso responsável dos recursos de produção.', 3),
  ('Trabalho em equipe', 'Colaboração com colegas de produção e outras áreas.', 4),
  ('Assiduidade e pontualidade', 'Comparecimento regular e cumprimento de horários.', 5)
) as c(label, description, sort_order);

-- Serviços gerais
with t as (
  insert into performance_review_templates (name, function_category)
  values ('Avaliação de Desempenho - Serviços Gerais', 'servicos_gerais')
  returning id
)
insert into performance_review_template_criteria (template_id, label, description, sort_order)
select t.id, c.label, c.description, c.sort_order
from t, (values
  ('Qualidade e capricho na execução das tarefas', 'Cuidado e capricho na realização das atividades.', 0),
  ('Organização e zelo pelo ambiente de trabalho', 'Manutenção da organização e limpeza dos espaços.', 1),
  ('Cumprimento das normas de segurança e higiene', 'Adesão aos procedimentos de segurança e higiene no trabalho.', 2),
  ('Proatividade e disposição', 'Iniciativa para resolver e antecipar necessidades do dia a dia.', 3),
  ('Relacionamento com a equipe', 'Boa convivência e colaboração com os demais colaboradores.', 4),
  ('Assiduidade e pontualidade', 'Comparecimento regular e cumprimento de horários.', 5)
) as c(label, description, sort_order);
