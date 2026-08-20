import { Payment, type PaymentStatus } from "@/src/models/entities/Payment";
import type { PaymentRepository } from "@/src/models/repositories/PaymentRepository";
import type { SupabaseClient } from "@supabase/supabase-js";

export class SupabasePaymentRepository implements PaymentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createPending(input: {
    userId: string;
    externalId: string;
    amountInCents: number;
  }): Promise<Payment> {
    const { data, error } = await this.supabase
      .from("payments")
      .insert({
        user_id: input.userId,
        provider: "mercado_pago",
        external_id: input.externalId,
        amount: input.amountInCents / 100,
        status: "pending",
      })
      .select("id,user_id,external_id,amount,status")
      .single();

    if (error || !data) {
      throw new Error("Não foi possível criar o pagamento.");
    }

    return this.toPayment(data);
  }

  async findByExternalId(externalId: string): Promise<Payment | null> {
    const { data, error } = await this.supabase
      .from("payments")
      .select("id,user_id,external_id,amount,status")
      .eq("external_id", externalId)
      .maybeSingle();

    if (error) {
      throw new Error("Não foi possível buscar o pagamento.");
    }

    return data ? this.toPayment(data) : null;
  }

  async updateStatus(
    externalId: string,
    status: PaymentStatus,
  ): Promise<Payment> {
    const current = await this.findByExternalId(externalId);
    if (!current) {
      throw new Error("Pagamento não encontrado.");
    }

    const { data, error } = await this.supabase
      .from("payments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("external_id", externalId)
      .select("id,user_id,external_id,amount,status")
      .single();

    if (error || !data) {
      throw new Error("Não foi possível atualizar o pagamento.");
    }

    if (current.status !== status) {
      await this.supabase.from("payment_status_history").insert({
        payment_id: current.id,
        previous_status: current.status,
        next_status: status,
      });
    }

    return this.toPayment(data);
  }

  async countByStatus(status: PaymentStatus): Promise<number> {
    const { count, error } = await this.supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", status);

    if (error) {
      throw new Error("Não foi possível contar pagamentos.");
    }

    return count ?? 0;
  }

  async sumApprovedRevenueInCents(): Promise<number> {
    const { data, error } = await this.supabase
      .from("payments")
      .select("amount")
      .eq("status", "approved");

    if (error) {
      throw new Error("Não foi possível calcular a receita.");
    }

    return (data ?? []).reduce(
      (total, row) => total + Math.round(Number(row.amount ?? 0) * 100),
      0,
    );
  }

  private toPayment(row: {
    id: string;
    user_id: string;
    external_id: string | null;
    amount: number | string | null;
    status: PaymentStatus;
  }): Payment {
    if (!row.external_id) {
      throw new Error("Pagamento sem identificador externo.");
    }

    return new Payment(
      row.id,
      row.user_id,
      row.external_id,
      Math.round(Number(row.amount ?? 0) * 100),
      row.status,
    );
  }
}
