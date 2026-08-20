export interface MetricsRepository {
  record(eventName: string, metadata?: Record<string, unknown>): Promise<void>;
  count(eventName: string): Promise<number>;
}
