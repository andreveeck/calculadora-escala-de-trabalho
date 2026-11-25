# Melhoria: Impressão Robusta do Calendário Anual (A4) — v2 corrigida

> **Versão 2.2** — corrigida após avaliação contra o código real do repositório e ampliada
> com a marcação de feriados nacionais, pontos facultativos e feriados estaduais do RS.
>
> A v1 partia de premissas falsas (impressão já existente, 12 meses de janeiro a dezembro,
> opção `removeAfterPrint`, CSS global de impressão). Tudo isso foi removido ou substituído.
> Se este plano divergir da v1, **este arquivo é a fonte de verdade**.

- **Projeto:** Minha Escala (`app/` na raiz, `src/` em camadas controller/model/view)
- **Stack confirmada:** Next.js 16.2.6 (App Router), React 19.2.6, TypeScript 5.9 strict, Tailwind 4.2.1
- **Complexidade:** média-baixa
- **Esforço:** 4–6 h (implementação + testes manuais em 3 navegadores)
- **Risco de regressão:** baixo, com uma ressalva: a Fase 0 mexe no componente que está atrás do paywall — executá-la e validar isoladamente antes de qualquer código de impressão

---

## 0. Correções aplicadas em relação à v1

| # | Problema na v1 | Correção nesta versão |
| --- | --- | --- |
| P0-1 | Opção `removeAfterPrint` não existe na v3 → erro de `tsc` | Removida. A API usada é `contentRef`, `pageStyle`, `documentTitle`, `onBeforePrint` (Promise), `preserveAfterPrint` |
| P0-2 | `body > *:not(.print-doc) { display: none }` no `globals.css` imprime folha em branco | Seção de CSS global de impressão **eliminada**. Nenhuma regra de impressão em `globals.css` |
| P0-3 | Períodos "ano/semestre/trimestre" sobre uma janela móvel de 12 meses | Período expresso em **meses reais** da janela (`startMonthKey` + `monthCount`) |
| P0-4 | `DEFAULT_OPTIONS` usava `year` inexistente | `createDefaultPrintOptions(months)`, derivando o título das chaves `YYYY-MM` |
| P0-5 | `days: unknown[]` incompatível com `MiniMonth(days: WorkDay[])` | `AnnualMonth` com `days: WorkDay[]` e `key: "YYYY-MM"` |
| P0-6 | "reutilizar o MiniMonth" sem passo de extração (ele é privado) | **Fase 0** dedicada: extrair `MiniMonth` + helpers de data |
| P1-1 | CSS no `globals.css`, cores via variáveis CSS | CSS do documento em `<style>` dentro do componente impresso, com **cores literais** |
| P1-2 | `float` + `width: 33.33%`, página final em branco | `display: grid` + `break-after: auto` no último mês |
| P1-3 | "Todos em uma folha" resolvido só com fonte menor | Modo **removido do escopo** (inviável com `min-height: 30px` + `aspect-ratio: 1`) |
| P1-4 | Documento impresso sem escala/referência/período | Cabeçalho impresso inclui escala, data de referência e período |
| P1-5 | Orientação/margens prometidas como garantia | Declarado como preferência sujeita ao diálogo do navegador |
| P1-6 | Diálogo assumindo componentes existentes (não há modal) | `<dialog>` nativo + CSS de tela novo, com regras de lint/acessibilidade explícitas |
| P1-7 | `pendingPrint` + `setTimeout(0)` para escapar de `pageStyle` desatualizado | `@page` vai no `<style>` do documento (clonado no print) + título via ref → efeito único pós-commit, sem `setTimeout` |
| — | (v2.1) feriados nacionais não estavam no escopo | Etapa **5.1.1** na Fase 0: feriados marcados por data, com Páscoa calculada e sem alterar a regra de escala |
| — | (v2.2) faltavam Carnaval, Corpus Christi e feriados estaduais | Três categorias com cores próprias (`national`, `optional`, `state`) e seletor de região Brasil / Brasil + RS |

---

## 1. Fatos validados no repositório (não repetir a investigação)

```
app/globals.css                                  2.994 linhas, "@import tailwindcss" na linha 1
app/calendario-anual/page.tsx                    → AnnualAccessGate (token assinado | login+paywall)
src/views/components/AnnualAccessGate.tsx        → AnnualCalendarExperience (readOnly no link compartilhado)
src/views/components/AnnualCalendarExperience.tsx  MiniMonth é privado aqui (não exportado)
src/models/entities/WorkDay.ts                   { date: string; status: "work" | "rest"; label; cycleDay }
src/models/schedules/ScheduleType.ts             "6x1" | "12x36" | "6x2" | "3x3"
src/shared/date/BrazilDate.ts                    today(), toIso(), isValidIsoDate()
src/lib/                                          existe (hoje só constants.ts)
tsconfig paths                                   "@/*" → raiz do projeto (logo: @/src/..., nunca @/lib/...)
```

Ausências confirmadas (não procurar de novo):

- **não existe** `window.print`, `print-area`, `@media print` ou `@page` em `app/` ou `src/`;
- **não existe** `src/components/` (componentes de UI ficam em `src/views/components/`);
- **não existe** modal/`<dialog>` no projeto;
- **não existe** `react-to-print` instalado.

Fato de produto que governa o desenho: os 12 meses são uma **janela móvel** calculada em
`AnnualCalendarExperience`:

```ts
const safeStartMonth = BrazilDate.today().toIso().slice(0, 7);
Array.from({ length: 12 }, (_, index) => addMonths(`${safeStartMonth}-01`, index));
```

Em novembro/2026, `months[0]` = Novembro 2026 e `months[11]` = Outubro 2027.
Portanto **não existem** "ano civil", "1º semestre" ou "trimestre". O seletor de período
trabalha com os rótulos reais já exibidos na tela ("Novembro 2026" … "Outubro 2027").

---

## 2. Objetivo

Permitir que o usuário imprima o calendário anual em A4 com:

1. **Período** — mês inicial (qualquer um dos 12 da janela) e quantidade (3, 6 ou 12 meses).
2. **Orientação** — retrato ou paisagem (`@page size`).
3. **Margens** — estreita (10 mm), normal (15 mm), larga (25 mm).
4. **Layout** — 1, 2 ou 3 meses por página.
5. **Título do PDF** — editável, com padrão derivado dos anos da janela.
6. **Feriados** — o dia aparece marcado no calendário (tela e papel) em três categorias
   com cores próprias: feriado nacional, ponto facultativo (Carnaval e Corpus Christi) e
   feriado estadual do RS. O status de trabalho/folga não muda.

