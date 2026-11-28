"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createScheduleController } from "@/src/controllers/controllerFactory";
import { BrazilDate } from "@/src/shared/date/BrazilDate";
import { ANNUAL_CALENDAR_PRICE_IN_CENTS } from "@/src/shared/constants/pricing";
import type { ScheduleCalculationResult } from "@/src/shared/dto/ScheduleDtos";
import type { ScheduleType } from "@/src/models/schedules/ScheduleType";

/** Dias do mês visíveis na versão gratuita. */
const FREE_VISIBLE_DAYS = 15;
/** Tempo até o pop-up do plano anual aparecer. */
const ANNUAL_PLAN_MODAL_DELAY_MS = 8000;

const scheduleOptions: Array<{
  type: ScheduleType;
  title: string;
  hint: string;
}> = [
  {
    type: "6x1",
    title: "6x1",
    hint: "Seis dias de trabalho e um de folga.",
  },
  {
    type: "12x36",
    title: "12x36",
    hint: "Um dia de plantão e o dia seguinte de folga.",
  },
  {
    type: "6x2",
    title: "6x2",
    hint: "Seis dias de trabalho e duas folgas.",
  },
  {
    type: "3x3",
    title: "3x3",
    hint: "Três dias de trabalho e três folgas.",
  },
];

const referenceHelp: Record<ScheduleType, string> = {
  "6x1": "Informe uma data conhecida de folga.",
  "12x36": "Informe a data em que você iniciou um plantão.",
  "6x2": "Informe o primeiro dia de trabalho após as duas folgas.",
  "3x3": "Informe o primeiro dia de trabalho do ciclo 3x3.",
};

const referencePointNote: Record<ScheduleType, string> = {
  "6x1":
    "O dia que você informar é o ponto de partida do cálculo. Use uma data em que você tenha certeza de que estava de folga.",
  "12x36":
    "O dia que você informar é o ponto de partida do cálculo. Use a data em que você iniciou um plantão e tenha certeza dela.",
  "6x2":
    "O dia que você informar é o ponto de partida do cálculo. Use o primeiro dia de trabalho após as suas folgas e tenha certeza dele.",
  "3x3":
    "O dia que você informar é o ponto de partida do cálculo. Use o primeiro dia de trabalho do ciclo e tenha certeza dele.",
};

interface ScheduleCalculatorProps {
  initialScheduleType: ScheduleType;
}

