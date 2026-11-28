import { MARGIN_MM } from "./print-options";
import type {
  PrintOptions,
  PrintOrientation,
  PrintPaper,
} from "./types";

/**
 * Dimensões explícitas em mm: o Chrome não reconhece o nome `A6` em `@page`
 * e cai no papel padrão (Letter). Com medidas, o tamanho é sempre respeitado.
 */
const PAPER_MM: Record<PrintPaper, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  a6: { width: 105, height: 148 },
};

interface Typography {
  daySize: string;
  weekdaySize: string;
  dayPadding: string;
  monthTitleSize: string;
  holidaysSize: string;
  documentTitleSize: string;
  metaSize: string;
  monthPadding: string;
  gap: string;
}

/**
 * Escala tipográfica por papel e densidade (meses por folha). Quanto menor o
 * papel ou mais denso o layout, menor a fonte — e vice-versa.
 */
const TYPOGRAPHY: Record<PrintPaper, Record<number, Typography>> = {
  a4: {
    1: {
      daySize: "13pt",
      weekdaySize: "8.5pt",
      dayPadding: "3mm",
      monthTitleSize: "15pt",
      holidaysSize: "8.5pt",
      documentTitleSize: "16pt",
      metaSize: "9pt",
      monthPadding: "5mm",
      gap: "5mm",
    },
    2: {
      daySize: "9pt",
      weekdaySize: "6.5pt",
      dayPadding: "1.6mm",
      monthTitleSize: "12pt",
      holidaysSize: "7pt",
      documentTitleSize: "15pt",
      metaSize: "8.5pt",
      monthPadding: "4mm",
      gap: "4mm",
    },
    3: {
      daySize: "7pt",
      weekdaySize: "5.5pt",
      dayPadding: "1mm",
      monthTitleSize: "10.5pt",
      holidaysSize: "6pt",
      documentTitleSize: "14pt",
      metaSize: "8.5pt",
      monthPadding: "3mm",
      gap: "4mm",
    },
  },
  // Em A5/A6 os meses ficam empilhados e ocupam a folha inteira, então a
  // tipografia é maior do que na grade compacta do A4.
  a5: {
    1: {
      daySize: "14pt",
      weekdaySize: "8.5pt",
      dayPadding: "3.5mm",
      monthTitleSize: "14pt",
      holidaysSize: "8.5pt",
      documentTitleSize: "14pt",
      metaSize: "8pt",
      monthPadding: "4mm",
      gap: "4mm",
    },
    2: {
      daySize: "10pt",
      weekdaySize: "6.5pt",
      dayPadding: "1mm",
      monthTitleSize: "10.5pt",
      holidaysSize: "6.5pt",
      documentTitleSize: "13pt",
      metaSize: "7.5pt",
      monthPadding: "2.5mm",
      gap: "3mm",
    },
  },
  a6: {
    1: {
      daySize: "10pt",
      weekdaySize: "6pt",
      dayPadding: "1mm",
      monthTitleSize: "10pt",
      holidaysSize: "6.5pt",
      documentTitleSize: "11pt",
      metaSize: "7pt",
      monthPadding: "2.5mm",
      gap: "3mm",
    },
  },
};

/**
 * Regras de página do documento impresso. Vão no `<style>` do próprio documento
 * (clonado junto com o conteúdo) para que papel, orientação e margens acompanhem
 * o estado do React sem depender de timing.
 */
export function buildPageStyle(
  options: Pick<PrintOptions, "paper" | "orientation" | "margins">,
): string {
  const paper = PAPER_MM[options.paper];
  const landscape = options.orientation === "landscape";
  const width = landscape ? paper.height : paper.width;
  const height = landscape ? paper.width : paper.height;
  const margin = MARGIN_MM[options.paper][options.margins];

  const marginMm = Number.parseFloat(margin);
  const contentHeight = height - marginMm * 2;

  return [
    // Sem a palavra-chave de orientação: o Chrome descarta a declaração
    // `148mm 210mm portrait`, mas aceita as medidas (que já definem a orientação).
    `@page { size: ${width}mm ${height}mm; margin: ${margin}; }`,
    "html, body { margin: 0 !important; padding: 0 !important; background: #ffffff; }",
    "body { color: #000000; }",
    // Altura útil da folha: quanto sobra entre as margens, para o layout de
    // A5/A6 preencher a página em vez de parar no meio.
    `.print-doc { --print-page-content-height: ${contentHeight}mm; }`,
  ].join("\n");
}

/**
 * Paisagem tem menos altura útil: os meses ficam mais baixos e a tipografia
 * precisa encolher para caber sem cortar nada.
 */
const LANDSCAPE_TYPOGRAPHY: Partial<
  Record<PrintPaper, Record<number, Typography>>
> = {
  a5: {
    1: {
      daySize: "12pt",
      weekdaySize: "7.5pt",
      dayPadding: "2.5mm",
      monthTitleSize: "12pt",
      holidaysSize: "7.5pt",
      documentTitleSize: "13pt",
      metaSize: "8pt",
      monthPadding: "4mm",
      gap: "3mm",
    },
    2: {
      daySize: "10pt",
      weekdaySize: "6.5pt",
      dayPadding: "1mm",
      monthTitleSize: "10.5pt",
      holidaysSize: "6.5pt",
      documentTitleSize: "13pt",
      metaSize: "7.5pt",
      monthPadding: "2.5mm",
      gap: "3mm",
    },
  },
  a6: {
    1: {
      daySize: "7pt",
      weekdaySize: "5pt",
      dayPadding: "0.5mm",
      monthTitleSize: "8pt",
      holidaysSize: "5.5pt",
      documentTitleSize: "9pt",
      metaSize: "6pt",
      monthPadding: "2mm",
      gap: "2mm",
    },
  },
};

/** Variáveis CSS de tipografia do papel/densidade/orientação escolhidos. */
export function buildTypographyStyle(
  paper: PrintPaper,
  monthsPerPage: number,
  orientation: PrintOrientation = "portrait",
): string {
  const source =
    orientation === "landscape"
      ? (LANDSCAPE_TYPOGRAPHY[paper] ?? TYPOGRAPHY[paper])
      : TYPOGRAPHY[paper];
  const perPage = source[monthsPerPage] ? monthsPerPage : 1;
  const typography = source[perPage];

  return `.print-doc {
  --print-day-size: ${typography.daySize};
  --print-weekday-size: ${typography.weekdaySize};
  --print-day-padding: ${typography.dayPadding};
  --print-month-title-size: ${typography.monthTitleSize};
  --print-holidays-size: ${typography.holidaysSize};
  --print-document-title-size: ${typography.documentTitleSize};
  --print-meta-size: ${typography.metaSize};
  --print-month-padding: ${typography.monthPadding};
  --print-gap: ${typography.gap};
}`;
}

/** Reset estático do iframe, passado em `pageStyle`. Não depende de opções. */
export const BASE_PRINT_STYLE = [
  "html, body { margin: 0 !important; padding: 0 !important; background: #ffffff; }",
  "* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
].join("\n");
