import type { AccessEntitlement } from "@/src/models/entities/AccessEntitlement";

export interface AccessEntitlementRepository {
  findAnnualCalendarAccess(userId: string): Promise<AccessEntitlement | null>;
  grantAnnualCalendarAccess(input: {
    userId: string;
    paymentId: string;
  }): Promise<AccessEntitlement>;
}
