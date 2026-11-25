import type { WorkDay } from "@/src/models/entities/WorkDay";
import {
  formatFullDate,
  formatWeekdayLong,
  formatWeekdayShort,
} from "@/src/shared/date/calendarLabels";
import {
  getHoliday,
  type Holiday,
  type HolidayRegion,
} from "@/src/shared/date/holidays";

const HOLIDAY_KIND_LABELS: Record<Holiday["kind"], string> = {
  national: "feriado nacional",
  optional: "ponto facultativo",
  state: "feriado estadual",
};

interface MiniMonthProps {
  days: WorkDay[];
  region: HolidayRegion;
}

export function MiniMonth({ days, region }: MiniMonthProps) {
  const firstDay = new Date(`${days[0]?.date ?? "2026-01-01"}T00:00:00.000Z`);
  const offset = firstDay.getUTCDay();

  return (
    <div className="annual-mini-month">
      {Array.from({ length: offset }, (_, index) => (
        <span className="annual-empty-day" key={`empty-${index}`} />
      ))}
      {days.map((day) => {
        const holiday = getHoliday(day.date, region);
        const statusLabel = day.status === "rest" ? "Folga" : "Trabalho";
        const weekdayLabel = formatWeekdayLong(day.date);
        const dayNumber = Number(day.date.slice(-2));
        const holidayClass = holiday ? ` holiday holiday--${holiday.kind}` : "";
        const holidayLabel = holiday
          ? ` - ${HOLIDAY_KIND_LABELS[holiday.kind]}: ${holiday.name}`
          : "";

        return (
          <span
            className={`annual-mini-day ${day.status}${holidayClass}`}
            title={`${weekdayLabel}, ${formatFullDate(day.date)} - ${statusLabel}${holidayLabel}`}
            aria-label={`${dayNumber}, ${weekdayLabel}, ${statusLabel}${holidayLabel}`}
            key={day.date}
          >
            <strong>{dayNumber}</strong>
            <small>{formatWeekdayShort(day.date)}</small>
          </span>
        );
      })}
    </div>
  );
}
