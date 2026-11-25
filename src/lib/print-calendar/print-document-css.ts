export const PRINT_DOCUMENT_CSS = `
.print-doc {
  padding: 0;
  color: #0b1b2b;
  background: #ffffff;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  font-size: 10pt;
}

.print-doc__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 1mm 6mm;
  margin: 0 0 5mm;
  padding: 0 0 3mm;
  border-bottom: 1px solid #c9d6e2;
}

.print-doc__title {
  margin: 0;
  font-size: 14pt;
  color: #17477e;
}

.print-doc__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1mm 5mm;
  margin: 0;
  font-size: 8.5pt;
  color: #3d4c5e;
}

.print-doc__months {
  display: grid;
  gap: 4mm;
}

.print-layout-one-per-page .print-doc__months { grid-template-columns: 1fr; }
.print-layout-two-per-page .print-doc__months { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.print-layout-three-per-page .print-doc__months { grid-template-columns: repeat(3, minmax(0, 1fr)); }

.print-doc__month {
  break-inside: avoid;
  page-break-inside: avoid;
  padding: 3mm;
  border: 1px solid #c9d6e2;
  border-radius: 2mm;
  background: #ffffff;
}

/* Evita a última página em branco. */
.print-layout-one-per-page .print-doc__month {
  break-after: page;
  page-break-after: always;
}

.print-layout-one-per-page .print-doc__month:last-child {
  break-after: auto;
  page-break-after: auto;
}

.print-doc__month h2 {
  margin: 0 0 2.5mm;
  font-size: 10.5pt;
  color: #215896;
}

/* Mini-mês: redefine o que importa para impressão, com cores literais
   e sem o min-height/aspect-ratio da tela (que estouram a célula). */
.print-doc .annual-mini-month {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 1mm;
}

.print-doc .annual-empty-day,
.print-doc .annual-mini-day {
  min-height: 0;
  aspect-ratio: auto;
  border-radius: 1mm;
}

.print-doc .annual-mini-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1mm 0;
  background: #e8f1ff;
  color: #17477e;
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
}

.print-doc .annual-mini-day strong { font-size: 7pt; }
.print-doc .annual-mini-day small { font-size: 5.5pt; font-weight: 700; }

.print-doc .annual-mini-day.rest {
  background: #188b54;
  color: #ffffff;
}

/* Feriado: círculo em volta do número do dia, com fundo branco (que também
   aparece sobre o verde da folga) e anel grosso de 0,5 mm para o papel. */
.print-doc .annual-mini-day.holiday strong {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2em;
  height: 2em;
  border: 0.5mm solid transparent;
  border-radius: 999px;
  background: #ffffff;
  color: #0b1b2b;
}

.print-doc .annual-mini-day.holiday--national strong {
  border-color: #b45309;
}

.print-doc .annual-mini-day.holiday--optional strong {
  border-color: #7e22ce;
}

.print-doc .annual-mini-day.holiday--state strong {
  border-color: #9d174d;
}

.print-doc__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 2mm 5mm;
  margin: 4mm 0 0;
  padding: 0;
  list-style: none;
  color: #3d4c5e;
  font-size: 8pt;
}

.print-doc__legend li {
  display: flex;
  align-items: center;
  gap: 1.5mm;
}

.print-doc__legend li::before {
  content: "";
  width: 2.8mm;
  height: 2.8mm;
  border: 0.5mm solid transparent;
  border-radius: 999px;
}

.print-doc__legend-item--national::before {
  border-color: #b45309;
}

.print-doc__legend-item--optional::before {
  border-color: #7e22ce;
}

.print-doc__legend-item--state::before {
  border-color: #9d174d;
}
`;
