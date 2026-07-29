import { formatMoney } from "@/lib/money";
import type { Category } from "@/lib/stats";

type Props = {
  byCategory: Record<Category, number>;
  spentCents: number;
  budgetCents: number;
  dayOfMonth: number;
  daysInMonth: number;
  isCurrentMonth: boolean;
  activeCategory?: Category | null;
};

const SEGMENT_COLORS: Record<Category, string> = {
  needs: "bg-pine",
  wants: "bg-moss",
};

const SEGMENT_LABELS: Record<Category, string> = {
  needs: "Needs",
  wants: "Wants",
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
  isCurrentMonth,
  activeCategory = null,
}: Props) {
  if (budgetCents <= 0) return null;

  // The bar geometry always describes the whole month, so filtering doesn't
  // move the budget line or the day marker under you.
  const scale = Math.max(spentCents, budgetCents);
  const monthPct = dayOfMonth / daysInMonth;
  const over = spentCents > budgetCents;

  // The readout follows the filter: with one category selected it reports that
  // category's spend against the month's budget.
  const shownCents = activeCategory ? byCategory[activeCategory] : spentCents;
  const shownPct = shownCents / budgetCents;
  const shownOver = shownCents > budgetCents;

  return (
    <section aria-label="Spending pace" className="border-b border-line">
      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="relative h-6 border border-line">
          <div className="flex h-full">
            {(Object.keys(SEGMENT_COLORS) as Category[]).map((category) => (
              <div
                key={category}
                className={`${SEGMENT_COLORS[category]} ${
                  activeCategory && category !== activeCategory ? "opacity-30" : ""
                }`}
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
          {isCurrentMonth ? (
            <div
              className="absolute -top-1 h-8 w-0.5 bg-paper"
              style={{ left: `${monthPct * (budgetCents / scale) * 100}%` }}
              title={`Day ${dayOfMonth} of ${daysInMonth}`}
            />
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-widest">
          <span className={shownOver ? "text-alarm" : "text-fog"}>
            {activeCategory ? `${SEGMENT_LABELS[activeCategory]} spent` : "Spent"}{" "}
            {formatMoney(shownCents)} · {Math.round(shownPct * 100)}% of budget
          </span>
          {isCurrentMonth ? (
            <span className="text-fog">
              Day {dayOfMonth}/{daysInMonth} · {Math.round(monthPct * 100)}% of month
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
