import { describe, expect, test } from "vitest";
import {
  daysInMonth,
  effectiveBudget,
  isMonthKey,
  lastNMonths,
  monthKey,
  monthLabel,
  shiftMonth,
} from "./months";

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

describe("isMonthKey", () => {
  test("accepts well-formed YYYY-MM keys", () => {
    expect(isMonthKey("2026-07")).toBe(true);
    expect(isMonthKey("2026-01")).toBe(true);
    expect(isMonthKey("2026-12")).toBe(true);
  });

  test("rejects malformed or out-of-range values", () => {
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-00")).toBe(false);
    expect(isMonthKey("2026-7")).toBe(false);
    expect(isMonthKey("2026/07")).toBe(false);
    expect(isMonthKey("")).toBe(false);
    expect(isMonthKey("2026-07-01")).toBe(false);
  });
});

describe("shiftMonth", () => {
  test("moves forward and backward within a year", () => {
    expect(shiftMonth("2026-07", 1)).toBe("2026-08");
    expect(shiftMonth("2026-07", -1)).toBe("2026-06");
    expect(shiftMonth("2026-07", 0)).toBe("2026-07");
  });

  test("crosses year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-02", -4)).toBe("2025-10");
  });
});

describe("daysInMonth", () => {
  test("returns the number of days in the month", () => {
    expect(daysInMonth("2026-07")).toBe(31);
    expect(daysInMonth("2026-06")).toBe(30);
    expect(daysInMonth("2026-02")).toBe(28);
  });

  test("accounts for leap years", () => {
    expect(daysInMonth("2028-02")).toBe(29);
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
