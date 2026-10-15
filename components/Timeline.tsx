import { deleteEntry } from "@/app/actions";
import { EditEntryButton, type EditableEntry } from "@/components/EntryForm";
import { formatMoney } from "@/lib/money";
import type { Category } from "@/lib/stats";

export type TimelineEntry = EditableEntry;

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

// Row actions stay visible on touch screens, which have no hover to reveal
// them; pointer devices show them on row hover or keyboard focus.
const ROW_ACTION =
  "flex h-8 w-8 items-center justify-center text-fog transition-opacity focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0";

function PencilIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M11 2.5 13.5 5 5.5 13H3v-2.5z" />
      <path d="m9.5 4 2.5 2.5" />
    </svg>
  );
}

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
                className="group flex items-center gap-3 border-b border-line py-1.5 pr-2 pl-4"
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
                <div className="-ml-1 flex items-center">
                  <EditEntryButton
                    entry={entry}
                    aria-label={`Edit ${formatMoney(entry.amountCents)} entry`}
                    className={`${ROW_ACTION} hover:text-phosphor`}
                  >
                    <PencilIcon />
                  </EditEntryButton>
                  <form action={deleteEntry}>
                    <input type="hidden" name="id" value={entry.id} />
                    <button
                      type="submit"
                      aria-label={`Delete ${formatMoney(entry.amountCents)} entry`}
                      className={`${ROW_ACTION} font-mono text-sm hover:text-alarm`}
                    >
                      ×
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
