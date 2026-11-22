# AGENTS.md

Guidance for AI agents (and humans) working in this repo. Keep changes small, verified, and
consistent with what's here.

## What this is

Stride Guide — a goal-tailored running + strength training PWA on Cloudflare (Hono Worker + D1 on the
API side, SvelteKit PWA on the web side, a pure shared package in between). Full plan in
[PLAN.md](./PLAN.md); dev/deploy flow in [README.md](./README.md).

## Commands

```bash
pnpm install
pnpm dev                 # api (wrangler dev :8787) + web (vite :5173)
pnpm typecheck           # tsc + svelte-check across all packages
pnpm test                # vitest (see testing philosophy)
pnpm build               # build api + web
pnpm db:generate         # schema.ts -> migration file
pnpm db:migrate:local    # apply to local D1
pnpm db:migrate:remote   # apply to production D1
pnpm deploy:api          # wrangler deploy (apps/api)
pnpm deploy:web          # build + deploy (apps/web)
```

Scope a command to one package with `pnpm --filter @strideguide/api <script>`.

## Testing philosophy — test the core, not the surface

A small, sharp suite beats a large, clunky one. Tests exist to protect behaviour, not to raise a
number.

- **Add a test only when it protects real behaviour that could regress and is hard to catch by hand.**
  In this codebase that means: the plan engine (phase/volume/taper logic), pace & zone math, VDOT and
  unit conversion, session/ledger logic, and migration/serialization edge cases.
- **Never write tests to write tests.** No tests that merely mirror the implementation, assert that
  one function calls another, snapshot markup, or cover trivial getters/wrappers/config. If you can't
  name the failure a test prevents, don't add it.
- **Coverage is not a goal.** Don't add tests just because a file lacks one.
- **Prefer pure functions.** Keep decision logic pure and I/O-free so it's cheap to test — that is why
  the plan engine lives in `packages/shared` with no runtime imports.
- **Bug fixes get exactly one regression test** — the one that would have caught that bug.
- Test files are colocated as `*.test.ts` next to the code they cover.

Core paths currently covered: the plan engine and VDOT paces (`packages/shared/src/plan/*.test.ts`).
Add to that set deliberately, not broadly.

## Architecture conventions

- `packages/shared` is the pure domain: types, goal profiles, the plan engine, VDOT, the machine
  catalog, design tokens, and the Drizzle schema. Browser code imports it via
  `@strideguide/shared/plan` (which excludes the DB); **never** import `drizzle` into `apps/web`.
- `apps/api`: Hono on Workers. Routes stay thin; logic lives in `src/lib`.
- `apps/web`: SvelteKit PWA — presentation only.
- **Units are presentation.** The engine computes in metric (km, seconds-per-km). Conversions
  (km ↔ mi, pace display) happen at the edge, driven by user settings. Never bake units into the
  engine or the stored prescriptions.
- **Prefer data over code.** Goal profiles and the machine catalog are data — adding a new goal or
  machine should not require new logic. User preferences (units, week start, …) belong in the
  `settings.prefs` JSON, not new columns or branches.

## Workflow

- Branch → PR → **CI gate** (install → typecheck → test → build) → merge to `main` → auto-deploy
  (path-filtered, and each deploy is chained to the gate via `needs`). See README.
- **Migrations are additive by default** and auto-apply before the API deploy. Destructive changes
  (dropping columns/tables, rewriting data) go through the manual **DB Migrate** workflow, reviewed
  first.
- **Never commit secrets.** `.dev.vars` and `session-*.md` are gitignored; production secrets live in
  Cloudflare (`wrangler secret put`). The only GitHub secret is `CLOUDFLARE_API_TOKEN`.
- Keep PRs small and single-purpose; write commit messages that say what changed and why.
