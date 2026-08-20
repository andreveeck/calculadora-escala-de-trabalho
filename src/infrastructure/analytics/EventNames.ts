export const eventNames = [
  "page_view",
  "calculation_completed",
  "lead_captured",
  "checkout_started",
  "payment_approved",
  "banner_viewed",
  "banner_clicked",
] as const;

export type EventName = (typeof eventNames)[number];
