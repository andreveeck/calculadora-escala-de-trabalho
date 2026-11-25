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

test("Domingo de Páscoa também é feriado nacional", () => {
  assert.deepEqual(getHoliday("2026-04-05"), {
    date: "2026-04-05",
    name: "Páscoa",
    kind: "national",
  });
  assert.equal(getHoliday("2027-03-28")?.name, "Páscoa");
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
    assert.equal(
      getHoliday(date)?.kind,
      "optional",
      `${date} deveria ser facultativo`,
    );
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
  assert.equal(getHolidays(2026, "br").length, 14); // 11 nacionais + 3 facultativos
  assert.equal(getHolidays(2026, "rs").length, 15);
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
