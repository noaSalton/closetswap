# ClosetSwap — Presentation Outline (10–15 min)

A talking outline for the final presentation, not a slide-by-slide script. Pair with a live demo
of the deployed app.

## 1. The product (1–2 min)

- ClosetSwap: peer-to-peer clothing rental. Rent out clothes you own, rent great pieces instead of
  buying something you'll wear once.
- The problem it solves, who it's for — see [`docs/product-spec.md`](./product-spec.md) §1–3.

## 2. Live demo (4–5 min)

Walk the full loop in the deployed app, two accounts (owner + renter) in two tabs:

1. Sign up, browse, list an item with photos.
2. Renter requests a booking → owner approves → renter pays (mock) → owner marks picked up → owner
   marks returned → mutual rating.
3. Chat in the booking, live between the two tabs.
4. Admin dashboard: stats, block a user, show the blocked user can't publish a listing.

## 3. Architecture (3 min)

- Stack and why: Next.js Server Actions instead of a separate API layer; RLS as the security
  floor, application code (the booking state machine) as the business-logic layer. See
  [`docs/technical-design.md`](./technical-design.md) "Why these choices."
- The booking state machine, drawn out: `pending → approved → paid → in_progress → returned`, plus
  the `rejected` branch. Point at `lib/booking-state-machine.ts` and its unit tests as the reason
  this is trustworthy.
- The database schema, six tables, and the one FK decision worth explaining:
  `bookings.item_id ON DELETE RESTRICT`, not `CASCADE` — deleting a listing must not destroy
  someone else's booking history.

## 4. Testing (2 min)

- Layered: Zod schema unit tests, a couple of component tests, full Playwright end-to-end flows
  against a real Supabase project.
- **Lead with the two real bugs the test suite caught**, not just coverage numbers — this is the
  most convincing evidence the tests are doing real work, not theater:
  1. The booking-overlap check ran on the RLS-scoped client, so a third-party renter's overlap
     query silently saw zero rows and let double-bookings through. Caught by an e2e test, not by
     manual clicking.
  2. The `profiles.rating_avg`/`rating_count` aggregate trigger was being silently undone by
     another trigger meant to stop clients self-granting admin — found while manually verifying
     ratings, fixed with `pg_trigger_depth()`.
- See [`docs/test-plan.md`](./test-plan.md) for the full breakdown.

## 5. Scale (1–2 min)

- What's already fine at hundreds of users; what would need to change first (admin stats to SQL
  aggregates, pagination on dashboard/admin lists, a search index) if it grew. See
  [`docs/scale.md`](./scale.md).

## 6. Security (1–2 min)

- Two authorization layers and why they're separate; `auth.getUser()` vs `getSession()`; the
  service-role key boundary; known gaps (no rate limiting yet). See
  [`docs/security.md`](./security.md).

## 7. What I'd improve with more time (1 min)

- Rate limiting on Server Actions.
- Renter-initiated cancellation of a pending request.
- SQL-side admin stats aggregation and dashboard/admin pagination.
- Automated test coverage for the two bugs above, so a regression would fail CI, not require
  manual re-verification.

## Anticipate these questions

- *"Why Server Actions instead of a REST API?"* — no separate client needs to consume this data;
  Next.js already gives CSRF protection and dead-code elimination for actions; less code, same
  guarantees for a form-driven app like this one.
- *"Why does the state machine live in code, not entirely in RLS?"* — a pure function is
  exhaustively unit-testable in a way a SQL policy expression isn't; RLS still gates row access,
  the state machine gates which transition is legal.
- *"What would you change about the schema in hindsight?"* — the `bookings.owner_id`
  denormalization was the right call (avoids a join for every RLS check and every dashboard
  query), but it means owner_id and items.owner_id can theoretically drift if an item's ownership
  ever transferred — not a feature this app has, but worth naming if asked.
- *"How do you know the RLS policies are actually correct?"* — walk through the storage-upload
  cross-user test done manually during development (own-folder upload succeeds, other user's
  folder rejected), and the booking-overlap bug the e2e test caught specifically because it
  exercised RLS from a third party's perspective, not the two directly-involved users.
