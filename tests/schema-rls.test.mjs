import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/001_initial_minha_escala.sql", import.meta.url),
  "utf8",
);

const tables = [
  "profiles",
  "leads",
  "payments",
  "payment_status_history",
  "access_entitlements",
  "events",
  "banners",
  "banner_events",
  "error_logs",
];

test("all MVP tables enable row level security", () => {
  for (const table of tables) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
    );
  }
});

test("user-owned policies use auth.uid ownership predicates", () => {
  assert.match(migration, /profiles_select_own/i);
  assert.match(migration, /payments_select_own/i);
  assert.match(migration, /entitlements_select_own/i);
  assert.match(migration, /\(select auth\.uid\(\)\) = user_id/i);
});

test("profiles store authorization in controlled columns", () => {
  assert.match(migration, /role text not null default 'user'/i);
  assert.match(migration, /role in \('user', 'admin'\)/i);
  assert.match(migration, /access_status text not null default 'pending_payment'/i);
  assert.match(
    migration,
    /access_status in \('pending_payment', 'approved', 'blocked'\)/i,
  );
  assert.match(migration, /profiles_protect_access_status/i);
  assert.match(migration, /not \(select private\.is_admin\(\)\)/i);
  assert.match(migration, /revoke update \(role, user_id, email\)/i);
});

test("admin policies use a table-controlled role lookup", () => {
  assert.match(migration, /create or replace function private\.is_admin/i);
  assert.match(migration, /where user_id = \(select auth\.uid\(\)\)\s+and role = 'admin'/i);
  assert.match(migration, /profiles_select_admin/i);
  assert.match(migration, /payments_select_admin/i);
  assert.match(
    migration,
    /grant usage on schema private to authenticated, service_role/i,
  );
  assert.match(
    migration,
    /grant execute on function private\.is_admin\(\) to authenticated, service_role/i,
  );
  assert.doesNotMatch(migration, /raw_user_meta_data\s*->>\s*'role'/i);
});

test("payments keep provider ids unique for future webhook idempotency", () => {
  assert.match(migration, /provider text not null default 'pagbank'/i);
  assert.match(migration, /external_id text unique/i);
  assert.match(migration, /unique \(user_id, product\)/i);
});

test("foreign keys used for ownership checks are indexed", () => {
  assert.match(migration, /create index payments_user_id_idx/i);
  assert.match(migration, /create index access_entitlements_user_id_idx/i);
});
