export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled";

export class Payment {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly externalId: string,
    public readonly amountInCents: number,
    public readonly status: PaymentStatus,
  ) {}
}