Disponível em **Chrome, Firefox e Edge** (Safari 18.2+ para `@page size`; paisagem em Safari
não é suportada — ver Seção 10). O botão de impressão aparece **também no modo somente leitura**
(link compartilhado): imprimir é o principal uso de quem recebe o link.

---

## 3. Dependência

```bash
npm install react-to-print
```

- Versão atual: **3.3.0**. `peerDependencies: { "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ~19" }` — compatível com o React 19.2.6 do projeto, **sem** `--legacy-peer-deps`.
- Projeto usa npm (`package-lock.json`) — não misturar com outro gerenciador.
- Bundle pequeno (~53 kB descompactado), carregado só no cliente.

### API da v3 — usar exatamente assim

| Opção | Uso neste plano |
| --- | --- |
| `contentRef` | ✅ ref do elemento a imprimir (a API v2 `content: () => ref.current` **não existe mais**) |
| `pageStyle` | ✅ string de CSS injetada no iframe (reset estático, sem opções) |
| `documentTitle` | ✅ `string \| (() => string)` — usamos função para manter o hook estável |
| `onBeforePrint` | ✅ aceita Promise (não é necessário aqui) |
| `preserveAfterPrint` | ✅ padrão `false` (iframe é removido depois) |

**Não usar** (não existem na v3): `removeAfterPrint`, `onBeforeGetContent`, `content`.

---

## 4. Arquitetura

```
src/
├── shared/date/
│   ├── calendarLabels.ts                        # NOVO  (Fase 0) helpers de data extraídos
│   └── holidays.ts                              # NOVO  (Fase 0) nacionais + facultativos + RS
├── views/components/
│   ├── AnnualCalendarExperience.tsx             # ALTERADO (Fase 0 + integração)
│   └── annual/
│       ├── MiniMonth.tsx                        # NOVO  (Fase 0) extraído do Experience
│       └── PrintCalendarDialog.tsx              # NOVO  (diálogo <dialog> nativo)
├── lib/print-calendar/
│   ├── types.ts                                 # NOVO  tipos + AnnualMonth
│   ├── print-options.ts                         # NOVO  defaults + rótulos pt-BR
│   ├── select-months.ts                         # NOVO  função pura, testável
│   ├── page-style.ts                            # NOVO  @page + reset do iframe
│   ├── print-document-css.ts                    # NOVO  CSS do documento (cores literais)
│   ├── PrintCalendarDocument.tsx                # NOVO  documento impresso
│   └── use-calendar-print.ts                    # NOVO  wrapper do react-to-print
└── app/globals.css                              # ALTERADO apenas com CSS de TELA do diálogo
```

Testes:

```
tests/print-calendar.test.ts                     # NOVO  selectMonths / buildPageStyle / defaults
tests/holidays.test.ts                           # NOVO  Páscoa, categorias, RS, índice por data
package.json                                     # ALTERADO: incluir os testes no script "test"
```

### Onde vive cada CSS (ponto que a v1 errava)

| Camada | Onde | Por quê |
| --- | --- | --- |
| Estilos de **tela** do diálogo e do botão | `app/globals.css` (novo bloco, ao lado de `.annual-*`) | São UI normal da aplicação |
| Estilos de **impressão** do documento | `<style>` dentro de `PrintCalendarDocument` | É clonado junto com o conteúdo para o iframe: chega sempre, sem depender da cópia do `<head>`, e acompanha o estado do React |
| Reset de página do iframe (`html, body`, `print-color-adjust`) | `pageStyle` do hook | Não depende de opções; é o único CSS estável do iframe |

`@page { size; margin }` fica **no `<style>` do documento**, como recomenda o README da
biblioteca ("force orientation… include the following in the component being printed").
Consequência: orientação e margens entram no clone no momento do print, sem corrida de timing.

### Fluxo

```
[Botão "Imprimir calendário"]  (visível em modo normal e somente leitura)
        │
        ▼
[PrintCalendarDialog]  mês inicial · quantidade · orientação · margens · layout · título
        │  onConfirm(nextOptions)
        ▼
[AnnualCalendarExperience]
        ├─ printTitleRef.current = nextOptions.documentTitle
        ├─ setPrintOptions(nextOptions)          → re-render do documento oculto
        └─ setPrintRequest(n + 1)
        │
        ▼
[useEffect pós-commit, guardado por ref]  →  printFn()
        │
        ▼
[react-to-print clona <div ref>]  →  iframe com <style media="print"> já atualizado
        │
        ▼
[Diálogo de impressão do navegador]
```

---

## 5. Passo a passo

### Fase 0 — Extração (sem comportamento novo; checkpoint obrigatório)

#### 5.1. Criar `src/shared/date/calendarLabels.ts`

Mover, **sem alterar o corpo**, os helpers hoje privados em `AnnualCalendarExperience.tsx`:
`formatMonthYear`, `formatFullDate`, `formatWeekdayShort`, `formatWeekdayLong`,
`capitalizeFirstLetter`, `addMonths`. Todos devem ser `export function`.

```ts
export function formatMonthYear(value: string): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));

  return capitalizeFirstLetter(label);
}

export function addMonths(value: string, amount: number): string {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function formatFullDate(value: string): string { /* copiar do componente */ }
export function formatWeekdayShort(value: string): string { /* copiar do componente */ }
export function formatWeekdayLong(value: string): string { /* copiar do componente */ }
export function capitalizeFirstLetter(value: string): string { /* copiar do componente */ }
```

#### 5.1.1. Criar `src/shared/date/holidays.ts`

Um único módulo com três categorias e filtro de região. Nada de tabela por ano: tudo derivado
de três fontes.

| Categoria | `kind` | Origem | Datas |
| --- | --- | --- | --- |
| Feriado nacional | `national` | Leis federais | 01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 20/11, 25/12 e Sexta-feira Santa |
| Ponto facultativo | `optional` | Decreto/portaria federal | Carnaval (segunda e terça) e Corpus Christi |
| Feriado estadual | `state` | Lei estadual, por região | RS: 20/09 Revolução Farroupilha (Dia do Gaúcho) |

Fatos confirmados nas fontes oficiais — **não pesquisar de novo**:

- **O RS tem um único feriado estadual:** 20/09, Data Magna Estadual / Revolução Farroupilha
  (Decreto RS 58.607/2026, inciso II). No mesmo decreto, 02/02 (Nossa Senhora dos Navegantes)
  e Corpus Christi aparecem como **feriados municipais** — cada município decide; não são
  estaduais.
