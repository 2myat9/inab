export type BudgetRow = { month: string; amountCents: number };

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  return monthKey(new Date(year, month - 1 + delta, 1));
}

export function daysInMonth(key: string): number {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export function monthLabel(key: string, style: "long" | "short" = "long"): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  if (style === "short") {
    return date.toLocaleString("en-US", { month: "short" });
  }
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function lastNMonths(endKey: string, n: number): string[] {
  const [year, month] = endKey.split("-").map(Number);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(year, month - 1 - i, 1)));
  }
  return keys;
}

export function effectiveBudget(rows: BudgetRow[], month: string): number {
  let best: BudgetRow | null = null;
  for (const row of rows) {
    if (row.month > month) continue;
    if (!best || row.month > best.month) best = row;
  }
  return best?.amountCents ?? 0;
}
