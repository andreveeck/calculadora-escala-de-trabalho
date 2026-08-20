import type { MetricsRepository } from "@/src/models/repositories/MetricsRepository";

export class MetricsService {
  constructor(private readonly metricsRepository: MetricsRepository) {}

  recordPageView(pathname: string): Promise<void> {
    return this.metricsRepository.record("page_view", { pathname });
  }

  recordCalculation(scheduleType: string): Promise<void> {
    return this.metricsRepository.record("calculation_completed", {
      scheduleType,
    });
  }

  recordCheckoutStarted(): Promise<void> {
    return this.metricsRepository.record("checkout_started");
  }

  recordPaymentApproved(): Promise<void> {
    return this.metricsRepository.record("payment_approved");
  }
}
