import { Lead } from "@/src/models/entities/Lead";
import type { LeadRepository } from "@/src/models/repositories/LeadRepository";
import type { SupabaseClient } from "@supabase/supabase-js";

export class SupabaseLeadRepository implements LeadRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(email: string, consentGiven: boolean): Promise<Lead> {
    const { data, error } = await this.supabase
      .from("leads")
      .insert({ email, consent_given: consentGiven })
      .select("id,email,consent_given,created_at")
      .single();

    if (error || !data) {
      throw new Error("Não foi possível cadastrar o contato.");
    }

    return new Lead(data.id, data.email, data.consent_given, data.created_at);
  }

  async count(): Promise<number> {
    const { count, error } = await this.supabase
      .from("leads")
      .select("id", { count: "exact", head: true });

    if (error) {
      throw new Error("Não foi possível contar contatos.");
    }

    return count ?? 0;
  }
}
