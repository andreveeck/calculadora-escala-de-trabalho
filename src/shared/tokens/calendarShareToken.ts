import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

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
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export interface CalendarShareParams {
  scheduleType: string;
  referenceDate: string;
}

/**
 * Gera um token assinado que autoriza acesso ao calendário anual
 * compartilhado, válido por 7 dias.
 */
export function generateShareToken(
  params: CalendarShareParams,
): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const payload: ShareTokenPayload = {
    s: params.scheduleType,
    r: params.referenceDate,
    e: Date.now() + TOKEN_EXPIRY_MS,
    n: crypto.randomUUID(),
  };

  const serialized = JSON.stringify(payload);
  const encoded = Buffer.from(serialized).toString("base64url");
  const signature = sign(serialized, secret);

  return `${encoded}.${signature}`;
}

/**
 * Valida um token de compartilhamento e retorna os parâmetros
 * se for válido, ou null caso contrário.
 */
export function verifyShareToken(
  token: string,
): CalendarShareParams | null {
  const secret = getSecret();
  if (!secret) return null;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encoded = token.slice(0, dotIndex);
  const providedSignature = token.slice(dotIndex + 1);

  let serialized: string;
  try {
    serialized = Buffer.from(encoded, "base64url").toString("utf-8");
  } catch {
    return null;
  }

  const expectedSignature = sign(serialized, secret);
  if (!safeEqual(expectedSignature, providedSignature)) {
    return null;
  }

  let payload: ShareTokenPayload;
  try {
    payload = JSON.parse(serialized) as ShareTokenPayload;
  } catch {
    return null;
  }

  if (!payload.s || !payload.r || typeof payload.e !== "number") {
    return null;
  }

  if (Date.now() > payload.e) {
    return null;
  }

  const validTypes = ["6x1", "12x36", "6x2", "3x3"];
  if (!validTypes.includes(payload.s)) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.r)) {
    return null;
  }

  return { scheduleType: payload.s, referenceDate: payload.r };
}
