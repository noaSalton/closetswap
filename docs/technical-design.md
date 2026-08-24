# ClosetSwap — Technical Design

## Stack

- **Next.js 16** (App Router, Turbopack), **TypeScript**, **Tailwind CSS v4**
- **Supabase**: Postgres (data), Auth (email/password), Storage (item photos), Realtime (chat)
- **Vercel** for deployment
- **Zod** for validation, **Vitest** + **React Testing Library** + **Playwright** for testing

## Why these choices

- **Server Actions over a separate API layer.** Every mutation (create a listing, request a
  booking, send a message, block a user) is a `"use server"` function called directly from a form
  or a client component, not a hand-rolled `/api/*` route. Next.js already gives Server Actions
  CSRF protection (origin/host check), encrypted action references, and dead-code elimination of
  unused actions from the client bundle — see [`lib/actions/`](../lib/actions/). Route Handlers
  weren't needed anywhere in this app; there's no third-party webhook or non-form client to serve.
- **RLS as the authorization floor, application code as the business-logic layer.** Postgres Row
  Level Security decides *whether a row is visible/writable at all* (only participants see a
  booking, only the owner edits their item). *Which state transition is legal for which role*
  (only an owner can approve, only a renter can pay) lives in
  [`lib/booking-state-machine.ts`](../lib/booking-state-machine.ts) instead of being encoded in
  SQL policies, because a pure function is far easier to unit test exhaustively than a policy
  expression, and the failure mode of a bug in each layer is different: an RLS bug leaks/corrupts
  data, a state-machine bug just produces a wrong status transition that's caught by tests.
- **Service-role client only where RLS genuinely can't do the job**, gated by an explicit
  `role === "admin"` check in application code first — see [Security](./security.md). This
  happens in exactly two places: admin user management, and the booking overlap check (below).

## Folder structure

```
app/                    Routes (App Router) - one folder per URL segment
  page.tsx               Browse/search marketplace (paginated)
  login/, signup/         Auth pages
  items/new/, items/[id]/, items/[id]/edit/
  dashboard/               My listings / requests to review / my rentals
  bookings/[id]/            Booking detail: status, actions, chat, rating
  profile/, profile/[id]/    Own profile edit / public profile view
  admin/, admin/users/        Admin dashboard, user management
lib/
  supabase/{client,server,admin,proxy}.ts   Supabase client factories
  actions/{auth,items,bookings,messages,ratings,admin,profile}.ts   Server Actions
  validation/*.ts          Zod schemas, shared by client forms and server actions
  booking-state-machine.ts  Pure transition function (unit tested)
  pricing.ts                 Rental day/total calculation (unit tested)
  admin.ts, auth.ts           Server-only data-fetch helpers
  types.ts                    Hand-maintained domain types mirroring the DB schema
components/                Shared UI: forms, cards, badges, the chat panel, etc.
supabase/migrations/        SQL migrations, applied in order via the Supabase SQL Editor
tests/unit/, tests/e2e/      Vitest unit/component tests, Playwright end-to-end tests
```

## Database schema

Six tables in the `public` schema (full DDL, indexes, triggers, and RLS policies live in
[`supabase/migrations/`](../supabase/migrations/)):

- **`profiles`** — one row per `auth.users` row (created by a trigger on signup). Holds
  `full_name`, `bio`, `role` (`user`/`admin`), `is_blocked`, and a denormalized `rating_avg`/
  `rating_count` kept in sync by a trigger on `ratings`.
- **`items`** — a listing: `owner_id`, `title`, `description`, `category`, `size`,
  `price_per_day`, `is_active`.
- **`item_images`** — one row per photo (`item_id`, `url`, `sort_order`); files live in the
  `item-images` Storage bucket.
- **`bookings`** — a rental request/transaction: `item_id`, `renter_id`, `owner_id`
  (denormalized — see below), `start_date`, `end_date`, `status`, `total_price`.
- **`messages`** — chat scoped to one `booking_id`.
- **`ratings`** — one row per (`booking_id`, `rater_id`), `score` 1–5, optional `comment`.

`bookings.owner_id` is denormalized from `items.owner_id` at booking-creation time specifically so
RLS and queries don't need a join through `items` just to check "is this user a participant" —
it's set once and never changes for the life of a booking.

**Indexes**: `items(category, is_active)` for the browse/filter query, `bookings(item_id)`,
`bookings(renter_id)`, `bookings(owner_id)` for the three dashboard queries, and
`messages(booking_id, created_at)` for the chat panel's ordered fetch.

**Referential integrity choice worth calling out**: `bookings.item_id` references `items(id)` with
`ON DELETE RESTRICT`, not `CASCADE`. An earlier version of the migration cascaded, which meant
deleting a listing would silently destroy every booking, message, and rating tied to it — including
another user's transaction history. The app instead only allows deleting an item with zero booking
history; once it has any bookings, the UI offers **delist** (`is_active = false`) instead. See
[`lib/actions/items.ts`](../lib/actions/items.ts) `deleteItem`.

