import type {
  AnnualMonth,
  PrintLayout,
  PrintMargins,
  PrintOptions,
  PrintOrientation,
  PrintPaper,
} from "./types";

export const MONTH_COUNT_OPTIONS: number[] = [3, 6, 12];

export const PAPER_LABELS: Record<PrintPaper, string> = {
  a4: "A4 (210 × 297 mm)",
  a5: "A5 (148 × 210 mm)",
  a6: "A6 (105 × 148 mm)",
};

export const ORIENTATION_LABELS: Record<PrintOrientation, string> = {
  portrait: "Retrato",
  landscape: "Paisagem",
};

export const MARGIN_NAMES: Record<PrintMargins, string> = {
  narrow: "Estreita",
  normal: "Normal",
  wide: "Larga",
};

/**
 * Margens em mm por papel: 25 mm em A6 comeria quase um terço da largura,
 * então cada papel tem sua própria escala.
 */
export const MARGIN_MM: Record<PrintPaper, Record<PrintMargins, string>> = {
  a4: { narrow: "10mm", normal: "15mm", wide: "25mm" },
  a5: { narrow: "8mm", normal: "12mm", wide: "18mm" },
  a6: { narrow: "5mm", normal: "8mm", wide: "12mm" },
};

export const LAYOUT_LABELS: Record<PrintLayout, string> = {
  "one-per-page": "1 mês por página",
  "two-per-page": "2 meses por página",
  "three-per-page": "3 meses por página",
};

/** Meses que cabem em cada folha, por layout. */
export const LAYOUT_MONTHS_PER_PAGE: Record<PrintLayout, number> = {
  "one-per-page": 1,
  "two-per-page": 2,
  "three-per-page": 3,
};

/**
 * Layouts oferecidos por papel. Em A6 só um mês por folha continua legível;
 * em A5, no máximo dois.
 */
export const PAPER_LAYOUTS: Record<PrintPaper, PrintLayout[]> = {
  a4: ["one-per-page", "two-per-page", "three-per-page"],
  a5: ["one-per-page", "two-per-page"],
  a6: ["one-per-page"],
};

/** Rótulo de margem já com a medida do papel escolhido. */
export function getMarginLabel(paper: PrintPaper, margins: PrintMargins): string {
  return `${MARGIN_NAMES[margins]} (${MARGIN_MM[paper][margins]})`;
}

/**
 * Layout efetivamente usado. Se o layout atual não existe no papel escolhido
 * (ex.: 3 meses por página em A6), cai no mais denso permitido.
 */
export function getEffectiveLayout(
  options: Pick<PrintOptions, "paper" | "layout">,
): PrintLayout {
  const allowed = PAPER_LAYOUTS[options.paper];

  return allowed.includes(options.layout)
    ? options.layout
    : allowed[allowed.length - 1];
}

export function getMonthsPerPage(
  options: Pick<PrintOptions, "paper" | "layout">,
): number {
  return LAYOUT_MONTHS_PER_PAGE[getEffectiveLayout(options)];
}

/** Meses existentes na janela a partir de `startMonthKey` (0 se não houver janela). */
export function countAvailableMonths(
  months: AnnualMonth[],
  startMonthKey: string,
): number {
  if (months.length === 0) {
    return 0;
  }

  const foundIndex = months.findIndex(
    (month) => month.key === startMonthKey,
  );
  const startIndex = foundIndex >= 0 ? foundIndex : 0;

  return months.length - startIndex;
}

/**
 * Quantidades oferecidas para o mês inicial atual. Evita prometer "12 meses"
 * quando a janela só tem 4 a partir do mês escolhido.
 */
export function getMonthCountOptions(availableMonths: number): number[] {
  if (availableMonths <= 0) {
    return [];
  }

  const options = MONTH_COUNT_OPTIONS.filter(
    (count) => count < availableMonths,
  );

  return [...options, availableMonths];
}

/** Páginas necessárias para `monthCount` meses com `monthsPerPage` por folha. */
export function countPrintPages(
  monthCount: number,
  monthsPerPage: number,
): number {
  const months = Math.max(Math.trunc(monthCount), 1);
  const perPage = Math.max(Math.trunc(monthsPerPage), 1);

  return Math.max(Math.ceil(months / perPage), 1);
}

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
    paper: "a4",
    orientation: "portrait",
    margins: "normal",
    layout: "three-per-page",
    documentTitle: `Calendario-Escala-${yearPart}`,
  };
}
