"use client";

import { useMemo, useState } from "react";
import { createScheduleController } from "@/src/controllers/controllerFactory";
import type { WorkDay } from "@/src/models/entities/WorkDay";
import type { ScheduleType } from "@/src/models/schedules/ScheduleType";
import { BrazilDate } from "@/src/shared/date/BrazilDate";

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

  const months = useMemo(() => {
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
        label: formatMonthYear(normalizedMonth),
        days: result.currentMonth,
      };
    });
  }, [controller, referenceDate, scheduleType]);

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

  function copyShareLink() {
    const params = new URLSearchParams({
      escala: scheduleType,
      referencia: referenceDate,
    });
    const url = `${window.location.origin}/calendario-anual?${params.toString()}`;
    void navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="annual-page">
      <section className="annual-hero">
        <div>
          <p className="eyebrow">
            {readOnly ? "Calendário compartilhado" : "Acesso anual liberado"}
          </p>
          <h1>Calendário de 12 meses</h1>
          <p>
            Consulte qualquer período do ano, veja suas folgas com antecedência
            e compartilhe o calendário com quem organiza a rotina com você.
          </p>
        </div>
      </section>

      {readOnly ? (
        <section className="annual-share-context" aria-label="Dados do calendário compartilhado">
          <span>Visualização somente leitura</span>
          <strong>Escala {scheduleType}</strong>
          <span>Referência: {formatFullDate(referenceDate)}</span>
        </section>
      ) : (
        <section className="annual-controls" aria-label="Filtros do calendário anual">
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
        </section>
      )}

      <section className="annual-calendar-grid" aria-label="Calendário anual">
        {months.map((month) => (
          <article className="annual-month" key={month.label}>
            <h2>{month.label}</h2>
            <MiniMonth days={month.days} />
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
  );
}

function MiniMonth({ days }: { days: WorkDay[] }) {
  const firstDay = new Date(`${days[0]?.date ?? "2026-01-01"}T00:00:00.000Z`);
  const offset = firstDay.getUTCDay();

  return (
    <div className="annual-mini-month">
      {Array.from({ length: offset }, (_, index) => (
        <span className="annual-empty-day" key={`empty-${index}`} />
      ))}
      {days.map((day) => (
        <span
          className={`annual-mini-day ${day.status}`}
          title={`${formatWeekdayLong(day.date)}, ${formatFullDate(day.date)} - ${
            day.status === "rest" ? "Folga" : "Trabalho"
          }`}
          aria-label={`${Number(day.date.slice(-2))}, ${formatWeekdayLong(
            day.date,
          )}, ${day.status === "rest" ? "Folga" : "Trabalho"}`}
          key={day.date}
        >
          <strong>{Number(day.date.slice(-2))}</strong>
          <small>{formatWeekdayShort(day.date)}</small>
        </span>
      ))}
    </div>
  );
}

function formatMonthYear(value: string): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));

  return capitalizeFirstLetter(label);
}

function addMonths(value: string, amount: number): string {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-01`;
}

function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatWeekdayShort(value: string): string {
  return capitalizeFirstLetter(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      weekday: "short",
    })
      .format(new Date(`${value}T00:00:00.000Z`))
      .replace(".", ""),
  );
}

function formatWeekdayLong(value: string): string {
  return capitalizeFirstLetter(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      weekday: "long",
    }).format(new Date(`${value}T00:00:00.000Z`)),
  );
}

function capitalizeFirstLetter(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isScheduleType(value: string | undefined): value is ScheduleType {
  return scheduleOptions.some((option) => option.type === value);
}
