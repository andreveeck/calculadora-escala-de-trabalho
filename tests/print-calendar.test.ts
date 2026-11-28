import assert from "node:assert/strict";
import test from "node:test";
import {
  countAvailableMonths,
  countPrintPages,
  createDefaultPrintOptions,
  getEffectiveLayout,
  getMarginLabel,
  getMonthCountOptions,
  getMonthsPerPage,
} from "../src/lib/print-calendar/print-options";
import {
  buildPageStyle,
  buildTypographyStyle,
} from "../src/lib/print-calendar/page-style";
import { selectMonths } from "../src/lib/print-calendar/select-months";
import type { AnnualMonth } from "../src/lib/print-calendar/types";

function buildWindow(): AnnualMonth[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = new Date(Date.UTC(2026, 10 + index, 1)); // começa em nov/2026
    const key = `${month.getUTCFullYear()}-${String(
      month.getUTCMonth() + 1,
    ).padStart(2, "0")}`;

    return { key, label: key, days: [] };
  });
}

const months = buildWindow();

test("janela completa imprime os 12 meses", () => {
  const selected = selectMonths(months, {
    startMonthKey: "2026-11",
    monthCount: 12,
  });

  assert.equal(selected.length, 12);
  assert.equal(selected[0].key, "2026-11");
  assert.equal(selected[11].key, "2027-10");
});

test("quantidade é limitada ao que existe a partir do mês inicial", () => {
  const selected = selectMonths(months, {
    startMonthKey: "2027-07",
    monthCount: 12,
  });

  assert.equal(selected.length, 4);
  assert.equal(selected[0].key, "2027-07");
});

test("chave desconhecida cai no primeiro mês", () => {
  const selected = selectMonths(months, {
    startMonthKey: "2030-01",
    monthCount: 3,
  });

  assert.deepEqual(
    selected.map((month) => month.key),
    ["2026-11", "2026-12", "2027-01"],
  );
});

test("quantidade inválida nunca devolve lista vazia", () => {
  assert.equal(
    selectMonths(months, { startMonthKey: "2026-11", monthCount: 0 }).length,
    1,
  );
  assert.equal(
    selectMonths(months, { startMonthKey: "2026-11", monthCount: -5 }).length,
    1,
  );
});

test("lista vazia devolve lista vazia", () => {
  assert.deepEqual(
    selectMonths([], { startMonthKey: "2026-11", monthCount: 12 }),
    [],
  );
});

test("pageStyle reflete papel, orientação e margem", () => {
  const a4 = buildPageStyle({
    paper: "a4",
    orientation: "landscape",
    margins: "wide",
  });
  const a6 = buildPageStyle({
    paper: "a6",
    orientation: "portrait",
    margins: "wide",
  });

  // Medidas explícitas em mm: o navegador não reconhece o nome "A6" em @page.
  assert.match(a4, /size: 297mm 210mm;/);
  assert.match(a4, /margin: 25mm/);
  assert.match(a6, /size: 105mm 148mm;/);
  assert.match(a6, /margin: 12mm/);

  const a5 = buildPageStyle({
    paper: "a5",
    orientation: "portrait",
    margins: "normal",
  });

  assert.match(a5, /size: 148mm 210mm;/);
  assert.match(a5, /margin: 12mm/);
  // Altura útil (papel - 2 margens) usada para preencher a folha.
  assert.match(a5, /--print-page-content-height: 186mm/);
});

test("cada papel limita o layout e os meses por folha", () => {
  assert.equal(
    getEffectiveLayout({ paper: "a6", layout: "three-per-page" }),
    "one-per-page",
  );
  assert.equal(
    getEffectiveLayout({ paper: "a5", layout: "three-per-page" }),
    "two-per-page",
  );
  assert.equal(
    getEffectiveLayout({ paper: "a4", layout: "three-per-page" }),
    "three-per-page",
  );
  assert.equal(getMonthsPerPage({ paper: "a6", layout: "one-per-page" }), 1);
  assert.equal(getMonthsPerPage({ paper: "a5", layout: "two-per-page" }), 2);
  assert.equal(getMonthsPerPage({ paper: "a4", layout: "three-per-page" }), 3);
});

test("margem exibida acompanha o papel", () => {
  assert.equal(getMarginLabel("a4", "wide"), "Larga (25mm)");
  assert.equal(getMarginLabel("a6", "narrow"), "Estreita (5mm)");
});

test("tipografia gerada acompanha papel e densidade", () => {
  assert.match(buildTypographyStyle("a6", 1), /--print-day-size: 10pt/);
  assert.match(buildTypographyStyle("a4", 1), /--print-day-size: 13pt/);
  assert.match(buildTypographyStyle("a4", 3), /--print-day-size: 7pt/);
  assert.match(buildTypographyStyle("a5", 2), /--print-day-size: 10pt/);
  assert.match(buildTypographyStyle("a6", 3), /--print-day-size: 10pt/);
  // Paisagem tem menos altura útil: fonte menor para não cortar nada.
  assert.match(buildTypographyStyle("a6", 1, "landscape"), /--print-day-size: 7pt/);
  assert.match(buildTypographyStyle("a5", 2, "landscape"), /--print-day-size: 10pt/);
  assert.match(buildTypographyStyle("a5", 2, "portrait"), /--print-day-size: 10pt/);
});

test("quantidades oferecidas nunca passam do que existe na janela", () => {
  assert.deepEqual(getMonthCountOptions(12), [3, 6, 12]);
  assert.deepEqual(getMonthCountOptions(4), [3, 4]);
  assert.deepEqual(getMonthCountOptions(1), [1]);
  assert.deepEqual(getMonthCountOptions(0), []);
});

test("páginas impressas acompanham a densidade por folha", () => {
  assert.equal(countPrintPages(12, 3), 4);
  assert.equal(countPrintPages(12, 2), 6);
  assert.equal(countPrintPages(4, 1), 4);
  assert.equal(countPrintPages(13, 3), 5);
  assert.equal(countPrintPages(0, 3), 1);
});

test("meses disponíveis caem quando o mês inicial avança", () => {
  assert.equal(countAvailableMonths(months, "2026-11"), 12);
  assert.equal(countAvailableMonths(months, "2027-07"), 4);
  assert.equal(countAvailableMonths(months, "2030-01"), 12);
});

test("default usa a janela inteira e deriva o título dos anos", () => {
  const options = createDefaultPrintOptions(months);

  assert.equal(options.monthCount, 12);
  assert.equal(options.startMonthKey, "2026-11");
  assert.equal(options.paper, "a4");
  assert.equal(options.documentTitle, "Calendario-Escala-2026-2027");
});
