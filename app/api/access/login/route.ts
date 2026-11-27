import { createPublicServerSupabaseClient } from "@/src/infrastructure/supabase/server";
import {
  connectionErrorMessage,
  isConnectionFailure,
} from "@/src/infrastructure/supabase/authErrors";
import { SafeLogger } from "@/src/infrastructure/logging/SafeLogger";
import {
  clientIp,
  consumeRateLimit,
  resetRateLimit,
  tooManyRequestsResponse,
} from "@/src/infrastructure/security/rateLimit";

/** Janela de bloqueio após excesso de tentativas. */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
/** Tentativas por conta (e-mail) dentro da janela. */
const MAX_ATTEMPTS_PER_ACCOUNT = 5;
/** Tentativas por IP dentro da janela (protege várias contas do mesmo IP). */
const MAX_ATTEMPTS_PER_IP = 25;

/**
 * Mensagem única para credencial inválida: não revela se o e-mail existe nem
 * repassa o texto do provedor de autenticação.
 */
const INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha incorretos.";
const RATE_LIMIT_MESSAGE =
  "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.";

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

  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { message: "Corpo da requisição inválido." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const ip = clientIp(request);

  // Barreira por IP antes de qualquer chamada ao provedor.
  const ipLimit = consumeRateLimit(
    `login:ip:${ip}`,
    MAX_ATTEMPTS_PER_IP,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!ipLimit.allowed) {
    logger.info("auth.login.rate_limited", { ip, scope: "ip" });
    return tooManyRequestsResponse(ipLimit, RATE_LIMIT_MESSAGE);
  }

  if (!email || !password) {
    return Response.json(
      { message: "Informe e-mail e senha." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  // Barreira por conta: um ataque distribuído contra um único e-mail também
  // para, não só o ataque repetido do mesmo IP.
  const accountKey = `login:account:${email}`;
  const accountLimit = consumeRateLimit(
    accountKey,
    MAX_ATTEMPTS_PER_ACCOUNT,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!accountLimit.allowed) {
    logger.info("auth.login.rate_limited", { ip, scope: "account" });
    return tooManyRequestsResponse(accountLimit, RATE_LIMIT_MESSAGE);
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      if (isConnectionFailure(error)) {
        return Response.json(
          { message: connectionErrorMessage },
          { status: 503, headers: noStoreHeaders },
        );
      }

      logger.info("auth.login.failed", { ip });
      return Response.json(
        { message: INVALID_CREDENTIALS_MESSAGE },
        { status: 401, headers: noStoreHeaders },
      );
    }

    // Login válido libera a janela da conta, para não punir quem apenas errou
    // a senha algumas vezes e depois acertou.
    resetRateLimit(accountKey);

    return Response.json(
      {
        user: { id: data.user.id, email: data.user.email },
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
      { headers: noStoreHeaders },
    );
  } catch {
    logger.error("auth.login.unexpected", { ip });
    return Response.json(
      { message: "Não foi possível entrar. Tente novamente." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
