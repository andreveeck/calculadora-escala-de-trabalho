import { WorkDay } from "@/src/models/entities/WorkDay";
import { ScheduleFactory } from "@/src/models/schedules/ScheduleFactory";
import { BrazilDate } from "@/src/shared/date/BrazilDate";
import { ANNUAL_CALENDAR_PRICE_IN_CENTS } from "@/src/shared/constants/pricing";
import type {
  CalculateScheduleInput,
  ScheduleCalculationResult,
} from "@/src/shared/dto/ScheduleDtos";

export class ScheduleCalculatorService {
  constructor(private readonly scheduleFactory: ScheduleFactory) {}

  calculate(input: CalculateScheduleInput): ScheduleCalculationResult {
    const schedule = this.scheduleFactory.create(input.scheduleType);
    const referenceDate = BrazilDate.fromIso(input.referenceDate);
    const today = input.today
      ? BrazilDate.fromIso(input.today)
      : BrazilDate.today();
    const tomorrow = today.addDays(1);
    const upcomingDaysCount = Math.min(Math.max(input.upcomingDays ?? 14, 1), 62);

    return {
      scheduleType: input.scheduleType,
      scheduleName: schedule.name,
      referenceDate: referenceDate.toIso(),
      today: schedule.getDay(today, referenceDate),
      tomorrow: schedule.getDay(tomorrow, referenceDate),
      nextRestDay: schedule.getNextRestDay(today, referenceDate),
      upcomingDays: this.buildRange(today, upcomingDaysCount, (date) =>
        schedule.getDay(date, referenceDate),
      ),
      currentMonth: this.buildCurrentMonth(today, (date) =>
        schedule.getDay(date, referenceDate),
      ),
      paidPreview: {
        priceInCents: ANNUAL_CALENDAR_PRICE_IN_CENTS,
        benefit: "Calendário anual vitalício e consulta de qualquer período de 12 meses.",
      },
    };
  }

  private buildRange(
    startDate: BrazilDate,
    days: number,
    mapper: (date: BrazilDate) => WorkDay,
  ): WorkDay[] {
    return Array.from({ length: days }, (_, index) =>
      mapper(startDate.addDays(index)),
    );
  }

  private buildCurrentMonth(
    currentDate: BrazilDate,
    mapper: (date: BrazilDate) => WorkDay,
  ): WorkDay[] {
    const monthStart = currentDate.getMonthStart();
    return this.buildRange(monthStart, currentDate.getMonthDays(), mapper);
  }
}
