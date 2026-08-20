import { MercadoPagoGateway } from "@/src/infrastructure/mercado-pago/MercadoPagoGateway";
import { getMercadoPagoEnvironment } from "@/src/infrastructure/mercado-pago/environment";
import { SupabaseAccessEntitlementRepository } from "@/src/infrastructure/supabase/SupabaseAccessEntitlementRepository";
import { SupabasePaymentRepository } from "@/src/infrastructure/supabase/SupabasePaymentRepository";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server";
import { PaymentService } from "@/src/models/services/PaymentService";
import { PaymentController } from "./PaymentController";

export function createPaymentController(): PaymentController | null {
  const supabase = createServerSupabaseClient();
  const mercadoPago = getMercadoPagoEnvironment();

  if (!supabase || !mercadoPago) {
    return null;
  }

  return new PaymentController(
    new PaymentService(
      new SupabasePaymentRepository(supabase),
      new SupabaseAccessEntitlementRepository(supabase),
      new MercadoPagoGateway(mercadoPago),
    ),
  );
}
