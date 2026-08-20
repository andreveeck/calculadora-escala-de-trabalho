import type { Lead } from "@/src/models/entities/Lead";

export interface LeadRepository {
  create(email: string, consentGiven: boolean): Promise<Lead>;
  count(): Promise<number>;
}
