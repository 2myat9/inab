"use client";

import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { addEntry, updateEntry } from "@/app/actions";
import { formatMoney } from "@/lib/money";
import type { Category } from "@/lib/stats";

export type EditableEntry = {
  id: number;
  category: Category;
  amountCents: number;
  note: string | null;
  // YYYY-MM-DD, the day the timeline files the entry under.
  date: string;
};

// Lets timeline rows (rendered as children of the form) open it on an entry.
const EditEntryContext = createContext<((entry: EditableEntry) => void) | null>(null);

export function useEditEntry() {
  const edit = use(EditEntryContext);
  if (!edit) throw new Error("useEditEntry must be used inside <EntryForm>");
  return edit;
}

const CATEGORIES: Category[] = ["needs", "wants"];

// Amounts are typed cents-first, like a card terminal: "1", "2", "5" reads
// $1.25. The "00" key appends two zeros; "." on a keyboard maps to it.
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "del"] as const;
type Key = (typeof KEYS)[number];
const MAX_DIGITS = 8;
const HOLD_TO_CLEAR_MS = 500;

type Props = {
  month: string;
  // The active timeline filter, if any; the entry defaults to that category.
  filterCategory: Category | null;
  defaultDate: string;
  minDate: string;
  maxDate: string;
  today: string;
  // What's left of the month's budget before this entry; null without a budget.
  remainingCents: number | null;
  children?: ReactNode;
};

function shiftDate(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(y, m - 1, d + delta);
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, "0"),
    String(next.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === shiftDate(today, -1)) return "Yesterday";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function amountSize(label: string, sizes: [number, number, number, number]): number {
  const len = label.length;
  return len <= 6 ? sizes[0] : len <= 8 ? sizes[1] : len <= 10 ? sizes[2] : sizes[3];
}

