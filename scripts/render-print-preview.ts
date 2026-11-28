/**
 * Gera páginas de teste (sem login) e PDFs do documento de impressão do
 * calendário anual, para conferir tipografia, margens e quebra de página.
 *
 *   npx tsx scripts/render-print-preview.ts
 *
 * Saída: work/impressao-teste/ (HTML + PDF por papel). O PDF é produzido pelo
 * Chrome/Edge headless encontrado na máquina, imprimindo o HTML com o mesmo
 * CSS de impressão usado em produção (@page, tipografia por papel/densidade).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createScheduleController } from "@/src/controllers/controllerFactory";
import {
  countPrintPages,
  getMonthsPerPage,
  MARGIN_MM,
} from "@/src/lib/print-calendar/print-options";
import { PRINT_DOCUMENT_CSS } from "@/src/lib/print-calendar/print-document-css";
import { PrintCalendarDocument } from "@/src/lib/print-calendar/PrintCalendarDocument";
import {
  buildPageStyle,
  buildTypographyStyle,
} from "@/src/lib/print-calendar/page-style";
import type {
  AnnualMonth,
  PrintOptions,
  PrintOrientation,
  PrintPaper,
} from "@/src/lib/print-calendar/types";
import { addMonths, formatMonthYear } from "@/src/shared/date/calendarLabels";
import type { HolidayRegion } from "@/src/shared/date/holidays";
import type { ScheduleType } from "@/src/models/schedules/ScheduleType";

const OUTPUT_DIR = path.resolve("work/impressao-teste");
const SCHEDULE_TYPE: ScheduleType = "6x1";
const REFERENCE_DATE = "2026-11-20";
const REGION: HolidayRegion = "rs";
const START_MONTH = "2026-11";
const MONTH_COUNT = 12;

/** Papel + orientação; layout é o mais denso que o papel permite. */
const PAPERS: Array<{
  paper: PrintPaper;
  orientation: PrintOrientation;
  layout: PrintOptions["layout"];
}> = [
  { paper: "a5", orientation: "portrait", layout: "two-per-page" },
  { paper: "a6", orientation: "portrait", layout: "one-per-page" },
  { paper: "a5", orientation: "landscape", layout: "two-per-page" },
  { paper: "a6", orientation: "landscape", layout: "one-per-page" },
];

const PAPER_MM: Record<PrintPaper, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  a6: { width: 105, height: 148 },
};

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter((candidate): candidate is string => Boolean(candidate));

function buildMonths(): AnnualMonth[] {
  const controller = createScheduleController();

  return Array.from({ length: MONTH_COUNT }, (_, index) => {
    const normalizedMonth = addMonths(`${START_MONTH}-01`, index);
    const result = controller.calculate({
      scheduleType: SCHEDULE_TYPE,
      referenceDate: REFERENCE_DATE,
      today: normalizedMonth,
    });

    return {
      key: normalizedMonth.slice(0, 7),
      label: formatMonthYear(normalizedMonth),
      days: result.currentMonth,
    };
  });
}