## API surface: Server Actions

There's no REST/GraphQL API; each of these is a typed server function called from a form or
client component. All of them re-validate input with Zod and re-check identity/ownership
server-side — the framework's CSRF protection is not treated as a substitute for that.

| File | Actions |
| --- | --- |
| `actions/auth.ts` | `signUp`, `signIn`, `signOut` |
| `actions/items.ts` | `createItem`, `updateItem`, `addItemImages`, `deleteItemImage`, `setItemActive`, `deleteItem` |
| `actions/bookings.ts` | `createBooking`, `approveBooking`, `rejectBooking`, `payBooking`, `markPickedUp`, `markReturned` |
| `actions/messages.ts` | `sendMessage` |
| `actions/ratings.ts` | `submitRating` |
| `actions/profile.ts` | `updateProfile` |
| `actions/admin.ts` | `setUserBlocked` |

## Business logic: the booking state machine

`pending → approved → paid → in_progress → returned`, with `pending → rejected` as the only other
branch. `canTransition(current, action, role)` in
[`lib/booking-state-machine.ts`](../lib/booking-state-machine.ts) is the single source of truth
for which role can perform which transition; every mutating booking action calls it before
touching the database, and it's exhaustively unit tested (valid transitions, wrong role, wrong
starting status, skipping a step).

**Double-booking prevention.** `createBooking` and the approve/pay transitions both check for
date-range overlap against other `approved`/`paid`/`in_progress` bookings on the same item (see
`hasOverlap` in `lib/actions/bookings.ts`). This check deliberately runs on the **service-role**
client, not the normal RLS-scoped one: a renter who isn't yet a party to any booking on that item
can't `SELECT` someone else's booking row under `bookings_select_participant`, so the RLS-scoped
client would silently see zero rows and let a double-booking through. Only a boolean derived from
a count is ever returned to the caller — no row data is exposed. This was caught by an end-to-end
test, not by manual testing; see [`docs/test-plan.md`](./test-plan.md).

Pending requests are **not** blocked from overlapping each other — only confirmed bookings block.
An owner can see multiple pending requests for the same dates and choose one; approving one
re-checks for overlap at that moment in case something else was confirmed in the meantime.

## State management

Server-first: most data flows through Server Components and Server Actions with
`revalidatePath`, not a client-side store. Client components are used only where interactivity
demands it:

- Forms with pending/error state (`useActionState` for simple `<form action>` forms;
  `useTransition` + a manually-invoked action for forms that need to do async work — like a
  Storage upload — before calling the action, e.g. `ItemForm`).
- The realtime chat panel (`ChatPanel`), which holds its own message list in `useState` and
  appends incoming Supabase Realtime events.
- Search filters on the browse page, implemented as a plain `<form method="get">` — no JS
  required, the filter state lives entirely in the URL's search params, which also makes filtered
  views shareable/bookmarkable.

## Error handling

Server Actions return `{ error: string | null }` (see `lib/actions/action-state.ts`) for expected,
user-facing failures (validation, authorization, business-rule violations) rather than throwing —
the calling form/component renders `error` inline. Actual `redirect()`/`notFound()` calls are used
for navigation outcomes (successful creation, missing/forbidden resource), which Next.js handles
as control-flow, not application errors.

## Validation

Every form has a Zod schema in `lib/validation/`, used both to type the form's input and as the
actual gate inside the corresponding Server Action — client-side checks (HTML `required`,
`minLength`, `type="email"`) are UX, not security; the server never trusts them. See
[`docs/security.md`](./security.md) for why that distinction matters.

## Realtime chat

`ChatPanel` subscribes to Postgres changes on `messages` filtered by `booking_id` via
`supabase.channel(...).on("postgres_changes", ...)`. Supabase evaluates the same RLS `SELECT`
policy for realtime subscriptions as for normal queries, so a user who isn't a participant on that
booking can't subscribe to its messages either. New messages are sent via `sendMessage` and simply
appear via the realtime echo to the sender's own subscription — there's no local optimistic insert,
which trades a small amount of latency (one realtime round-trip) for not having to reconcile a
temporary local message with the eventual persisted row.

## Known simplifications

- `returned` is the terminal booking status; the spec's "closed / rated" next-step wasn't modeled
  as a separate status (see [`docs/product-spec.md`](./product-spec.md) appendix).
- No renter-initiated cancellation of a pending request — only the owner can approve/reject. Not
  in the original state table; would be a natural next feature.
- Blocking a user prevents them from creating new items/bookings, but not from sending chat
  messages on bookings they're already a party to. See [`docs/security.md`](./security.md).
