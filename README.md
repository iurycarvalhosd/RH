# RH Sheila Morais

Sistema interno de RH (multi-filial) para a Sheila Morais. Next.js (App Router) +
Supabase (Postgres + Auth). Camada visual propositalmente mínima — o foco desta
versão é modelo de dados e funcionalidade; o design definitivo entra depois.

## Stack

- Next.js 16 (App Router, TypeScript), API própria em `app/api/**`
- Supabase: Postgres (dados) + Auth (login das contas de RH)
- `@supabase/supabase-js` + `@supabase/ssr`
- Sem ORM: SQL puro nas migrations (`supabase/migrations/`)

## Como colocar para rodar

### 1. Criar o projeto no Supabase

Crie um projeto em [supabase.com](https://supabase.com) (ou rode o Supabase
localmente via CLI, se preferir).

### 2. Rodar a migration

Cole o conteúdo de `supabase/migrations/20260917000000_initial_schema.sql` no
**SQL Editor** do painel do Supabase e execute — ou, se tiver o
[Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
instalado e o projeto linkado (`supabase link`), rode:

```bash
supabase db push
```

Isso cria todas as tabelas (filiais, colaboradores, ponto, férias, folha,
desempenho, compliance, indicadores, etc.), com RLS habilitado em tudo — só a
`service_role key` (usada no backend do app) acessa os dados; não é preciso
criar nenhuma policy adicional.

### 3. Configurar as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha com os valores de **Project Settings → API** no painel do Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (nunca exponha essa chave no cliente)

### 4. Criar a primeira conta (admin)

1. No painel do Supabase, vá em **Authentication → Users → Add user** e crie
   um usuário com email/senha (marque "Auto Confirm User").
2. Copie o UUID do usuário criado.
3. No **SQL Editor**, rode (trocando `<uuid>` e o nome):

   ```sql
   insert into profiles (id, name, role)
   values ('<uuid>', 'Nome da pessoa', 'admin');
   ```

A partir daqui, esse usuário pode logar no app e cadastrar as demais contas de
RH pela própria tela **Usuários** (não precisa mais mexer no painel do
Supabase para isso).

### 5. Rodar o app

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) e entre com a conta criada
no passo 4.

## Estrutura

- `supabase/migrations/` — schema SQL (única fonte de verdade do banco)
- `lib/supabase/` — clients Supabase (server, admin/service-role, proxy)
- `lib/auth/` — sessão (DAL) e RBAC (`admin` vs `rh_padrao`)
- `lib/calculations/` — regras de negócio (status calculado, agregações,
  indicadores, alertas) — reaproveitadas tanto pelas rotas de API quanto pelo
  assistente de chat
- `lib/chat/engine.ts` — motor de regras do assistente (sem LLM/API externa)
- `app/api/**` — API REST consumida pelas páginas (e reutilizável por uma
  futura camada visual)
- `app/(app)/**` — páginas autenticadas (uma por módulo)
- `proxy.ts` — equivalente ao antigo `middleware.ts` no Next.js 16; faz a
  checagem otimista de sessão e redireciona para `/login`

## Permissões (RBAC)

Dois papéis, definidos em `profiles.role`:

- **`rh_padrao`**: lê e cadastra (cria) registros em qualquer módulo.
- **`admin`**: além de cadastrar, pode editar e excluir. As telas
  **Usuários** e **Configurações** são inteiramente restritas a admins.

A checagem de verdade vive na API (`lib/auth/rbac.ts`); a UI só
esconde/desabilita botões como reforço de usabilidade.

## Ponto/banco de horas

Não há login nem app de ponto para os colaboradores — o RH lança os
registros manualmente (ou por import) na tela **Ponto**.
