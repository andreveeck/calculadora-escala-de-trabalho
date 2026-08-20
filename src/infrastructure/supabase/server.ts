import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

type SupabaseServerEnvironment = {
  url: string;
  publishableKey: string;
  serviceRoleKey?: string;
};

type SupabaseRuntimeEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export type AuthenticatedRequest = {
  user: User;
  adminClient: SupabaseClient;
};

function getServerEnvironment(): SupabaseServerEnvironment | null {
  const url = readRuntimeEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = readRuntimeEnvironment(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  const serviceRoleKey = readRuntimeEnvironment("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey, serviceRoleKey };
}

function readRuntimeEnvironment(key: keyof SupabaseRuntimeEnvironment) {
  const value = process.env[key];
  return value || undefined;
}

function serverAuthOptions() {
  return {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  } as const;
}

export function createServerSupabaseClient(): SupabaseClient | null {
  const env = getServerEnvironment();
  if (!env?.serviceRoleKey) {
    return null;
  }

  return createClient(env.url, env.serviceRoleKey, serverAuthOptions());
}

export function createPublicServerSupabaseClient(): SupabaseClient | null {
  const env = getServerEnvironment();
  if (!env) {
    return null;
  }

  return createClient(env.url, env.publishableKey, serverAuthOptions());
}

export async function authenticateRequest(
  request: Request,
): Promise<AuthenticatedRequest | null> {
  const accessToken = readBearerToken(request);
  const env = getServerEnvironment();
  const adminClient = env?.serviceRoleKey
    ? createClient(env.url, env.serviceRoleKey, serverAuthOptions())
    : null;

  if (!accessToken || !env || !adminClient) {
    return null;
  }

  const user = await verifySupabaseAccessToken(env, accessToken);
  if (!user) {
    return null;
  }

  return { user, adminClient };
}

export async function authenticateAdminRequest(
  request: Request,
): Promise<AuthenticatedRequest | null> {
  const authenticated = await authenticateRequest(request);
  if (!authenticated) {
    return null;
  }

  const { data: profile, error } = await authenticated.adminClient
    .from("profiles")
    .select("role")
    .eq("user_id", authenticated.user.id)
    .maybeSingle();

  if (error || profile?.role !== "admin") {
    return null;
  }

  return authenticated;
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

async function verifySupabaseAccessToken(
  env: SupabaseServerEnvironment,
  accessToken: string,
): Promise<User | null> {
  const authUrl = `${env.url.replace(/\/$/, "")}/auth/v1/user`;

  try {
    const response = await fetch(authUrl, {
      headers: {
        apikey: env.publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const user = (await response.json()) as User;
    return typeof user.id === "string" && user.id ? user : null;
  } catch {
    return null;
  }
}
