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

## Google Health connector

The app can link Google Health so workouts and daily activity from a Pixel Watch or
Fitbit show up here. The foundation is in place: OAuth, encrypted token storage, and a
Settings > Connections page. Live data fetching is not wired up yet, and the nightly
cron only lists the connected rows.

Google Health is the only connector. Apple Health is not offered: it needs a native
app, which is out of scope for a PWA.

### Secrets

Three secrets, set the same way as the others above (`.dev.vars` locally,
`wrangler secret put` in production):

| Secret | What it is |
|---|---|
| `GOOGLE_HEALTH_CLIENT_ID` | Google Health OAuth client id. |
| `GOOGLE_HEALTH_CLIENT_SECRET` | Google Health OAuth client secret. |
| `CONNECTIONS_KEY` | Base64 of 32 random bytes, used to encrypt stored tokens. `openssl rand -base64 32`. |

The client id and secret may be left unset; the connector then shows as "not set up"
and the rest of the app runs unchanged. When `GOOGLE_HEALTH_CLIENT_ID` and
`GOOGLE_HEALTH_CLIENT_SECRET` are empty, the flow falls back to the Google sign-in
client (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).

### Scopes and the authorize request

Verified from the Google Health docs (https://developers.google.com/health/scopes):

- `https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly`
- `https://www.googleapis.com/auth/googlehealth.profile.readonly`

The profile scope is what lets us read the account id at `users/me/identity`. The
authorize request sends `access_type=offline` and `prompt=consent`; without them Google
does not return a refresh token, which a later sync needs to stay signed in.

### Redirect URI

Register `https://run.midnightcatit.com/connections/google-health/callback` with the
Google Cloud OAuth client. Locally it is
`http://localhost:8787/connections/google-health/callback`. The web dev server proxies
`/connections` to the API Worker, so the flow stays same-origin.

## How development and deployment work (read this once)

There are **three copies of the app**:

| Copy | Where it lives | What it's for |
|---|---|---|
| **Local** | your Mac | where you write and test code |
| **GitHub** | `midnightcatit/strideguide` | the shared source of truth + history |
| **Production** | Cloudflare (`run.midnightcatit.com`) | the live app you actually use |

GitHub is the middleman. You never edit production directly: you push code to GitHub, and GitHub
(through a feature called **Actions**) builds and ships it to Cloudflare for you.

### The everyday loop

1. **Start a branch** (a safe, separate copy of the code to work on):
   ```bash
   git checkout -b feat/what-im-building
   ```
2. **Run it locally** while you work:
   ```bash
   pnpm install     # only the first time
   pnpm dev         # web at http://localhost:5173, api at :8787
   ```
3. **Save your work to GitHub:**
   ```bash
   git add -A
   git commit -m "describe what changed"
   git push -u origin feat/what-im-building
   ```
4. **Open a Pull Request (PR)** on GitHub — literally a "please merge this branch" request. As soon as
   it's open, **CI runs**: it installs the code and checks it builds. A green check = safe to merge.
5. **Merge the PR into `main`.** This is the release step.
6. **It deploys automatically.** Actions sees the merge and ships the changed piece to Cloudflare.
   About a minute later, the change is live.

In practice you mostly do steps 1–3. Steps 4–6 are automated.

### What triggers what

Not every change redeploys everything:

- change in `apps/web/` → only the website redeploys
- change in `apps/api/` → only the backend redeploys (and its **database migrations run first**)
- change in `packages/shared/` → both redeploy (they both depend on it)

### The database, and why migrations matter

The database (Cloudflare **D1**) has a **schema** — the shape of its tables. Changing that shape is a
**migration**: a numbered `.sql` file that turns the old shape into the new one.

- **Creating** one is a normal code change: edit the schema in `packages/shared/src/db/schema.ts`, run
  `pnpm db:generate`, and commit the new file under `apps/api/drizzle/`.
- **Applying** one to production is now **automatic, and it runs before the API deploy** — so the
  database is always updated *before* the code that needs it goes live (order matters). Only
  *pending* migrations run; D1 remembers what's already applied.
- **The one rule:** keep migrations **additive** (add tables/columns). **Destructive** changes
  (dropping a column/table, rewriting data) should not slip through automatically — for those, run the
  **DB Migrate** workflow by hand and review first.
- **Re-seeding the research KB** is always manual (Actions → **DB Migrate** → *Run workflow* → tick *seed*).

### Secrets (values that must never reach GitHub)

- The app's secret values (Google client secret, OpenRouter key, session key) live **only** in two
  places: your Mac (`apps/api/.dev.vars`, which git ignores) and Cloudflare (set once with
  `wrangler secret put`).
- The **only** secret in GitHub is `CLOUDFLARE_API_TOKEN`, which lets Actions deploy. It's stored as a
  repo secret and never printed in logs.
- Never paste a secret into chat or commit it. If one ever leaks, rotate it in Cloudflare.

### Where to watch it happen

GitHub → **Actions** tab shows every run. Green check = deployed; click a run to read the logs. You can
also re-run a workflow, or manually trigger **Deploy API**, **Deploy Web**, or **DB Migrate**, from there.

### Rolling back a bad deploy

Fastest fix: Cloudflare → **Workers & Pages → the Worker → Deployments → roll back** to the previous
version. Note: rolling back the *code* does **not** undo a migration that already ran — which is exactly
why migrations should stay small and additive.

### Local gotchas (things that have bitten us)

- **Two Cloudflare accounts** exist on your login, so account-scoped `wrangler` commands must pin
  `CLOUDFLARE_ACCOUNT_ID=3f513e4b8539944bdbbf5e1ff45f3af9`.
- **`pnpm deploy` is a built-in pnpm command** and shadows our script — always use the root scripts
  (`pnpm deploy:api`) or `pnpm run deploy`.
- **`.dev.vars` must never be committed** (it's gitignored), and `session-*.md` chat notes are ignored too.
- If you change the D1 `database_id` in `wrangler.jsonc`, the **local** database is keyed to that id —
  re-run `pnpm db:migrate:local` (and the seeds) afterward.

## Manual commands (doing it by hand)

```bash
pnpm typecheck          # type-check everything
pnpm build              # build everything
pnpm db:generate        # schema.ts -> a new migration file
pnpm db:migrate:local   # apply migrations to your local DB
pnpm db:migrate:remote  # apply migrations to the production DB
pnpm deploy:api         # deploy the API Worker (needs `wrangler login`)
pnpm deploy:web         # build + deploy the web Worker
```

Remote commands also need `CLOUDFLARE_ACCOUNT_ID=3f513e4b8539944bdbbf5e1ff45f3af9` pinned.

