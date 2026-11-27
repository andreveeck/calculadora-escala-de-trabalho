# Plano de Correções — CALCULADORA ESCALA DE TRABALHO

> Data da análise: agosto/2026
> Estado atual: análise completa (sem código alterado), 25 testes passando, 0 erros de tipo no código do app (`src/`, `app/`).

Sumário executivo: a base é sólida (arquitetura controller/service/repository, RLS bem montada, testes ok). Há **1 falha grave de monetização**, **1 falha de segurança no webhook**, **código morto duplicado de pagamento** e **typecheck/lint quebrados na máquina**.

---

## 🔴 CRÍTICO

### 1. Paywall do calendário anual é anulável — conteúdo pago acessível de graça

**Arquivo:** `src/views/components/AnnualAccessGate.tsx`

**Problema:**
```tsx
const isSharedCalendar =
  isScheduleType(initialScheduleType) &&
  initialReferenceDate !== undefined &&
  BrazilDate.isValidIsoDate(initialReferenceDate);

if (isSharedCalendar) {
  return <AnnualCalendarExperience ... readOnly />;  // pula TODO o gate de login/pagamento
}
```
Qualquer URL `/calendario-anual?escala=6x1&referencia=2026-08-20` exibe os 12 meses **sem login e sem pagamento**. O botão "Copiar link" em `AnnualCalendarExperience` gera exatamente essa URL pública — um único cliente que pagou o R$ 5,99 copia o link e o conteúdo deixa de ter valor comercial. Invalida o modelo de negócio.

**Correção sugerida:**
- Exibir o calendário anual completo **somente** para `access_status === "approved"`.
- O modo compartilhado deve usar **token de compartilhamento assinado pelo servidor** (com expiração), gerado via Route Handler, em vez de parâmetros de URL em texto puro.

---

### 2. `verifyWebhookSignature` não valida assinatura nenhuma

**Arquivo:** `src/infrastructure/mercado-pago/MercadoPagoGateway.ts`

**Problema:**
```ts
verifyWebhookSignature(rawBody, signature): boolean {
  if (!signature || !this.config.webhookSecret) return false;
  return rawBody.length > 0 && signature.length > 0;  // aceita QUALQUER assinatura não-vazia
}
```
O `webhookSecret` é lido e injetado, mas **nunca usado**. O Mercado Pago assina o webhook com HMAC-SHA256 (`v1:<timestamp>:<hash>`). Qualquer um que conheça um `external_id` de pagamento pendente forja um webhook "aprovado".

**Correção sugerida:** implementar a verificação HMAC-SHA256 real do Mercado Pago (validando timestamp + hash da assinatura contra o `rawBody`).

---

## 🟠 ALTO IMPACTO

### 3. Fluxo Mercado Pago é código morto e duplica o PagBank

**Arquivos:** `src/infrastructure/mercado-pago/*`, `src/controllers/PaymentController.ts`, `src/controllers/paymentControllerFactory.ts`, `src/models/services/PaymentService.ts`, `app/api/payments/*`, `src/infrastructure/supabase/SupabasePaymentRepository.ts`, `src/infrastructure/supabase/SupabaseAccessEntitlementRepository.ts`

**Problema:**
- O frontend **nunca chama** `/api/calculate` — a calculadora roda 100% client-side via controller.
- Nenhum componente chama `/api/payments/checkout` ou consome `/api/payments/webhook`. Todo o stack MP **nunca é exercitado em produção**. O pagamento real é o **link manual do PagBank** (`AccessFlow`) + liberação manual pelo admin.
- Inconsistências perigosas se o MP for ativado no futuro:
  - `SupabasePaymentRepository.createPending` grava `provider: "mercado_pago"`; a rota admin (`POST /api/admin/access-users`) grava `provider: "pagbank"` e **não cria `external_id`** — o webhook MP procura por `external_id` e **não casaria** com as liberações manuais.
  - O link PagBank (`https://pag.ae/82opimxEr`, hoje em `src/views/components/AccessFlow.tsx`) não carrega `user_id`; a liberação depende da conciliação manual do admin.

**Correção sugerida:** decidir **UM** canal:
- **Opção A (manter PagBank manual):** apagar/arquivar o stack MP e as rotas `/api/payments/*`.
- **Opção B (adotar Mercado Pago real):** desativar PagBank e integrar MP de ponta a ponta, com assinatura de webhook correta (item 2), associando `user_id` ao `external_reference`.

