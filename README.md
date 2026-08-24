# ClosetSwap

A peer-to-peer clothing rental marketplace — rent out clothes you own, rent great pieces from
people near you instead of buying something you'll wear once. Final project for Internet
Technologies, RUNI CS 2026.

- **Live app**: _add Vercel URL after deploying_
- **Repository**: _add GitHub URL after pushing_

## Documentation

| Doc | What's in it |
| --- | --- |
| [Product spec](docs/product-spec.md) | The problem, users, business goals, core flows |
| [Technical design](docs/technical-design.md) | Stack, folder structure, DB schema, API surface, business logic, state management |
| [Test plan](docs/test-plan.md) | What's tested, how, and why — including two real bugs the test suite caught |
| [Scale](docs/scale.md) | What holds up today, what wouldn't at real scale, what would change first |
| [Security](docs/security.md) | Auth, authorization (RLS + application layer), validation, secrets, known gaps |
| [Local setup](docs/local-setup.md) | Full instructions below, and in more detail |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage,
Realtime) · Vercel · Zod · Vitest + React Testing Library · Playwright

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase project's keys - see docs/local-setup.md
npm run dev
```

Full setup (creating the Supabase project, applying migrations, promoting an admin user, running
tests) is in [`docs/local-setup.md`](docs/local-setup.md).

## Testing

```bash
npm test          # unit + component tests (Vitest)
npm run test:e2e  # end-to-end (Playwright), needs a real Supabase project
```