- **Carnaval** é ponto facultativo federal na segunda e na terça; **Corpus Christi** é ponto
  facultativo federal, 60 dias após a Páscoa.
- Datas de 2026: Carnaval 16 e 17/02, Sexta-feira Santa 03/04, Corpus Christi 04/06,
  Revolução Farroupilha 20/09.
- Datas de 2027: Carnaval 08 e 09/02, Sexta-feira Santa 26/03, Corpus Christi 27/05.

Regra de arquitetura: feriado é **apresentação**, não regra de escala. Não alterar `WorkDay`
nem `ScheduleCalculatorService`; o status de trabalho/folga continua vindo dele.

```ts
import { BrazilDate } from "@/src/shared/date/BrazilDate";

/** Categoria do dia marcado no calendário. */
export type HolidayKind = "national" | "optional" | "state";

/** Região cujos feriados estaduais são exibidos. */
export type HolidayRegion = "br" | "rs";

export interface Holiday {
  /** "YYYY-MM-DD" */
  date: string;
  name: string;
  kind: HolidayKind;
}

export const REGION_LABELS: Record<HolidayRegion, string> = {
  br: "Brasil",
  rs: "Brasil + RS",
};

/** Decisão de produto: trocar para "rs" se o público for gaúcho. */
export const DEFAULT_HOLIDAY_REGION: HolidayRegion = "br";

interface FixedHoliday {
  month: number;
  day: number;
  name: string;
  /** Primeiro ano em que a data vale (para leis novas). */
  since?: number;
}

const NATIONAL_FIXED: FixedHoliday[] = [
  { month: 1, day: 1, name: "Confraternização Universal" },
  { month: 4, day: 21, name: "Tiradentes" },
  { month: 5, day: 1, name: "Dia do Trabalho" },
  { month: 9, day: 7, name: "Independência do Brasil" },
  { month: 10, day: 12, name: "Nossa Senhora Aparecida" },
  { month: 11, day: 2, name: "Finados" },
  { month: 11, day: 15, name: "Proclamação da República" },
  {
    month: 11,
    day: 20,
    name: "Dia Nacional de Zumbi e da Consciência Negra",
    since: 2024,
  },
  { month: 12, day: 25, name: "Natal" },
];

/** Feriados estaduais. Hoje só o RS, que tem uma única data estadual. */
const STATE_FIXED: Partial<Record<HolidayRegion, FixedHoliday[]>> = {
  rs: [{ month: 9, day: 20, name: "Revolução Farroupilha (Dia do Gaúcho)" }],
};

/** Domingo de Páscoa no calendário gregoriano (Meeus/Jones/Butcher). */
export function getEasterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return formatIsoDate(year, month, day);
}

export function getHolidays(
  year: number,
  region: HolidayRegion = DEFAULT_HOLIDAY_REGION,
): Holiday[] {
  const national = NATIONAL_FIXED.filter(
    (holiday) => holiday.since === undefined || year >= holiday.since,
  ).map((holiday) => ({
    date: formatIsoDate(year, holiday.month, holiday.day),
    name: holiday.name,
    kind: "national" as const,
  }));

  const state = (STATE_FIXED[region] ?? []).map((holiday) => ({
    date: formatIsoDate(year, holiday.month, holiday.day),
    name: holiday.name,
    kind: "state" as const,
  }));

  return [...national, ...state, ...movableHolidays(year)].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

/** Datas que dependem da Páscoa. */
function movableHolidays(year: number): Holiday[] {
  const easter = getEasterSunday(year);
  const dateFromEaster = (days: number) => BrazilDate.fromIso(easter).addDays(days).toIso();

  return [
    { date: dateFromEaster(-48), name: "Carnaval (segunda-feira)", kind: "optional" },
    { date: dateFromEaster(-47), name: "Carnaval (terça-feira)", kind: "optional" },
    { date: dateFromEaster(-2), name: "Sexta-feira Santa", kind: "national" },
    { date: dateFromEaster(60), name: "Corpus Christi", kind: "optional" },
  ];
}

const holidayCache = new Map<string, Map<string, Holiday>>();

/** Feriado na data ISO informada, ou `undefined`. */
export function getHoliday(
  isoDate: string,
  region: HolidayRegion = DEFAULT_HOLIDAY_REGION,
): Holiday | undefined {
  if (isoDate.length !== 10) {
    return undefined;
  }

  const year = Number(isoDate.slice(0, 4));

  if (!Number.isInteger(year)) {
    return undefined;
  }

  const cacheKey = `${year}:${region}`;
  let index = holidayCache.get(cacheKey);

  if (!index) {
    index = new Map(
      getHolidays(year, region).map((holiday) => [holiday.date, holiday]),
    );
    holidayCache.set(cacheKey, index);
  }

  return index.get(isoDate);
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
```

`getHoliday` usa cache por `ano:região` — o calendário faz ~372 consultas por render (12 meses
× 31 dias) e o índice é montado uma vez.

**Cores por categoria** (as mesmas na tela e no papel):

| Categoria | Cor | Hex |
| --- | --- | --- |
| Nacional | âmbar | `#b45309` |
| Ponto facultativo | roxo | `#7e22ce` |
| Estadual (RS) | vinho | `#9d174d` |

O ponto leva um anel branco porque o fundo do dia é azul (trabalho) ou verde (folga).

**Seletor de região (tela)** — fica na barra do botão de impressão, visível nos dois modos
(inclusive no link compartilhado), porque muda a marcação exibida:

```tsx
<div className="annual-print-actions">
  <label className="annual-region-field">
    <span>Feriados</span>
    <select
      value={region}
      onChange={(event) => setRegion(event.target.value as HolidayRegion)}
    >
      <option value="br">Brasil</option>
      <option value="rs">Brasil + RS</option>
    </select>
  </label>

  <button type="button" onClick={() => setPrintOpen(true)}>
    Imprimir calendário
  </button>
</div>
```

No estado do componente:

```tsx
const [region, setRegion] = useState<HolidayRegion>(DEFAULT_HOLIDAY_REGION);
```

`region` precisa chegar aos **dois** pontos que renderizam o mês: a grade da tela
(`<MiniMonth days={month.days} region={region} />`) e o `PrintCalendarDocument`
(`region={region}`).

