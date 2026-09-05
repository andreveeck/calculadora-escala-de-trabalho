import assert from "node:assert/strict";
import test from "node:test";
import type { Payment, PaymentStatus } from "../src/models/entities/Payment";
import type { AccessEntitlement } from "../src/models/entities/AccessEntitlement";
import type { AccessEntitlementRepository } from "../src/models/repositories/AccessEntitlementRepository";
import type { PaymentRepository } from "../src/models/repositories/PaymentRepository";
import {
  PaymentService,
  type PaymentGateway,
} from "../src/models/services/PaymentService";

class InMemoryPaymentRepository implements PaymentRepository {
  private readonly payments = new Map<string, Payment>();

  async createPending(input: {
    userId: string;
    externalId: string;
    amountInCents: number;
  }): Promise<Payment> {
    const payment = {
      id: `payment-${this.payments.size + 1}`,
      userId: input.userId,
      externalId: input.externalId,
      amountInCents: input.amountInCents,
      status: "pending" as PaymentStatus,
    } satisfies Payment;
    this.payments.set(input.externalId, payment);
    return payment;
  }

  async findByExternalId(externalId: string): Promise<Payment | null> {
    return this.payments.get(externalId) ?? null;
  }

  async updateStatus(
    externalId: string,
    status: PaymentStatus,
  ): Promise<Payment> {
    const payment = this.payments.get(externalId);
    if (!payment) {
      throw new Error("Pagamento não encontrado.");
    }
    const updated = { ...payment, status } satisfies Payment;
    this.payments.set(externalId, updated);
    return updated;
  }

  async countByStatus(status: PaymentStatus): Promise<number> {
    return [...this.payments.values()].filter((payment) => payment.status === status)
      .length;
  }

  async sumApprovedRevenueInCents(): Promise<number> {
    return [...this.payments.values()]
      .filter((payment) => payment.status === "approved")
      .reduce((total, payment) => total + payment.amountInCents, 0);
  }
}

class InMemoryEntitlementRepository implements AccessEntitlementRepository {
  readonly grants = new Map<string, AccessEntitlement>();

  async findAnnualCalendarAccess(
    userId: string,
  ): Promise<AccessEntitlement | null> {
    return this.grants.get(userId) ?? null;
  }

  async grantAnnualCalendarAccess(input: {
    userId: string;
    paymentId: string;
  }): Promise<AccessEntitlement> {
    const existing = this.grants.get(input.userId);
    if (existing) {
      return existing;
    }
    const entitlement = {
      id: `entitlement-${this.grants.size + 1}`,
      userId: input.userId,
      product: "annual-calendar",
      paymentId: input.paymentId,
      lifetime: true,
      grantedAt: "2026-08-20T00:00:00.000Z",
    } satisfies AccessEntitlement & { paymentId: string };
    this.grants.set(input.userId, entitlement);
    return entitlement;
  }
}

class FakePaymentGateway implements PaymentGateway {
  status: "approved" | "rejected" | "pending" = "approved";
  signatureValid = true;

  async createCheckout(): Promise<{ externalId: string; checkoutUrl: string }> {
    return {
      externalId: "external-1",
      checkoutUrl: "https://checkout.example/pay",
    };
  }

  verifyWebhookSignature(): boolean {
    return this.signatureValid;
  }

  async fetchPaymentStatus(): Promise<"approved" | "rejected" | "pending"> {
    return this.status;
  }
}

test("approved webhook grants annual access once", async () => {
  const payments = new InMemoryPaymentRepository();
  const entitlements = new InMemoryEntitlementRepository();
  const gateway = new FakePaymentGateway();
  const service = new PaymentService(payments, entitlements, gateway);

  await service.startCheckout("user-1");
  await service.handleWebhook({
    rawBody: "{}",
    signature: "valid",
    requestId: "req-1",
    externalId: "external-1",
  });
  await service.handleWebhook({
    rawBody: "{}",
    signature: "valid",
    requestId: "req-1",
    externalId: "external-1",
  });

  assert.equal(await payments.countByStatus("approved"), 1);
  assert.equal(entitlements.grants.size, 1);
});

test("rejected webhook does not grant paid access", async () => {
  const payments = new InMemoryPaymentRepository();
  const entitlements = new InMemoryEntitlementRepository();
  const gateway = new FakePaymentGateway();
  gateway.status = "rejected";
  const service = new PaymentService(payments, entitlements, gateway);

  await service.startCheckout("user-1");
  await service.handleWebhook({
    rawBody: "{}",
    signature: "valid",
    requestId: "req-1",
    externalId: "external-1",
  });

  assert.equal(await payments.countByStatus("rejected"), 1);
  assert.equal(entitlements.grants.size, 0);
});

test("invalid webhook is rejected", async () => {
  const service = new PaymentService(
    new InMemoryPaymentRepository(),
    new InMemoryEntitlementRepository(),
    Object.assign(new FakePaymentGateway(), { signatureValid: false }),
  );

  await assert.rejects(
    service.handleWebhook({
      rawBody: "{}",
      signature: "invalid",
      requestId: "req-1",
      externalId: "external-1",
    }),
    /webhook inválido/i,
  );
});
