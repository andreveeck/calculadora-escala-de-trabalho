import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validade curta do link compartilhado: o token deixa de funcionar em 1 hora.
 * Quem recebeu o link precisa abrir o calendário dentro desse período.
 */
export const SHARE_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Tolerância de relógio ao validar a expiração. */
const CLOCK_SKEW_MS = 60 * 1000;

/** Um token legítimo tem algumas centenas de bytes; o limite evita abuso. */
const MAX_TOKEN_LENGTH = 2048;

const SIGNATURE_PATTERN = /^[a-f0-9]{64}$/i;
const VALID_SCHEDULE_TYPES = ["6x1", "12x36", "6x2", "3x3"];

interface ShareTokenPayload {
  /** Tipo de escala: "6x1", "12x36", "6x2", "3x3" */
  s: string;
  /** Data de referência ISO (YYYY-MM-DD) */
  r: string;
  /** Timestamp de expiração (epoch ms) */
  e: number;
  /** Nonce aleatório para evitar reuso */
  n: string;
}

function getSecret(): string | null {
  const secret = process.env.CALENDAR_SHARE_SECRET;
  if (!secret || secret.length < 16) {
    return null;
  }
  return secret;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const expected = Buffer.from(a, "hex");
  const provided = Buffer.from(b, "hex");

  if (expected.length !== provided.length || expected.length === 0) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

export interface CalendarShareParams {
  scheduleType: string;
  referenceDate: string;
}

/**
 * Gera um token assinado (HMAC-SHA256) que autoriza a visualização somente
 * leitura do calendário anual pelo período de SHARE_TOKEN_TTL_MS.
 */
export function generateShareToken(
  params: CalendarShareParams,
  now: number = Date.now(),
): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const payload: ShareTokenPayload = {
    s: params.scheduleType,
    r: params.referenceDate,
    e: now + SHARE_TOKEN_TTL_MS,
    n: crypto.randomUUID(),
  };

  const serialized = JSON.stringify(payload);
  const encoded = Buffer.from(serialized).toString("base64url");
  const signature = sign(serialized, secret);

  return `${encoded}.${signature}`;
}

/**
 * Valida um token de compartilhamento e retorna os parâmetros se a assinatura
 * conferir, o token estiver dentro da validade e o conteúdo for aceito.
 * Qualquer falha (ausente, adulterado, expirado) retorna null, o que faz a
 * página cair no fluxo normal de login/pagamento.
 */
export function verifyShareToken(
  token: string,
  now: number = Date.now(),
): CalendarShareParams | null {
  if (typeof token !== "string") return null;

  const trimmed = token.trim();
  if (!trimmed || trimmed.length > MAX_TOKEN_LENGTH) return null;

  const secret = getSecret();
  if (!secret) return null;

  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === trimmed.length - 1) return null;

  const encoded = trimmed.slice(0, dotIndex);
  const providedSignature = trimmed.slice(dotIndex + 1);

  if (!SIGNATURE_PATTERN.test(providedSignature)) return null;

  let serialized: string;
  try {
    serialized = Buffer.from(encoded, "base64url").toString("utf-8");
  } catch {
    return null;
  }

  if (!serialized) return null;

  if (!safeEqual(sign(serialized, secret), providedSignature)) return null;

  let payload: ShareTokenPayload;
  try {
    payload = JSON.parse(serialized) as ShareTokenPayload;
  } catch {
    return null;
  }

  if (
    typeof payload.s !== "string" ||
    typeof payload.r !== "string" ||
    typeof payload.e !== "number" ||
    !Number.isFinite(payload.e)
  ) {
    return null;
  }

  // Expirado: cai no fluxo normal de login/pagamento.
  if (now > payload.e) return null;

  // Expiração absurda (assinada por uma versão antiga/longa) também é recusada.
  if (payload.e - now > SHARE_TOKEN_TTL_MS + CLOCK_SKEW_MS) return null;

  if (!VALID_SCHEDULE_TYPES.includes(payload.s)) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.r)) return null;

  return { scheduleType: payload.s, referenceDate: payload.r };
}
