import { BrazilDate } from "@/src/shared/date/BrazilDate";

/** Categoria do dia marcado no calendário. */
export type HolidayKind = "national" | "optional" | "state";

/** Região cujos feriados estaduais são exibidos. */
export type HolidayRegion = "br" | "rs";

export interface Holiday {
  /** "YYYY-MM-DD" */
  date: string;
  name: string;
  kind: HolidayKind;
}

export const REGION_LABELS: Record<HolidayRegion, string> = {
  br: "Brasil",
  rs: "Brasil + RS",
};

/** Decisão de produto: trocar para "rs" se o público for gaúcho. */
export const DEFAULT_HOLIDAY_REGION: HolidayRegion = "br";

interface FixedHoliday {
  month: number;
  day: number;
  name: string;
  /** Primeiro ano em que a data vale (para leis novas). */
  since?: number;
}

const NATIONAL_FIXED: FixedHoliday[] = [
  { month: 1, day: 1, name: "Confraternização Universal" },
  { month: 4, day: 21, name: "Tiradentes" },
  { month: 5, day: 1, name: "Dia do Trabalho" },
  { month: 9, day: 7, name: "Independência do Brasil" },
  { month: 10, day: 12, name: "Nossa Senhora Aparecida" },
  { month: 11, day: 2, name: "Finados" },
  { month: 11, day: 15, name: "Proclamação da República" },
  {
    month: 11,
    day: 20,
    name: "Dia Nacional de Zumbi e da Consciência Negra",
    since: 2024,
  },
  { month: 12, day: 25, name: "Natal" },
];

/** Feriados estaduais. Hoje só o RS, que tem uma única data estadual. */
const STATE_FIXED: Partial<Record<HolidayRegion, FixedHoliday[]>> = {
  rs: [{ month: 9, day: 20, name: "Revolução Farroupilha (Dia do Gaúcho)" }],
};

/** Domingo de Páscoa no calendário gregoriano (Meeus/Jones/Butcher). */
export function getEasterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return formatIsoDate(year, month, day);
}

export function getHolidays(
  year: number,
  region: HolidayRegion = DEFAULT_HOLIDAY_REGION,
): Holiday[] {
  const national = NATIONAL_FIXED.filter(
    (holiday) => holiday.since === undefined || year >= holiday.since,
  ).map((holiday) => ({
    date: formatIsoDate(year, holiday.month, holiday.day),
    name: holiday.name,
    kind: "national" as const,
  }));

  const state = (STATE_FIXED[region] ?? []).map((holiday) => ({
    date: formatIsoDate(year, holiday.month, holiday.day),
    name: holiday.name,
    kind: "state" as const,
  }));

  return [...national, ...state, ...movableHolidays(year)].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

/** Datas que dependem da Páscoa. */
function movableHolidays(year: number): Holiday[] {
  const easter = getEasterSunday(year);
  const dateFromEaster = (days: number) =>
    BrazilDate.fromIso(easter).addDays(days).toIso();

  return [
    { date: dateFromEaster(-48), name: "Carnaval (segunda-feira)", kind: "optional" },
    { date: dateFromEaster(-47), name: "Carnaval (terça-feira)", kind: "optional" },
    { date: dateFromEaster(-2), name: "Sexta-feira Santa", kind: "national" },
    { date: dateFromEaster(60), name: "Corpus Christi", kind: "optional" },
  ];
}

const holidayCache = new Map<string, Map<string, Holiday>>();

/** Feriado na data ISO informada, ou `undefined`. */
export function getHoliday(
  isoDate: string,
  region: HolidayRegion = DEFAULT_HOLIDAY_REGION,
): Holiday | undefined {
  if (isoDate.length !== 10) {
    return undefined;
  }

  const year = Number(isoDate.slice(0, 4));

  if (!Number.isInteger(year)) {
    return undefined;
  }

  const cacheKey = `${year}:${region}`;
  let index = holidayCache.get(cacheKey);

  if (!index) {
    index = new Map(
      getHolidays(year, region).map((holiday) => [holiday.date, holiday]),
    );
    holidayCache.set(cacheKey, index);
  }

  return index.get(isoDate);
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
