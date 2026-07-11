# Personal Finance Goal Tracker — Design

**Date:** 2026-07-11
**Status:** Approved

## Purpose

A single-user web app for tracking a monthly budget against three spending
pillars: **Needs**, **Fun**, and **Short-term Savings**. Adding an entry in any
pillar subtracts from the month's remaining budget. A second tab shows stats
and trends over the past 6 months.

## Stack

- **Framework:** Next.js (App Router, TypeScript), deployed on Vercel
- **Styling:** Tailwind CSS
- **Database:** Neon Postgres (Vercel Marketplace integration)
- **ORM:** Drizzle
- **Auth:** Auth.js v5, Google provider, JWT session strategy (no adapter
  tables). An `ALLOWED_EMAILS` env var (comma-separated) restricts sign-in;
  any other Google account is rejected at sign-in.
- **Charts:** hand-rolled SVG (no chart library)
- **Validation:** zod in server actions
- **Tests:** Vitest

## Data model

All money is stored as **integer cents**. Months are identified by a
`YYYY-MM` text key.

### `budgets`

| column      | type                        | notes                        |
| ----------- | --------------------------- | ---------------------------- |
| id          | serial PK                   |                              |
| userId      | text                        | Google `sub` from the JWT    |
| month       | text `YYYY-MM`              |                              |
| amountCents | integer                     | ≥ 0                          |
|             | unique (userId, month)      |                              |

### `entries`

| column      | type                              | notes                  |
| ----------- | --------------------------------- | ---------------------- |
| id          | serial PK                         |                        |
| userId      | text                              |                        |
| month       | text `YYYY-MM`                    |                        |
| category    | enum `needs` \| `fun` \| `savings` |                        |
| amountCents | integer                           | > 0                    |
| note        | text, nullable                    | optional label         |
| createdAt   | timestamptz, default now          |                        |

All queries are scoped by `userId`.

## Budget tab (`/`)

- **Header:** current month name and the **remaining budget** as the dominant
  number (`effective budget − sum of all entries this month`), with
  "of $X budget" beside it. Clicking the budget amount switches it to an
  inline edit field; saving upserts the current month's `budgets` row.
  When remaining is negative, the number switches to a high-contrast warning
  treatment.
- **Pillars:** three columns — Needs, Fun, Short-term Savings. Each shows:
  - the pillar's month-to-date subtotal
  - an **+ Add entry** button that opens an inline form: amount (required,
    dollars with optional cents) and note (optional)
  - the month's entries newest-first: amount, note, day-of-month, and a
    delete control per entry
- Pages are server components; all mutations (upsert budget, add entry,
  delete entry) are server actions validated with zod, followed by
  `revalidatePath`.

## Effective budget & month rollover

- The **effective budget** for month M is the `budgets` row for M if it
  exists, otherwise the row for the most recent month before M, otherwise 0.
- A new month therefore starts automatically with zero entries and inherits
  the latest budget until the user edits it (editing writes M's own row).
- Past months are never mutated by rollover; they remain in the DB and feed
  stats. The stats view applies the same effective-budget resolution per
  month.

## Stats tab (`/stats`)

Covers the past 6 calendar months including the current one.

- **Stat cards (4):** averages are computed over months in the window that
  have at least one entry, so empty months don't drag them down.
  1. Average monthly spend
  2. Average % of budget used
  3. Total saved (sum of the `savings` pillar over the window)
  4. Highest-spend month (name + amount)
- **Spend vs budget chart:** one bar per month (total spend) with a 1px
  budget marker line per month; over-budget months get the warning treatment.
- **Category mix chart:** stacked bar per month showing the
  needs/fun/savings split, plus a summary row with the 6-month average split.
- Months with no data render as empty slots, keeping the 6-month axis stable.
- All charts are flat SVG rectangles and 1px lines; no animation libraries,
  no chart dependencies.

## Navigation

A top nav bar with two tabs — **Budget** and **Stats** — implemented as
routes (`/` and `/stats`) with the active tab highlighted. Also shows the
signed-in user and a sign-out control.

## Auth flow

- Middleware protects all routes; unauthenticated users land on a sign-in
  page (styled to match the app) with a single "Sign in with Google" action.
- The `signIn` callback rejects emails not in `ALLOWED_EMAILS`.
- Required env vars: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
  `AUTH_GOOGLE_SECRET`, `ALLOWED_EMAILS`.

## Visual language

- Dark mode only. Near-black background, one signal green as the primary
  accent, white/near-white text.
- **No border-radius anywhere. No shadows, no gradients, no 3D effects.**
  1px solid borders, flat fills, high contrast.
- Uppercase labels for section titles; tabular numerals for all money values.
- **Warning treatment** (used everywhere an over-budget state appears): a
  single flat red accent replaces green for the affected value/bar — same
  flat, sharp styling, no other decoration.

## Error handling

- Server actions validate input with zod and return typed error results;
  forms display inline error text (e.g., invalid amount).
- Money input accepts `1234`, `1234.5`, `1,234.56` style strings and parses
  to cents; rejects non-positive or malformed values.
- DB/network failures in actions surface as a form-level error message.
- Unauthenticated requests to actions/routes are rejected by middleware.

## Testing

Vitest unit tests for the pure logic most likely to silently break:

- money parsing/formatting (string → cents, cents → display)
- effective-budget resolution across missing months
- stats aggregation (per-month totals, category splits, averages, 6-month
  window construction)

UI behavior is verified by running the app locally against a dev database.

## Out of scope (YAGNI)

- Multiple budgets/accounts, recurring entries, editing past months' entries
  from the UI, CSV export, currency selection (USD assumed), light mode.
