"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { budgets, entries } from "@/db/schema";
import { parseMoney } from "@/lib/money";
import { monthKey } from "@/lib/months";

export type ActionResult = { ok: boolean; error?: string };

const categorySchema = z.enum(["needs", "wants", "savings"]);
const noteSchema = z.string().trim().max(200);

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
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

  try {
    await getDb()
      .insert(budgets)
      .values({ userId, month: monthKey(new Date()), amountCents })
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

  try {
    await getDb().insert(entries).values({
      userId,
      month: monthKey(new Date()),
      category: category.data,
      amountCents,
      note: note.data || null,
    });
  } catch {
    return { ok: false, error: "Could not add entry" };
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
