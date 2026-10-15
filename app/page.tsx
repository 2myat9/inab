import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { budgets, entries } from "@/db/schema";
import {
  daysInMonth,
  effectiveBudget,
  isMonthKey,
  monthKey,
  monthLabel,
  shiftMonth,
} from "@/lib/months";
import type { Category } from "@/lib/stats";
import { BudgetHeader } from "@/components/BudgetHeader";
import { PaceStrip } from "@/components/PaceStrip";
import { EntryForm } from "@/components/EntryForm";
import { CategoryFilter } from "@/components/CategoryFilter";
import { Timeline, type DayGroup } from "@/components/Timeline";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;

  const now = new Date();
  const currentMonth = monthKey(now);

  const params = await searchParams;

  // The viewed month comes from the URL; clamp to a valid key no later than the
  // current month (no navigating into the future).
  const requested = params.m;
  const month =
    typeof requested === "string" && isMonthKey(requested) && requested <= currentMonth
      ? requested
      : currentMonth;
  const isCurrentMonth = month === currentMonth;
  const dim = daysInMonth(month);

  // Optional category filter; anything unrecognized means "All".
  const activeCategory: Category | null =
    params.cat === "needs" || params.cat === "wants" ? params.cat : null;

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

  // Totals span the whole month across both categories so the header stays
  // honest about what's left; the filter narrows the timeline and the pace
  // strip's readout.
  const byCategory: Record<Category, number> = { needs: 0, wants: 0 };
  const shortMonth = monthLabel(month, "short").toUpperCase();
  const groupsByDay = new Map<number, DayGroup>();
  for (const entry of monthEntries) {
    byCategory[entry.category] += entry.amountCents;
    if (activeCategory && entry.category !== activeCategory) continue;
    const day = entry.createdAt.getDate();
    let group = groupsByDay.get(day);
    if (!group) {
      group = {
        day,
        label: `${shortMonth} ${String(day).padStart(2, "0")}`,
        entries: [],
      };
      groupsByDay.set(day, group);
    }
    group.entries.push({
      id: entry.id,
      category: entry.category,
      amountCents: entry.amountCents,
      note: entry.note,
      date: `${month}-${String(day).padStart(2, "0")}`,
    });
  }
  // monthEntries is newest-first, so the map is already ordered newest day first.
  const groups = [...groupsByDay.values()];
  const spentCents = byCategory.needs + byCategory.wants;

  const today = `${currentMonth}-${String(now.getDate()).padStart(2, "0")}`;
  const minDate = `${month}-01`;
  // On the live month you can't file an entry in the future; past months are
  // open through their last day.
  const maxDate = isCurrentMonth ? today : `${month}-${String(dim).padStart(2, "0")}`;
  const defaultDate = isCurrentMonth ? today : minDate;

  return (
    <main className="flex-1">
      <BudgetHeader
        month={month}
        label={monthLabel(month)}
        prevMonth={shiftMonth(month, -1)}
        nextMonth={isCurrentMonth ? null : shiftMonth(month, 1)}
        category={activeCategory ?? undefined}
        dayLine={isCurrentMonth ? `Day ${now.getDate()} of ${dim}` : undefined}
        remainingCents={budgetCents - spentCents}
        budgetCents={budgetCents}
        hasBudget={hasBudget}
      />
      <PaceStrip
        byCategory={byCategory}
        spentCents={spentCents}
        budgetCents={budgetCents}
        dayOfMonth={isCurrentMonth ? now.getDate() : dim}
        daysInMonth={dim}
        isCurrentMonth={isCurrentMonth}
        activeCategory={activeCategory}
      />
      {/* Extra bottom room on mobile so the pinned add button never hides the last entry. */}
      <div className="mx-auto max-w-5xl px-4 pt-8 pb-32 md:pb-8">
        <div className="mb-4">
          <CategoryFilter month={month} active={activeCategory} />
        </div>
        {/* The timeline sits inside the form so its rows can open it to edit. */}
        <EntryForm
          month={month}
          filterCategory={activeCategory}
          defaultDate={defaultDate}
          minDate={minDate}
          maxDate={maxDate}
          today={today}
          remainingCents={hasBudget ? budgetCents - spentCents : null}
        >
          <Timeline
            groups={groups}
            emptyMessage={
              activeCategory
                ? `No ${activeCategory} entries this month.`
                : "No entries this month."
            }
          />
        </EntryForm>
      </div>
    </main>
  );
}
