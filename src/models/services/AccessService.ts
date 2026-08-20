import type { AccessEntitlementRepository } from "@/src/models/repositories/AccessEntitlementRepository";

export class AccessService {
  constructor(
    private readonly entitlementRepository: AccessEntitlementRepository,
  ) {}

  async userHasAnnualCalendarAccess(userId: string): Promise<boolean> {
    const entitlement =
      await this.entitlementRepository.findAnnualCalendarAccess(userId);
    return Boolean(entitlement?.lifetime);
  }
}
