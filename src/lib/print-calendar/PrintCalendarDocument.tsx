import type { ScheduleType } from "@/src/models/schedules/ScheduleType";
import { formatFullDate } from "@/src/shared/date/calendarLabels";
import { REGION_LABELS, type HolidayRegion } from "@/src/shared/date/holidays";
import { MiniMonth } from "@/src/views/components/annual/MiniMonth";
import { MonthHolidays } from "@/src/views/components/annual/MonthHolidays";
import {
  buildPageStyle,
  buildTypographyStyle,
} from "./page-style";
import { PRINT_DOCUMENT_CSS } from "./print-document-css";
import { getEffectiveLayout, getMonthsPerPage } from "./print-options";
import { selectMonths } from "./select-months";
import type { AnnualMonth, PrintOptions } from "./types";

interface PrintCalendarDocumentProps {
  months: AnnualMonth[];
  options: PrintOptions;
  scheduleType: ScheduleType;
  referenceDate: string;
  region: HolidayRegion;
}

export function PrintCalendarDocument({
  months,
  options,
  scheduleType,
  referenceDate,
  region,
}: PrintCalendarDocumentProps) {
  const visibleMonths = selectMonths(months, options);
  const effectiveLayout = getEffectiveLayout(options);
  const monthsPerPage = getMonthsPerPage(options);
  const pages = chunkMonths(visibleMonths, monthsPerPage);
  const documentStyle = [
    buildPageStyle(options),
    PRINT_DOCUMENT_CSS,
    // Por último: a tipografia gerada sobrescreve os padrões do CSS estático.
    buildTypographyStyle(options.paper, monthsPerPage, options.orientation),
  ].join("\n");

  const header = (
    <header className="print-doc__header">
      <h1 className="print-doc__title">Calendário de trabalho</h1>
      <p className="print-doc__meta">
        <span>Escala {scheduleType}</span>
        <span>Referência: {formatFullDate(referenceDate)}</span>
        <span>Período: {formatPeriod(visibleMonths)}</span>
        <span>Feriados: {REGION_LABELS[region]}</span>
      </p>
    </header>
  );

  return (
    <div
      className={`print-doc print-paper-${options.paper} print-orientation-${options.orientation} print-layout-${effectiveLayout}`}
    >
      {/*
        dangerouslySetInnerHTML é intencional: o documento também é renderizado no
        servidor, e dentro de <style> o React escaparia ">" e "&" dos seletores.
        Só conteúdo constante de buildPageStyle/PRINT_DOCUMENT_CSS entra aqui.
      */}
      <style media="print" dangerouslySetInnerHTML={{ __html: documentStyle }} />

      {/*
        O cabeçalho entra em cada folha para que A5/A6 possam preencher a
        página inteira. No A4 o CSS mostra o cabeçalho apenas na primeira
        folha (grade compacta).
      */}
      <div className="print-doc__pages">
        {pages.map((pageMonths, index) => (
          <section className="print-doc__page" key={`page-${index}`}>
            {header}
            <div className="print-doc__months">
              {pageMonths.map((month) => (
                <section className="print-doc__month" key={month.key}>
                  <h2>{month.label}</h2>
                  <MiniMonth days={month.days} region={region} />
                  <MonthHolidays days={month.days} region={region} />
                </section>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Divide os meses em folhas com exatamente `monthsPerPage` meses cada. */
function chunkMonths(months: AnnualMonth[], monthsPerPage: number): AnnualMonth[][] {
  if (months.length === 0) {
    return [];
  }

  const perPage = Math.max(Math.trunc(monthsPerPage), 1);

  return Array.from({ length: Math.ceil(months.length / perPage) }, (_, index) =>
    months.slice(index * perPage, (index + 1) * perPage),
  );
}

function formatPeriod(months: AnnualMonth[]): string {
  const first = months[0];
  const last = months[months.length - 1];

  if (!first || !last) {
    return "—";
  }

  return first.key === last.key ? first.label : `${first.label} a ${last.label}`;
}
