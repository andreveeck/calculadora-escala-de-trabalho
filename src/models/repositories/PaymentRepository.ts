import type { Payment, PaymentStatus } from "@/src/models/entities/Payment";

export interface PaymentRepository {
  createPending(input: {
    userId: string;
    externalId: string;
    amountInCents: number;
  }): Promise<Payment>;
  findByExternalId(externalId: string): Promise<Payment | null>;
  updateStatus(externalId: string, status: PaymentStatus): Promise<Payment>;
  countByStatus(status: PaymentStatus): Promise<number>;
  sumApprovedRevenueInCents(): Promise<number>;
}
