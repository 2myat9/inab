import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { budgets, entries } from "@/db/schema";
import { effectiveBudget, monthKey, monthLabel } from "@/lib/months";
import type { Category } from "@/lib/stats";
import { BudgetHeader } from "@/components/BudgetHeader";
import { PaceStrip } from "@/components/PaceStrip";
import { Pillar, type PillarEntry } from "@/components/Pillar";

const PILLARS: { category: Category; title: string }[] = [
  { category: "needs", title: "Needs" },
  { category: "wants", title: "Wants" },
  { category: "savings", title: "Savings" },
];

export default async function BudgetPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;

  const now = new Date();
  const month = monthKey(now);
  const db = getDb();

  const [budgetRows, monthEntries] = await Promise.all([
    db.select().from(budgets).where(eq(budgets.userId, userId)),
    db
      .select()
      .from(entries)
      .where(and(eq(entries.userId, userId), eq(entries.month, month)))
      .orderBy(desc(entries.createdAt)),
  ]);

  const budgetCents = effectiveBudget(budgetRows, month);
  const hasBudget = budgetRows.some((row) => row.month <= month);

  const byCategory: Record<Category, number> = { needs: 0, wants: 0, savings: 0 };
  const byPillar: Record<Category, PillarEntry[]> = { needs: [], wants: [], savings: [] };
  for (const entry of monthEntries) {
    byCategory[entry.category] += entry.amountCents;
    byPillar[entry.category].push({
      id: entry.id,
      amountCents: entry.amountCents,
      note: entry.note,
      day: entry.createdAt.getDate(),
    });
  }
  const spentCents = byCategory.needs + byCategory.wants + byCategory.savings;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  return (
    <main className="flex-1">
      <BudgetHeader
        monthTitle={monthLabel(month)}
        dayLine={`Day ${now.getDate()} of ${daysInMonth}`}
        remainingCents={budgetCents - spentCents}
        budgetCents={budgetCents}
        hasBudget={hasBudget}
      />
      <PaceStrip
        byCategory={byCategory}
        spentCents={spentCents}
        budgetCents={budgetCents}
        dayOfMonth={now.getDate()}
        daysInMonth={daysInMonth}
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {PILLARS.map(({ category, title }) => (
            <Pillar
              key={category}
              category={category}
              title={title}
              subtotalCents={byCategory[category]}
              entries={byPillar[category]}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
