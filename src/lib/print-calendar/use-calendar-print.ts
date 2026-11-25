"use client";

import type { RefObject } from "react";
import { useReactToPrint } from "react-to-print";
import { BASE_PRINT_STYLE } from "./page-style";

/**
 * Wrapper do react-to-print (v3).
 *
 * - `documentTitle` vem de um ref, então a função devolvida é estável e o
 *   efeito de disparo não reimprime por mudança de título.
 * - Orientação, margens e layout NÃO passam por aqui: são renderizados no
 *   <style> do PrintCalendarDocument, clonado no momento da impressão.
 */
export function useCalendarPrint(
  contentRef: RefObject<Element | Text | null>,
  documentTitleRef: RefObject<string>,
) {
  return useReactToPrint({
    contentRef,
    documentTitle: () => documentTitleRef.current,
    pageStyle: BASE_PRINT_STYLE,
  });
}
