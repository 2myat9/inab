"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { budgets, entries } from "@/db/schema";
import { parseMoney } from "@/lib/money";
import { daysInMonth, isMonthKey, monthKey } from "@/lib/months";

export type ActionResult = { ok: boolean; error?: string };

const categorySchema = z.enum(["needs", "wants"]);
const noteSchema = z.string().trim().max(200);

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

// The month a write targets comes from the form (the month being viewed), but
// is never trusted: fall back to the current month unless it is a valid key
// that isn't in the future.
function resolveMonth(raw: unknown, currentMonth: string): string {
  return typeof raw === "string" && isMonthKey(raw) && raw <= currentMonth
    ? raw
    : currentMonth;
}

// Pick the timestamp an entry is filed under. A date within the target month
// (from the add form) sets the day the timeline groups it under; today keeps
// the real time so same-day entries stay ordered; anything else lands at noon.
function entryTimestamp(month: string, raw: unknown, now: Date): Date {
  const currentMonth = monthKey(now);
  if (
    typeof raw === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(raw) &&
    raw.startsWith(`${month}-`)
  ) {
    const [year, m, day] = raw.split("-").map(Number);
    if (day >= 1 && day <= daysInMonth(month)) {
      const today = `${currentMonth}-${String(now.getDate()).padStart(2, "0")}`;
      if (raw === today) return now;
      return new Date(year, m - 1, day, 12, 0, 0);
    }
  }
  if (month === currentMonth) return now;
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1, 12, 0, 0);
}

function dateKey(date: Date): string {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

type EntryFields = {
  category: z.infer<typeof categorySchema>;
  amountCents: number;
  note: string | null;
};

function parseEntryFields(
  formData: FormData,
): { ok: true; data: EntryFields } | { ok: false; error: string } {
  const category = categorySchema.safeParse(formData.get("category"));
  if (!category.success) {
    return { ok: false, error: "Unknown category" };
  }

  const amountCents = parseMoney(String(formData.get("amount") ?? ""));
  if (amountCents === null || amountCents === 0) {
    return { ok: false, error: "Enter a valid amount" };
  }

  const note = noteSchema.safeParse(formData.get("note") ?? "");
  if (!note.success) {
    return { ok: false, error: "Note is too long" };
  }

  return {
    ok: true,
    data: { category: category.data, amountCents, note: note.data || null },
  };
}

function revalidateTabs() {
  revalidatePath("/");
  revalidatePath("/stats");
}

export async function setBudget(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const amountCents = parseMoney(String(formData.get("amount") ?? ""));
  if (amountCents === null) {
    return { ok: false, error: "Enter a valid amount" };
  }

  const month = resolveMonth(formData.get("month"), monthKey(new Date()));

  try {
    await getDb()
      .insert(budgets)
      .values({ userId, month, amountCents })
      .onConflictDoUpdate({
        target: [budgets.userId, budgets.month],
        set: { amountCents },
      });
  } catch {
    return { ok: false, error: "Could not save budget" };
  }

  revalidateTabs();
  return { ok: true };
}

export async function addEntry(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const fields = parseEntryFields(formData);
  if (!fields.ok) return { ok: false, error: fields.error };

  const now = new Date();
  const month = resolveMonth(formData.get("month"), monthKey(now));
  const createdAt = entryTimestamp(month, formData.get("date"), now);

  try {
    await getDb()
      .insert(entries)
      .values({ userId, month, ...fields.data, createdAt });
  } catch {
    return { ok: false, error: "Could not add entry" };
  }

  revalidateTabs();
  return { ok: true };
}

export async function updateEntry(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const id = z.coerce.number().int().safeParse(formData.get("id"));
  if (!id.success) {
    return { ok: false, error: "Unknown entry" };
  }

  const fields = parseEntryFields(formData);
  if (!fields.ok) return { ok: false, error: fields.error };

  const db = getDb();
  const where = and(eq(entries.id, id.data), eq(entries.userId, userId));

  try {
    const [existing] = await db
      .select({ month: entries.month, createdAt: entries.createdAt })
      .from(entries)
      .where(where);
    if (!existing) {
      return { ok: false, error: "Entry not found" };
    }

    // An entry stays in its month; the date only moves it between days. Leave
    // the timestamp alone when the day is unchanged so it keeps its place.
    const now = new Date();
    const date = formData.get("date");
    const day = typeof date === "string" ? Number(date.slice(8)) : 0;
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !date.startsWith(`${existing.month}-`) ||
      day < 1 ||
      day > daysInMonth(existing.month) ||
      date > dateKey(now)
    ) {
      return { ok: false, error: "Pick a date in this month" };
    }
    const createdAt =
      date === dateKey(existing.createdAt)
        ? existing.createdAt
        : entryTimestamp(existing.month, date, now);

    await db
      .update(entries)
      .set({ ...fields.data, createdAt })
      .where(where);
  } catch {
    return { ok: false, error: "Could not save entry" };
  }

  revalidateTabs();
  return { ok: true };
}

export async function deleteEntry(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const id = z.coerce.number().int().safeParse(formData.get("id"));
  if (!id.success) return;

  await getDb()
    .delete(entries)
    .where(and(eq(entries.id, id.data), eq(entries.userId, userId)));

  revalidateTabs();
}
