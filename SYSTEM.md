# SYSTEM.md

This is the system as it is now. Read it before changing the engine, the schema, the AI or the
writing rules. It describes what exists today, not what we intend; intentions and the full build
history live in [PLAN.md](./PLAN.md), the settled decisions and their why in
[docs/decisions.md](./docs/decisions.md), and how to work (commands, workflow, review, delegation)
in [AGENTS.md](./AGENTS.md).

## Packages and the pipeline

Three packages in one pnpm workspace:

- `packages/shared` is the pure domain: types, goal profiles, the Drizzle schema, design tokens,
  VDOT and pace maths, and the plan engine. It is I/O-free and imports nothing at runtime beyond
  `drizzle-orm`, so decision logic is cheap to test. Browser code reaches it through subpaths such
  as `@strideguide/shared/plan` and `@strideguide/shared/units`; `apps/web` never imports `drizzle`.
- `apps/api` is a Hono Worker on Cloudflare, with D1 through Drizzle. Routes stay thin; logic lives
  in `src/lib`.
- `apps/web` is a SvelteKit PWA. Presentation only.

A plan flows through these stages:

1. **Onboarding** (web to API) collects the goal profile, target date, baseline (recent race time,
   weekly volume, experience, age), available days, equipment, sport and schedule.
   `POST /api/plans/generate` stores a goal, a plan, its weeks and sessions.
2. **Generation** (`packages/shared/src/plan/engine.ts`) is deterministic. It picks the phase arc
   (base, build, peak, taper, post-race recovery), builds the weekly volume and long-run curve,
   derives training paces from VDOT, and lays out running, strength and mobility sessions. It
   computes every distance, pace, duration and count.
3. **The AI shaping pass** never generates the plan. It reads the engine's plan and chooses within a
   closed set of typed intents: a quality kind and a volume, strength and mobility intent of `ease`,
   `hold` or `build`, plus a short emphasis line. An answer outside the set is dropped. The engine
   applies what survives inside its own bounds (`apps/api/src/lib/plan-shape.ts`,
   `apps/api/src/lib/plan-change.ts`).
4. **The load model** (`packages/shared/src/plan/load.ts`) reads a plan and the runner's logs, builds
   fitness, fatigue and form curves, and can only ease or hold a future week. It runs in `shadow` by
   default (records, changes nothing); `advisory` and `apply` are opt-in per user. It never builds
   and never writes a number.
5. **Adapt** (`adaptPlan`, `POST /api/plans/adapt`) rebuilds only the weeks that have not started,
   seeded with real recent volume and feedback, folding together the AI shapes and the load read.
   Adding a goal or a machine is data, not new code.
6. **The UI** (SvelteKit) renders Today, Week, Coach and Progress from the stored plan, converting
   units at the edge.

Admin (`apps/api/src/routes/admin.ts`) reads metadata only, and can show the load model's shadow
records.

## Boundaries everyone must hold

- **Units are presentation and the engine is unit-free.** The engine computes in km and seconds per
  km; km/mi conversion and pace display happen at the edge from user settings. A stored prescription
  is metric.
- **The engine computes every number.** A model never writes a distance, a pace or a count. The AI
  chooses typed intents only, and an out-of-set answer is dropped.
- **The load model may ease or hold and never build.** No path may raise a week above the engine's
  own curve.
- **The roughly ten percent weekly ceiling holds.** No positive step exceeds it; the two-week
  progression ceiling is about thirty percent.
- **A week's prescribed total must not exceed the week's own target.**
- **No ACWR threshold.** Load is read as a trend; there is no ratio to cross.
- **No medical diagnosis.** A health risk is redirected, never diagnosed (`coach-safety`).
- **Prefer data over code.** A new goal or machine is data, not new logic. User preferences (units,
  week start) live in the `settings.prefs` JSON, not in new columns or branches.
- **Writing is a boundary too.** Every user-facing string follows the human-writing rules (no em
  dashes, no AI tells, mono for data), including any prompt that produces visible text. See
  [AGENTS.md](./AGENTS.md) and the `human-writing` skill. Every prose model path carries
  `WRITING_RULES` in the prompt it sends and runs the reply through `sanitizeText` before it is
  stored or shown; the guard in `packages/shared/src/writing-guard.test.ts` finds the prose call
  sites and fails when one is missing them.

## Invariants

Each row is enforced by a named test. The check in `packages/shared/src/system-map.test.ts` reads
this table and fails if a listed test is gone, skipped, or turned into an expected failure.

