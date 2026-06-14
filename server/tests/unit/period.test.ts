import { describe, it, expect } from "vitest";
import { bucketUnit, formatDateIso, getPeriodRange } from "../../src/lib/period.js";

const iso = (d: Date) => formatDateIso(d);

describe("getPeriodRange — week", () => {
  it("Понедельник 2026-04-13: from=2026-04-13, to=2026-04-19", () => {
    const r = getPeriodRange("week", "2026-04-13");
    expect(iso(r.from)).toBe("2026-04-13");
    expect(iso(r.to)).toBe("2026-04-19");
  });

  it("Среда 2026-04-15: from=2026-04-13 (понедельник), to=2026-04-19", () => {
    const r = getPeriodRange("week", "2026-04-15");
    expect(iso(r.from)).toBe("2026-04-13");
    expect(iso(r.to)).toBe("2026-04-19");
  });

  it("Воскресенье 2026-04-19: from=2026-04-13 (предыдущий понедельник)", () => {
    const r = getPeriodRange("week", "2026-04-19");
    expect(iso(r.from)).toBe("2026-04-13");
    expect(iso(r.to)).toBe("2026-04-19");
  });

  it("Граница 1 января 2027 (пятница): понедельник = 2026-12-28", () => {
    const r = getPeriodRange("week", "2027-01-01");
    expect(iso(r.from)).toBe("2026-12-28");
    expect(iso(r.to)).toBe("2027-01-03");
  });
});

describe("getPeriodRange — month", () => {
  it("Апрель 2026", () => {
    const r = getPeriodRange("month", "2026-04-15");
    expect(iso(r.from)).toBe("2026-04-01");
    expect(iso(r.to)).toBe("2026-04-30");
  });

  it("Февраль 2024 високосный", () => {
    const r = getPeriodRange("month", "2024-02-15");
    expect(iso(r.from)).toBe("2024-02-01");
    expect(iso(r.to)).toBe("2024-02-29");
  });

  it("Февраль 2026 невисокосный", () => {
    const r = getPeriodRange("month", "2026-02-15");
    expect(iso(r.from)).toBe("2026-02-01");
    expect(iso(r.to)).toBe("2026-02-28");
  });

  it("Декабрь", () => {
    const r = getPeriodRange("month", "2026-12-15");
    expect(iso(r.from)).toBe("2026-12-01");
    expect(iso(r.to)).toBe("2026-12-31");
  });
});

describe("getPeriodRange — year", () => {
  it("2026", () => {
    const r = getPeriodRange("year", "2026-04-15");
    expect(iso(r.from)).toBe("2026-01-01");
    expect(iso(r.to)).toBe("2026-12-31");
  });
});

describe("bucketUnit", () => {
  it("week -> day", () => expect(bucketUnit("week")).toBe("day"));
  it("month -> day", () => expect(bucketUnit("month")).toBe("day"));
  it("year -> month", () => expect(bucketUnit("year")).toBe("month"));
});
