import type { ScheduleType } from "@/src/models/schedules/ScheduleType";
import { formatFullDate } from "@/src/shared/date/calendarLabels";
import { REGION_LABELS, type HolidayRegion } from "@/src/shared/date/holidays";
import { MiniMonth } from "@/src/views/components/annual/MiniMonth";
import { MonthHolidays } from "@/src/views/components/annual/MonthHolidays";
import { buildPageStyle } from "./page-style";
import { PRINT_DOCUMENT_CSS } from "./print-document-css";
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
  const documentStyle = `${buildPageStyle(options)}\n${PRINT_DOCUMENT_CSS}`;

  return (
    <div className={`print-doc print-layout-${options.layout}`}>
      {/*
        dangerouslySetInnerHTML é intencional: o documento também é renderizado no
        servidor, e dentro de <style> o React escaparia ">" e "&" dos seletores.
        Só conteúdo constante de buildPageStyle/PRINT_DOCUMENT_CSS entra aqui.
      */}
      <style media="print" dangerouslySetInnerHTML={{ __html: documentStyle }} />

      <header className="print-doc__header">
        <h1 className="print-doc__title">Calendário de trabalho</h1>
        <p className="print-doc__meta">
          <span>Escala {scheduleType}</span>
          <span>Referência: {formatFullDate(referenceDate)}</span>
          <span>Período: {formatPeriod(visibleMonths)}</span>
          <span>Feriados: {REGION_LABELS[region]}</span>
        </p>
      </header>

      <div className="print-doc__months">
        {visibleMonths.map((month) => (
          <section className="print-doc__month" key={month.key}>
            <h2>{month.label}</h2>
            <MiniMonth days={month.days} region={region} />
            <MonthHolidays days={month.days} region={region} />
          </section>
        ))}
      </div>

      <ul className="print-doc__legend">
        <li className="print-doc__legend-item--national">Feriado nacional</li>
        <li className="print-doc__legend-item--optional">Ponto facultativo</li>
        {region === "rs" ? (
          <li className="print-doc__legend-item--state">Feriado estadual (RS)</li>
        ) : null}
      </ul>
    </div>
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
