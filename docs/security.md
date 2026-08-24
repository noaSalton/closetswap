# ClosetSwap — Security

## Authentication

Supabase Auth, email + password. Sessions are stored as httpOnly cookies managed by
`@supabase/ssr` (`lib/supabase/server.ts`, `lib/supabase/client.ts`); a `proxy.ts` (Next 16's
successor to `middleware.ts`) refreshes the session token on every request, since Server
Components can read cookies but can't write them.

Every place that needs "who is the current user" calls `supabase.auth.getUser()`
(`lib/auth.ts`), never `getSession()`. `getUser()` revalidates the JWT against the Supabase Auth
server; `getSession()` just reads whatever's in the (spoofable, client-writable) cookie without
checking it's still valid. This distinction matters and is the one Supabase's own docs call out
as the most common auth mistake in SSR apps.

## Authorization

Two layers, deliberately kept separate:

1. **Row Level Security (Postgres)** decides row-level visibility and write access: a user can
   only see/edit their own profile fields, only see/edit their own items, only see bookings they're
   a party to, only send messages on bookings they're a party to, and so on. Full policies are in
   `supabase/migrations/0001_init.sql`. This is the actual security boundary — it holds even if
   application code has a bug, since it's enforced by the database itself for every query,
   regardless of which client or server code path issues it.
2. **Business-rule authorization** (which *transition* a given role may perform on a booking) lives
   in application code — `lib/booking-state-machine.ts` — because it's a richer rule than RLS
   comfortably expresses and is much easier to unit test as a pure function. RLS still gates the
   underlying row access; the state machine gates which action is legal given the current status
   and the caller's role.

**Admin privilege boundary.** `profiles.role` and `profiles.is_blocked` can only be changed by a
request authenticated as the Postgres `service_role` — enforced by a `BEFORE UPDATE` trigger
(`protect_profile_columns`) that silently resets those columns on any write that isn't from the
service role. The service-role key itself lives only in a server-only env var
(`SUPABASE_SERVICE_ROLE_KEY`, read only from `lib/supabase/admin.ts`, which is marked
`import "server-only"` so bundling it into client code is a build error, not just a convention).
Every admin Server Action (`lib/actions/admin.ts`) checks `getCurrentUser().role === "admin"` —
using the *normal*, RLS-scoped client to establish who's asking — before ever touching the
service-role client to make the change. **Bug avoided during development**: the same protective
trigger initially also blocked the *legitimate* system write that keeps `rating_avg`/
`rating_count` in sync (that trigger runs from a normal user's session too, since it fires off a
normal `INSERT` into `ratings`). Fixed in migration `0004` by allowing the write through when it's
nested inside another trigger (`pg_trigger_depth() > 1`) rather than a direct client statement —
see `docs/technical-design.md`.

## Actions restricted to a logged-in user

Every mutating Server Action re-checks `auth.getUser()` itself — creating/editing/deleting a
listing, requesting/approving/rejecting/paying/progressing a booking, sending a message, rating,
editing a profile, admin actions. None of them rely on "the page that renders this button already
checked the user is logged in" as the actual gate, because Server Actions are reachable directly
via POST by anyone who can construct the request, regardless of which page rendered the form that
normally calls them.

## Preventing access to another user's data

RLS is the primary mechanism (above). On top of that, every Server Action that mutates a specific
row re-derives *identity* from the authenticated session (never from client-supplied "this is my
user id" data) and scopes the write with `.eq("owner_id", user.id)` (or the equivalent) even where
RLS would already block a mismatched write — defense in depth, and a clearer failure message than
a raw RLS rejection.

## Input validation

Every form has a Zod schema (`lib/validation/*.ts`) used both to type the form and as the actual
server-side gate inside the corresponding Server Action. Client-side constraints (`required`,
`minLength`, `type="email"`) are real and tested (`tests/e2e/auth.spec.ts`), but treated as UX,
never as the security boundary — a request can always be sent directly, bypassing the browser
entirely. Numeric/date inputs are range- and format-checked (price > 0, dates not in the past, end
date ≥ start date); string inputs are length-capped server-side.

## Protecting API calls

There is no separate REST API surface to protect beyond Server Actions themselves, which Next.js
already checks the request `Origin` against `Host` for (CSRF), caps at a 1MB body by default, and
strips from the client bundle if unused. What this app adds on top: every action independently
authenticates and authorizes (above), and file uploads go directly from the browser to Supabase
Storage rather than through a Server Action — partly to avoid the 1MB body limit, but also so a
large/malicious upload never transits this app's own compute at all; Storage RLS policies and a
server-side `allowed_mime_types`/`file_size_limit` on the bucket (migration `0002`) gate what
actually lands there.

## Secrets

Three Supabase keys, two of them public by design:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe to ship to the browser; the
  anon key can only do what RLS allows an unauthenticated/authenticated request to do.
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS entirely. Read only in server-only modules
  (`lib/supabase/admin.ts`), never referenced from a Client Component, never returned from a
  Server Action to the browser. In Vercel, all three are set as encrypted environment variables,
  not committed; locally they live in `.env.local`, which is gitignored (`.env.example` documents
  the shape without real values — see `docs/local-setup.md`).

## Known gaps / what would come next

- **No rate limiting.** `createBooking`, `sendMessage`, and `submitRating` in particular could be
  hammered by an authenticated-but-malicious user today. Adding this (e.g. Upstash Ratelimit, or a
  simple Postgres-backed counter) is the single highest-value next security improvement.
- **Blocking is partial.** A blocked user can still send chat messages on bookings they were
  already a party to before being blocked (RLS only guards message *insert* on participancy, not
  on the sender's `is_blocked` flag). Worth tightening if abuse via chat becomes a real scenario.
- **No email verification enforcement documented for production.** This project's Supabase
  instance has "confirm email" on by default, which the signup flow already handles correctly
  (routes to a "check your email" page when no session comes back) — but it's worth explicitly
  confirming that setting stays on before a real launch, since it's a dashboard toggle someone
  could turn off without realizing the app depends on it being on.
- **No audit log** for admin actions (who blocked whom, when) — would matter once there's more
  than one admin.
