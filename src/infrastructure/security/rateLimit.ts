/**
 * Rate limit simples em memória, por instância do processo.
 *
 * Serve como primeira barreira contra força bruta e abuso de endpoints
 * públicos (login, cadastro, painel administrativo). Em ambiente com várias
 * instâncias (serverless), cada instância tem seu próprio contador: o limite
 * efetivo é multiplicado pelo número de instâncias. Para garantia distribuída
 * é necessário um store compartilhado (Redis/Upstash), o que este projeto não
 * usa hoje.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, Bucket>();

/** Evita crescimento ilimitado da memória com chaves antigas. */
const MAX_TRACKED_KEYS = 5_000;

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * Consome uma tentativa da chave informada dentro de uma janela fixa.
 * A primeira chamada abre a janela; quando o limite é atingido, a chave fica
 * bloqueada até `resetAt`.
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  if (buckets.size >= MAX_TRACKED_KEYS) {
    pruneExpired(now);
  }

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: 0,
    };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;

  return {
    allowed: true,
    remaining: Math.max(limit - bucket.count, 0),
    retryAfterSeconds: 0,
  };
}

/** Zera a janela de uma chave (usado após um login bem-sucedido). */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * IP do cliente atrás de proxy (Vercel/nginx). Sem cabeçalho de proxy o valor
 * é "unknown", o que compartilha o limite entre os clientes locais.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function tooManyRequestsResponse(
  result: RateLimitResult,
  message: string,
): Response {
  return Response.json(
    { message },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}
