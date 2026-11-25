"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createScheduleController } from "@/src/controllers/controllerFactory";
import { createBrowserSupabaseClient } from "@/src/infrastructure/supabase/client";
import { createDefaultPrintOptions } from "@/src/lib/print-calendar/print-options";
import { PrintCalendarDocument } from "@/src/lib/print-calendar/PrintCalendarDocument";
import type {
  AnnualMonth,
  PrintOptions,
} from "@/src/lib/print-calendar/types";
import { useCalendarPrint } from "@/src/lib/print-calendar/use-calendar-print";
import type { ScheduleType } from "@/src/models/schedules/ScheduleType";
import { BrazilDate } from "@/src/shared/date/BrazilDate";
import {
  addMonths,
  formatFullDate,
  formatMonthYear,
} from "@/src/shared/date/calendarLabels";
import {
  DEFAULT_HOLIDAY_REGION,
  type HolidayRegion,
} from "@/src/shared/date/holidays";
import { MiniMonth } from "./annual/MiniMonth";
import { MonthHolidays } from "./annual/MonthHolidays";
import { PrintCalendarDialog } from "./annual/PrintCalendarDialog";

const scheduleOptions: Array<{ type: ScheduleType; label: string }> = [
  { type: "6x1", label: "6x1" },
  { type: "12x36", label: "12x36" },
  { type: "6x2", label: "6x2" },
  { type: "3x3", label: "3x3" },
];

const referenceLabels: Record<ScheduleType, string> = {
  "6x1": "Data de uma folga conhecida",
  "12x36": "Primeiro dia do plantão",
  "6x2": "1º dia de trabalho depois das folgas",
  "3x3": "1º dia de trabalho do ciclo",
};

interface AnnualCalendarExperienceProps {
  initialScheduleType?: string;
  initialReferenceDate?: string;
  readOnly?: boolean;
}

