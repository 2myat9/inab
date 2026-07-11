import { describe, expect, test } from "vitest";
import { computeStats, type EntryRow } from "./stats";
import type { BudgetRow } from "./months";

const WINDOW = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];

const budgets: BudgetRow[] = [{ month: "2026-01", amountCents: 200000 }];

const entries: EntryRow[] = [
  { month: "2026-03", category: "needs", amountCents: 80000 },
  { month: "2026-03", category: "wants", amountCents: 20000 },
  { month: "2026-03", category: "savings", amountCents: 50000 },
  { month: "2026-05", category: "needs", amountCents: 100000 },
  { month: "2026-05", category: "savings", amountCents: 150000 },
  // outside the window — must be ignored
  { month: "2026-01", category: "wants", amountCents: 999999 },
];

describe("computeStats", () => {
  const stats = computeStats(WINDOW, entries, budgets);

  test("returns one row per window month, ascending, zeroed when empty", () => {
    expect(stats.months.map((m) => m.month)).toEqual(WINDOW);
    expect(stats.months[0].totalCents).toBe(0);
    expect(stats.months[0].byCategory).toEqual({ needs: 0, wants: 0, savings: 0 });
  });

  test("totals entries per month and per category", () => {
    const march = stats.months[1];
    expect(march.totalCents).toBe(150000);
    expect(march.byCategory).toEqual({ needs: 80000, wants: 20000, savings: 50000 });
  });

  test("resolves each month's budget with fallback to earlier months", () => {
    expect(stats.months.every((m) => m.budgetCents === 200000)).toBe(true);
  });

  test("averages spend over months that have entries only", () => {
    // (150000 + 250000) / 2
    expect(stats.avgSpendCents).toBe(200000);
  });

  test("averages % of budget used over months with entries", () => {
    // 150000/200000 = 75%, 250000/200000 = 125% -> avg 100
    expect(stats.avgBudgetUsedPct).toBe(100);
  });

  test("sums savings across the window", () => {
    expect(stats.totalSavedCents).toBe(200000);
  });

  test("finds the highest-spend month", () => {
    expect(stats.highestSpend).toEqual({ month: "2026-05", totalCents: 250000 });
  });

  test("computes the average category split as fractions of total spend", () => {
    // needs 180000, wants 20000, savings 200000 of 400000
    expect(stats.avgSplit).toEqual({ needs: 0.45, wants: 0.05, savings: 0.5 });
  });

  test("returns nulls and zeros when the window has no entries", () => {
    const empty = computeStats(WINDOW, [], budgets);
    expect(empty.avgSpendCents).toBeNull();
    expect(empty.avgBudgetUsedPct).toBeNull();
    expect(empty.totalSavedCents).toBe(0);
    expect(empty.highestSpend).toBeNull();
    expect(empty.avgSplit).toBeNull();
  });

  test("skips zero-budget months in the budget-used average", () => {
    const noBudget = computeStats(WINDOW, entries, []);
    expect(noBudget.avgBudgetUsedPct).toBeNull();
  });
});
