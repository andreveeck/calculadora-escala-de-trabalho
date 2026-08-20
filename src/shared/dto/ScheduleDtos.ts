import type { WorkDay } from "@/src/models/entities/WorkDay";
import type { ScheduleType } from "@/src/models/schedules/ScheduleType";

export interface CalculateScheduleInput {
  scheduleType: ScheduleType;
  referenceDate: string;
  today?: string;
  upcomingDays?: number;
}

export interface ScheduleCalculationResult {
  scheduleType: ScheduleType;
  scheduleName: string;
  referenceDate: string;
  today: WorkDay;
  tomorrow: WorkDay;
  nextRestDay: WorkDay;
  upcomingDays: WorkDay[];
  currentMonth: WorkDay[];
  paidPreview: {
    priceInCents: number;
    benefit: string;
  };
}
