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
  margin: 0 0 var(--print-gap);
  padding: 0 0 3mm;
  border-bottom: 1px solid #c9d6e2;
}

.print-doc__title {
  margin: 0;
  font-size: var(--print-document-title-size);
  color: #17477e;
}

.print-doc__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1mm 5mm;
  margin: 0;
  font-size: var(--print-meta-size);
  color: #3d4c5e;
}

.print-doc__months {
  display: grid;
  gap: var(--print-gap);
}

/* Colunas da grade por layout. Ficam antes das regras por papel para que
   A5/A6 possam empilhar os meses em largura total. */
.print-layout-one-per-page .print-doc__months { grid-template-columns: 1fr; }
.print-layout-two-per-page .print-doc__months { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.print-layout-three-per-page .print-doc__months { grid-template-columns: repeat(3, minmax(0, 1fr)); }

/* Cada bloco .print-doc__page é uma folha: contém exatamente os meses do
   layout escolhido, então o número de páginas do diálogo confere com o papel. */
.print-doc__pages {
  display: grid;
  gap: 0;
}

.print-doc__page {
  display: flex;
  flex-direction: column;
  break-inside: avoid;
  page-break-inside: avoid;
}

.print-doc__page:not(:last-child) {
  break-after: page;
  page-break-after: always;
}

/* A4 mantém o cabeçalho só na primeira folha. */
.print-paper-a4 .print-doc__page:not(:first-child) .print-doc__header {
  display: none;
}

/* A5 e A6: meses empilhados em largura total, preenchendo a folha inteira. */
.print-paper-a5 .print-doc__page,
.print-paper-a6 .print-doc__page {
  /* Altura fixa = área útil da folha: a página nunca transborda para uma
     folha extra em branco, e o conteúdo é dimensionado para caber. */
  height: calc(var(--print-page-content-height, 0mm) - 4mm);
  overflow: hidden;
  justify-content: space-between;
}

.print-paper-a5 .print-doc__months,
.print-paper-a6 .print-doc__months {
  flex: 1 1 auto;
  min-height: 0;
  grid-template-columns: 1fr;
  align-content: stretch;
  grid-auto-rows: minmax(0, 1fr);
}

/* Paisagem tem largura sobrando e altura curta: em vez de empilhar, os meses
   ficam lado a lado e preenchem a folha na horizontal. */
.print-paper-a5.print-orientation-landscape.print-layout-two-per-page .print-doc__months {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.print-paper-a5 .print-doc__month,
.print-paper-a6 .print-doc__month {
  display: flex;
  flex-direction: column;
}

.print-paper-a5 .annual-mini-month,
.print-paper-a6 .annual-mini-month {
  flex: 1 1 auto;
  /* min-height: 0 permite encolher até o espaço que a folha oferece; sem isso
     o mini-mês empurra o conteúdo para fora da página. */
  min-height: 0;
  align-content: stretch;
  grid-auto-rows: minmax(0, 1fr);
}

.print-paper-a5 .annual-empty-day,
.print-paper-a5 .annual-mini-day,
.print-paper-a6 .annual-empty-day,
.print-paper-a6 .annual-mini-day {
  min-height: 0;
  aspect-ratio: auto;
}

.print-doc__month {
  break-inside: avoid;
  page-break-inside: avoid;
  padding: var(--print-month-padding);
  border: 1px solid #c9d6e2;
  border-radius: 2mm;
  background: #ffffff;
}

.print-doc__month h2 {
  margin: 0 0 2.5mm;
  font-size: var(--print-month-title-size);
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
  padding: var(--print-day-padding) 0;
  background: #e8f1ff;
  color: #17477e;
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
}

.print-doc .annual-mini-day strong { font-size: var(--print-day-size); }
.print-doc .annual-mini-day small { font-size: var(--print-weekday-size); font-weight: 700; }

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

/* Feriados do mês escritos dentro do container do mês. */
.print-doc .annual-month-holidays {
  display: flex;
  flex-direction: column;
  gap: 0.4mm;
  margin: 2mm 0 0;
  padding: 1.2mm 0 0;
  border-top: 1px solid #c9d6e2;
  color: #0b1b2b;
  font-size: var(--print-holidays-size);
  line-height: 1.2;
}

/* A tela usa flex; a impressão precisa repetir, senão data e nome ficam
   colados ("02/11Finados"). */
.print-doc .annual-month-holidays__item {
  display: flex;
  align-items: baseline;
  gap: 1mm;
}

.print-doc .annual-month-holidays__date {
  white-space: nowrap;
}

.print-doc .annual-month-holidays__name {
  color: #0b1b2b;
  font-weight: 700;
}

.print-doc .annual-month-holidays__item.holiday--national .annual-month-holidays__date {
  color: #b45309;
}

.print-doc .annual-month-holidays__item.holiday--optional .annual-month-holidays__date {
  color: #7e22ce;
}

.print-doc .annual-month-holidays__item.holiday--state .annual-month-holidays__date {
  color: #9d174d;
}

`;
