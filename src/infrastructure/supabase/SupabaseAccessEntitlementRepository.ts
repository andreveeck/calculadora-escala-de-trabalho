import { AccessEntitlement } from "@/src/models/entities/AccessEntitlement";
import type { AccessEntitlementRepository } from "@/src/models/repositories/AccessEntitlementRepository";
import type { SupabaseClient } from "@supabase/supabase-js";

export class SupabaseAccessEntitlementRepository
  implements AccessEntitlementRepository
{
  constructor(private readonly supabase: SupabaseClient) {}

  async findAnnualCalendarAccess(
    userId: string,
  ): Promise<AccessEntitlement | null> {
    const { data, error } = await this.supabase
      .from("access_entitlements")
      .select("id,user_id,product,granted_at,lifetime")
      .eq("user_id", userId)
      .eq("product", "annual-calendar")
      .maybeSingle();

    if (error) {
      throw new Error("Não foi possível verificar o acesso.");
    }

    return data
      ? new AccessEntitlement(
          data.id,
          data.user_id,
          data.product,
          data.granted_at,
          data.lifetime,
        )
      : null;
  }

  async grantAnnualCalendarAccess(input: {
    userId: string;
    paymentId: string;
  }): Promise<AccessEntitlement> {
    const { error: profileError } = await this.supabase
      .from("profiles")
      .update({ access_status: "approved" })
      .eq("user_id", input.userId);

    if (profileError) {
      throw new Error("Não foi possível atualizar o status de acesso.");
    }

    const { data, error } = await this.supabase
      .from("access_entitlements")
      .upsert(
        {
          user_id: input.userId,
          payment_id: input.paymentId,
          product: "annual-calendar",
          lifetime: true,
        },
        { onConflict: "user_id,product" },
      )
      .select("id,user_id,product,granted_at,lifetime")
      .single();

    if (error || !data) {
      throw new Error("Não foi possível liberar o acesso.");
    }

    return new AccessEntitlement(
      data.id,
      data.user_id,
      data.product,
      data.granted_at,
      data.lifetime,
    );
  }
}