function buildHtml(months: AnnualMonth[], options: PrintOptions): string {
  const monthsPerPage = getMonthsPerPage(options);
  const paper = PAPER_MM[options.paper];
  const landscape = options.orientation === "landscape";
  const sheet = landscape
    ? { width: paper.height, height: paper.width }
    : paper;
  const margin = Number(MARGIN_MM[options.paper][options.margins].replace("mm", ""));
  const orientationLabel = landscape ? "paisagem" : "retrato";
  const documentHtml = renderToStaticMarkup(
    createElement(PrintCalendarDocument, {
      months,
      options,
      scheduleType: SCHEDULE_TYPE,
      referenceDate: REFERENCE_DATE,
      region: REGION,
    }),
  );

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Teste de impressão — ${options.paper.toUpperCase()} ${orientationLabel} — ${monthsPerPage} por página</title>
<style>
  html, body { margin: 0; padding: 0; }
  body {
    background: #e9eef5;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  }
  .preview-note {
    max-width: 640px;
    margin: 24px auto 0;
    padding: 14px 18px;
    border-radius: 10px;
    background: #ffffff;
    color: #33475b;
    font-size: 13px;
    line-height: 1.55;
    box-shadow: 0 8px 20px rgba(16, 35, 59, 0.1);
  }
  .preview-note strong { color: #17477e; }
  .preview-note code { font-size: 12px; }
  .sheet {
    width: ${sheet.width}mm;
    min-height: ${sheet.height}mm;
    margin: 12mm auto 24mm;
    padding: ${margin}mm;
    box-sizing: border-box;
    background: #ffffff;
    box-shadow: 0 12px 30px rgba(16, 35, 59, 0.18);
  }
  ${PRINT_DOCUMENT_CSS}
  ${buildTypographyStyle(options.paper, monthsPerPage, options.orientation)}
  /* Na tela o @page não vale: repõe a altura útil só para simular a folha. */
  .print-doc { --print-page-content-height: ${sheet.height - margin * 2}mm; }
  /* Na tela, marca onde cada folha termina (no PDF a quebra é real). */
  @media screen {
    .print-doc__page {
      position: relative;
      box-sizing: border-box;
    }
    .print-doc__page + .print-doc__page {
      /* Só espaço externo entre folhas: não reduz a área útil na tela. */
      margin-top: 14mm;
      border-top: 2px dashed #9db2c9;
    }
    .print-doc__page + .print-doc__page::before {
      content: "quebra de página";
      position: absolute;
      top: -8mm;
      left: 0;
      color: #6b7f95;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
  }
  @media print {
    body { background: #ffffff; }
    .preview-note { display: none; }
    .sheet {
      width: auto;
      min-height: 0;
      margin: 0;
      padding: 0;
      background: none;
      box-shadow: none;
    }
  }
</style>
<style media="print">${buildPageStyle(options)}</style>
</head>
<body>
  <div class="preview-note">
    <strong>Página de teste de impressão (sem login)</strong> — papel ${options.paper.toUpperCase()},
    ${orientationLabel}, margem ${MARGIN_MM[options.paper][options.margins]}, ${monthsPerPage}
    ${monthsPerPage === 1 ? "mês" : "meses"} por página.
    O PDF é gerado pelo próprio CSS de impressão; aqui o bloco branco simula a folha,
    então as margens aparecem como espaço em branco ao redor do conteúdo.
  </div>
  <div class="sheet">${documentHtml}</div>
</body>
</html>`;
}

function findChrome(): string | null {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function printToPdf(
  browser: string,
  htmlPath: string,
  pdfPath: string,
  profileDir: string,
): string | null {
  const result = spawnSync(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-pdf-header-footer",
      `--user-data-dir=${profileDir}`,
      `--print-to-pdf=${pdfPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );

  if (result.status !== 0) {
    return `Chrome saiu com código ${result.status}: ${result.stderr ?? ""}`.trim();
  }

  return existsSync(pdfPath) ? null : "Chrome não gerou o PDF";
}

interface PdfInfo {
  pages: number;
  mediaBox: string | null;
}

async function inspectPdf(pdfPath: string): Promise<PdfInfo> {
  const bytes = await readFile(pdfPath, "latin1");
  const pages = /\/Type\s*\/Page[^s]/g;
  const boxes = [...bytes.matchAll(/\/MediaBox\s*\[\s*([\d.\s-]+)\]/g)];

  return {
    pages: (bytes.match(pages) ?? []).length,
    mediaBox: boxes[0] ? boxes[0][1].trim().replace(/\s+/g, " ") : null,
  };
}

async function main() {
  const months = buildMonths();
  const browser = findChrome();

  await mkdir(OUTPUT_DIR, { recursive: true });

  if (!browser) {
    console.warn(
      "Nenhum Chrome/Edge encontrado: gerando apenas os HTMLs de teste.",
    );
  }

  const profileDir = path.join(os.tmpdir(), `print-preview-${process.pid}`);
  console.log(`Chrome: ${browser ?? "(não encontrado)"}`);

  for (const { paper, orientation, layout } of PAPERS) {
    const options: PrintOptions = {
      startMonthKey: START_MONTH,
      monthCount: MONTH_COUNT,
      paper,
      orientation,
      margins: "normal",
      layout,
      documentTitle: `Calendario-Escala-teste-${paper.toUpperCase()}-${orientation}`,
    };
    const suffix = orientation === "landscape" ? "-paisagem" : "";
    const baseName = `calendario-${paper}${suffix}`;
    const label = `${paper.toUpperCase()} ${orientation === "landscape" ? "paisagem" : "retrato"}`;
    const htmlPath = path.join(OUTPUT_DIR, `${baseName}.html`);
    const pdfPath = path.join(OUTPUT_DIR, `${baseName}.pdf`);

    await writeFile(htmlPath, buildHtml(months, options), "utf8");
    console.log(`HTML: ${htmlPath}`);

    if (!browser) {
      continue;
    }

    const error = printToPdf(browser, htmlPath, pdfPath, profileDir);

    if (error) {
      console.error(`Falha no PDF ${label}: ${error}`);
      continue;
    }

    const info = await inspectPdf(pdfPath);
    const monthsPerPage = getMonthsPerPage(options);
    const expectedPages = countPrintPages(MONTH_COUNT, monthsPerPage);
    const box = info.mediaBox?.split(" ").map(Number) ?? [];
    const paperSheet = PAPER_MM[paper];
    const expectedWidth =
      ((orientation === "landscape" ? paperSheet.height : paperSheet.width) *
        72) /
      25.4;
    const expectedHeight =
      ((orientation === "landscape" ? paperSheet.width : paperSheet.height) *
        72) /
      25.4;
    const sizeOk =
      box.length === 4 &&
      Math.abs(box[2] - expectedWidth) < 3 &&
      Math.abs(box[3] - expectedHeight) < 3;
    const pagesOk = info.pages === expectedPages;

    console.log(
      `PDF ${label}: ${pdfPath} — ${info.pages}/${expectedPages} páginas, ` +
        `MediaBox [${info.mediaBox}] pt (esperado ~${expectedWidth.toFixed(0)}×${expectedHeight.toFixed(0)} pt) — ` +
        `${pagesOk ? "páginas OK" : "PÁGINAS DIVERGENTES"}, ${sizeOk ? "tamanho OK" : "TAMANHO DIVERGENTE"}`,
    );

    if (!pagesOk || !sizeOk) {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
