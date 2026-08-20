# Minha Escala

Aplicativo de cálculo de escalas com autenticação e liberação manual do
calendário anual via Supabase Auth/Postgres. O frontend roda com
[Next.js](https://nextjs.org/) e é preparado para deploy na Vercel.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

## Supabase

O projeto Supabase ainda precisa ser criado. Depois disso:

1. aplique `supabase/migrations/001_initial_minha_escala.sql` no SQL Editor;
2. configure `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SERVICE_ROLE_KEY`;
3. crie a primeira conta pela página `/acesso`;
4. promova essa conta para admin pelo SQL Editor, seguindo
   `docs/supabase-setup.md`;
5. use `/admin` para liberar ou bloquear os demais usuários.

`SUPABASE_SERVICE_ROLE_KEY` é lida apenas pelos módulos de servidor. A URL e a
publishable key são públicas por design; a proteção de dados é feita pelas
policies RLS e pelas permissões por coluna da migração.

O código legado da API SQLite permanece arquivado em `vps/minha-escala-api` e
`src/infrastructure/vps`, mas não faz parte do deploy novo. Não configure
`VPS_API_URL` nem `VPS_ADMIN_TOKEN` em produção.

## Deploy na Vercel

1. importe o repositório na Vercel;
2. mantenha os comandos padrão (`npm run build` e `next start`);
3. cadastre as variáveis de `.env.example` em **Settings → Environment Variables**;
4. defina `NEXT_PUBLIC_APP_URL` com o domínio final, antes de ativar pagamentos.

As funções em `app/api/` são Route Handlers do Next.js e serão publicadas como
Vercel Functions. `SUPABASE_SERVICE_ROLE_KEY`, `MERCADO_PAGO_ACCESS_TOKEN` e
`MERCADO_PAGO_WEBHOOK_SECRET` devem existir somente no ambiente de servidor.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: gera o build de produção do Next.js
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
