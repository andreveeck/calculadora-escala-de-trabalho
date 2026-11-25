import type {
  AnnualMonth,
  PrintLayout,
  PrintMargins,
  PrintOptions,
  PrintOrientation,
} from "./types";

export const MONTH_COUNT_OPTIONS: number[] = [3, 6, 12];

export const ORIENTATION_LABELS: Record<PrintOrientation, string> = {
  portrait: "Retrato",
  landscape: "Paisagem",
};

export const MARGIN_LABELS: Record<PrintMargins, string> = {
  narrow: "Estreita (10 mm)",
  normal: "Normal (15 mm)",
  wide: "Larga (25 mm)",
};

export const LAYOUT_LABELS: Record<PrintLayout, string> = {
  "one-per-page": "1 mês por página",
  "two-per-page": "2 meses por página",
  "three-per-page": "3 meses por página",
};

export function createDefaultPrintOptions(months: AnnualMonth[]): PrintOptions {
  const first = months[0];
  const last = months[months.length - 1];
  const startYear = first ? first.key.slice(0, 4) : "";
  const endYear = last ? last.key.slice(0, 4) : startYear;
  const yearPart =
    startYear && endYear && startYear !== endYear
      ? `${startYear}-${endYear}`
      : startYear;

  return {
    startMonthKey: first ? first.key : "",
    monthCount: months.length > 0 ? months.length : 12,
    orientation: "portrait",
    margins: "normal",
    layout: "three-per-page",
    documentTitle: `Calendario-Escala-${yearPart}`,
  };
}