export function EntryForm({
  month,
  filterCategory,
  defaultDate,
  minDate,
  maxDate,
  today,
  remainingCents,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  // The entry being edited, or null when adding a new one.
  const [editing, setEditing] = useState<EditableEntry | null>(null);
  const [digits, setDigits] = useState("");
  const [category, setCategory] = useState<Category>(filterCategory ?? "needs");
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sheetCloseRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const cents = digits ? Number(digits) : 0;

  function openEntry() {
    setEditing(null);
    setDigits("");
    setNote("");
    setError(null);
    setDate(defaultDate);
    if (filterCategory) setCategory(filterCategory);
    setOpen(true);
  }

  function openEdit(entry: EditableEntry) {
    setEditing(entry);
    setDigits(String(entry.amountCents));
    setNote(entry.note ?? "");
    setError(null);
    setDate(entry.date);
    setCategory(entry.category);
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  function press(key: Key) {
    setError(null);
    setDigits((d) => {
      if (key === "del") return d.slice(0, -1);
      if (!d && (key === "0" || key === "00")) return d;
      const next = d + key;
      return next.length > MAX_DIGITS ? d : next;
    });
  }

  function stepDate(delta: number) {
    setDate((d) => {
      const next = shiftDate(d, delta);
      return next < minDate || next > maxDate ? d : next;
    });
  }

  function submit() {
    if (!cents || pending) return;
    const formData = new FormData();
    formData.set("month", month);
    formData.set("category", category);
    formData.set("amount", (cents / 100).toFixed(2));
    formData.set("date", date);
    formData.set("note", note);
    if (editing) formData.set("id", String(editing.id));
    startTransition(async () => {
      const result = editing
        ? await updateEntry(null, formData)
        : await addEntry(null, formData);
      if (result.ok) {
        setOpen(false);
        setDigits("");
        setNote("");
      } else {
        setError(result.error ?? (editing ? "Could not save entry" : "Could not add entry"));
      }
    });
  }

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    const editable =
      target?.isContentEditable ||
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.tagName === "SELECT";

    if (editable) {
      // The note field is the only input in the flow: Enter files the entry,
      // Escape hands the keyboard back to the amount.
      if (open && target?.dataset.entryNote !== undefined) {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        } else if (e.key === "Escape") {
          target.blur();
        }
      }
      return;
    }

    if (!open) {
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        openEntry();
      }
      return;
    }

    // preventDefault also stops a focused keypad button from re-firing on Enter.
    if (/^[0-9]$/.test(e.key)) press(e.key as Key);
    else if (e.key === ".") press("00");
    else if (e.key === "Backspace") press("del");
    else if (e.key === "Enter") submit();
    else if (e.key === "Escape") close();
    else return;
    e.preventDefault();
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // On phones the entry takes over the screen: lock the page behind it and
  // move focus into the sheet. On desktop, focus the inline panel so typed
  // digits land without a click.
  useEffect(() => {
    if (!open) return;
    const mobile = window.matchMedia("(max-width: 47.999rem)").matches;
    if (!mobile) {
      // Editing starts from a timeline row that may be well below the panel.
      panelRef.current?.scrollIntoView({ block: "nearest" });
      panelRef.current?.focus({ preventScroll: true });
      return;
    }
    sheetCloseRef.current?.focus({ preventScroll: true });
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const amountText = formatMoney(cents);
  // An edited entry is already counted in remainingCents; swap its old amount
  // for the new one.
  const left =
    remainingCents === null
      ? null
      : remainingCents + (editing?.amountCents ?? 0) - cents;
  const leftText =
    left === null
      ? null
      : left < 0
        ? `${formatMoney(-left)} over${cents ? " after" : ""}`
        : `${formatMoney(left)} left${cents ? " after" : ""}`;

  const shared = {
    date,
    today,
    minDate,
    maxDate,
    category,
    note,
    cents,
    amountText,
    leftText,
    over: left !== null && left < 0,
    pending,
    error,
    editing: editing !== null,
    onStepDate: stepDate,
    onPickDate: (value: string) => {
      if (value >= minDate && value <= maxDate) setDate(value);
    },
    onCategory: setCategory,
    onNote: setNote,
    onPress: press,
    onClear: () => setDigits(""),
    onSubmit: submit,
    onClose: close,
  };

  const title = editing ? "Edit entry" : "Add entry";

  return (
    <EditEntryContext value={openEdit}>
      <div className="mb-4 md:mb-5">
        {/* Desktop: inline trigger, expanding into a two-column panel. */}
        {open ? (
          <div
            ref={panelRef}
            tabIndex={-1}
            role="group"
            aria-label={title}
            className="hidden border border-phosphor outline-none md:grid md:grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))]"
          >
            <div className="flex flex-col gap-6 border-r border-line p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <DateStepper {...shared} className="h-10 border border-line" />
                <CategoryToggle {...shared} className="h-10" />
              </div>
              <div className="flex min-h-40 flex-1 flex-col justify-center">
                <AmountDisplay {...shared} sizes={[96, 84, 72, 60]} />
              </div>
              <NoteInput {...shared} className="h-12 w-full text-[15px]" />
              <div className="flex gap-2.5">
                <SubmitButton {...shared} className="h-14 flex-1" />
                <button
                  type="button"
                  onClick={close}
                  className="h-14 border border-line px-5 font-mono text-xs uppercase tracking-widest text-fog transition-colors hover:border-phosphor hover:text-paper"
                >
                  Cancel
                </button>
              </div>
              <ErrorLine error={error} />
              <p className="font-mono text-[11px] tracking-wide text-fog/70">
                Type digits · ⌫ delete · ↵ {editing ? "save" : "add"} · esc cancel
              </p>
            </div>
            <Keypad {...shared} className="auto-rows-[minmax(5rem,1fr)] text-[34px]" />
          </div>
        ) : (
          <button
            type="button"
            onClick={openEntry}
            className="hidden h-15 w-full items-center gap-3 border border-line px-6 text-left font-mono text-sm uppercase tracking-[0.2em] text-phosphor transition-colors hover:border-phosphor md:flex"
          >
            + Add entry
            <span className="font-mono text-xs normal-case tracking-wide text-fog/70">
              or press N
            </span>
          </button>
        )}

        {/* Mobile: thumb-reach button pinned to the bottom... */}
        <div className="fixed inset-x-0 bottom-0 z-40 bg-linear-to-t from-ink from-70% to-ink/0 px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:hidden">
          <button
            type="button"
            onClick={openEntry}
            className="h-15 w-full bg-phosphor font-mono text-[15px] font-medium uppercase tracking-[0.2em] text-black active:bg-moss"
          >
            + Add entry
          </button>
        </div>

        {/* ...opening a full-screen sheet with its own keypad. */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          inert={!open}
          className={`fixed inset-0 z-50 flex flex-col bg-ink transition-transform duration-[260ms] ease-[cubic-bezier(.2,.8,.2,1)] md:hidden ${
            open ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex h-14 shrink-0 items-stretch border-b border-line">
            <button
              ref={sheetCloseRef}
              type="button"
              onClick={close}
              aria-label="Close"
              className="w-16 border-r border-line text-2xl text-fog"
            >
              ×
            </button>
            <DateStepper {...shared} className="flex-1" wide />
          </div>

          <div className="flex flex-auto flex-col items-center justify-center px-4 py-3">
            <AmountDisplay {...shared} sizes={[76, 64, 52, 44]} centered />
          </div>

          <div className="flex gap-2 px-4 pb-3">
            <CategoryToggle {...shared} className="h-11 shrink-0" />
            <NoteInput {...shared} className="h-11 min-w-0 flex-1 text-sm" />
          </div>

          <Keypad
            {...shared}
            className="min-h-45 flex-[0_1_18.5rem] auto-rows-[minmax(0,1fr)] border-t border-line text-3xl"
          />

          <div className="border-t border-line px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <ErrorLine error={error} className="mb-2" />
            <SubmitButton {...shared} className="h-15 w-full" />
          </div>
        </div>
      </div>
      {children}
    </EditEntryContext>
  );
}

type SharedProps = {
  date: string;
  today: string;
  minDate: string;
  maxDate: string;
  category: Category;
  note: string;
  cents: number;
  amountText: string;
  leftText: string | null;
  over: boolean;
  pending: boolean;
  editing: boolean;
  onStepDate: (delta: number) => void;
  onPickDate: (value: string) => void;
  onCategory: (category: Category) => void;
  onNote: (note: string) => void;
  onPress: (key: Key) => void;
  onClear: () => void;
  onSubmit: () => void;
};

function DateStepper({
  date,
  today,
  minDate,
  maxDate,
  onStepDate,
  onPickDate,
  className = "",
  wide = false,
}: SharedProps & { className?: string; wide?: boolean }) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const atMin = date <= minDate;
  const atMax = date >= maxDate;
  const arrow = `${wide ? "w-14 text-lg" : "w-10"} text-paper/80 disabled:opacity-25`;

  return (
    <div className={`flex items-stretch ${className}`}>
      <button
        type="button"
        onClick={() => onStepDate(-1)}
        disabled={atMin}
        aria-label="Previous day"
        className={arrow}
      >
        ‹
      </button>
      {/* Tapping the label opens the native picker for longer jumps. */}
      <div className="relative flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={() => {
            try {
              pickerRef.current?.showPicker();
            } catch {
              // showPicker is unavailable or blocked; the arrows still work.
            }
          }}
          aria-label={`Date: ${dateLabel(date, today)}. Choose a date`}
          className={`h-full w-full px-2 font-mono uppercase tracking-[0.25em] text-paper ${
            wide ? "text-[13px]" : "min-w-28 text-xs"
          }`}
        >
          {dateLabel(date, today)}
        </button>
        <input
          ref={pickerRef}
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          onChange={(e) => onPickDate(e.target.value)}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </div>
      <button
        type="button"
        onClick={() => onStepDate(1)}
        disabled={atMax}
        aria-label="Next day"
        className={arrow}
      >
        ›
      </button>
    </div>
  );
}

function CategoryToggle({
  category,
  onCategory,
  className = "",
}: SharedProps & { className?: string }) {
  return (
    <div
      role="group"
      aria-label="Category"
      className={`flex items-stretch border border-line ${className}`}
    >
      {CATEGORIES.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={category === c}
          onClick={() => onCategory(c)}
          className={`min-w-19 px-2.5 font-mono text-[11px] uppercase tracking-widest transition-colors md:min-w-22 md:text-xs ${
            category === c ? "bg-phosphor text-black" : "text-fog hover:text-paper"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function AmountDisplay({
  cents,
  amountText,
  leftText,
  over,
  sizes,
  centered = false,
}: SharedProps & { sizes: [number, number, number, number]; centered?: boolean }) {
  return (
    <div className={centered ? "text-center" : ""}>
      <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-fog md:text-[11px]">
        Amount
      </p>
      <p
        aria-live="polite"
        style={{ fontSize: amountSize(amountText, sizes) }}
        className={`mt-2.5 whitespace-nowrap font-mono font-semibold leading-none tracking-tight tabular-nums md:mt-3 ${
          cents ? "text-phosphor" : "text-fog/30"
        }`}
      >
        {amountText}
      </p>
      {leftText ? (
        <p
          className={`mt-3 font-mono text-[11px] uppercase tracking-[0.15em] md:mt-3.5 md:text-xs ${
            over ? "text-alarm" : "text-fog/70"
          }`}
        >
          {leftText}
        </p>
      ) : null}
    </div>
  );
}

function NoteInput({
  note,
  onNote,
  className = "",
}: SharedProps & { className?: string }) {
  return (
    <input
      data-entry-note
      aria-label="Note (optional)"
      value={note}
      onChange={(e) => onNote(e.target.value)}
      placeholder="Note (optional)"
      maxLength={200}
      enterKeyHint="done"
      className={`border border-line bg-transparent px-3 text-paper outline-none placeholder:text-fog/70 focus:border-phosphor ${className}`}
    />
  );
}

function Keypad({
  onPress,
  onClear,
  className = "",
}: SharedProps & { className?: string }) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  function release() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  return (
    <div className={`grid grid-cols-3 gap-px bg-line ${className}`}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={
            key === "del" ? "Delete (hold to clear)" : key === "00" ? "Double zero" : undefined
          }
          onPointerDown={() => {
            if (key !== "del") return;
            held.current = false;
            holdTimer.current = setTimeout(() => {
              held.current = true;
              onClear();
            }, HOLD_TO_CLEAR_MS);
          }}
          onPointerUp={release}
          onPointerLeave={release}
          onClick={() => {
            if (held.current) {
              held.current = false;
              return;
            }
            onPress(key);
          }}
          className="touch-manipulation select-none bg-ink font-mono font-medium text-paper hover:bg-panel active:bg-phosphor active:text-black"
        >
          {key === "del" ? "⌫" : key}
        </button>
      ))}
    </div>
  );
}

function SubmitButton({
  cents,
  category,
  amountText,
  pending,
  editing,
  onSubmit,
  className = "",
}: SharedProps & { className?: string }) {
  const ready = cents > 0;
  const verb = editing ? "Save" : "Add";
  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={!ready || pending}
      className={`font-mono text-sm font-medium uppercase tracking-widest transition-colors ${
        ready ? "bg-phosphor text-black disabled:opacity-60" : "bg-panel text-fog/40"
      } ${className}`}
    >
      {pending
        ? editing
          ? "Saving…"
          : "Adding…"
        : ready
          ? `${verb} ${amountText} → ${category}`
          : "Enter an amount"}
    </button>
  );
}

function ErrorLine({ error, className = "" }: { error: string | null; className?: string }) {
  return error ? (
    <p role="alert" className={`font-mono text-xs text-alarm ${className}`}>
      {error}
    </p>
  ) : null;
}

// A timeline row's edit action; opens the form on that entry.
export function EditEntryButton({
  entry,
  className = "",
  "aria-label": ariaLabel,
  children,
}: {
  entry: EditableEntry;
  className?: string;
  "aria-label": string;
  children: ReactNode;
}) {
  const edit = useEditEntry();
  return (
    <button
      type="button"
      onClick={() => edit(entry)}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  );
}