| id | invariant | enforced by | test file | kind |
| --- | --- | --- | --- | --- |
| backtest-matrix | The backtest runs the full realistic matrix (every goal, level, volume, day set, target and schedule combination) | covers the full realistic matrix | packages/shared/src/plan/plan-quality.test.ts | hard |
| weekly-progression-ceiling | No build week rises more than about thirty percent over the week two before it | keeps every build week under the two-week progression ceiling | packages/shared/src/plan/plan-quality.test.ts | hard |
| long-run-share-ceiling | The long run is at most half the week it is delivered in | keeps the long run under half the week | packages/shared/src/plan/plan-quality.test.ts | hard |
| long-run-absolute-ceiling | The long run never passes the goal's own maximum | keeps the long run under the goal ceiling | packages/shared/src/plan/plan-quality.test.ts | hard |
| quality-count-cap | A week carries at most two hard sessions, one for a beginner, none in recovery | keeps the hard-session count within the cap | packages/shared/src/plan/plan-quality.test.ts | hard |
| hard-session-spacing | Two hard sessions keep at least two easy days between them | leaves at least two easy days between hard sessions | packages/shared/src/plan/plan-quality.test.ts | hard |
| rest-days | Every week keeps at least one true rest day, two for a beginner | never schedules a zero-rest week | packages/shared/src/plan/plan-quality.test.ts | hard |
| no-token-run | No running session is under fifteen minutes | never schedules a token run | packages/shared/src/plan/plan-quality.test.ts | hard |
| taper-reduction | Volume falls off the peak across the taper and never rises within it | tapers the volume down off the peak | packages/shared/src/plan/plan-quality.test.ts | hard |
| post-race-recovery-weeks | Post-race recovery weeks carry easy running only and are not heavier than the build peak | keeps the post-race recovery weeks easy and under the peak | packages/shared/src/plan/plan-quality.test.ts | hard |
| phase-shape | A race plan runs base, build, peak and taper, and lands the race in a taper week | holds the phase shape and lands the race in the taper | packages/shared/src/plan/plan-quality.test.ts | hard |
| load-model-never-builds | The load model may ease or hold a week, never raise it above the engine's curve | a stricter load intent beats an AI build intent, never the other way | packages/shared/src/plan/load-wiring.test.ts | hard |
| load-model-never-raises | Folding the load read onto the engine shapes only ever lowers a week | lowers an AI build to the model ease, and never raises a week | packages/shared/src/plan/load.test.ts | hard |
| long-run-ten-percent-step | The long run builds without a step over the roughly ten percent weekly ceiling | still holds the roughly ten percent weekly ceiling on the long run | packages/shared/src/plan/engine.test.ts | hard |
| long-run-goal-cap | The long run never passes the goal peak | never lets the long run pass the goal peak, even on a huge week | packages/shared/src/plan/engine.test.ts | hard |
| taper-not-heavier-than-peak | A taper week is never heavier than the peak | never lets a taper week be heavier than the peak | packages/shared/src/plan/engine.test.ts | hard |
| recovery-under-reached-peak | Post-race recovery weeks stay under the peak the plan actually reached | keeps the post-race recovery weeks under the peak the plan reached | packages/shared/src/plan/engine.test.ts | hard |
| long-run-share-realised-week | The long run is under half of the realised week on a light short plan | keeps the long run under half of the realised week on a light short plan | packages/shared/src/plan/engine.test.ts | hard |
| no-token-run-light-week | No token run on a light week spread over six days | never schedules a token run on a light week spread over six days | packages/shared/src/plan/engine.test.ts | hard |
| long-run-share-falls-with-volume | The long run takes a bigger share of a light week than a heavy one | gives the long run a bigger share of a light week than a heavy one | packages/shared/src/plan/engine.test.ts | soft |
| ai-typed-intents-closed-set | The model's answer is kept only when it names a choice in the closed set | drops an answer outside the closed set | packages/shared/src/plan/change.test.ts | hard |
| ai-modality-intents-closed-set | A strength or mobility intent outside the closed set is dropped, the rest kept | drops a strength or mobility intent outside the closed set and keeps the rest | apps/api/src/lib/plan-shape.test.ts | hard |
| why-no-invented-numbers | A reworded reason never adds a number the deterministic reason did not have | rejects a line that adds a number the reason did not have | packages/shared/src/plan/why-rephrase.test.ts | hard |
| session-why-no-invented-numbers | A session why line never adds a number the reason did not have | drops a line that adds a number the reason did not have | apps/api/src/lib/session-why.test.ts | hard |
| coach-no-diagnosis | The coach redirects only on a confident, non-none health risk, never diagnosing | redirects only when a non-none risk is confident | apps/api/src/lib/coach-safety.test.ts | hard |
| writing-rules-in-prompts | Every prose model path carries the writing rules in its prompt and runs the reply through the sanitizer | fails a prose path whose prompt omits the writing rules or the sanitizer | packages/shared/src/writing-guard.test.ts | hard |
