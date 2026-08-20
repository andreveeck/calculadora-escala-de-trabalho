import assert from "node:assert/strict";
import test from "node:test";
import { createScheduleController } from "../src/controllers/controllerFactory";
import { BrazilDate } from "../src/shared/date/BrazilDate";

const controller = createScheduleController();

test("6x1 treats the reference date as rest", () => {
  const result = controller.calculate({
    scheduleType: "6x1",
    referenceDate: "2026-08-20",
    today: "2026-08-20",
  });

  assert.equal(result.today.status, "rest");
  assert.equal(result.tomorrow.status, "work");
});

test("6x1 supports dates before the reference with positive modulo", () => {
  const result = controller.calculate({
    scheduleType: "6x1",
    referenceDate: "2026-08-20",
    today: "2026-08-13",
  });

  assert.equal(result.today.status, "rest");
});

test("12x36 alternates plantão and rest across month boundaries", () => {
  const result = controller.calculate({
    scheduleType: "12x36",
    referenceDate: "2026-01-31",
    today: "2026-02-01",
  });

  assert.equal(result.today.status, "rest");
  assert.equal(result.tomorrow.status, "work");
});

test("6x2 handles year turn and far future dates", () => {
  const result = controller.calculate({
    scheduleType: "6x2",
    referenceDate: "2025-12-29",
    today: "2027-01-01",
  });

  assert.equal(result.upcomingDays.length, 14);
  assert.ok(["work", "rest"].includes(result.today.status));
  assert.equal(result.currentMonth[0].date, "2027-01-01");
});

test("3x3 uses three work days followed by three rest days", () => {
  const reference = "2026-08-20";

  assert.equal(
    controller.calculate({
      scheduleType: "3x3",
      referenceDate: reference,
      today: "2026-08-20",
    }).today.status,
    "work",
  );
  assert.equal(
    controller.calculate({
      scheduleType: "3x3",
      referenceDate: reference,
      today: "2026-08-23",
    }).today.status,
    "rest",
  );
  assert.equal(
    controller.calculate({
      scheduleType: "3x3",
      referenceDate: reference,
      today: "2026-08-19",
    }).today.status,
    "rest",
  );
});

test("leap years are counted without server timezone dependency", () => {
  const result = controller.calculate({
    scheduleType: "6x2",
    referenceDate: "2024-02-28",
    today: "2024-02-29",
  });

  assert.equal(result.today.status, "work");
  assert.equal(result.tomorrow.status, "work");
});

test("invalid or empty input is rejected", () => {
  assert.throws(
    () =>
      controller.calculate({
        scheduleType: "6x1",
        referenceDate: "",
      }),
    /data de referência/i,
  );
});

test("BrazilDate validates real calendar dates only", () => {
  assert.equal(BrazilDate.isValidIsoDate("2026-02-29"), false);
  assert.equal(BrazilDate.isValidIsoDate("2024-02-29"), true);
});
