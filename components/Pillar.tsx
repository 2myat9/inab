"use client";

import { useActionState, useState } from "react";
import { addEntry, deleteEntry, type ActionResult } from "@/app/actions";
import { formatMoney } from "@/lib/money";
import type { Category } from "@/lib/stats";

export type PillarEntry = {
  id: number;
  amountCents: number;
  note: string | null;
  day: number;
};

type Props = {
  category: Category;
  title: string;
  subtotalCents: number;
  entries: PillarEntry[];
};

export function Pillar({ category, title, subtotalCents, entries }: Props) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await addEntry(prev, formData);
      if (result.ok) setAdding(false);
      return result;
    },
    null,
  );

  return (
    <section aria-label={title} className="flex min-h-64 flex-col border border-line -mt-px -ml-px">
      <header className="flex items-baseline justify-between border-b border-line px-4 py-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-paper">{title}</h2>
        <p className="font-mono text-sm tabular-nums text-phosphor">
          {formatMoney(subtotalCents)}
        </p>
      </header>

      {adding ? (
        <form action={action} className="border-b border-line p-4">
          <input type="hidden" name="category" value={category} />
          <div className="flex gap-2">
            <label htmlFor={`${category}-amount`} className="sr-only">
              Amount in dollars
            </label>
            <input
              id={`${category}-amount`}
              name="amount"
              autoFocus
              placeholder="0.00"
              inputMode="decimal"
              className="w-24 border border-phosphor bg-ink px-2 py-1.5 font-mono text-sm tabular-nums text-paper placeholder:text-fog"
            />
            <label htmlFor={`${category}-note`} className="sr-only">
              Note (optional)
            </label>
            <input
              id={`${category}-note`}
              name="note"
              placeholder="Note (optional)"
              className="min-w-0 flex-1 border border-line bg-ink px-2 py-1.5 text-sm text-paper placeholder:text-fog"
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-phosphor px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-black disabled:opacity-50"
            >
              {pending ? "Adding" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-fog hover:text-paper"
            >
              Cancel
            </button>
            {state?.error ? (
              <p className="font-mono text-xs text-alarm">{state.error}</p>
            ) : null}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="border-b border-line px-4 py-2.5 text-left font-mono text-xs uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor hover:text-black"
        >
          + Add entry
        </button>
      )}

      <ul className="flex-1">
        {entries.length === 0 ? (
          <li className="px-4 py-6 font-mono text-xs text-fog">
            No entries yet this month.
          </li>
        ) : (
          entries.map((entry) => (
            <li
              key={entry.id}
              className="group flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
            >
              <span className="w-6 shrink-0 font-mono text-[10px] tabular-nums text-fog">
                {String(entry.day).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-paper">
                {entry.note || <span className="text-fog">—</span>}
              </span>
              <span className="font-mono text-sm tabular-nums text-paper">
                {formatMoney(entry.amountCents)}
              </span>
              <form action={deleteEntry}>
                <input type="hidden" name="id" value={entry.id} />
                <button
                  type="submit"
                  aria-label={`Delete ${formatMoney(entry.amountCents)} entry`}
                  className="px-1 font-mono text-sm text-fog opacity-0 transition-opacity hover:text-alarm focus-visible:opacity-100 group-hover:opacity-100"
                >
                  ×
                </button>
              </form>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
