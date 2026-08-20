import type { MetricsRepository } from "@/src/models/repositories/MetricsRepository";
import type { SupabaseClient } from "@supabase/supabase-js";

export class SupabaseMetricsRepository implements MetricsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async record(
    eventName: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    const { error } = await this.supabase.from("events").insert({
      event_name: eventName,
      metadata,
    });

    if (error) {
      throw new Error("Não foi possível registrar o evento.");
    }
  }

  async count(eventName: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", eventName);

    if (error) {
      throw new Error("Não foi possível contar eventos.");
    }

    return count ?? 0;
  }
}
