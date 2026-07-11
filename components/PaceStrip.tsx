import { formatMoney } from "@/lib/money";
import type { Category } from "@/lib/stats";

type Props = {
  byCategory: Record<Category, number>;
  spentCents: number;
  budgetCents: number;
  dayOfMonth: number;
  daysInMonth: number;
};

const SEGMENT_COLORS: Record<Category, string> = {
  needs: "bg-pine",
  fun: "bg-moss",
  savings: "bg-phosphor",
};

// Spend vs. time: category segments fill toward the budget line while a
// marker shows how far through the month you are. Ahead of the marker means
// spending faster than the month is passing.
export function PaceStrip({
  byCategory,
  spentCents,
  budgetCents,
  dayOfMonth,
  daysInMonth,
}: Props) {
  if (budgetCents <= 0) return null;

  const scale = Math.max(spentCents, budgetCents);
  const monthPct = dayOfMonth / daysInMonth;
  const spentPct = spentCents / budgetCents;
  const over = spentCents > budgetCents;

  return (
    <section aria-label="Spending pace" className="border-b border-line">
      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="relative h-6 border border-line">
          <div className="flex h-full">
            {(Object.keys(SEGMENT_COLORS) as Category[]).map((category) => (
              <div
                key={category}
                className={SEGMENT_COLORS[category]}
                style={{ width: `${(byCategory[category] / scale) * 100}%` }}
              />
            ))}
          </div>
          {over ? (
            <div
              className="absolute top-0 h-full w-px bg-paper"
              style={{ left: `${(budgetCents / scale) * 100}%` }}
              title="Budget"
            />
          ) : null}
          <div
            className="absolute -top-1 h-8 w-0.5 bg-paper"
            style={{ left: `${monthPct * (budgetCents / scale) * 100}%` }}
            title={`Day ${dayOfMonth} of ${daysInMonth}`}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest">
          <span className={over ? "text-alarm" : "text-fog"}>
            Spent {formatMoney(spentCents)} · {Math.round(spentPct * 100)}% of budget
          </span>
          <span className="text-fog">
            Day {dayOfMonth}/{daysInMonth} · {Math.round(monthPct * 100)}% of month
          </span>
        </div>
      </div>
    </section>
  );
}
