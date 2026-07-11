import { monthLabel } from "@/lib/months";
import type { Category, MonthStat } from "@/lib/stats";

const CATEGORY_FILLS: Record<Category, string> = {
  needs: "fill-pine",
  wants: "fill-moss",
  savings: "fill-phosphor",
};

const CATEGORY_SWATCHES: Record<Category, string> = {
  needs: "bg-pine",
  wants: "bg-moss",
  savings: "bg-phosphor",
};

const CATEGORY_LABELS: Record<Category, string> = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
};

const ORDER: Category[] = ["needs", "wants", "savings"];

function shortMoney(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `$${Math.round(dollars)}`;
}

export function SpendVsBudgetChart({ months }: { months: MonthStat[] }) {
  const W = 640;
  const H = 240;
  const padTop = 24;
  const padBottom = 26;
  const chartH = H - padTop - padBottom;
  const slot = W / months.length;

  const max = Math.max(...months.map((m) => Math.max(m.totalCents, m.budgetCents)), 1);
  const y = (cents: number) => padTop + chartH - (cents / max) * chartH;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Total spend per month against budget"
      className="w-full"
    >
      {months.map((m, i) => {
        const over = m.budgetCents > 0 && m.totalCents > m.budgetCents;
        const barW = slot * 0.5;
        const x = i * slot + (slot - barW) / 2;
        return (
          <g key={m.month}>
            {m.totalCents > 0 ? (
              <>
                <rect
                  x={x}
                  y={y(m.totalCents)}
                  width={barW}
                  height={padTop + chartH - y(m.totalCents)}
                  className={over ? "fill-alarm" : "fill-phosphor"}
                />
                <text
                  x={i * slot + slot / 2}
                  y={y(m.totalCents) - 6}
                  textAnchor="middle"
                  fontSize={10}
                  className={`font-mono ${over ? "fill-alarm" : "fill-paper"}`}
                >
                  {shortMoney(m.totalCents)}
                </text>
              </>
            ) : null}
            {m.budgetCents > 0 ? (
              <rect
                x={i * slot + slot * 0.15}
                y={y(m.budgetCents) - 1}
                width={slot * 0.7}
                height={2}
                className="fill-paper"
              />
            ) : null}
            <text
              x={i * slot + slot / 2}
              y={H - 8}
              textAnchor="middle"
              fontSize={10}
              letterSpacing={2}
              className="fill-fog font-mono uppercase"
            >
              {monthLabel(m.month, "short")}
            </text>
          </g>
        );
      })}
      <rect x={0} y={padTop + chartH} width={W} height={1} className="fill-line" />
    </svg>
  );
}

export function CategoryMixChart({
  months,
  avgSplit,
}: {
  months: MonthStat[];
  avgSplit: Record<Category, number> | null;
}) {
  const W = 640;
  const H = 200;
  const padTop = 8;
  const padBottom = 26;
  const chartH = H - padTop - padBottom;
  const slot = W / months.length;

  return (
    <div>
      <div className="flex gap-5">
        {ORDER.map((category) => (
          <span
            key={category}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-fog"
          >
            <span aria-hidden className={`h-2.5 w-2.5 ${CATEGORY_SWATCHES[category]}`} />
            {CATEGORY_LABELS[category]}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Share of spending by category per month"
        className="mt-4 w-full"
      >
        {months.map((m, i) => {
          const barW = slot * 0.5;
          const x = i * slot + (slot - barW) / 2;

          let cursor = padTop + chartH;
          const segments = m.totalCents
            ? ORDER.map((category) => {
                const h = (m.byCategory[category] / m.totalCents) * chartH;
                cursor -= h;
                return { category, y: cursor, h };
              })
            : [];

          return (
            <g key={m.month}>
              {m.totalCents === 0 ? (
                <rect
                  x={x}
                  y={padTop}
                  width={barW}
                  height={chartH}
                  fill="none"
                  strokeWidth={1}
                  className="stroke-line"
                />
              ) : (
                segments.map((s) => (
                  <rect
                    key={s.category}
                    x={x}
                    y={s.y}
                    width={barW}
                    height={s.h}
                    className={CATEGORY_FILLS[s.category]}
                  />
                ))
              )}
              <text
                x={i * slot + slot / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize={10}
                letterSpacing={2}
                className="fill-fog font-mono uppercase"
              >
                {monthLabel(m.month, "short")}
              </text>
            </g>
          );
        })}
      </svg>

      {avgSplit ? (
        <div className="mt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-fog">
            6-month average split
          </p>
          <div className="mt-2 flex h-6 border border-line">
            {ORDER.map((category) => (
              <div
                key={category}
                className={CATEGORY_SWATCHES[category]}
                style={{ width: `${avgSplit[category] * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex gap-5 font-mono text-[10px] uppercase tracking-widest text-fog">
            {ORDER.map((category) => (
              <span key={category}>
                {CATEGORY_LABELS[category]} {Math.round(avgSplit[category] * 100)}%
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
