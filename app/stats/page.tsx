import { redirect } from "next/navigation";
import { and, eq, gte } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { budgets, entries } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { lastNMonths, monthKey, monthLabel } from "@/lib/months";
import { computeStats } from "@/lib/stats";
import { CategoryMixChart, SpendVsBudgetChart } from "@/components/charts";

function StatCard({
  label,
  value,
  sub,
  tone = "paper",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "paper" | "phosphor" | "alarm";
}) {
  const tones = {
    paper: "text-paper",
    phosphor: "text-phosphor",
    alarm: "text-alarm",
  } as const;

  return (
    <div className="border border-line p-4 -mt-px -ml-px">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-medium tabular-nums ${tones[tone]}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 font-mono text-xs text-fog">{sub}</p> : null}
    </div>
  );
}

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;

  const currentMonth = monthKey(new Date());
  const window = lastNMonths(currentMonth, 6);
  const db = getDb();

  const [budgetRows, windowEntries] = await Promise.all([
    db.select().from(budgets).where(eq(budgets.userId, userId)),
    db
      .select()
      .from(entries)
      .where(and(eq(entries.userId, userId), gte(entries.month, window[0]))),
  ]);

  const stats = computeStats(window, windowEntries, budgetRows);
  const overAverage = stats.avgBudgetUsedPct !== null && stats.avgBudgetUsedPct > 100;

  return (
    <main className="flex-1">
      <section className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between px-4 py-8">
          <h1 className="font-mono text-xs uppercase tracking-[0.3em] text-fog">
            Stats — last 6 months
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest text-fog">
            {monthLabel(window[0])} — {monthLabel(currentMonth)}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4">
          <StatCard
            label="Avg monthly spend"
            value={stats.avgSpendCents === null ? "—" : formatMoney(stats.avgSpendCents)}
            sub="Months with entries"
          />
          <StatCard
            label="Avg budget used"
            value={stats.avgBudgetUsedPct === null ? "—" : `${stats.avgBudgetUsedPct}%`}
            sub={overAverage ? "Running over budget" : "Of each month's budget"}
            tone={overAverage ? "alarm" : "paper"}
          />
          <StatCard
            label="Saved · 6 mo"
            value={formatMoney(stats.totalSavedCents)}
            sub="Savings pillar"
            tone="phosphor"
          />
          <StatCard
            label="Peak month"
            value={stats.highestSpend === null ? "—" : formatMoney(stats.highestSpend.totalCents)}
            sub={stats.highestSpend === null ? "No spending yet" : monthLabel(stats.highestSpend.month)}
          />
        </div>

        <section className="mt-10">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-fog">
            Spend vs budget
          </h2>
          <p className="mt-1 text-sm text-fog">
            Bars are total spend; the white mark is that month&apos;s budget.
          </p>
          <div className="mt-4 border border-line p-4">
            <SpendVsBudgetChart months={stats.months} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-fog">
            Category mix
          </h2>
          <p className="mt-1 text-sm text-fog">
            Where each month went, as a share of that month&apos;s spending.
          </p>
          <div className="mt-4 border border-line p-4">
            <CategoryMixChart months={stats.months} avgSplit={stats.avgSplit} />
          </div>
        </section>
      </div>
    </main>
  );
}
