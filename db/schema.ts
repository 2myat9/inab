import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// "savings" was retired from the app. The live Postgres enum still carries the
// value (no rows use it); we deliberately don't `db:push` to drop it, since
// removing an enum value means recreating the type on the live database.
export const categoryEnum = pgEnum("category", ["needs", "wants"]);

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
