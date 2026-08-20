import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.APP_TEST_BASE_URL ?? "http://localhost:3005";
const env = loadLocalEnv();

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
  throw new Error("Variáveis Supabase incompletas em .env.local.");
}

const authOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

const serviceClient = createClient(supabaseUrl, serviceRoleKey, authOptions);
const suffix = randomUUID().slice(0, 8);
const password = `CodexTest!${suffix}2026`;
const adminEmail = `codex-admin-${suffix}@example.com`;
const userEmail = `codex-user-${suffix}@example.com`;
const createdUserIds = [];

try {
  const adminUser = await createConfirmedUser(adminEmail, password, "Admin Codex");
  const accessUser = await createConfirmedUser(userEmail, password, "Usuario Codex");
  createdUserIds.push(adminUser.id, accessUser.id);

  await updateProfile(adminUser.id, {
    role: "admin",
    access_status: "approved",
  });

  const pendingProfile = await getProfile(accessUser.id);
  assertEqual(pendingProfile.access_status, "pending_payment", "usuário nasce pendente");

  const userToken = await signIn(userEmail, password);
  await verifyToken("usuário comum", userToken);
  const pendingMe = await apiJson("/api/access/me", {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assertEqual(
    pendingMe.profile.access_status,
    "pending_payment",
    "API /access/me mantém pagamento pendente",
  );

  const adminToken = await signIn(adminEmail, password);
  await verifyToken("admin", adminToken);
  const beforeRelease = await apiJson("/api/admin/access-users", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!beforeRelease.users.some((user) => user.user_id === accessUser.id)) {
    throw new Error("Usuário pendente não apareceu no painel admin.");
  }

  await apiJson("/api/admin/access-users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: accessUser.id,
      accessStatus: "approved",
    }),
  });

  const approvedMe = await apiJson("/api/access/me", {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assertEqual(
    approvedMe.profile.access_status,
    "approved",
    "API /access/me reflete liberação admin",
  );

  const rlsClient = createClient(supabaseUrl, publishableKey, authOptions);
  const { error: sessionError } = await rlsClient.auth.setSession({
    access_token: userToken,
    refresh_token: "unused-by-query",
  });
  if (sessionError) throw sessionError;

  const { data: calendarGateProfile, error: calendarGateError } = await rlsClient
    .from("profiles")
    .select("access_status")
    .eq("user_id", accessUser.id)
    .single();
  if (calendarGateError) throw calendarGateError;
  assertEqual(
    calendarGateProfile.access_status,
    "approved",
    "consulta usada pelo calendário anual libera acesso",
  );

  const { data: payments, error: paymentsError } = await serviceClient
    .from("payments")
    .select("status,provider")
    .eq("user_id", accessUser.id);
  if (paymentsError) throw paymentsError;
  if (!payments.some((payment) => payment.status === "approved")) {
    throw new Error("Liberação admin não registrou pagamento aprovado.");
  }

  console.log("OK cadastro -> pendente -> admin -> calendario aprovado");
} finally {
  for (const userId of createdUserIds) {
    await serviceClient.auth.admin.deleteUser(userId);
  }
}

function loadLocalEnv() {
  const output = {};
  const contents = readFileSync(".env.local", "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    output[key] = value;
  }

  return output;
}

async function createConfirmedUser(email, password, name) {
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    throw error ?? new Error(`Não foi possível criar ${email}.`);
  }

  return data.user;
}

async function signIn(email, password) {
  const client = createClient(supabaseUrl, publishableKey, authOptions);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw error ?? new Error(`Não foi possível entrar como ${email}.`);
  }

  return data.session.access_token;
}

async function verifyToken(label, accessToken) {
  const client = createClient(supabaseUrl, publishableKey, authOptions);
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    throw error ?? new Error(`Token de ${label} não pôde ser validado.`);
  }
}

async function updateProfile(userId, patch) {
  const { error } = await serviceClient
    .from("profiles")
    .update(patch)
    .eq("user_id", userId);
  if (error) throw error;
}

async function getProfile(userId) {
  const { data, error } = await serviceClient
    .from("profiles")
    .select("role,access_status")
    .eq("user_id", userId)
    .single();
  if (error) throw error;

  return data;
}

async function apiJson(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path} retornou ${response.status}: ${payload.message}`);
  }

  return payload;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${expected}, recebido ${actual}`);
  }
}