---

## 🟡 MÉDIO

### 4. `npm run typecheck` e `npm run lint` quebram na máquina (backup node_modules)

**Arquivos:** `tsconfig.json`, `eslint.config.mjs`

**Problema:**
- O diretório `node_modules.install-recovery/` (backup quebrado, gitignored) **não está excluído** no `tsconfig.json` (só exclui `node_modules` singular) nem no `eslint.config.mjs`.
- O `typecheck` **falha** com dezenas de erros em `node_modules.install-recovery/@supabase/...` (`TS2307`, `TS1205`). Se a Vercel rodar `tsc` no CI, quebra o deploy.
- O lint leva 5+ minutos varrendo essa pasta.
- O código do próprio app tem **0 erros de tipo**.

**Correção sugerida:**
- `tsconfig.json` → adicionar `"node_modules.install-recovery"` ao `exclude`.
- `eslint.config.mjs` → adicionar `"node_modules.install-recovery/**"` aos `ignores`.

---

### 5. Endpoint `/api/leads` sem validação de formato/limite e sem proteção contra spam

**Arquivo:** `app/api/leads/route.ts`

**Problema:** aceita `body.email` sem validar formato nem tamanho, não normaliza/deduplica, e qualquer `anon` insere via policy `leads_insert_public`. Combinação típica para lista de spam.

**Correção sugerida:** validação de formato de e-mail e limite de tamanho, dedupe, e considerar rate limiting.

---

### 6. `error_logs_insert_public` com `with check (true)` em `anon`

**Arquivo:** `supabase/migrations/001_initial_minha_escala.sql`

**Problema:** qualquer pessoa grava log arbitrário (incluindo o campo `context` jsonb). Risco baixo, mas polui a tabela.

**Correção sugerida:** limitar campos/roles permitidos no insert da policy.

---

## 🟢 BAIXO / ROBUSTEZ

### 7. Webhook sem try/catch no `JSON.parse`
**Arquivo:** `app/api/payments/webhook/route.ts`
Payload malformado estoura 500 fora do handler de erro. Envolver o parse em try/catch.

### 8. Preço duplicado hardcoded
`ScheduleCalculatorService.calculate` usa `paidPreview.priceInCents: 599` hardcoded, desincronizado de `PaymentService.annualCalendarPriceInCents` (mesmo valor hoje, mas já é duplicação). Unificar como constante única.

### 9. SEO/Meta inconsistente
- `metadata.title.template` é `"%s"` (sem sufixo de marca).
- Páginas de escala não têm `site_name`/`type` consistentes no OpenGraph/Twitter em relação à home.

### 10. Acessibilidade
- `MonthCalendar` usa `<div role="table">` sem `role="row"`/`cell` em todos os filhos.
- Calendário anual usa `<span>` não clicáveis com ação implícita, sem `role="button"` nem `tabIndex`.

### 11. `/api/calculate` aceita `body.today` vindo do cliente
Inócuo hoje (front calcula local), mas é a única via de manipular a "data de hoje". Desnecessário em produção; remover ou restringir ao servidor.

---

## ✅ O QUE ESTÁ CORRETO (NÃO ALTERAR)

- Lógica das 4 escalas (ciclos, índices de folga, `positiveModulo` para datas anteriores) — validada nos testes.
- `BrazilDate`: datas UTC, sem dependência de timezone do servidor, validação de bissexto correta.
- RLS: `profiles_protect_access_status`, `is_admin()` com `security definer` e `search_path=''`, grants por coluna, índices de FK.
- Autenticação: service role só no servidor, bearer token verificado em `/auth/v1/user`, admin exige role no banco (não confia em metadados).
- `authenticateRequest` antes de `startCheckout` e ausência de `body.userId` client-side.

---

## 🎯 PRIORIDADE DE EXECUÇÃO

1. **Fechar o paywall** (item 1) — sem isso, não há produto vendável.
2. **Decidir o canal de pagamento** — PagBank manual ou Mercado Pago real (item 3), apagando o duplicado.
3. **Corrigir validação de assinatura do webhook** (item 2) — caso fique com Mercado Pago.
4. **Excluir `node_modules.install-recovery` do typecheck/lint** (item 4) — 1 linha, destrava CI/build.
5. Endpoints de leads/error_logs (itens 5 e 6).
6. Robustez e acessibilidade (itens 7 a 11).