import type { PaymentGateway } from "@/src/models/services/PaymentService";

interface MercadoPagoConfig {
  accessToken: string;
  webhookSecret: string;
  appUrl: string;
}

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
        back_urls: {
          success: `${this.config.appUrl}/conta`,
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

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature || !this.config.webhookSecret) {
      return false;
    }

    return rawBody.length > 0 && signature.length > 0;
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
