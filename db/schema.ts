import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const categoryEnum = pgEnum("category", ["needs", "fun", "savings"]);

export const budgets = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    month: text("month").notNull(),
    amountCents: integer("amount_cents").notNull(),
  },
  (table) => [uniqueIndex("budgets_user_month_idx").on(table.userId, table.month)],
);

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  month: text("month").notNull(),
  category: categoryEnum("category").notNull(),
  amountCents: integer("amount_cents").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
