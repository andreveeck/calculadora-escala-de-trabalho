/**
 * Aplica supabase/apply-schema.sql no projeto Supabase e imprime a verificação
 * do schema (tabelas, RLS, policies, triggers e grants).
 *
 * Uso:
 *   SUPABASE_ACCESS_TOKEN=sbp_... npm run apply:schema
 *
 * O token é um Personal Access Token (Account → Access Tokens), não é a
 * service_role key: a Management API só aceita PAT.
 */
import { readFileSync } from "node:fs";

const SCHEMA_FILE = "supabase/apply-schema.sql";

const env = loadEnvFiles([".env.local", ".env"]);
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_ACCESS_TOKEN;

if (!supabaseUrl) {
  fail("NEXT_PUBLIC_SUPABASE_URL ausente em .env.local.");
}

const projectRef = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/.exec(
  supabaseUrl.trim(),
) ?.[1];

if (!projectRef) {
  fail(`Não consegui extrair o project ref de NEXT_PUBLIC_SUPABASE_URL (${supabaseUrl}).`);
}

if (!accessToken) {
  fail(
    [
      "Falta SUPABASE_ACCESS_TOKEN (Personal Access Token).",
      "Gere em https://supabase.com/dashboard/account/tokens e rode:",
      "  SUPABASE_ACCESS_TOKEN=sbp_... npm run apply:schema",
    ].join("\n"),
  );
}

console.log(`Projeto: ${projectRef}`);
console.log(`Arquivo: ${SCHEMA_FILE}\n`);

const sql = readFileSync(SCHEMA_FILE, "utf8");
await runQuery(sql, "aplicar schema");

console.log("\n=== verificação ===");

const tables = await runQuery(
  `select tablename, rowsecurity
     from pg_tables
    where schemaname = 'public'
    order by tablename`,
);
printTable("tabelas e RLS", tables.map((r) => [r.tablename, r.rowsecurity ? "RLS on" : "RLS OFF"]));

const policies = await runQuery(
  `select tablename, policyname, cmd, roles::text as roles
     from pg_policies
    where schemaname = 'public'
    order by tablename, policyname`,
);
printTable("policies", policies.map((r) => [r.tablename, r.policyname, r.cmd, r.roles]));

const triggers = await runQuery(
  `select event_object_schema as schema, event_object_table as tabela, trigger_name
     from information_schema.triggers
    where trigger_name in (
      'on_auth_user_created',
      'profiles_protect_access_status',
      'profiles_set_updated_at',
      'payments_set_updated_at',
      'error_logs_validate_insert'
    )
    order by tabela, trigger_name`,
);
printTable("triggers", triggers.map((r) => [`${r.schema}.${r.tabela}`, r.trigger_name]));

const grants = await runQuery(
  `select grantee, table_name, string_agg(privilege_type, ',' order by privilege_type) as privileges
     from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated', 'service_role')
    group by grantee, table_name
    order by grantee, table_name`,
);
printTable("grants", grants.map((r) => [r.grantee, r.table_name, r.privileges]));

const missingServiceRole = tables
  .map((r) => r.tablename)
  .filter((t) => !grants.some((g) => g.grantee === "service_role" && g.table_name === t));

if (missingServiceRole.length > 0) {
  fail(`service_role continua sem grants em: ${missingServiceRole.join(", ")}`);
}

console.log("\nOK: schema aplicado e conferido.");

async function runQuery(query, label) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : [];
  } catch {
    payload = text;
  }

  if (!response.ok) {
    fail(
      `${label} falhou (HTTP ${response.status}): ${
        typeof payload === "string" ? payload : JSON.stringify(payload)
      }`,
    );
  }

  return Array.isArray(payload) ? payload : [];
}

function printTable(title, rows) {
  console.log(`\n--- ${title} (${rows.length}) ---`);
  for (const row of rows) {
    console.log(row.map((cell) => String(cell ?? "")).join(" | "));
  }
}

function loadEnvFiles(files) {
  const values = {};
  for (const file of files) {
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      values[trimmed.slice(0, separator)] = trimmed.slice(separator + 1).trim();
    }
  }
  return values;
}

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}
