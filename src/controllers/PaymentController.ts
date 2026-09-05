import type { PaymentService } from "@/src/models/services/PaymentService";

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  startCheckout(userId: string): Promise<{
    checkoutUrl: string;
    paymentId: string;
  }> {
    if (!userId) {
      throw new Error("Usuario autenticado e obrigatorio.");
    }

    return this.paymentService.startCheckout(userId).then((result) => ({
      checkoutUrl: result.checkoutUrl,
      paymentId: result.payment.id,
    }));
  }

  handleWebhook(input: {
    rawBody: string;
    signature: string | null;
    requestId: string | null;
    externalId: string;
  }) {
    if (!input.externalId) {
      throw new Error("Identificador externo ausente.");
    }

    return this.paymentService.handleWebhook(input);
  }
}
