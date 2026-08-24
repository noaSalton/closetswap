# ClosetSwap — Local Setup

## Prerequisites

- Node.js 20+ and npm
- A free [Supabase](https://supabase.com) project

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project and apply the migrations

1. Create a project at [supabase.com](https://supabase.com) (any name/region).
2. In the dashboard, open **SQL Editor → New query**, and run each file in
   [`supabase/migrations/`](../supabase/migrations/) **in order** (`0001`, `0002`, `0003`, `0004`)
   — paste the contents, run, repeat for the next file. This creates every table, index, trigger,
   RLS policy, and the `item-images` Storage bucket.
3. In **Project Settings → API**, copy three values: the **Project URL**, the `anon` `public` key,
   and the `service_role` key.

## 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in the three values from step 2:

| Variable | Where it's used | Safe to expose to the browser? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Everywhere (client + server) | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everywhere (client + server) | Yes — gated by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` only (admin actions, booking-overlap check) | **No** — server-only, bypasses RLS |

## 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first signup, if the Supabase project has
email confirmation on (the default), you'll be routed to a "check your email" page — either
confirm via the real email, or, for local testing, confirm a user directly from the dashboard
(**Authentication → Users → select the user → confirm**) or via a script using the service-role
key:

```js
// scripts are not shipped in the repo; this is the pattern used during development
const { createClient } = require("@supabase/supabase-js");
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
await admin.auth.admin.createUser({ email, password, email_confirm: true });
```

## 5. Promote a user to admin

There's no UI for this by design (see `docs/security.md`) — it's a one-time manual step:

```sql
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

Run in the Supabase SQL Editor, or via the service-role key from a script.

## 6. Run the tests

```bash
npm test          # Vitest: unit + component tests, no external dependencies
npm run test:e2e  # Playwright: end-to-end, against a REAL Supabase project (.env.local)
```

`npm run test:e2e` creates real users, items, and bookings in whatever project `.env.local` points
at via `SUPABASE_SERVICE_ROLE_KEY` — point it at a Supabase project you don't mind accumulating
test data in, not necessarily production. It starts its own `next dev` server automatically
(`playwright.config.ts`); make sure nothing else is already bound to port 3000, or stop it first
(Next.js refuses to run two dev servers for the same project simultaneously).

## 7. Lint and type-check

```bash
npm run lint
npx tsc --noEmit
```
