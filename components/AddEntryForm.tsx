"use client";

import { useActionState, useState } from "react";
import { addEntry, type ActionResult } from "@/app/actions";
import type { Category } from "@/lib/stats";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "needs", label: "Needs" },
  { value: "wants", label: "Wants" },
];

type Props = {
  month: string;
  defaultCategory: Category;
  defaultDate: string;
  minDate: string;
  maxDate: string;
};

export function AddEntryForm({
  month,
  defaultCategory,
  defaultDate,
  minDate,
  maxDate,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await addEntry(prev, formData);
      if (result.ok) setAdding(false);
      return result;
    },
    null,
  );

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="w-full border border-line px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor hover:text-black"
      >
        + Add entry
      </button>
    );
  }

  return (
    <form action={action} className="border border-phosphor p-4">
      <input type="hidden" name="month" value={month} />
      <div className="flex flex-wrap gap-2">
        <label htmlFor="entry-category" className="sr-only">
          Category
        </label>
        <select
          id="entry-category"
          name="category"
          defaultValue={defaultCategory}
          className="border border-line bg-ink px-2 py-1.5 font-mono text-xs uppercase tracking-widest text-paper"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <label htmlFor="entry-amount" className="sr-only">
          Amount in dollars
        </label>
        <input
          id="entry-amount"
          name="amount"
          autoFocus
          placeholder="0.00"
          inputMode="decimal"
          className="w-24 border border-phosphor bg-ink px-2 py-1.5 font-mono text-sm tabular-nums text-paper placeholder:text-fog"
        />
        <label htmlFor="entry-date" className="sr-only">
          Date
        </label>
        <input
          id="entry-date"
          type="date"
          name="date"
          defaultValue={defaultDate}
          min={minDate}
          max={maxDate}
          className="border border-line bg-ink px-2 py-1.5 font-mono text-xs tabular-nums text-paper"
        />
        <label htmlFor="entry-note" className="sr-only">
          Note (optional)
        </label>
        <input
          id="entry-note"
          name="note"
          placeholder="Note (optional)"
          className="min-w-[8rem] flex-1 border border-line bg-ink px-2 py-1.5 text-sm text-paper placeholder:text-fog"
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
  );
}
