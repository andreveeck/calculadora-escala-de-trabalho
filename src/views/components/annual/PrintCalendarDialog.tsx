"use client";

import { useEffect, useRef, useState } from "react";
import {
  LAYOUT_LABELS,
  MARGIN_LABELS,
  MONTH_COUNT_OPTIONS,
  ORIENTATION_LABELS,
} from "@/src/lib/print-calendar/print-options";
import { selectMonths } from "@/src/lib/print-calendar/select-months";
import type {
  AnnualMonth,
  PrintLayout,
  PrintMargins,
  PrintOptions,
  PrintOrientation,
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
  const selectedMonths = selectMonths(months, draft);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  function update<K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleCancel() {
    dialogRef.current?.close();
    onCancel();
  }

  function handleConfirm() {
    dialogRef.current?.close();
    onConfirm({
      ...draft,
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

      <div className="print-dialog__grid">
        <fieldset>
          <legend>Período</legend>

          <label>
            <span>Começar em</span>
            <select
              value={draft.startMonthKey}
              onChange={(event) => update("startMonthKey", event.target.value)}
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
              {MONTH_COUNT_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count} meses
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend>Orientação</legend>
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
        </fieldset>

        <fieldset>
          <legend>Margens</legend>
          <div className="print-dialog__radios">
            {(Object.keys(MARGIN_LABELS) as PrintMargins[]).map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="print-margins"
                  checked={draft.margins === value}
                  onChange={() => update("margins", value)}
                />
                {MARGIN_LABELS[value]}
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <span>Layout</span>
          <select
            value={draft.layout}
            onChange={(event) =>
              update("layout", event.target.value as PrintLayout)
            }
          >
            {(Object.keys(LAYOUT_LABELS) as PrintLayout[]).map((value) => (
              <option key={value} value={value}>
                {LAYOUT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Título do PDF</span>
          <input
            type="text"
            value={draft.documentTitle}
            onChange={(event) => update("documentTitle", event.target.value)}
          />
        </label>
      </div>

      <p className="print-dialog__hint">
        Serão impressos {selectedMonths.length} de {months.length} meses.
      </p>

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
