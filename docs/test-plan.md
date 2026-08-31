# ClosetSwap — Test Plan

This documents what "the product works" means for ClosetSwap and how each category is verified.
Test code lives in [`tests/unit/`](../tests/unit/) (Vitest + React Testing Library) and
[`tests/e2e/`](../tests/e2e/) (Playwright, against a real dev server and a real Supabase project).

Not every line is tested — per the course brief, the goal is meaningful coverage of the product's
central processes, not exhaustive coverage. Run with `npm test` (unit) and `npm run test:e2e`
(end-to-end; requires `.env.local` pointed at a real Supabase project, since these tests exercise
real Auth, Postgres, RLS, and Storage — see [`docs/local-setup.md`](./local-setup.md)).

## 1. Core features

| Feature | Covered by |
| --- | --- |
| Signup / login / logout | `tests/e2e/auth.spec.ts` |
| Create a listing with photo upload | `tests/e2e/items.spec.ts` |
| Browse / search / filter listings | `tests/e2e/items.spec.ts` |
| Full booking lifecycle (request → approve → pay → pick up → return → rate) | `tests/e2e/booking-flow.spec.ts` |
| Chat scoped to a booking | Manual (see [§7](#7-manual-checks)); Realtime is hard to assert deterministically in CI without a second live client |
| Admin: block/unblock a user, activity stats | `tests/e2e/admin.spec.ts` |

## 2. Invalid input

| Case | Covered by |
| --- | --- |
| Signup: password under 8 chars, malformed email | Server-side: `tests/unit/validation.test.ts` (zod schema). Client-side: `tests/e2e/auth.spec.ts` confirms the browser's own HTML5 constraints block submission before it reaches the server — both layers exist, both are tested. |
| Login: wrong password | `tests/e2e/auth.spec.ts` |
| Listing: no photo, non-positive price, unknown category | `tests/unit/validation.test.ts` (schema); no-photo case also end-to-end in `tests/e2e/items.spec.ts` |
| Booking: end date before start date, start date in the past | `tests/unit/validation.test.ts` |
| Rating: score outside 1–5 | Enforced by both the zod schema and a Postgres `check` constraint on `ratings.score` |

## 3. Core business processes

| Process | Covered by |
| --- | --- |
| Booking state machine — every legal transition, wrong role, wrong starting status, skipped steps | `tests/unit/booking-state-machine.test.ts` (10 cases) |
| Rental day/price calculation, incl. same-day and month-boundary | `tests/unit/pricing.test.ts` |
| Double-booking prevention (overlapping confirmed bookings rejected) | `tests/e2e/booking-flow.spec.ts` "overlapping dates are rejected" — **this test caught a real bug**: the overlap check originally ran on the RLS-scoped client, which silently returned zero rows for a renter who wasn't yet a party to the conflicting booking, so it never actually blocked anything for a third party. Fixed by moving the check to the service-role client (see [`docs/technical-design.md`](./technical-design.md)). |
| Owner cannot rent their own item | `tests/e2e/items.spec.ts` |
| Rating aggregate (`profiles.rating_avg`/`rating_count`) stays in sync | Caught a real bug manually (see below) — the `protect_profile_columns` trigger was blocking the aggregate trigger's own writes; fixed in migration `0004`. Not yet covered by an automated test (would need to assert the profile's rounded aggregate right after a rating, which depends on migration 0004 being applied to the test project). |

## 4. Authorization / permissions

| Case | Covered by |
| --- | --- |
| Renter cannot approve/reject their own request | `tests/e2e/booking-flow.spec.ts` (button not rendered) + `booking-state-machine.test.ts` (server-side rejection even if it were called) |
| Owner cannot pay their own booking | `tests/e2e/booking-flow.spec.ts` |
| A blocked user can log in but cannot create a listing or a booking | `tests/e2e/admin.spec.ts` (items); RLS policy directly verified via script during development for bookings |
| A non-admin cannot load `/admin` or `/admin/users` | `tests/e2e/admin.spec.ts` |
| A user can't edit/delete another user's listing | Enforced by RLS (`items_update_own`, `items_delete_own`); not yet under an automated test |
| Only participants can read a booking's messages | Enforced by RLS (`messages_select_participant`), exercised implicitly by the chat panel in every booking-flow e2e test |

## 5. Database

| Case | Covered by |
| --- | --- |
| Profile auto-created on signup (trigger) | Verified manually against the live project during development (see local setup section on seeding); implicitly required by every e2e test that logs in a freshly created user |
| Deleting an item with booking history is blocked at the FK level | `ON DELETE RESTRICT` on `bookings.item_id` (migration `0002`); not yet under an automated test |
| Storage RLS: a user can only upload under their own user-id folder | Verified manually with a script during development (legitimate upload succeeds, cross-user path rejected) |
| Rating uniqueness: one rating per (booking, rater) | Enforced by a `unique` constraint; `submitRating` surfaces the resulting Postgres error (`23505`) as a friendly message |

## 6. Edge cases

- Same-day rental (start date = end date) → 1 day, not 0 — `tests/unit/pricing.test.ts`.
- Rental spanning a month boundary — `tests/unit/pricing.test.ts`.
- Booking a date range that partially (not fully) overlaps an existing confirmed booking — covered
  by the same SQL condition as a full overlap; the query is a standard interval-overlap check, not
  an exact-match check.
- Empty states: browse page with no results, dashboard with no listings/bookings, profile with no
  ratings — checked manually, low-risk (pure conditional rendering).

## 7. Manual checks

Some behavior is impractical to assert deterministically in an automated suite and was verified by
hand during development instead, each re-verified after the relevant migration was applied:

- Realtime chat delivering a message to a *second, already-open* browser session live (would
  require two concurrent Playwright browser contexts synchronized on a websocket event —
  possible, but not done given time constraints; the insert/RLS/read path that realtime rides on
  top of *is* covered by the automated suite).
- Visual/responsive layout at mobile and desktop widths.

## 8. Known gaps

- No load/perf testing (see [`docs/scale.md`](./scale.md) for what's known instead).
- No automated test for the rating-aggregate trigger fix or the item-delete-with-bookings
  restriction — both were verified manually against the live database during development; adding
  them would mean either running migrations against a disposable test database per CI run, or
  accepting shared state across test runs the way the current e2e suite already does.
- **No coverage for deployment/environment configuration** — a real bug found by manual testing on
  the deployed site, not by the automated suite: the Supabase project's Site URL was left at its
  default `http://localhost:3000`, so every real signup's confirmation email redirected to
  `localhost` instead of the deployed app. e2e tests never caught this because they confirm users
  through the admin API (`email_confirm: true`), bypassing the real email-link flow entirely - the
  one thing an automated suite in this setup structurally can't exercise. See
  [`docs/technical-design.md`](./technical-design.md) "Known simplifications" for the fix.
