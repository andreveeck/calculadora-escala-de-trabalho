import type { WorkDay } from "@/src/models/entities/WorkDay";

export type PrintOrientation = "portrait" | "landscape";
export type PrintMargins = "narrow" | "normal" | "wide";
export type PrintLayout = "one-per-page" | "two-per-page" | "three-per-page";

/** Um mês da janela móvel de 12 meses. */
export interface AnnualMonth {
  /** "YYYY-MM" — identifica o mês sem depender do índice. */
  key: string;
  /** "Novembro 2026" */
  label: string;
  days: WorkDay[];
}

export interface PrintOptions {
  /** Chave ("YYYY-MM") de um mês presente em `months`. */
  startMonthKey: string;
  /** Quantidade de meses a imprimir, a partir de `startMonthKey`. */
  monthCount: number;
  orientation: PrintOrientation;
  margins: PrintMargins;
  layout: PrintLayout;
  documentTitle: string;
}
