# AGENTS.md — TrafficMind

This file provides guidance for AI coding agents (e.g., GitHub Copilot, Codex) working in this repository.

## Project Overview

**TrafficMind** is a self-hosted, open-source web analytics platform built with Next.js. It tracks pageviews, sessions, UTM attribution, conversions, and affiliates across multiple sites. All data is stored in a local SQLite database — no external data services are required.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (Pages Router) + React 19 |
| Database | SQLite via `better-sqlite3` (WAL mode) |
| Auth | JWT stored in httpOnly cookies |
| Styling | SASS (`.scss` files in `src/styles/`) |
| Charts | Recharts |
| Package Manager | **Bun** (`bun install`, `bun run build`) |

## Repository Layout

```
├── public/
│   └── t.js                    # Client-side tracking script (~3KB)
├── scripts/
│   └── deploy.sh               # Zero-downtime PM2 deploy script
├── src/
│   ├── components/             # Shared React UI components
│   │   ├── charts/             # Recharts wrappers
│   │   ├── layout/             # Page shell, nav, sidebar
│   │   └── ui/                 # Buttons, modals, inputs, etc.
│   ├── contexts/               # React contexts (Auth, DateRange, Theme)
│   ├── hooks/                  # Custom hooks (useAnalytics, etc.)
│   ├── lib/                    # Server-side utilities
│   │   ├── db.js               # DB singleton & WAL setup
│   │   ├── migrations.js       # Schema migrations (run automatically)
│   │   ├── analytics.js        # Core analytics query logic
│   │   ├── auth.js             # bcrypt + JWT helpers
│   │   ├── crypto.js           # AES-256-GCM encrypt/decrypt (for OAuth tokens)
│   │   ├── formatters.js       # Number & date formatting helpers
│   │   ├── maintenance.js      # DB vacuum / cleanup utilities
│   │   ├── iso-countries.js    # ISO 3166-1 alpha-2 lookup table
│   │   ├── stripe-sync.js      # Stripe payment polling
│   │   ├── creem-sync.js       # Creem payment polling
│   │   ├── polar-sync.js       # Polar payment polling
│   │   ├── coinbase-sync.js    # Coinbase Commerce payment polling
│   │   ├── gsc.js              # Google Search Console OAuth helpers
│   │   ├── gsc-sync.js         # GSC keyword data sync
│   │   └── withAuth.js         # Auth middleware for API routes
│   ├── pages/
│   │   ├── api/
│   │   │   ├── collect.js      # Tracking beacon endpoint (CORS-open)
│   │   │   ├── auth/           # Login, register, logout
│   │   │   ├── analytics/      # Analytics data API routes
│   │   │   ├── cron/
│   │   │   │   ├── sync-all.js # Unified cron: runs all payment syncs in parallel
│   │   │   │   ├── stripe-sync.js
│   │   │   │   ├── creem-sync.js
│   │   │   │   ├── polar-sync.js
│   │   │   │   ├── coinbase-sync.js
│   │   │   │   └── aggregate.js
│   │   │   ├── settings/       # Site settings API
│   │   │   ├── sites/          # Site CRUD + GSC/affiliate sub-routes
│   │   │   └── stripe/         # Stripe-specific endpoints
│   │   ├── analytics/[siteId]/ # Per-site dashboard pages
│   │   ├── shared/             # Public affiliate dashboard
│   │   ├── index.js            # Redirect to first site or login
│   │   ├── login.js
│   │   ├── register.js
│   │   └── settings.js
│   └── styles/                 # Global SASS stylesheets
├── data/                       # SQLite DB lives here (gitignored)
└── .env.local                  # Local environment config (not committed)
```

## Build & Dev Commands

```bash
# Install dependencies
bun install

# Run development server
bun run dev          # starts Next.js on http://localhost:3000

# Build for production
bun run build

# Start production server
bun run start

# Lint
bun run lint

# Zero-downtime deploy (uses PM2 + scripts/deploy.sh)
bun run deploy
```

## Key Architecture Patterns

### Database Access
- Always import the DB singleton via `import { getDb } from '@/lib/db'`.
- The DB is initialized once per process; `getDb()` returns the cached instance.
- All schema changes must be added as new entries in `src/lib/migrations.js` — never alter existing migration entries.

### API Routes & Auth
- All authenticated API routes must use the `withAuth` higher-order function from `@/lib/withAuth`.
- Unauthenticated routes: `/api/collect` (tracking beacon) and `/api/auth/*`.
- The cron routes (`/api/cron/*`) are guarded by the `CRON_SECRET` environment variable (optional but recommended in production).

### Payment Provider Syncs
All four payment integrations follow the same pattern:
1. Poll the last 24 hours of completed payments from the provider API.
2. Extract `ts_visitor_id` and `ts_session_id` from payment metadata.
3. Resolve UTM attribution by looking up the original session.
4. Dedup by `payment_intent_id` (or equivalent) before inserting.
5. Insert into the `conversions` table with a `provider` column (`stripe`, `creem`, `polar`, `coinbase`).

The unified endpoint `/api/cron/sync-all` runs all four syncs in parallel via `Promise.allSettled`. **Any new payment provider must be added here too.**

### Tracking Script (`public/t.js`)
- Served directly as a static file with permissive CORS headers (configured in `next.config.mjs`).
- Exposes `window.__ts.vid` (visitor ID) and `window.__ts.sid()` (session ID) for use in payment metadata.
- Handles SPA navigation via `pushState`/`popstate`.

### Encryption
- Sensitive data (Google OAuth refresh tokens, API keys) is encrypted at rest with AES-256-GCM using `src/lib/crypto.js`.
- The encryption key is auto-generated on first use and stored in `data/.appkey`. **Back this file up alongside the SQLite database.**

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | Random hex string for signing auth tokens |
| `JWT_EXPIRY` | No | `7d` | Auth token expiry |
| `NEXT_PUBLIC_APP_URL` | Yes | — | Public URL of this TrafficMind instance |
| `DATABASE_PATH` | No | `./data/analytics.db` | Path to the SQLite database file |
| `CRON_SECRET` | No | — | Bearer secret for protecting `/api/cron/*` endpoints |

## Coding Conventions

- **Imports:** Use the `@/` alias for `src/` (configured in `jsconfig.json`). Example: `import { getDb } from '@/lib/db'`.
- **API routes:** Export a default `handler(req, res)` function. Wrap authenticated routes with `withAuth`.
- **No TypeScript:** The project is plain JavaScript. Do not introduce TypeScript files.
- **Styling:** Add styles in the relevant `.scss` file under `src/styles/`. Do not use CSS-in-JS or inline styles.
- **Comments:** Only add comments where the logic is non-obvious. Match the style of existing comments.
- **No new dependencies** unless strictly necessary; prefer utilities already present in `src/lib/`.

## Testing & Linting

There are currently no automated tests. Use the linter to catch issues:

```bash
bun run lint
```

When verifying changes manually, run `bun run dev` and test the affected flows in the browser.
