import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentGateway } from "@/src/models/services/PaymentService";

interface MercadoPagoConfig {
  accessToken: string;
  webhookSecret: string;
  appUrl: string;
}

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/i;

export class MercadoPagoGateway implements PaymentGateway {
  constructor(private readonly config: MercadoPagoConfig) {}

  async createCheckout(input: {
    userId: string;
    amountInCents: number;
    description: string;
  }): Promise<{ externalId: string; checkoutUrl: string }> {
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_reference: input.userId,
        items: [
          {
            title: input.description,
            quantity: 1,
            currency_id: "BRL",
            unit_price: input.amountInCents / 100,
          },
        ],
        notification_url: `${this.config.appUrl}/api/payments/webhook`,
        // As três voltas apontam para uma rota que existe: /conta nunca foi
        // criada, então quem pagava caía em 404 depois de concluir o checkout.
        back_urls: {
          success: `${this.config.appUrl}/calendario-anual`,
          failure: `${this.config.appUrl}/calendario-anual`,
          pending: `${this.config.appUrl}/calendario-anual`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Não foi possível criar o checkout.");
    }

    const data = (await response.json()) as {
      id: string;
      init_point?: string;
      sandbox_init_point?: string;
    };

    return {
      externalId: data.id,
      checkoutUrl: data.init_point ?? data.sandbox_init_point ?? "",
    };
  }

  /**
   * Valida o HMAC-SHA256 do webhook com o segredo configurado.
   *
   * Aceita os dois formatos usados na integração:
   * - `sha256=<hex>` ou `<hex>`: HMAC-SHA256 calculado sobre o corpo bruto.
   * - `ts=<timestamp>,v1=<hex>`: formato oficial do Mercado Pago, cujo HMAC
   *   cobre o manifesto `id:<recurso>;request-id:<header>;ts:<timestamp>;`.
   *
   * Sem assinatura, sem segredo, com hash divergente ou com corpo adulterado
   * a verificação falha. A comparação é feita em tempo constante.
   */
  verifyWebhookSignature(
    rawBody: string,
    signature: string | null,
    requestId: string | null,
  ): boolean {
    const secret = this.config.webhookSecret;
    if (!secret || !rawBody || !signature) {
      return false;
    }

    const normalizedSignature = signature.trim();
    if (!normalizedSignature) {
      return false;
    }

    const candidates: Array<{ payload: string; providedHash: string }> = [];

    const ts = /(?:^|[,;\s])ts=(\d+)/.exec(normalizedSignature)?.[1];
    const v1 = /(?:^|[,;\s])v1=([a-f0-9]{64})/i.exec(normalizedSignature)?.[1];

    if (ts && v1 && requestId) {
      const resourceId = readResourceId(rawBody);
      if (resourceId) {
        candidates.push({
          payload: `id:${resourceId};request-id:${requestId};ts:${ts};`,
          providedHash: v1,
        });
      }

      candidates.push({
        payload: `id:${requestId};request-id:${requestId};ts:${ts};`,
        providedHash: v1,
      });
    }

    const bareHash = normalizedSignature.replace(/^sha256=/i, "");
    if (SHA256_HEX_PATTERN.test(bareHash)) {
      candidates.push({ payload: rawBody, providedHash: bareHash });
    }

    if (candidates.length === 0) {
      return false;
    }

    return candidates.some(({ payload, providedHash }) =>
      matchesHmac(payload, providedHash, secret),
    );
  }

  async fetchPaymentStatus(
    externalId: string,
  ): Promise<"approved" | "rejected" | "pending"> {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${externalId}`, {
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      return "pending";
    }

    const data = (await response.json()) as { status?: string };
    if (data.status === "approved") {
      return "approved";
    }
    if (data.status === "rejected" || data.status === "cancelled") {
      return "rejected";
    }
    return "pending";
  }
}

function matchesHmac(payload: string, providedHash: string, secret: string): boolean {
  if (!SHA256_HEX_PATTERN.test(providedHash)) {
    return false;
  }

  const expected = Buffer.from(
    createHmac("sha256", secret).update(payload).digest("hex"),
    "hex",
  );
  const provided = Buffer.from(providedHash, "hex");

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

function readResourceId(rawBody: string): string | null {
  try {
    const payload = JSON.parse(rawBody) as {
      data?: { id?: unknown };
      id?: unknown;
    };
    const resourceId = payload.data?.id ?? payload.id;

    if (typeof resourceId !== "string" && typeof resourceId !== "number") {
      return null;
    }

    const value = String(resourceId).trim();
    return value ? value : null;
  } catch {
    return null;
  }
}