**Marcação no dia** — classes `holiday holiday--<kind>`, ponto no canto e categoria + nome em
`title`/`aria-label`. O `MiniMonth` final está na Seção 5.2; o CSS de tela na 5.13 e o de
impressão na 5.8.

**Teste do módulo** — criar já nesta fase, é o que valida a Páscoa:

`tests/holidays.test.ts`

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  getEasterSunday,
  getHoliday,
  getHolidays,
} from "../src/shared/date/holidays";

test("Páscoa 2026 e 2027", () => {
  assert.equal(getEasterSunday(2026), "2026-04-05");
  assert.equal(getEasterSunday(2027), "2027-03-28");
});

test("Páscoa cai sempre entre 22/03 e 25/04", () => {
  for (let year = 2024; year <= 2040; year += 1) {
    const easter = getEasterSunday(year);

    assert.ok(
      easter >= `${year}-03-22` && easter <= `${year}-04-25`,
      `Páscoa fora da faixa em ${year}: ${easter}`,
    );
  }
});

test("Sexta-feira Santa é feriado nacional dois dias antes da Páscoa", () => {
  assert.deepEqual(getHoliday("2026-04-03"), {
    date: "2026-04-03",
    name: "Sexta-feira Santa",
    kind: "national",
  });
});

test("Carnaval e Corpus Christi são pontos facultativos", () => {
  for (const date of ["2026-02-16", "2026-02-17", "2026-06-04"]) {
    assert.equal(getHoliday(date)?.kind, "optional", `${date} deveria ser facultativo`);
  }

  assert.equal(getHoliday("2026-02-17")?.name, "Carnaval (terça-feira)");
  assert.equal(getHoliday("2026-06-04")?.name, "Corpus Christi");
});

test("feriados nacionais fixos de 2026 estão presentes", () => {
  const dates = getHolidays(2026).map((holiday) => holiday.date);
  const expected = [
    "2026-01-01",
    "2026-04-21",
    "2026-05-01",
    "2026-09-07",
    "2026-10-12",
    "2026-11-02",
    "2026-11-15",
    "2026-11-20",
    "2026-12-25",
  ];

  for (const date of expected) {
    assert.ok(dates.includes(date), `${date} deveria ser feriado nacional`);
  }
});

test("20 de setembro é feriado estadual no RS e não existe em Brasil", () => {
  assert.equal(getHoliday("2026-09-20", "rs")?.kind, "state");
  assert.equal(getHoliday("2026-09-20", "br"), undefined);
});

test("contagem por região em 2026", () => {
  assert.equal(getHolidays(2026, "br").length, 13); // 10 nacionais + 3 facultativos
  assert.equal(getHolidays(2026, "rs").length, 14);
});

test("nenhuma data se repete", () => {
  const holidays = getHolidays(2026, "rs");

  assert.equal(
    new Set(holidays.map((holiday) => holiday.date)).size,
    holidays.length,
  );
});

test("Consciência Negra só vale a partir de 2024", () => {
  assert.ok(!getHolidays(2023).some((holiday) => holiday.date === "2023-11-20"));
  assert.ok(getHolidays(2024).some((holiday) => holiday.date === "2024-11-20"));
});

test("dia comum não é feriado", () => {
  assert.equal(getHoliday("2026-11-25"), undefined);
  assert.equal(getHoliday("2026-12-25")?.name, "Natal");
});
```

#### 5.2. Criar `src/views/components/annual/MiniMonth.tsx`

Mover o componente preservando a estrutura e as classes (`annual-mini-month`,
`annual-empty-day`, `annual-mini-day`), trocando as chamadas pelos helpers importados,
exportando a função e acrescentando o que a Seção 5.1.1 definiu: prop `region`, consulta a
`getHoliday` e as classes `holiday holiday--<kind>`.

```tsx
import type { WorkDay } from "@/src/models/entities/WorkDay";
import {
  formatFullDate,
  formatWeekdayLong,
  formatWeekdayShort,
} from "@/src/shared/date/calendarLabels";
import {
  getHoliday,
  type Holiday,
  type HolidayRegion,
} from "@/src/shared/date/holidays";

const HOLIDAY_KIND_LABELS: Record<Holiday["kind"], string> = {
  national: "feriado nacional",
  optional: "ponto facultativo",
  state: "feriado estadual",
};

interface MiniMonthProps {
  days: WorkDay[];
  region: HolidayRegion;
}

export function MiniMonth({ days, region }: MiniMonthProps) {
  const firstDay = new Date(`${days[0]?.date ?? "2026-01-01"}T00:00:00.000Z`);
  const offset = firstDay.getUTCDay();

  return (
    <div className="annual-mini-month">
      {Array.from({ length: offset }, (_, index) => (
        <span className="annual-empty-day" key={`empty-${index}`} />
      ))}
      {days.map((day) => {
        const holiday = getHoliday(day.date, region);
        const statusLabel = day.status === "rest" ? "Folga" : "Trabalho";
        const weekdayLabel = formatWeekdayLong(day.date);
        const dayNumber = Number(day.date.slice(-2));
        const holidayClass = holiday ? ` holiday holiday--${holiday.kind}` : "";
        const holidayLabel = holiday
          ? ` - ${HOLIDAY_KIND_LABELS[holiday.kind]}: ${holiday.name}`
          : "";

        return (
          <span
            className={`annual-mini-day ${day.status}${holidayClass}`}
            title={`${weekdayLabel}, ${formatFullDate(day.date)} - ${statusLabel}${holidayLabel}`}
            aria-label={`${dayNumber}, ${weekdayLabel}, ${statusLabel}${holidayLabel}`}
            key={day.date}
          >
            <strong>{dayNumber}</strong>
            <small>{formatWeekdayShort(day.date)}</small>
          </span>
        );
      })}
    </div>
  );
}
```

#### 5.3. Ajustar `AnnualCalendarExperience.tsx` (só o necessário para a Fase 0)

- remover `MiniMonth` e os helpers locais;
- importar `MiniMonth` de `./annual/MiniMonth` e os helpers de `@/src/shared/date/calendarLabels`;
- criar o estado de região e a barra com o seletor "Feriados" + botão de imprimir (Seção 5.1.1);
- passar `region={region}` para o `MiniMonth` da grade de 12 meses;
- adicionar a legenda de feriados depois da grade;
- adicionar `key` aos meses (necessário para os períodos da Fase 2):

```ts
return {
  key: normalizedMonth.slice(0, 7), // "YYYY-MM"
  label: formatMonthYear(normalizedMonth),
  days: result.currentMonth,
};
```

**Checkpoint da Fase 0:**

```bash
npm run typecheck
npm run lint
npm run build
```

E conferir na tela que a página `/calendario-anual` está visualmente idêntica — 3 colunas,
12 meses, cores de folga/trabalho — **exceto** pelos marcadores de feriado, que passam a
existir nesta fase. **Não avance sem esse checkpoint** — é a única mudança que toca
componente atrás de paywall.

---

### Fase 1 — Núcleo de impressão

#### 5.4. `src/lib/print-calendar/types.ts`

```ts
import type { WorkDay } from "@/src/models/entities/WorkDay";

