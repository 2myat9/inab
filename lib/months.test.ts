import { describe, expect, test } from "vitest";
import { effectiveBudget, lastNMonths, monthKey, monthLabel } from "./months";

describe("monthKey", () => {
  test("formats a date as YYYY-MM", () => {
    expect(monthKey(new Date(2026, 6, 11))).toBe("2026-07");
  });

  test("pads single-digit months", () => {
    expect(monthKey(new Date(2026, 0, 1))).toBe("2026-01");
  });
});

describe("monthLabel", () => {
  test("renders a human-readable month name and year", () => {
    expect(monthLabel("2026-07")).toBe("July 2026");
  });

  test("renders short labels when asked", () => {
    expect(monthLabel("2026-07", "short")).toBe("Jul");
  });
});

describe("lastNMonths", () => {
  test("returns n months ascending, ending at the given month", () => {
    expect(lastNMonths("2026-07", 6)).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
  });

  test("crosses year boundaries", () => {
    expect(lastNMonths("2026-02", 4)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});

describe("effectiveBudget", () => {
  const rows = [
    { month: "2026-03", amountCents: 300000 },
    { month: "2026-05", amountCents: 500000 },
  ];

  test("uses the month's own budget row when present", () => {
    expect(effectiveBudget(rows, "2026-05")).toBe(500000);
  });

  test("falls back to the most recent earlier month", () => {
    expect(effectiveBudget(rows, "2026-07")).toBe(500000);
    expect(effectiveBudget(rows, "2026-04")).toBe(300000);
  });

  test("returns 0 when no budget exists at or before the month", () => {
    expect(effectiveBudget(rows, "2026-02")).toBe(0);
    expect(effectiveBudget([], "2026-07")).toBe(0);
  });
});
