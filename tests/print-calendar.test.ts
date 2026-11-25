import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultPrintOptions } from "../src/lib/print-calendar/print-options";
import { buildPageStyle } from "../src/lib/print-calendar/page-style";
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

test("pageStyle reflete orientação e margem", () => {
  const style = buildPageStyle({ orientation: "landscape", margins: "wide" });

  assert.match(style, /size: A4 landscape/);
  assert.match(style, /margin: 25mm/);
});

test("default usa a janela inteira e deriva o título dos anos", () => {
  const options = createDefaultPrintOptions(months);

  assert.equal(options.monthCount, 12);
  assert.equal(options.startMonthKey, "2026-11");
  assert.equal(options.documentTitle, "Calendario-Escala-2026-2027");
});
