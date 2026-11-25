import type { PrintMargins, PrintOptions } from "./types";

const MARGIN_MM: Record<PrintMargins, string> = {
  narrow: "10mm",
  normal: "15mm",
  wide: "25mm",
};

/**
 * Regras de página do documento impresso. Vão no `<style>` do próprio documento
 * (clonado junto com o conteúdo) para que orientação e margens acompanhem o
 * estado do React sem depender de timing.
 */
export function buildPageStyle(
  options: Pick<PrintOptions, "orientation" | "margins">,
): string {
  return [
    `@page { size: A4 ${options.orientation}; margin: ${MARGIN_MM[options.margins]}; }`,
    "html, body { margin: 0 !important; padding: 0 !important; background: #ffffff; }",
    "body { color: #000000; }",
  ].join("\n");
}

/** Reset estático do iframe, passado em `pageStyle`. Não depende de opções. */
export const BASE_PRINT_STYLE = [
  "html, body { margin: 0 !important; padding: 0 !important; background: #ffffff; }",
  "* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
].join("\n");
