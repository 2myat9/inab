// One-time migration: re-key data written under Auth.js's per-sign-in random
// UUIDs to the stable Google account id now used as token.sub.
//
// Usage: node scripts/migrate-user-id.mjs <stable-google-sub>
// (Get the id from http://localhost:3000/api/auth/session after signing in
// with the fixed auth config.)
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

// Local identity that owns the real data (16 entries + budget).
const OLD_ID = "89386ee9-c3a0-4f8e-8f2a-5eab6f7e0898";
// Orphan identity minted by the first prod sign-in; owns one duplicate
// budget row (2026-07, $1000) and nothing else.
const ORPHAN_ID = "d8a74d32-5730-4aa7-bd0f-cebc0c09b07d";

const newId = process.argv[2];
if (!newId || newId === OLD_ID || newId === ORPHAN_ID) {
  console.error("Usage: node scripts/migrate-user-id.mjs <stable-google-sub>");
  process.exit(1);
}
if (!/^\d{10,30}$/.test(newId)) {
  console.error(
    `"${newId}" does not look like a Google account id (long digit string). Refusing.`,
  );
  process.exit(1);
}

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const before = await sql`
  select 'entries' as tbl, user_id, count(*)::int as rows from entries group by user_id
  union all
  select 'budgets', user_id, count(*)::int from budgets group by user_id
`;
console.log("Before:", before);

// Drop the orphan's budget rows (duplicates of months the real data already
// covers, or empty months) so re-keying cannot hit the unique index.
const orphaned = await sql`delete from budgets where user_id = ${ORPHAN_ID} returning month`;
console.log(`Deleted ${orphaned.length} orphan budget row(s).`);

// Re-key budgets, skipping months already present under the new id (possible
// if the app was used after the fix but before this migration ran).
const movedBudgets = await sql`
  update budgets b set user_id = ${newId}
  where b.user_id = ${OLD_ID}
    and not exists (
      select 1 from budgets x where x.user_id = ${newId} and x.month = b.month
    )
  returning b.month
`;
const staleBudgets = await sql`delete from budgets where user_id = ${OLD_ID} returning month`;
console.log(
  `Re-keyed ${movedBudgets.length} budget row(s); dropped ${staleBudgets.length} superseded by post-fix data.`,
);

const movedEntries = await sql`
  update entries set user_id = ${newId}
  where user_id in (${OLD_ID}, ${ORPHAN_ID})
  returning id
`;
console.log(`Re-keyed ${movedEntries.length} entry row(s).`);

const after = await sql`
  select 'entries' as tbl, user_id, count(*)::int as rows from entries group by user_id
  union all
  select 'budgets', user_id, count(*)::int from budgets group by user_id
`;
console.log("After:", after);
