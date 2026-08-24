# ClosetSwap — Scale

How the product behaves as usage grows, what's already in place, and what isn't.

## What happens with tens or hundreds of users

At that scale, the current architecture holds up fine without changes: a single Supabase Postgres
instance comfortably handles low hundreds of concurrent users doing browse/search/booking
operations, and Vercel's serverless functions scale horizontally per-request by default. The
places that would start to matter first are the ones below.

## Queries that could get heavy

- **Browse/search** (`app/page.tsx`) — filters by category, size, and an `ilike` text search
  across `title`/`description`, ordered by `created_at`. This is the query every visitor hits on
  every load, and the one most likely to slow down first as the `items` table grows.
- **Dashboard** (`app/dashboard/page.tsx`) — three separate queries per load (owned items, incoming
  requests, outgoing rentals), each unbounded (`.select("*")...`, no `.limit()`). Fine at current
  scale; would need pagination once a single user has dozens of listings or bookings.
- **Admin stats** (`lib/admin.ts`) — `getAdminStats` runs five separate queries, including
  `select("status")` over *all* bookings to compute a status breakdown in JavaScript rather than
  with a SQL `group by`. Cheap today; would become the single most expensive query on the site
  once bookings are in the thousands, and should move to a SQL aggregate at that point.

## Indexes

Already in place (see `supabase/migrations/0001_init.sql`): `items(category, is_active)` for the
main browse/filter path, `bookings(item_id)` / `bookings(renter_id)` / `bookings(owner_id)` for the
three dashboard queries and the overlap check, and `messages(booking_id, created_at)` for the chat
panel's ordered fetch. Not indexed: the `ilike` text search on `items.title`/`description`, which
does a sequential scan — fine at low item counts, but the first thing to add a
[`pg_trgm`](https://www.postgresql.org/docs/current/pgtrgm.html) trigram index (or move to full-text
search / an external search service) for once the catalog is large enough that search feels slow.

## Avoiding over-fetching

- Item images are requested through Next's `<Image>` component, which resizes/optimizes and lazy-loads
  automatically — the browse grid doesn't ship full-resolution photos to every visitor.
- The browse page selects specific columns plus a nested `item_images(url)` rather than every
  column on every join; the item detail and booking detail pages do the same.
- The booking-overlap check (`hasOverlap` in `lib/actions/bookings.ts`) uses `head: true` with
  `count: "exact"` — it asks Postgres for a row *count*, not the rows themselves, since the caller
  only needs a boolean.

## Pagination

The browse page is the only place with real pagination today: `PAGE_SIZE = 12`, driven by a `page`
URL search param and Postgres `.range()`. Dashboard lists and the admin user list are not
paginated — acceptable while a single user's listing/booking count and the total user count are
small, but both would need the same `.range()` treatment before they're used at real scale.

## Client/server separation

Data fetching happens in Server Components (browse, item/booking detail, dashboard, admin); client
components exist only where interactivity requires it (forms, the realtime chat panel, the search
filter's native `<form method="get">`, which needs no JavaScript at all). This keeps the client
JS bundle small and means most pages ship pre-rendered HTML rather than fetching over the client.

## Current limits

- Single Postgres instance, no read replica or caching layer (no Redis, no CDN-level caching of
  dynamic pages) — every browse-page load hits the database directly.
- No rate limiting on Server Actions (see [`docs/security.md`](./security.md)) — at real scale
  this is also a scale concern, not just a security one: an unthrottled endpoint is an easy way to
  overwhelm the database.
- No background job system — `markPickedUp`/`markReturned` are both manual, owner-triggered
  actions rather than scheduled/automatic transitions; fine at this scale, would want a proper job
  queue if e.g. auto-expiring unpaid `approved` bookings became a requirement.
- Admin stats compute in application code instead of SQL aggregates (above) — the first thing that
  would need rewriting under real load.

## What would change first for real scale

1. Move the admin bookings-by-status breakdown to a single SQL `group by` query.
2. Paginate the dashboard and admin user list the same way the browse page already is.
3. Add a trigram (or full-text) index for the item search query.
4. Add basic rate limiting on Server Actions, particularly `createBooking` and `sendMessage`.
5. Introduce a scheduled job for time-based transitions (e.g. auto-flagging overdue returns) rather
   than relying entirely on manual owner actions.
