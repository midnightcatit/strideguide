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

## Development flow

```
feature branch ──push──▶ PR ──▶ CI (ci.yml: install + typecheck + build)  ──merge──▶ main
                                                                                      │
                                    push to main ──▶ deploy-api.yml   (apps/api/** or packages/shared/**)
                                                 └─▶ deploy-web.yml   (apps/web/** or packages/shared/**)
```

- **CI** (`.github/workflows/ci.yml`) runs on every PR and on push to `main` — it is a **gate only**, no deploy.
- **Deploys** run on push to `main`, path-filtered, via `wrangler deploy` using the
  `CLOUDFLARE_API_TOKEN` repo secret and `CLOUDFLARE_ACCOUNT_ID=3f513e4b8539944bdbbf5e1ff45f3af9`.
  - `deploy-api.yml` — `apps/api/**` or `packages/shared/**`
  - `deploy-web.yml` — `apps/web/**` or `packages/shared/**` (builds, then deploys)
- **DB migrations are manual** (`.github/workflows/db-migrate.yml`, `workflow_dispatch`) — run it to apply
  remote migrations, and optionally re-seed the research KB. Never on every push.
- **Secrets:** the four Worker secrets live in Cloudflare (set once via `wrangler secret put`, PLAN.md §12.1).
  CI only needs the `CLOUDFLARE_API_TOKEN` repo secret.

## Manual build / deploy

```bash
pnpm typecheck
pnpm build
pnpm deploy:api          # wrangler deploy (apps/api)
pnpm deploy:web          # wrangler deploy (apps/web) — build first
```

Requires `wrangler login` locally, and `CLOUDFLARE_ACCOUNT_ID=3f513e4b8539944bdbbf5e1ff45f3af9`
(the login sees two accounts, so it must be pinned).

