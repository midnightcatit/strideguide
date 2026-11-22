# Stride Guide

Goal-tailored running + strength training app for two runners, hosted free on Cloudflare at
`run.midnightcatit.com`. Blend of Runna with Planet Fitness strength training and a research-backed
"why" layer for every session and machine.

The full build plan is in [PLAN.md](./PLAN.md).

## Structure

```
apps/
  api/   Hono API on Cloudflare Workers — auth, D1 (Drizzle), AI router, cron
  web/   SvelteKit PWA — installed at the gym and on the laptop, offline-capable
packages/
  shared/  Domain types, Drizzle schema, design tokens, goal profiles
research/  Cited knowledge-base source (wave-1..3 + stack surveys)
```

## Prerequisites

Node 22+, `pnpm`, `wrangler`, git. Local secrets live in `apps/api/.dev.vars` (gitignored);
see [PLAN.md §12.1](./PLAN.md) for exact placement. Never commit or paste secret values.

## Develop

```bash
pnpm install
pnpm dev          # api (wrangler dev :8787) + web (vite :5173) in parallel
```

The web dev server proxies `/api/*` and `/auth/*` to the API Worker on `:8787`, so cookies and
OAuth work same-origin. Google OAuth callback for dev is `http://localhost:8787/auth/google/callback`.

## Database (D1 + Drizzle)

```bash
pnpm db:generate        # drizzle-kit generate -> apps/api/drizzle/<ts>_*/migration.sql
pnpm db:migrate:local   # wrangler d1 migrations apply strideguide-db --local
pnpm db:migrate:remote  # ... --remote
```

## Build / deploy

```bash
pnpm typecheck
pnpm build
pnpm deploy:api
pnpm deploy:web
```

Production secrets go through `wrangler secret put` (PLAN.md §12.1).
