# INAB

A single-user personal finance tracker. One monthly budget, three pillars —
**Needs**, **Fun**, and **Short-term Savings** — and a stats tab covering the
past six months.

Built with Next.js (App Router), Neon Postgres, Drizzle ORM, and Auth.js
(Google sign-in). Designed to deploy on Vercel.

## Setup

### 1. Database (Neon)

Create a Neon Postgres database — either through the
[Vercel Marketplace](https://vercel.com/marketplace/neon) (recommended, it
wires up `DATABASE_URL` automatically) or at [neon.tech](https://neon.tech).

Push the schema:

```bash
DATABASE_URL="postgres://..." npm run db:push
```

### 2. Google OAuth

In [Google Cloud Console](https://console.cloud.google.com) → APIs & Services
→ Credentials, create an **OAuth client ID** (type: Web application) with:

- Authorized JavaScript origins: `http://localhost:3000` and your Vercel URL
- Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
  and `https://<your-app>.vercel.app/api/auth/callback/google`

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill it in. Note that **sign-in fails
closed**: only emails listed in `ALLOWED_EMAILS` can sign in, and if it's
empty nobody can.

```bash
npx auth secret   # generates AUTH_SECRET
```

On Vercel, set the same variables in Project Settings → Environment Variables.

### 4. Run

```bash
npm install
npm run dev
```

## How it works

- All money is stored as integer cents; months are keyed `YYYY-MM`.
- The big number on the Budget tab is what's left: budget minus every entry
  this month. Click the budget amount to edit it.
- A new month starts empty and inherits the most recent budget until you edit
  it. Months roll over based on the server's timezone (UTC on Vercel).
- The pace strip under the header compares spend (% of budget, split by
  pillar) against how far through the month you are.
- Stats cover the trailing 6 months: averages skip empty months, and the
  savings total sums the Short-term Savings pillar.

## Commands

| Command           | What it does                     |
| ----------------- | -------------------------------- |
| `npm run dev`     | Dev server                       |
| `npm test`        | Unit tests (money, months, stats)|
| `npm run build`   | Production build                 |
| `npm run lint`    | ESLint                           |
| `npm run db:push` | Push Drizzle schema to the DB    |
| `npm run db:studio` | Browse the DB in Drizzle Studio|
