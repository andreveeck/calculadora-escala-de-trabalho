import type { Payment } from "@/src/models/entities/Payment";
import type { AccessEntitlementRepository } from "@/src/models/repositories/AccessEntitlementRepository";
import type { PaymentRepository } from "@/src/models/repositories/PaymentRepository";

export interface PaymentGateway {
  createCheckout(input: {
    userId: string;
    amountInCents: number;
    description: string;
  }): Promise<{ externalId: string; checkoutUrl: string }>;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
  fetchPaymentStatus(externalId: string): Promise<"approved" | "rejected" | "pending">;
}

export class PaymentService {
  static readonly annualCalendarPriceInCents = 599;

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly entitlementRepository: AccessEntitlementRepository,
    private readonly gateway: PaymentGateway,
  ) {}

  async startCheckout(userId: string): Promise<{
    payment: Payment;
    checkoutUrl: string;
  }> {
    const checkout = await this.gateway.createCheckout({
      userId,
      amountInCents: PaymentService.annualCalendarPriceInCents,
      description: "Minha Escala - calendário anual vitalício",
    });
    const existing = await this.paymentRepository.findByExternalId(
      checkout.externalId,
    );
    const payment =
      existing ??
      (await this.paymentRepository.createPending({
        userId,
        externalId: checkout.externalId,
        amountInCents: PaymentService.annualCalendarPriceInCents,
      }));

    return { payment, checkoutUrl: checkout.checkoutUrl };
  }

  async handleWebhook(input: {
    rawBody: string;
    signature: string | null;
    externalId: string;
  }): Promise<Payment | null> {
    if (!this.gateway.verifyWebhookSignature(input.rawBody, input.signature)) {
      throw new Error("Webhook inválido.");
    }

    const payment = await this.paymentRepository.findByExternalId(
      input.externalId,
    );
    if (!payment) {
      return null;
    }

    const providerStatus = await this.gateway.fetchPaymentStatus(
      input.externalId,
    );
    const updated = await this.paymentRepository.updateStatus(
      input.externalId,
      providerStatus,
    );

    if (providerStatus === "approved") {
      await this.entitlementRepository.grantAnnualCalendarAccess({
        userId: payment.userId,
        paymentId: payment.id,
      });
    }

    return updated;
  }
}
