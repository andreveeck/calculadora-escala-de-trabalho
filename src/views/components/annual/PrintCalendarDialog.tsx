"use client";

import { useEffect, useRef, useState } from "react";
import {
  LAYOUT_LABELS,
  MARGIN_NAMES,
  ORIENTATION_LABELS,
  PAPER_LABELS,
  PAPER_LAYOUTS,
  countAvailableMonths,
  countPrintPages,
  getEffectiveLayout,
  getMarginLabel,
  getMonthCountOptions,
  getMonthsPerPage,
} from "@/src/lib/print-calendar/print-options";
import { selectMonths } from "@/src/lib/print-calendar/select-months";
import type {
  AnnualMonth,
  PrintLayout,
  PrintMargins,
  PrintOptions,
  PrintOrientation,
  PrintPaper,
} from "@/src/lib/print-calendar/types";

interface PrintCalendarDialogProps {
  months: AnnualMonth[];
  initialOptions: PrintOptions;
  onCancel: () => void;
  onConfirm: (options: PrintOptions) => void;
}

export function PrintCalendarDialog({
  months,
  initialOptions,
  onCancel,
  onConfirm,
}: PrintCalendarDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<PrintOptions>(initialOptions);
  const availableMonths = countAvailableMonths(months, draft.startMonthKey);
  const monthCountOptions = getMonthCountOptions(availableMonths);
  const selectedMonths = selectMonths(months, draft);
  const layoutOptions = PAPER_LAYOUTS[draft.paper];
  const monthsPerPage = getMonthsPerPage(draft);
  const pages = countPrintPages(selectedMonths.length, monthsPerPage);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  function update<K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleStartMonthChange(startMonthKey: string) {
    const available = Math.max(countAvailableMonths(months, startMonthKey), 1);

    setDraft((current) => ({
      ...current,
      startMonthKey,
      monthCount: Math.min(current.monthCount, available),
    }));
  }

  function handlePaperChange(paper: PrintPaper) {
    setDraft((current) => ({
      ...current,
      paper,
      // Papel menor não comporta 3 meses por folha: cai no layout permitido.
      layout: getEffectiveLayout({ paper, layout: current.layout }),
    }));
  }

  function handleCancel() {
    dialogRef.current?.close();
    onCancel();
  }

  function handleConfirm() {
    dialogRef.current?.close();
    onConfirm({
      ...draft,
      layout: getEffectiveLayout(draft),
      monthCount: Math.max(selectedMonths.length, 1),
      documentTitle: draft.documentTitle.trim() || initialOptions.documentTitle,
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className="print-dialog"
      aria-labelledby="print-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        handleCancel();
      }}
    >
      <h2 id="print-dialog-title">Imprimir calendário</h2>

      <div className="print-dialog__body">
        <div className="print-dialog__grid">
          <fieldset>
            <legend>Período</legend>

            <div className="print-dialog__period">
              <label>
                <span>Começar em</span>
                <select
                  value={draft.startMonthKey}
                  onChange={(event) =>
                    handleStartMonthChange(event.target.value)
                  }
                >
                  {months.map((month) => (
                    <option key={month.key} value={month.key}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Quantidade de meses</span>
                <select
                  value={draft.monthCount}
                  onChange={(event) =>
                    update("monthCount", Number(event.target.value))
                  }
                >
                  {monthCountOptions.map((count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? "mês" : "meses"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Página</legend>

            <label>
              <span>Papel</span>
              <select
                value={draft.paper}
                onChange={(event) =>
                  handlePaperChange(event.target.value as PrintPaper)
                }
              >
                {(Object.keys(PAPER_LABELS) as PrintPaper[]).map((value) => (
                  <option key={value} value={value}>
                    {PAPER_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <div
              className="print-dialog__group"
              role="group"
              aria-label="Orientação"
            >
              <span className="print-dialog__group-label">Orientação</span>
              <div className="print-dialog__radios">
                {(Object.keys(ORIENTATION_LABELS) as PrintOrientation[]).map(
                  (value) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="print-orientation"
                        checked={draft.orientation === value}
                        onChange={() => update("orientation", value)}
                      />
                      {ORIENTATION_LABELS[value]}
                    </label>
                  ),
                )}
              </div>
            </div>

            <div
              className="print-dialog__group"
              role="group"
              aria-label="Margens"
            >
              <span className="print-dialog__group-label">Margens</span>
              <div className="print-dialog__radios">
                {(Object.keys(MARGIN_NAMES) as PrintMargins[]).map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="print-margins"
                      checked={draft.margins === value}
                      onChange={() => update("margins", value)}
                    />
                    {getMarginLabel(draft.paper, value)}
                  </label>
                ))}
              </div>
            </div>

            <label>
              <span>Layout</span>
              <select
                value={draft.layout}
                onChange={(event) =>
                  update("layout", event.target.value as PrintLayout)
                }
              >
                {layoutOptions.map((value) => (
                  <option key={value} value={value}>
                    {LAYOUT_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <label>
            <span>Título do PDF</span>
            <input
              type="text"
              value={draft.documentTitle}
              onChange={(event) => update("documentTitle", event.target.value)}
            />
          </label>
        </div>

        <p className="print-dialog__hint" aria-live="polite">
          {selectedMonths.length === 0
            ? "Nenhum mês selecionado."
            : `Serão impressos ${selectedMonths.length} ${
                selectedMonths.length === 1 ? "mês" : "meses"
              } em ${pages} ${pages === 1 ? "página" : "páginas"} ${
                draft.paper.toUpperCase()
              } (${ORIENTATION_LABELS[draft.orientation].toLowerCase()}, ${
                monthsPerPage
              } ${monthsPerPage === 1 ? "mês" : "meses"} por página).`}
        </p>
      </div>

      <div className="print-dialog__actions">
        <button type="button" onClick={handleCancel}>
          Cancelar
        </button>
        <button type="button" onClick={handleConfirm}>
          Imprimir
        </button>
      </div>
    </dialog>
  );
}
