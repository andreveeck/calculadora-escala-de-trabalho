# Configuração do Supabase — Minha Escala

## 1. Criar e preparar o projeto

Crie um projeto exclusivo para o Minha Escala. No SQL Editor desse projeto,
execute integralmente:

```text
supabase/migrations/001_initial_minha_escala.sql
```

A migração cria `profiles` e `payments`, índices, trigger de criação automática
do profile, permissões de Data API e RLS. As tabelas públicas adicionais já
existentes no app também permanecem com RLS ativo.

## 2. Variáveis de ambiente

Configure no ambiente local e no provedor de deploy:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=SEU_SEGREDO_SOMENTE_DO_SERVIDOR
```

Não prefixe a service role com `NEXT_PUBLIC_` e não copie essa chave para código
React, logs, screenshots ou respostas da API.

## 3. Criar o primeiro administrador

Cadastre normalmente a conta pela página `/acesso`. Depois, no SQL Editor,
promova somente o e-mail escolhido:

```sql
update public.profiles
set role = 'admin',
    access_status = 'approved'
where email = 'admin@seu-dominio.com';
```

Confirme que exatamente uma linha foi alterada:

```sql
select user_id, email, role, access_status
from public.profiles
where email = 'admin@seu-dominio.com';
```

Não existe senha administrativa no código. O admin entra em `/admin` com a
própria conta do Supabase Auth, e a API revalida o bearer token e a coluna
`profiles.role` antes de usar a service role.

## 4. Homologação do fluxo Supabase

Teste em uma conta comum separada:

1. cadastro e, se habilitada, confirmação de e-mail;
2. login e status `pending_payment`;
3. abertura do botão oficial PagBank;
4. bloqueio de `/calendario-anual` enquanto pendente;
5. login do admin e liberação manual;
6. acesso ao calendário após nova consulta do profile;
7. bloqueio manual e negação do calendário;
8. tentativa de alterar `role` ou `access_status` usando a publishable key — a
   operação deve ser negada pelas permissões de coluna/RLS.

O deploy novo usa Supabase para cadastro, autenticação e liberação. Não
configure `VPS_API_URL` nem `VPS_ADMIN_TOKEN` no ambiente de produção.

## 5. Verificações SQL de segurança

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Todas as tabelas públicas criadas pela migração devem retornar
`rowsecurity = true`.
