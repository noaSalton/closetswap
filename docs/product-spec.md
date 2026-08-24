# ClosetSwap — Product Specification

Peer-to-peer clothing rental platform. Internet Technologies, RUNI CS 2026.

## 1. The problem

People buy expensive, special-occasion clothing — an evening dress, a suit, an outfit for a
photoshoot — and wear it once or twice. The item then hangs in a closet, taking up space, having
lost most of its economic value after a single use.

At the same time, people own beautiful, good-condition items they no longer wear but don't want
to sell or donate outright, creating hidden oversupply sitting in home closets.

The problem is two-sided: economic and environmental waste on clothes worn once, and the lack of
a convenient, safe, trustworthy channel for renting clothes between private individuals — with
coordination, payment, and mutual trust built in.

## 2. Users

ClosetSwap has one primary account type — **registered user** — who can act in two roles at once:

- **Owner** — lists items for rent, sets price and availability, approves or rejects rental
  requests.
- **Renter** — searches for items, sends rental requests for specific date ranges, pays after
  approval.

There is also an **admin** role, responsible for managing users, blocking problematic accounts,
and viewing usage/activity reports.

## 3. The customer

The primary audience is people who own a wardrobe and want to both earn from items they don't
wear regularly and save money by renting for one-off events instead of buying. The initial target
audience is younger, price-sensitive people (students, early-career professionals) who want to
look good at events without buying an expensive item for a single use.

## 4. Business goals

- Build an active, trustworthy marketplace for renting clothes between private users.
- Increase repeat usage (retention) through a fast, simple rent/lend experience.
- Build trust between strangers through a request-approval flow, in-app chat, and ratings.
- Enable a future revenue model via a commission on each rental transaction.
- Reduce consumer waste in the fashion industry through reuse of existing items.

## 5. Software capabilities required

- Signup, login, and profile management.
- Publishing an item for rent, including photos, description, size, category, price/day, and
  availability.
- Search and filtering by category, size, date range, and price range.
- A rental-request system with an approve/reject flow by the item's owner.
- Mock payment (Stripe Test Mode-equivalent, simulated) triggered after request approval.
- In-app chat between owner and renter to coordinate handover and return.
- Booking status tracking: pending → approved → paid → in progress → returned.
- Mutual rating system at the end of a transaction.
- Admin interface: manage and block users, view activity reports (transaction counts, active
  items, active users).

## 6. Core user flows

1. Sign up and log in.
2. Publish a new clothing item for rent, including photos and availability.
3. Search and browse available items by category, size, and dates.
4. Send a rental request for an item for a specific date range.
5. Approve or reject a rental request (item owner).
6. Pay (mock) after a request is approved.
7. Chat in-app to coordinate handover and return.
8. Mark the item as "returned" and close the transaction.
9. Mutual rating between owner and renter at the end of the transaction.
10. Manage users, blocks, and reports (admin).

## Appendix: booking state machine

The table below describes the legal transitions between rental booking statuses — a core piece of
the product's business logic, implemented in [`lib/booking-state-machine.ts`](../lib/booking-state-machine.ts)
and unit-tested in [`tests/unit/booking-state-machine.test.ts`](../tests/unit/booking-state-machine.test.ts).

| Status                  | Who acts             | Possible next step  |
| ------------------------ | --------------------- | -------------------- |
| Pending approval          | Renter sends request  | Approved / Rejected |
| Approved                  | Owner approves         | Paid                 |
| Rejected                  | Owner rejects           | *(terminal)*          |
| Paid                       | Renter pays             | In progress           |
| In progress                | Automatic, by pickup date | Returned            |
| Returned                   | Owner confirms receipt back | *(terminal — ratings open)* |

**Implementation note (deviation from the original spec):** the original spec listed a transition
from "returned" to "closed / rated." In the implementation, `returned` is treated as the terminal
status; ratings become available once a booking is `returned`, rather than modeling "closed" as a
separate status. This was a deliberate simplification — there was no additional state transition
or business rule attached to "closed" that `returned` didn't already cover — documented here and
in [`docs/technical-design.md`](./technical-design.md).
