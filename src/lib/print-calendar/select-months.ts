import type { AnnualMonth, PrintOptions } from "./types";

/**
 * Seleciona os meses a imprimir. Sempre devolve um intervalo válido:
 * chave desconhecida cai no primeiro mês; a quantidade é limitada ao que
 * existe a partir do mês inicial; mínimo de 1 mês.
 */
export function selectMonths(
  months: AnnualMonth[],
  options: Pick<PrintOptions, "startMonthKey" | "monthCount">,
): AnnualMonth[] {
  if (months.length === 0) {
    return [];
  }

  const foundIndex = months.findIndex(
    (month) => month.key === options.startMonthKey,
  );
  const startIndex = foundIndex >= 0 ? foundIndex : 0;
  const available = months.length - startIndex;
  const count = Math.min(Math.max(Math.trunc(options.monthCount), 1), available);

  return months.slice(startIndex, startIndex + count);
}