export type PrintOrientation = "portrait" | "landscape";
export type PrintMargins = "narrow" | "normal" | "wide";
export type PrintLayout = "one-per-page" | "two-per-page" | "three-per-page";

/** Um mês da janela móvel de 12 meses. */
export interface AnnualMonth {
  key: string;   // "YYYY-MM" — identifica o mês sem depender do índice
  label: string; // "Novembro 2026"
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
```

#### 5.5. `src/lib/print-calendar/print-options.ts`

```ts
import type {
  AnnualMonth,
  PrintLayout,
  PrintMargins,
  PrintOptions,
  PrintOrientation,
} from "./types";

export const MONTH_COUNT_OPTIONS: number[] = [3, 6, 12];

export const ORIENTATION_LABELS: Record<PrintOrientation, string> = {
  portrait: "Retrato",
  landscape: "Paisagem",
};

export const MARGIN_LABELS: Record<PrintMargins, string> = {
  narrow: "Estreita (10 mm)",
  normal: "Normal (15 mm)",
  wide: "Larga (25 mm)",
};

export const LAYOUT_LABELS: Record<PrintLayout, string> = {
  "one-per-page": "1 mês por página",
  "two-per-page": "2 meses por página",
  "three-per-page": "3 meses por página",
};

export function createDefaultPrintOptions(months: AnnualMonth[]): PrintOptions {
  const first = months[0];
  const last = months[months.length - 1];
  const startYear = first ? first.key.slice(0, 4) : "";
  const endYear = last ? last.key.slice(0, 4) : startYear;
  const yearPart =
    startYear && endYear && startYear !== endYear ? `${startYear}-${endYear}` : startYear;

  return {
    startMonthKey: first ? first.key : "",
    monthCount: months.length > 0 ? months.length : 12,
    orientation: "portrait",
    margins: "normal",
    layout: "three-per-page",
    documentTitle: `Calendario-Escala-${yearPart}`,
  };
}
```

#### 5.6. `src/lib/print-calendar/select-months.ts`

Função pura, sem React, sem `Date` — é o que os testes cobrem.

```ts
import type { AnnualMonth, PrintOptions } from "./types";

/**
 * Seleciona os meses a imprimir. Sempre devolve um intervalo válido:
 * chave desconhecida cai no primeiro mês; quantidade é limitada ao
 * que existe a partir do mês inicial; mínimo de 1 mês.
 */
export function selectMonths(
  months: AnnualMonth[],
  options: Pick<PrintOptions, "startMonthKey" | "monthCount">,
): AnnualMonth[] {
  if (months.length === 0) {
    return [];
  }

  const foundIndex = months.findIndex((month) => month.key === options.startMonthKey);
  const startIndex = foundIndex >= 0 ? foundIndex : 0;
  const available = months.length - startIndex;
  const count = Math.min(Math.max(Math.trunc(options.monthCount), 1), available);

  return months.slice(startIndex, startIndex + count);
}
```

#### 5.7. `src/lib/print-calendar/page-style.ts`

```ts
import type { PrintMargins, PrintOptions } from "./types";

const MARGIN_MM: Record<PrintMargins, string> = {
  narrow: "10mm",
  normal: "15mm",
  wide: "25mm",
};

/**
 * Regras de página do documento impresso. Vão no <style> do próprio documento
 * (clonado junto com o conteúdo) para que orientação e margens acompanhem o
 * estado do React sem depender de timing.
 */
export function buildPageStyle(
  options: Pick<PrintOptions, "orientation" | "margins">,
): string {
  return [
    `@page { size: A4 ${options.orientation}; margin: ${MARGIN_MM[options.margins]}; }`,
    "html, body { margin: 0 !important; padding: 0 !important; background: #ffffff; }",
    "body { color: #000000; }",
  ].join("\n");
}

/** Reset estático do iframe, passado em `pageStyle`. Não depende de opções. */
export const BASE_PRINT_STYLE = [
  "html, body { margin: 0 !important; padding: 0 !important; background: #ffffff; }",
  "* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
].join("\n");
```

> Nota: sobrescrever `pageStyle` remove também o padrão da biblioteca
> (que já aplica `print-color-adjust: exact`) — por isso `BASE_PRINT_STYLE` reafirma isso.

#### 5.8. `src/lib/print-calendar/print-document-css.ts`

Cores **literais** (sem `var(--...)`): o iframe não é obrigado a receber as variáveis de
`:root` do `globals.css`, e folga/trabalho não podem sair iguais no papel.

```ts
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

/* Feriado: ponto no canto (com anel branco) + número sublinhado (legível a 7pt). */
.print-doc .annual-mini-day.holiday {
  position: relative;
}

.print-doc .annual-mini-day.holiday::after {
  content: "";
  position: absolute;
  top: 0.8mm;
  right: 0.8mm;
  width: 1.2mm;
  height: 1.2mm;
  border-radius: 999px;
  box-shadow: 0 0 0 0.35mm #ffffff;
}

.print-doc .annual-mini-day.holiday--national::after {
  background: #b45309;
}

.print-doc .annual-mini-day.holiday--optional::after {
  background: #7e22ce;
}

.print-doc .annual-mini-day.holiday--state::after {
  background: #9d174d;
}

.print-doc .annual-mini-day.holiday strong {
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
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
  width: 1.4mm;
  height: 1.4mm;
  border-radius: 999px;
  box-shadow: 0 0 0 0.3mm #ffffff;
}

.print-doc__legend-item--national::before {
  background: #b45309;
}

.print-doc__legend-item--optional::before {
  background: #7e22ce;
}

.print-doc__legend-item--state::before {
  background: #9d174d;
}
`;
```

#### 5.9. `src/lib/print-calendar/PrintCalendarDocument.tsx`

```tsx
import type { ScheduleType } from "@/src/models/schedules/ScheduleType";
import { formatFullDate } from "@/src/shared/date/calendarLabels";
import { REGION_LABELS, type HolidayRegion } from "@/src/shared/date/holidays";
import { MiniMonth } from "@/src/views/components/annual/MiniMonth";
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
        Só conteúdo constante desta constante entra aqui.
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
```

#### 5.10. `src/lib/print-calendar/use-calendar-print.ts`

```ts
"use client";

import type { RefObject } from "react";
import { useReactToPrint } from "react-to-print";
import { BASE_PRINT_STYLE } from "./page-style";

/**
 * Wrapper do react-to-print (v3).
 *
 * - `documentTitle` vem de um ref, então o hook devolvido é estável e o
 *   useEffect de disparo não reimprime por mudança de título.
 * - Orientação, margens e layout NÃO passam por aqui: são renderizados no
 *   <style> do PrintCalendarDocument, clonado no momento da impressão.
 */
export function useCalendarPrint(
  contentRef: RefObject<Element | Text | null>,
  documentTitleRef: RefObject<string>,
) {
  return useReactToPrint({
    contentRef,
    documentTitle: () => documentTitleRef.current,
    pageStyle: BASE_PRINT_STYLE,
  });
}
```

> Se o `typecheck` reclamar do tipo de `contentRef`, use o tipo exportado pela própria
> biblioteca (o README documenta `RefObject<Element | Text>`); **não** use `as any`
> nem `@ts-ignore`. O ref local deve ser `useRef<HTMLDivElement>(null)`.

---

### Fase 2 — UI

#### 5.11. `src/views/components/annual/PrintCalendarDialog.tsx`

```tsx
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

  function handleConfirm() {
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
        onCancel();
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
              onChange={(event) => update("monthCount", Number(event.target.value))}
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
            {(Object.keys(ORIENTATION_LABELS) as PrintOrientation[]).map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="print-orientation"
                  checked={draft.orientation === value}
                  onChange={() => update("orientation", value)}
                />
                {ORIENTATION_LABELS[value]}
              </label>
            ))}
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
            onChange={(event) => update("layout", event.target.value as PrintLayout)}
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
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" onClick={handleConfirm}>
          Imprimir
        </button>
      </div>
    </dialog>
  );
}
```

Regras de acessibilidade/lint desta UI (o projeto tem `jsx-a11y` e `react-hooks` no modo
recomendado):

- `<dialog>` nativo com `showModal()` resolve foco preso, Esc e `aria-modal`.
  **Não** declarar `role="dialog"` nem `aria-modal` manualmente (redundante).
- `onCancel` cobre o Esc; o pai desmonta o diálogo, então não chamar `close()` manualmente.
- Nenhum handler de clique no backdrop (exigiria teclado equivalente).
- Todos os campos dentro de `<label>`/`<fieldset><legend>` — nenhum `aria-label` solto.

#### 5.12. Integração em `AnnualCalendarExperience.tsx`

Imports novos:

```tsx
import { PrintCalendarDialog } from "./annual/PrintCalendarDialog";
import { useCalendarPrint } from "@/src/lib/print-calendar/use-calendar-print";
import { createDefaultPrintOptions } from "@/src/lib/print-calendar/print-options";
import { PrintCalendarDocument } from "@/src/lib/print-calendar/PrintCalendarDocument";
import type { AnnualMonth, PrintOptions } from "@/src/lib/print-calendar/types";
```

> Ordem dos hooks: o `useMemo` de `months` precisa vir **antes** do `useState` de opções,
> porque o padrão é derivado da janela.

```tsx
const months = useMemo((): AnnualMonth[] => { /* código atual + key */ }, [
  controller,
  referenceDate,
  scheduleType,
]);

const [printOpen, setPrintOpen] = useState(false);
const [printOptions, setPrintOptions] = useState<PrintOptions>(() =>
  createDefaultPrintOptions(months),
);
const [printRequest, setPrintRequest] = useState(0);
const printDocumentRef = useRef<HTMLDivElement>(null);
const printTitleRef = useRef(printOptions.documentTitle);
const printFn = useCalendarPrint(printDocumentRef, printTitleRef);
const lastPrintedRequestRef = useRef(0);

useEffect(() => {
  if (printRequest === 0 || lastPrintedRequestRef.current === printRequest) {
    return;
  }

  lastPrintedRequestRef.current = printRequest;
  printFn();
}, [printRequest, printFn]);
```

Render (o botão entra uma única vez, fora do bloco `readOnly ? ... : ...`, para valer
nos dois modos):

```tsx
<div className="annual-print-actions">
  <button type="button" onClick={() => setPrintOpen(true)}>
    Imprimir calendário
  </button>
</div>

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
  O contêiner oculto fica FORA do ref — display: none é o padrão documentado
  pela biblioteca e não afeta o clone. Não usar visibility: hidden nem
  left: -9999px (a v1 sugeria isso sem necessidade).
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

{/* Depois da seção .annual-calendar-grid, antes do resumo */}
<ul className="annual-holiday-legend">
  <li className="is-national">Feriado nacional</li>
  <li className="is-optional">Ponto facultativo</li>
  {region === "rs" ? <li className="is-state">Feriado estadual (RS)</li> : null}
</ul>
```

Por que não há `pendingPrint` + `setTimeout`:

- o `useEffect` roda **depois** do commit, quando o `<style>` do documento já tem as
  opções novas — não existe janela de corrida;
- `printFn` é estável (título via ref), então o efeito não reimprime por mudança de título;
- a guarda `lastPrintedRequestRef` impede impressão duplicada mesmo se `printFn` mudar de
  identidade em uma atualização futura da biblioteca.

#### 5.13. CSS de tela em `app/globals.css`

Adicionar ao final do bloco `.annual-*` (perto de `.annual-mini-day`, por volta da linha 1046).
**Somente tela** — nenhuma regra `@media print` neste arquivo.

```css
.annual-print-actions {
  display: flex;
  justify-content: flex-end;
}

.annual-print-actions button {
  min-height: 46px;
  padding: 0 18px;
  border: 0;
  border-radius: 8px;
  background: var(--brand-soft);
  color: var(--brand);
  font-weight: 800;
}

.print-dialog {
  width: min(560px, calc(100vw - 32px));
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  color: var(--foreground);
  box-shadow: var(--shadow-card);
}

.print-dialog::backdrop {
  background: rgba(16, 35, 59, 0.45);
}

.print-dialog h2 {
  margin: 0 0 16px;
  font-size: 1.15rem;
}

.print-dialog__grid {
  display: grid;
  gap: 16px;
}

.print-dialog fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  display: grid;
  gap: 8px;
}

.print-dialog legend {
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 800;
}

.print-dialog label {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 700;
}

.print-dialog select,
.print-dialog input {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
  color: var(--foreground);
}

.print-dialog__radios {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.print-dialog__radios label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.print-dialog__hint {
  margin: 14px 0 0;
  color: var(--muted);
  font-size: 0.82rem;
}

.print-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.print-dialog__actions button {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 8px;
  font-weight: 800;
}

.print-dialog__actions button:first-child {
  background: var(--brand-soft);
  color: var(--brand);
}

.print-dialog__actions button:last-child {
  background: var(--accent-strong);
  color: #ffffff;
}

/* Feriados: três categorias com ponto no canto e anel branco, para não sumir
   sobre o verde da folga. Variáveis novas vão no :root existente (topo do arquivo):
   --holiday-national: #b45309;
   --holiday-optional: #7e22ce;
   --holiday-state: #9d174d; */

.annual-mini-day.holiday {
  position: relative;
}

.annual-mini-day.holiday::after {
  content: "";
  position: absolute;
  top: 3px;
  right: 3px;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  box-shadow: 0 0 0 1px #ffffff;
}

.annual-mini-day.holiday--national::after {
  background: var(--holiday-national);
}

.annual-mini-day.holiday--optional::after {
  background: var(--holiday-optional);
}

.annual-mini-day.holiday--state::after {
  background: var(--holiday-state);
}

.annual-holiday-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.annual-holiday-legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.annual-holiday-legend li::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 999px;
  box-shadow: 0 0 0 1px #ffffff;
}

.annual-holiday-legend .is-national::before {
  background: var(--holiday-national);
}

.annual-holiday-legend .is-optional::before {
  background: var(--holiday-optional);
}

.annual-holiday-legend .is-state::before {
  background: var(--holiday-state);
}

.annual-region-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: auto;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 800;
}

.annual-region-field select {
  min-height: 46px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
  color: var(--foreground);
}
```

---

### Fase 3 — Testes automatizados (as funções puras)

A impressão em si não é testável de forma útil, mas `selectMonths`, `buildPageStyle` e
`createDefaultPrintOptions` são. O projeto já usa `node:test` + `tsx` com imports relativos.

#### 5.14. `tests/print-calendar.test.ts`

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultPrintOptions } from "../src/lib/print-calendar/print-options";
import { buildPageStyle } from "../src/lib/print-calendar/page-style";
import { selectMonths } from "../src/lib/print-calendar/select-months";
import type { AnnualMonth } from "../src/lib/print-calendar/types";

