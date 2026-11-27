import { createPublicServerSupabaseClient } from "@/src/infrastructure/supabase/server";
import {
  connectionErrorMessage,
  isConnectionFailure,
} from "@/src/infrastructure/supabase/authErrors";
import { SafeLogger } from "@/src/infrastructure/logging/SafeLogger";
import {
  clientIp,
  consumeRateLimit,
  tooManyRequestsResponse,
} from "@/src/infrastructure/security/rateLimit";
import type { User } from "@supabase/supabase-js";

const alreadyRegisteredEmailMessage =
  "Este e-mail já está cadastrado. Use a opção Entrar para acessar sua conta.";

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_REGISTRATIONS_PER_IP = 5;

const noStoreHeaders = { "Cache-Control": "no-store" };
const logger = new SafeLogger();

export async function POST(request: Request): Promise<Response> {
  const supabase = createPublicServerSupabaseClient();
  if (!supabase) {
    return Response.json(
      { message: "Supabase ainda não configurado." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const ip = clientIp(request);
  const ipLimit = consumeRateLimit(
    `register:ip:${ip}`,
    MAX_REGISTRATIONS_PER_IP,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!ipLimit.allowed) {
    logger.info("auth.register.rate_limited", { ip });
    return tooManyRequestsResponse(
      ipLimit,
      "Muitos cadastros em sequência. Aguarde alguns minutos e tente novamente.",
    );
  }

  let body: { name?: unknown; email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { message: "Corpo da requisição inválido." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !email || password.length < MIN_PASSWORD_LENGTH) {
    return Response.json(
      {
        message: `Informe nome, e-mail e uma senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      },
      { status: 400, headers: noStoreHeaders },
    );
  }

  if (
    name.length > MAX_NAME_LENGTH ||
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_REGEX.test(email)
  ) {
    return Response.json(
      { message: "Confira o nome e o e-mail informados." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: accessRedirectUrl(request),
      },
    });

    if (isAlreadyRegisteredAuthError(error)) {
      return Response.json(
        { message: alreadyRegisteredEmailMessage },
        { status: 409, headers: noStoreHeaders },
      );
    }

    if (error) {
      throw error;
    }

    if (isAlreadyRegisteredSignUp(data.user)) {
      return Response.json(
        { message: alreadyRegisteredEmailMessage },
        { status: 409, headers: noStoreHeaders },
      );
    }

    return Response.json(
      {
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
        accessToken: data.session?.access_token ?? null,
        refreshToken: data.session?.refresh_token ?? null,
        requiresEmailConfirmation: !data.session,
      },
      { status: 201, headers: noStoreHeaders },
    );
  } catch (error) {
    if (isConnectionFailure(error)) {
      return Response.json(
        { message: connectionErrorMessage },
        { status: 503, headers: noStoreHeaders },
      );
    }

    logger.error("auth.register.failed", { ip });
    return Response.json(
      { message: "Não foi possível concluir o cadastro. Tente novamente." },
      { status: 400, headers: noStoreHeaders },
    );
  }
}

/**
 * O redirect de confirmação vem de NEXT_PUBLIC_APP_URL (configuração
 * confiável). O header Host da requisição só é usado como último recurso em
 * desenvolvimento, porque é controlado pelo cliente e permite open redirect.
 */
function accessRedirectUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const base =
    configured && /^https?:\/\//i.test(configured)
      ? configured
      : new URL(request.url).origin;

  return new URL("/acesso", base).toString();
}

function isAlreadyRegisteredSignUp(user: User | null): boolean {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

function isAlreadyRegisteredAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeAuthError = error as { code?: unknown; message?: unknown };
  return (
    maybeAuthError.code === "user_already_exists" ||
    maybeAuthError.message === "User already registered"
  );
}