export function ScheduleCalculator({
  initialScheduleType,
}: ScheduleCalculatorProps) {
  const controller = useMemo(() => createScheduleController(), []);
  const [scheduleType, setScheduleType] =
    useState<ScheduleType>(initialScheduleType);
  const [referenceDate, setReferenceDate] = useState(BrazilDate.today().toIso());
  const [result, setResult] = useState<ScheduleCalculationResult | null>(() =>
    controller.calculate({
      scheduleType: initialScheduleType,
      referenceDate: BrazilDate.today().toIso(),
    }),
  );
  const [error, setError] = useState<string | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);

  useEffect(() => {
    if (!result) {
      return;
    }

    const timer = window.setTimeout(
      () => setPlanModalOpen(true),
      ANNUAL_PLAN_MODAL_DELAY_MS,
    );

    return () => window.clearTimeout(timer);
  }, [result]);

  useEffect(() => {
    if (!planModalOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPlanModalOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [planModalOpen]);

  function calculate() {
    try {
      setResult(controller.calculate({ scheduleType, referenceDate }));
      setError(null);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Não foi possível calcular.");
    }
  }

  return (
    <section className="calculator-shell" aria-label="Calculadora de escala">
      <div className="calculator-form">
        <div className="hero-copy">
          <div className="hero-topline">
            <p className="eyebrow">Planeje sem complicação</p>
            <a href="/acesso">Já tenho plano anual</a>
          </div>
          <h1>Descubra suas folgas em segundos</h1>
          <p className="intro">
            Escolha sua escala e informe uma data conhecida. A gente mostra
            seus dias de trabalho e folga.
          </p>
          <div className="hero-highlights" aria-label="Benefícios da calculadora">
            <span><strong>4</strong> escalas</span>
            <span><strong>Grátis</strong> mês atual</span>
            <span><strong>12 meses</strong> no plano anual</span>
          </div>
        </div>

        <div className="calculator-input-area">
          <div className="input-step">
            <div className="input-step-head">
              <span className="step-badge" aria-hidden="true">1</span>
              <p className="schedule-selector-title">Escolha a sua escala</p>
            </div>
            <p className="input-step-note">
              Toque na escala que você trabalha — o calendário é montado
              conforme essa escolha.
            </p>
          </div>

          <div className="schedule-selector" role="tablist" aria-label="Tipo de escala">
            {scheduleOptions.map((option) => (
              <button
                key={option.type}
                type="button"
                className={option.type === scheduleType ? "selected" : ""}
                onClick={() => setScheduleType(option.type)}
                aria-pressed={option.type === scheduleType}
              >
                <strong>{option.title}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>

          <div className="input-step">
            <div className="input-step-head">
              <span className="step-badge" aria-hidden="true">2</span>
              <p className="schedule-selector-title">Informe sua data de referência</p>
            </div>
            <p className="input-step-note">
              {referencePointNote[scheduleType]}
            </p>
          </div>

          <div className="form-controls">
            <label className="date-field">
              <span>{referenceHelp[scheduleType]}</span>
              <input
                type="date"
                value={referenceDate}
                onChange={(event) => setReferenceDate(event.target.value)}
              />
              <small className="date-field-hint">
                A data de hoje já vem preenchida. Se você não tiver certeza
                sobre hoje, escolha uma data que você conheça bem.
              </small>
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button className="primary-action" type="button" onClick={calculate}>
              Calcular minha folga
            </button>
          </div>
        </div>
      </div>

      {result ? <ScheduleResult result={result} /> : null}

      {planModalOpen ? (
        <AnnualPlanModal onClose={() => setPlanModalOpen(false)} />
      ) : null}
    </section>
  );
}

function ScheduleResult({ result }: { result: ScheduleCalculationResult }) {
  return (
    <div className="result-area" aria-live="polite">
      <div className="status-grid">
        <StatusCard title="Hoje" day={result.today} />
        <StatusCard title="Amanhã" day={result.tomorrow} />
        <StatusCard title="Próxima folga" day={result.nextRestDay} />
      </div>

      <div className="affiliate-banner" aria-label="Banner de afiliado">
        <a
          className="affiliate-banner-link"
          href="https://go.hotmart.com/H107261677B?redirectionUrl=https%3A%2F%2Flp.vivasemprecomdinheiro.com.br%2F"
          target="_blank"
          rel="noreferrer"
        >
          <Image
            src="/design/viva-sempre-dinheiro-logo.webp"
            alt="Viva Sempre com Dinheiro"
            width={687}
            height={216}
          />
          <span>
            <small>Oferta parceira</small>
            <strong>Transforme seu tempo livre em dinheiro ainda hoje.</strong>
          </span>
          <em>Dinheiro agora!</em>
        </a>
      </div>

      <section className="result-section">
        <div className="section-heading">
          <h2>{formatMonthTitle(result.currentMonth[0]?.date)}</h2>
        </div>
        <MonthCalendar
          days={result.currentMonth}
          visibleDays={FREE_VISIBLE_DAYS}
        />
      </section>

      <section className="paid-offer">
        <div>
          <span>Versão paga</span>
          <h2>Calendário anual por R$ 49,90</h2>
          <p>
            Assinatura anual com renovação automática: você vê seu ano inteiro
            sem refazer contas todo mês. A escala impressa vai para a geladeira;
            o PDF fica no celular.
          </p>
          <ul
            className="paid-offer__features"
            aria-label="O que o plano anual inclui"
          >
            <li>Imprimir em A4</li>
            <li>Salvar em PDF</li>
          </ul>
        </div>
        <a className="paid-action" href="/acesso">
          Pagar agora
        </a>
      </section>
    </div>
  );
}

function StatusCard({
  title,
  day,
}: {
  title: string;
  day: ScheduleCalculationResult["today"];
}) {
  return (
    <article className={`status-card ${day.status}`}>
      <span>{title}</span>
      <strong>{day.status === "rest" ? "Folga" : "Trabalho"}</strong>
      <small>
        {formatDate(day.date)} - {day.label}
      </small>
    </article>
  );
}

function MonthCalendar({
  days,
  visibleDays,
}: {
  days: ScheduleCalculationResult["currentMonth"];
  visibleDays?: number;
}) {
  const firstDay = new Date(`${days[0]?.date ?? "2026-01-01"}T00:00:00.000Z`);
  const offset = firstDay.getUTCDay();
  const unlockedCount = Math.min(visibleDays ?? days.length, days.length);
  const hasLockedDays = unlockedCount < days.length;

  const monthLabel = days[0]
    ? formatMonthTitle(days[0].date)
    : "Calendário";

  return (
    <div className="month-calendar-block">
      <div className="month-calendar" role="grid" aria-label={monthLabel}>
        {Array.from({ length: offset }, (_, index) => (
          <span className="empty-day" key={`empty-${index}`} role="presentation" />
        ))}
        {days.map((day, index) => {
          if (index >= unlockedCount) {
            return (
              <div
                className="calendar-day locked"
                role="gridcell"
                aria-label="Dia disponível apenas no plano anual"
                key={day.date}
              >
                <span aria-hidden="true">•</span>
                <small className="calendar-weekday">Anual</small>
              </div>
            );
          }

          return (
            <div
              className={`calendar-day ${day.status}`}
              role="gridcell"
              aria-label={`${Number(day.date.slice(-2))}, ${formatWeekday(day.date)}, ${day.status === "rest" ? "Folga" : "Trabalho"}`}
              key={day.date}
            >
              <span>{Number(day.date.slice(-2))}</span>
              <small className="calendar-weekday">{formatWeekdayShort(day.date)}</small>
            </div>
          );
        })}
      </div>

      {hasLockedDays ? (
        <p className="month-calendar__locked-note">
          Na versão gratuita você vê os dias 1 a {unlockedCount}. Os dias{" "}
          {unlockedCount + 1} a {days.length} e os próximos 11 meses ficam no
          plano anual.{" "}
          <a href="/acesso">Liberar calendário completo</a>
        </p>
      ) : null}
    </div>
  );
}

function AnnualPlanModal({ onClose }: { onClose: () => void }) {
  const price = (
    ANNUAL_CALENDAR_PRICE_IN_CENTS / 100
  ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="plan-modal-backdrop">
      <div
        className="plan-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-modal-title"
      >
        <button
          type="button"
          className="plan-modal__close"
          aria-label="Fechar oferta"
          onClick={onClose}
        >
          ×
        </button>

        <p className="eyebrow">Plano anual</p>
        <h2 id="plan-modal-title">Veja o mês inteiro e o ano completo</h2>
        <p>
          No plano gratuito o calendário mostra só os 15 primeiros dias do mês.
          Com o plano anual por {price} você libera todos os dias e os próximos
          12 meses.
        </p>
        <ul aria-label="O que o plano anual inclui">
          <li>Calendário de 12 meses</li>
          <li>Impressão em A4 e PDF</li>
        </ul>

        <a className="paid-action" href="/acesso">
          Quero o plano anual
        </a>
        <button type="button" className="plan-modal__dismiss" onClick={onClose}>
          Continuar no gratuito
        </button>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  return BrazilDate.fromIso(value).formatForPtBr({
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatWeekday(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
  }).format(date);

  return weekday.replace(/-feira$/i, "");
}

function formatWeekdayShort(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
  })
    .format(date)
    .replace(".", "");

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMonthTitle(value?: string): string {
  if (!value) {
    return "Calendário";
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}
