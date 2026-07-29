import { deleteEntry } from "@/app/actions";
import { formatMoney } from "@/lib/money";
import type { Category } from "@/lib/stats";

export type TimelineEntry = {
  id: number;
  category: Category;
  amountCents: number;
  note: string | null;
};

export type DayGroup = {
  day: number;
  label: string;
  entries: TimelineEntry[];
};

const DOT: Record<Category, string> = {
  needs: "bg-pine",
  wants: "bg-moss",
};

const LABEL: Record<Category, string> = {
  needs: "Needs",
  wants: "Wants",
};

export function Timeline({
  groups,
  emptyMessage = "No entries this month.",
}: {
  groups: DayGroup[];
  emptyMessage?: string;
}) {
  if (groups.length === 0) {
    return (
      <p className="border border-line px-4 py-12 text-center font-mono text-xs text-fog">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="border-x border-t border-line">
      {groups.map((group) => (
        <section key={group.day} aria-label={group.label}>
          <header className="border-b border-line bg-line/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-fog">
            {group.label}
          </header>
          <ul>
            {group.entries.map((entry) => (
              <li
                key={entry.id}
                className="group flex items-center gap-3 border-b border-line px-4 py-2.5"
              >
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${DOT[entry.category]}`}
                />
                <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-widest text-fog">
                  {LABEL[entry.category]}
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
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