function buildWindow(): AnnualMonth[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = new Date(Date.UTC(2026, 10 + index, 1)); // começa em nov/2026
    const key = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`;

    return { key, label: key, days: [] };
  });
}

const months = buildWindow();

test("janela completa imprime os 12 meses", () => {
  const selected = selectMonths(months, { startMonthKey: "2026-11", monthCount: 12 });

  assert.equal(selected.length, 12);
  assert.equal(selected[0].key, "2026-11");
  assert.equal(selected[11].key, "2027-10");
});

test("quantidade é limitada ao que existe a partir do mês inicial", () => {
  const selected = selectMonths(months, { startMonthKey: "2027-07", monthCount: 12 });

  assert.equal(selected.length, 4);
  assert.equal(selected[0].key, "2027-07");
});

test("chave desconhecida cai no primeiro mês", () => {
  const selected = selectMonths(months, { startMonthKey: "2030-01", monthCount: 3 });

  assert.deepEqual(
    selected.map((month) => month.key),
    ["2026-11", "2026-12", "2027-01"],
  );
});

test("quantidade inválida nunca devolve lista vazia", () => {
  assert.equal(selectMonths(months, { startMonthKey: "2026-11", monthCount: 0 }).length, 1);
  assert.equal(selectMonths(months, { startMonthKey: "2026-11", monthCount: -5 }).length, 1);
});

test("lista vazia devolve lista vazia", () => {
  assert.deepEqual(selectMonths([], { startMonthKey: "2026-11", monthCount: 12 }), []);
});

test("pageStyle reflete orientação e margem", () => {
  const style = buildPageStyle({ orientation: "landscape", margins: "wide" });

  assert.match(style, /size: A4 landscape/);
  assert.match(style, /margin: 25mm/);
});

test("default usa a janela inteira e deriva o título dos anos", () => {
  const options = createDefaultPrintOptions(months);

  assert.equal(options.monthCount, 12);
  assert.equal(options.startMonthKey, "2026-11");
  assert.equal(options.documentTitle, "Calendario-Escala-2026-2027");
});
```

#### 5.15. `package.json`

Acrescentar o arquivo ao script `test` existente (que lista os testes um por um):

```json
"test": "tsx --test tests/schedule-rules.test.ts tests/payment-service.test.ts tests/schema-rls.test.mjs tests/auth-security.test.mjs tests/webhook-signature.test.ts tests/calendar-share-token.test.ts tests/print-calendar.test.ts tests/holidays.test.ts"
```

---

## 6. Checklist de testes manuais

Imprimir para **PDF** (não só olhar a pré-visualização) e abrir o arquivo gerado.

- [ ] Botão "Imprimir calendário" abre o diálogo em modo normal **e** no link compartilhado (`?token=...`).
- [ ] Esc fecha sem imprimir; "Cancelar" fecha sem imprimir.
- [ ] "Começar em" lista os 12 rótulos reais da janela ("Novembro 2026" … "Outubro 2027"), não meses de janeiro a dezembro.
- [ ] 3 meses a partir do 3º mês imprime exatamente esses 3, e o cabeçalho mostra "Janeiro 2027 a Março 2027" (ou o período escolhido).
- [ ] 12 meses com 1 por página = 12 páginas, **sem página final em branco**.
- [ ] 2 e 3 por página não cortam mês ao meio nem deixam um mês isolado na página seguinte.
- [ ] Com 3 por página em retrato, os dias das últimas semanas não vazam da borda do cartão do mês.
- [ ] Paisagem e margens 10/15/25 mm mudam a pré-visualização.
- [ ] **Folga sai verde (#188b54) e trabalho sai azulado (#e8f1ff)** no PDF — nos 3 navegadores.
- [ ] Cabeçalho impresso traz "Escala 6x1", data de referência e período.
- [ ] Título sugerido do PDF é o informado no campo.
- [ ] Layout responsivo do diálogo em tela pequena (não estoura a viewport).
- [ ] Com "Brasil", os 13 dias marcados de 2026 aparecem: 01/01, 16/02 e 17/02 (Carnaval), 03/04 (Sexta-feira Santa), 21/04, 01/05, 04/06 (Corpus Christi), 07/09, 12/10, 02/11, 15/11, 20/11 e 25/12.
- [ ] Com "Brasil + RS", 20/09 (Revolução Farroupilha) também fica marcado; com "Brasil", não.
- [ ] As três categorias têm cores distintas (âmbar, roxo, vinho) e o ponto continua visível sobre o verde da folga.
- [ ] O marcador **não** sobrescreve a cor de folga/trabalho do dia.
- [ ] Passar o mouse (ou inspecionar) mostra categoria e nome, ex.: "ponto facultativo: Carnaval (terça-feira)".
- [ ] No PDF, o ponto aparece e o número do dia fica sublinhado, inclusive com 3 meses por página.
- [ ] A legenda com as três categorias aparece na tela e no rodapé do impresso, e o cabeçalho traz "Feriados: Brasil + RS".
- [ ] Nada de impressão mudou na tela: `/calendario-anual` continua com 3 colunas, cores e totais iguais.

---

## 7. Critérios de aceite

1. Sem regressão visual na tela do calendário anual (comparar com o estado atual antes da Fase 0).
2. **Nenhuma** regra `@media print` ou `@page` em `app/globals.css`.
3. Nenhuma dependência nova além de `react-to-print@3`.
4. TypeScript strict sem `any`, sem `@ts-ignore`; sem `removeAfterPrint` e sem `content: () => ...`.
5. `<dialog>` nativo com `aria-labelledby`; `npm run lint` limpo (incluindo `jsx-a11y`).
6. Todos os textos em pt-BR, consistentes com o resto da UI.
7. Períodos expressos em meses reais da janela móvel — nenhum rótulo "ano/semestre/trimestre".
8. Cores de status legíveis no papel sem depender de variáveis CSS da aplicação.
9. `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` passam.
10. Feriados marcados por data em três categorias (`national`, `optional`, `state`), com cores
    distintas, categoria e nome acessíveis via `title`/`aria-label` e filtro de região
    (Brasil / Brasil + RS), sem alterar o status de trabalho/folga.

---

## 8. Ordem de execução

1. **Fase 0** — `calendarLabels.ts`, `holidays.ts` (+ `tests/holidays.test.ts`), `MiniMonth.tsx` com marcação por categoria, seletor de região, legenda, `key` nos meses, imports ajustados.
2. **Checkpoint**: `typecheck`, `lint`, `build` + conferência visual da página, incluindo os marcadores de feriado. Não seguir sem isso.
3. `npm install react-to-print`.
4. `types.ts` → `print-options.ts` → `select-months.ts` → `page-style.ts` → `print-document-css.ts` (já com as regras de feriado).
5. `PrintCalendarDocument.tsx` (com região e legenda) → `use-calendar-print.ts`.
6. `PrintCalendarDialog.tsx` → integração no `AnnualCalendarExperience` → CSS de tela.
7. `tests/print-calendar.test.ts` + `tests/holidays.test.ts` + script `test`.
8. `typecheck`, `lint`, `test`, `build`.
9. Checklist manual em Chrome, Firefox e Edge.

---

## 9. Riscos e mitigação

| Risco | Probabilidade | Mitigação |
| --- | --- | --- |
| Regressão na extração do `MiniMonth` (componente atrás do paywall) | Média | Fase 0 isolada, sem mudança de corpo, com checkpoint antes de seguir |
| Folga/trabalho saem brancos no papel | Média | Cores literais no CSS do documento + teste imprimindo para PDF |
| Página final em branco em 1 por página | Baixa | `:last-child { break-after: auto }` (já no CSS) |
| 3 por página estoura a altura em retrato | Baixa | `min-height: 0` + `aspect-ratio: auto` no print; validar também com margem larga |
| Tipagem de `contentRef` divergir da lib | Baixa | Usar o tipo documentado pela lib; nunca `as any` |
| `documentTitle` não virar nome do arquivo | Média | Firefox não garante; funciona em Chrome/Edge. Não prometer |
| Data da Páscoa errada → feriado móvel errado | Baixa | Algoritmo Meeus/Jones/Butcher + teste de faixa 2024–2040 e casos 2026/2027 |
| Feriado novo alterar a regra de escala | Baixa | Feriado é só apresentação; `WorkDay` e `ScheduleCalculatorService` não são tocados |
| Feriado municipal (ex.: 02/02 em Porto Alegre) faltando | Média | Fora de escopo: são 497 municípios. O seletor cobre só o estadual do RS |
| Cores de categoria indistinguíveis no papel | Baixa | Âmbar, roxo e vinho são matizes distintos; validar no PDF com 3 meses por página |
| Safari não aplica paisagem | Média | Documentar como limitação (`@page size` só em Safari 18.2+) |
| Usuário sobrescreve orientação/margem no diálogo do navegador | Alta | Declarar como preferência, não garantia |

---

## 10. Fora de escopo (não fazer nesta entrega)

- Layout "todos os 12 meses em uma folha" — inviável com a célula de dia atual; exigiria
  um mini-mês compacto dedicado (sem dia da semana, fonte 6,5pt).
- Feriados **municipais** (ex.: 02/02 Nossa Senhora dos Navegantes em Porto Alegre) — cada
  um dos 497 municípios tem legislação própria.
- Feriados estaduais de outros estados além do RS (basta acrescentar em `STATE_FIXED`).
- Datas de decreto anual (ex.: 20/04 e 05/06 em 2026) e Quarta-feira de Cinzas.
- Totais de folga/trabalho no papel (a tela já mostra; avaliar depois).
- Marca d'água / identificação de conta no PDF.
- Impressão da calculadora, de escalas individuais ou de outras páginas.
- Mudar a janela de 12 meses para ano civil.
- Testes de impressão automatizados (só as funções puras são cobertas).

---

## 11. Referências

- react-to-print v3 — README (opções `contentRef`, `pageStyle`, `documentTitle`, `preserveAfterPrint`; pitfalls de estilo e de `@page` dentro do conteúdo)
- MDN — `@page` e `@page.size` (suporte: Chrome 15+, Firefox 95+, Safari 18.2+; paisagem não suportada em Safari)
- MDN — `break-inside`, `print-color-adjust`
