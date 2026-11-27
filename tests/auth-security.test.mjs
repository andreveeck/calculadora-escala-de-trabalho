import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  adminPanel,
  adminRoute,
  serverClient,
  accessFlow,
  loginRoute,
  registerRoute,
  checkoutRoute,
  packageJson,
  appStyles,
  nextConfig,
] = await Promise.all([
  readFile(new URL("../src/views/components/AdminPanel.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/api/admin/access-users/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/infrastructure/supabase/server.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/views/components/AccessFlow.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/api/access/login/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/api/access/register/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/api/payments/checkout/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
]);

test("admin frontend has no hardcoded credentials", () => {
  assert.doesNotMatch(adminPanel, /adminCredentials|minhaescala2026/i);
  // Login administrativo passa pelo Route Handler para ter limite de tentativas.
  assert.match(adminPanel, /\/api\/access\/login/);
  assert.match(adminPanel, /setSession/);
});

test("administrative route validates a bearer user and database role", () => {
  assert.match(adminRoute, /authenticateAdminRequest/);
  assert.match(serverClient, /verifySupabaseAccessToken\(env, accessToken\)/);
  assert.match(serverClient, /\/auth\/v1\/user/);
  assert.match(serverClient, /\.eq\("user_id", authenticated\.user\.id\)/);
  assert.match(serverClient, /profile\?\.role !== "admin"/);
  // Perfil bloqueado perde o acesso administrativo mesmo com token válido.
  assert.match(serverClient, /access_status === "blocked"/);
});

test("administrative endpoints are rate limited, private and audited", () => {
  assert.match(adminRoute, /consumeRateLimit\(/);
  assert.match(adminRoute, /Cache-Control": "no-store"/);
  assert.match(adminRoute, /logger\.info\("admin\.access_status\.updated"/);
  assert.match(adminRoute, /logger\.info\("admin\.user\.deleted"/);
});

test("admin cannot change own status or delete administrative accounts", () => {
  assert.match(adminRoute, /Você não pode alterar o próprio status de acesso\./);
  assert.match(adminRoute, /currentProfile\.role === "admin"/);
  assert.match(adminRoute, /Contas administrativas não podem ser excluídas pelo painel\./);
});

test("server login is rate limited and never leaks provider errors", () => {
  assert.match(loginRoute, /consumeRateLimit\(/);
  assert.match(loginRoute, /MAX_ATTEMPTS_PER_ACCOUNT/);
  assert.match(loginRoute, /MAX_ATTEMPTS_PER_IP/);
  assert.match(loginRoute, /resetRateLimit\(accountKey\)/);
  assert.match(loginRoute, /Cache-Control": "no-store"/);
  assert.doesNotMatch(loginRoute, /error\.message/);
});

test("registration enforces a stronger password and a trusted redirect origin", () => {
  assert.match(registerRoute, /MIN_PASSWORD_LENGTH = 8/);
  assert.match(registerRoute, /consumeRateLimit\(/);
  assert.match(registerRoute, /NEXT_PUBLIC_APP_URL/);
  assert.match(registerRoute, /Cache-Control": "no-store"/);
  assert.doesNotMatch(registerRoute, /error\.message/);
});

test("security headers block framing and inline embedding of the admin panel", () => {
  assert.match(nextConfig, /Content-Security-Policy/);
  assert.match(nextConfig, /frame-ancestors 'none'/);
  assert.match(nextConfig, /X-Frame-Options/);
  assert.match(nextConfig, /Referrer-Policy/);
  assert.match(nextConfig, /X-Content-Type-Options/);
  assert.match(nextConfig, /poweredByHeader: false/);
  assert.match(nextConfig, /X-Robots-Tag/);
});

test("service role key is absent from client-side modules", () => {
  assert.doesNotMatch(adminPanel, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(accessFlow, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(serverClient, /readRuntimeEnvironment\("SUPABASE_SERVICE_ROLE_KEY"\)/);
});

test("service role key remains a server-only Vercel environment variable", () => {
  assert.match(serverClient, /readRuntimeEnvironment\("SUPABASE_SERVICE_ROLE_KEY"\)/);
  assert.doesNotMatch(serverClient, /cloudflare:workers|cloudflareEnv/);
  assert.doesNotMatch(packageJson, /vinext|@cloudflare\/vite-plugin|@openai\/sites-vite-plugin/);

  const manifest = JSON.parse(packageJson);
  assert.equal(manifest.scripts.dev, "next dev");
  assert.equal(manifest.scripts.build, "next build");
  assert.equal(manifest.scripts.start, "next start");
  assert.equal(manifest.dependencies.next, "16.2.6");
});

test("server Supabase auth reads public configuration from the standard runtime environment", () => {
  assert.match(serverClient, /readRuntimeEnvironment\("NEXT_PUBLIC_SUPABASE_URL"\)/);
  assert.match(
    serverClient,
    /readRuntimeEnvironment\(\s*"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",\s*\)/,
  );
  assert.match(serverClient, /process\.env\[key\]/);
});

test("PagBank official payment link remains in the access flow", () => {
  assert.match(accessFlow, /https:\/\/pag\.ae\/82opimxEr/);
});

test("pending payment actions share an aligned responsive container", () => {
  assert.match(accessFlow, /<div className="payment-actions">/);
  assert.match(appStyles, /\.payment-actions\s*\{[\s\S]*display:\s*flex[\s\S]*align-items:\s*center/);
  assert.match(appStyles, /\.payment-actions \.access-secondary-button\s*\{[\s\S]*margin-top:\s*0/);
});

test("legacy checkout never trusts a client supplied user id", () => {
  assert.match(checkoutRoute, /authenticateRequest\(request\)/);
  assert.match(checkoutRoute, /startCheckout\(authenticated\.user\.id\)/);
  assert.doesNotMatch(checkoutRoute, /body\.userId/);
});
