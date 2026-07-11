"use client";

import { useActionState, useState } from "react";
import { setBudget, type ActionResult } from "@/app/actions";
import { formatMoney } from "@/lib/money";

type Props = {
  monthTitle: string;
  dayLine: string;
  remainingCents: number;
  budgetCents: number;
  hasBudget: boolean;
};

export function BudgetHeader({
  monthTitle,
  dayLine,
  remainingCents,
  budgetCents,
  hasBudget,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await setBudget(prev, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    null,
  );

  const over = remainingCents < 0;

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-baseline justify-between">
          <h1 className="font-mono text-xs uppercase tracking-[0.3em] text-fog">
            {monthTitle}
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest text-fog">{dayLine}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
          <p
            className={`font-mono text-6xl font-semibold tabular-nums sm:text-7xl ${
              over ? "text-alarm" : "text-phosphor"
            }`}
          >
            {formatMoney(remainingCents)}
          </p>
          <div className="pb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-fog">
              {over ? "Over budget" : "Remaining"}
            </p>

            {editing ? (
              <form action={action} className="mt-1 flex items-center gap-2">
                <label htmlFor="budget-amount" className="sr-only">
                  Monthly budget in dollars
                </label>
                <span className="font-mono text-sm text-fog">$</span>
                <input
                  id="budget-amount"
                  name="amount"
                  autoFocus
                  defaultValue={(budgetCents / 100).toFixed(2)}
                  inputMode="decimal"
                  className="w-28 border border-phosphor bg-ink px-2 py-1 font-mono text-sm tabular-nums text-paper"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-phosphor px-3 py-1 font-mono text-xs uppercase tracking-widest text-black disabled:opacity-50"
                >
                  {pending ? "Saving" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="border border-line px-3 py-1 font-mono text-xs uppercase tracking-widest text-fog hover:text-paper"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-1 border-b border-line font-mono text-sm tabular-nums text-paper transition-colors hover:border-phosphor hover:text-phosphor"
              >
                {hasBudget
                  ? `of ${formatMoney(budgetCents)} budget — edit`
                  : "Set a budget for this month"}
              </button>
            )}
            {editing && state?.error ? (
              <p className="mt-1 font-mono text-xs text-alarm">{state.error}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