export function AnnualCalendarExperience({
  initialScheduleType,
  initialReferenceDate,
  readOnly = false,
}: AnnualCalendarExperienceProps) {
  const controller = useMemo(() => createScheduleController(), []);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(() =>
    isScheduleType(initialScheduleType) ? initialScheduleType : "6x1",
  );
  const [referenceDate, setReferenceDate] = useState(() =>
    initialReferenceDate && BrazilDate.isValidIsoDate(initialReferenceDate)
      ? initialReferenceDate
      : BrazilDate.today().toIso(),
  );
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [region, setRegion] = useState<HolidayRegion>(DEFAULT_HOLIDAY_REGION);

  const months = useMemo((): AnnualMonth[] => {
    const safeReferenceDate = BrazilDate.isValidIsoDate(referenceDate)
      ? referenceDate
      : BrazilDate.today().toIso();
    const safeStartMonth = BrazilDate.today().toIso().slice(0, 7);

    return Array.from({ length: 12 }, (_, index) => {
      const normalizedMonth = addMonths(`${safeStartMonth}-01`, index);
      const result = controller.calculate({
        scheduleType,
        referenceDate: safeReferenceDate,
        today: normalizedMonth,
      });

      return {
        key: normalizedMonth.slice(0, 7),
        label: formatMonthYear(normalizedMonth),
        days: result.currentMonth,
      };
    });
  }, [controller, referenceDate, scheduleType]);

  const [printOpen, setPrintOpen] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>(() =>
    createDefaultPrintOptions(months),
  );
  const [printRequest, setPrintRequest] = useState(0);
  const printDocumentRef = useRef<HTMLDivElement>(null);
  const printTitleRef = useRef(printOptions.documentTitle);
  const lastPrintedRequestRef = useRef(0);
  const printFn = useCalendarPrint(printDocumentRef, printTitleRef);

  useEffect(() => {
    if (printRequest === 0 || lastPrintedRequestRef.current === printRequest) {
      return;
    }

    lastPrintedRequestRef.current = printRequest;
    printFn();
  }, [printRequest, printFn]);

  const totals = months.reduce(
    (summary, month) => {
      for (const day of month.days) {
        if (day.status === "rest") {
          summary.rest += 1;
        } else {
          summary.work += 1;
        }
      }

      return summary;
    },
    { rest: 0, work: 0 },
  );

  async function copyShareLink() {
    setShareError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: sessionData } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setShareError(
          "Entre novamente na sua conta para gerar o link de compartilhamento.",
        );
        return;
      }

      const response = await fetch("/api/calendar-share-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          scheduleType,
          referenceDate,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        setShareError(
          payload.message ??
            "Não foi possível gerar o link de compartilhamento.",
        );
        return;
      }

      const { token } = (await response.json()) as { token: string };
      const url = `${window.location.origin}/calendario-anual?token=${encodeURIComponent(token)}`;
      void navigator.clipboard?.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setShareError(
        "Não foi possível gerar o link de compartilhamento. Tente novamente.",
      );
    }
  }

  return (
    <>
      <main className="annual-page">
        <section className="annual-hero">
          <div>
            <p className="eyebrow">
              {readOnly ? "Calendário compartilhado" : "Acesso anual liberado"}
            </p>
            <h1>Calendário de 12 meses</h1>
            <p>
              Consulte qualquer período do ano, veja suas folgas com
              antecedência e compartilhe o calendário com quem organiza a rotina
              com você.
            </p>
          </div>
        </section>

        {readOnly ? (
          <section
            className="annual-share-context"
            aria-label="Dados do calendário compartilhado"
          >
            <span>Visualização somente leitura</span>
            <strong>Escala {scheduleType}</strong>
            <span>Referência: {formatFullDate(referenceDate)}</span>
          </section>
        ) : (
          <section
            className="annual-controls"
            aria-label="Filtros do calendário anual"
          >
            <div className="annual-scale-selector">
              {scheduleOptions.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  className={option.type === scheduleType ? "selected" : ""}
                  onClick={() => setScheduleType(option.type)}
                  aria-pressed={option.type === scheduleType}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label>
              <span>{referenceLabels[scheduleType]}</span>
              <input
                type="date"
                value={referenceDate}
                onChange={(event) => setReferenceDate(event.target.value)}
              />
            </label>

            <button type="button" onClick={copyShareLink}>
              {copied ? "Link copiado" : "Copiar link"}
            </button>

            {shareError ? <p className="form-error">{shareError}</p> : null}
          </section>
        )}

        <div className="annual-print-actions">
          <div className="annual-print-actions__filters">
            <label className="annual-region-field">
              <span>Feriados</span>
              <select
                value={region}
                onChange={(event) =>
                  setRegion(event.target.value as HolidayRegion)
                }
              >
                <option value="br">Brasil</option>
                <option value="rs">Brasil + RS</option>
              </select>
            </label>

            <ul
              className="annual-holiday-legend"
              aria-label="Legenda de feriados"
            >
              <li className="is-national">Feriado nacional</li>
              <li className="is-optional">Ponto facultativo</li>
              {region === "rs" ? (
                <li className="is-state">Feriado estadual (RS)</li>
              ) : null}
            </ul>
          </div>

          <button type="button" onClick={() => setPrintOpen(true)}>
            Imprimir calendário
          </button>
        </div>

        <section className="annual-calendar-grid" aria-label="Calendário anual">
          {months.map((month) => (
            <article className="annual-month" key={month.key}>
              <h2>{month.label}</h2>
              <MiniMonth days={month.days} region={region} />
              <MonthHolidays days={month.days} region={region} />
            </article>
          ))}
        </section>

        <section className="annual-summary" aria-label="Resumo do período">
          <article>
            <span>Folgas</span>
            <strong>{totals.rest}</strong>
          </article>
          <article>
            <span>Trabalho</span>
            <strong>{totals.work}</strong>
          </article>
          <article>
            <span>Período</span>
            <strong>12 meses</strong>
          </article>
        </section>
      </main>

      {printOpen ? (
        <PrintCalendarDialog
          months={months}
          initialOptions={printOptions}
          onCancel={() => setPrintOpen(false)}
          onConfirm={(nextOptions) => {
            printTitleRef.current = nextOptions.documentTitle;
            setPrintOptions(nextOptions);
            setPrintOpen(false);
            setPrintRequest((current) => current + 1);
          }}
        />
      ) : null}

      {/*
        Documento sempre montado para o react-to-print poder clonar.
        O contêiner oculto fica FORA do ref: display: none é o padrão
        documentado pela biblioteca e não afeta o clone.
      */}
      <div aria-hidden="true" style={{ display: "none" }}>
        <div ref={printDocumentRef}>
          <PrintCalendarDocument
            months={months}
            options={printOptions}
            scheduleType={scheduleType}
            referenceDate={referenceDate}
            region={region}
          />
        </div>
      </div>
    </>
  );
}

function isScheduleType(value: string | undefined): value is ScheduleType {
  return scheduleOptions.some((option) => option.type === value);
}
