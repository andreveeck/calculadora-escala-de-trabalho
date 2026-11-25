import type { WorkDay } from "@/src/models/entities/WorkDay";
import { formatDayMonth } from "@/src/shared/date/calendarLabels";
import {
  getHoliday,
  type Holiday,
  type HolidayRegion,
} from "@/src/shared/date/holidays";

interface MonthHolidaysProps {
  days: WorkDay[];
  region: HolidayRegion;
}

/** Feriados que caem no mês, escritos abaixo da grade de dias. */
export function MonthHolidays({ days, region }: MonthHolidaysProps) {
  const holidays = days
    .map((day) => getHoliday(day.date, region))
    .filter((holiday): holiday is Holiday => holiday !== undefined);

  if (holidays.length === 0) {
    return null;
  }

  return (
    <ul className="annual-month-holidays">
      {holidays.map((holiday) => (
        <li
          className={`annual-month-holidays__item holiday--${holiday.kind}`}
          key={holiday.date}
        >
          <span className="annual-month-holidays__date">
            {formatDayMonth(holiday.date)}
          </span>
          <span className="annual-month-holidays__name">{holiday.name}</span>
        </li>
      ))}
    </ul>
  );
}
