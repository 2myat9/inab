import { effectiveBudget, type BudgetRow } from "./months";

export type Category = "needs" | "wants";

export type EntryRow = {
  month: string;
  category: Category;
  amountCents: number;
};

export type MonthStat = {
  month: string;
  totalCents: number;
  byCategory: Record<Category, number>;
  budgetCents: number;
};

export type Stats = {
  months: MonthStat[];
  avgSpendCents: number | null;
  avgBudgetUsedPct: number | null;
  highestSpend: { month: string; totalCents: number } | null;
  avgSplit: Record<Category, number> | null;
};

export function computeStats(
  window: string[],
  entries: EntryRow[],
  budgets: BudgetRow[],
): Stats {
  const months: MonthStat[] = window.map((month) => {
    const byCategory: Record<Category, number> = { needs: 0, wants: 0 };
    for (const entry of entries) {
      if (entry.month === month) byCategory[entry.category] += entry.amountCents;
    }
    const totalCents = byCategory.needs + byCategory.wants;
    return { month, totalCents, budgetCents: effectiveBudget(budgets, month), byCategory };
  });

  const active = months.filter((m) => m.totalCents > 0);

  const avgSpendCents = active.length
    ? Math.round(active.reduce((sum, m) => sum + m.totalCents, 0) / active.length)
    : null;

  const budgeted = active.filter((m) => m.budgetCents > 0);
  const avgBudgetUsedPct = budgeted.length
    ? Math.round(
        budgeted.reduce((sum, m) => sum + (m.totalCents / m.budgetCents) * 100, 0) /
          budgeted.length,
      )
    : null;

  const highest = active.reduce<MonthStat | null>(
    (best, m) => (!best || m.totalCents > best.totalCents ? m : best),
    null,
  );

  const grandTotal = months.reduce((sum, m) => sum + m.totalCents, 0);
  const avgSplit = grandTotal
    ? {
        needs: months.reduce((s, m) => s + m.byCategory.needs, 0) / grandTotal,
        wants: months.reduce((s, m) => s + m.byCategory.wants, 0) / grandTotal,
      }
    : null;

  return {
    months,
    avgSpendCents,
    avgBudgetUsedPct,
    highestSpend: highest ? { month: highest.month, totalCents: highest.totalCents } : null,
    avgSplit,
  };
}
