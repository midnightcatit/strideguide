# Decision log

A running record of decisions made in this repo, newest first. Entries are never
edited, only added. When a later decision replaces an earlier one, it gets a new
entry that names the old one and says what changed, so the trail of reasoning stays
intact even after the PR body is out of sight.

Each entry is short: a title, the date, what was decided, why, and what it rules
out. It cites the file or PR that shows the decision.

---

## Every prose model path is guarded for the writing rules and the sanitizer

2026-11-26

Decided: every path where a model writes text a person reads must put `WRITING_RULES`
in the prompt it sends and run the reply through `sanitizeText` before it is stored
or shown. A scan test finds each prose model call and fails when one is missing them.

Why: the rules and the filter were in place on every current path (narration, the
nightly note, the shaping pass, the coach, and the reason rephrase with its gate),
but a new path could be added without them and nothing would say so. The scan reads
the source, takes every file that calls the chat router `runAi`, and requires the
rules to be interpolated into a prompt and the sanitizer to run, in the file or in a
named builder it imports (`packages/shared/src/writing-guard.test.ts`).

Rules out: a new prose path shipping without the writing rules or the sanitizer. It
would miss a path that reaches a model without `runAi` (a direct provider fetch), one
that builds its prompt through a namespace import, or one that imports any symbol
from a module that carries the rules. See the test's own notes for the full limit.

---

## The load model may ease or hold, never build, and an eased week dips its long run

2026-11-26

Decided: the fitness and fatigue load model can only lower a future week's volume
intent to `ease` or `hold`. It never sets `build`, never writes a distance or pace,
and an eased week also dips its long run, the way a deload does.

Why: the model's own optimisation says "train maximally or not at all", so it
cannot be trusted to drive load up (research/wave-6/load-model-design.md). Easing a
week left the arc-driven long run untouched, so the week's prescribed total could
still land above the plan's own baseline; dipping it fixes that and matches how a
real eased week should look (PR #248).

Rules out: a model-authored distance or pace, and any path where a model decision
raises load. A lower intent always beats an AI `build` (`load.ts` `stricterIntent`,
`load-wiring.test.ts`).

---

## The ten percent weekly ceiling stays, and a week never exceeds its own target

2026-11-26

Decided: the engine's roughly ten percent weekly step ceiling stays the
load-bearing safety bound. The load model works inside it: its maximum ease is ten
percent (`LOAD_DEFAULTS.maxEase`), and the applied plan's week never carries more
prescribed volume than the engine's own target for that week.

Why: ramps like the ten percent rule and the "5 to 8 CTL per week" heuristic are
coaching convention, not proven rates, so the engine's existing ceilings are the
safety, not a second model-derived bound (research/wave-6/load-model-design.md,
section 5). PR #246 kept readiness as a selector into this ten percent bound rather
than the design's fifteen percent multiplier, which would have exceeded it.

Rules out: a model that sets its own ramp, and any ease deeper than the engine's
own weekly bound. See `engine.ts` `WEEKLY_STEP_CEILING` and `load-wiring.test.ts`.

---

## The plan-quality backtest asserts the invariants hard, not as expected failures

2026-11-26

Decided: a backtest that records known engine bugs as expected failures is not
merged. The plan-quality backtest generates the full goal matrix and asserts every
hard invariant as a plain assertion, with no allowances, so a regression fails CI.

Why: the first rubric PR (#244) reported three real engine gaps (long-run share,
token runs, and recovery weeks heavier than the build peak) and was closed rather
than merged with those failures in place. PR #248 fixed the three gaps and merged
the backtest with no allowances, so the tests prove the fix instead of hiding it.

Rules out: shipping a rubric whose expected-failure list becomes a place for real
bugs to live. See research/wave-6/plan-quality-rubric.md and
`packages/shared/src/plan/plan-quality.test.ts`.

---

## The load model defaults to shadow, and changing a plan is opt-in

2026-11-26

Decided: every plan and adapt runs the load model in `shadow`, which records what
it would change and applies nothing. The two modes that change a plan, `advisory`
and `apply`, are opt-in per runner. `off` turns it off.

Why: shadow changes no behaviour, so the fleet gathers real data with the model on,
while a missing or invalid pref still leaves the plan exactly as the engine built
it (`load.ts` `LOAD_DEFAULTS.mode`, `resolveLoadConfig`). Nothing auto-applies
outside the mode switch described in PLAN.md section 6.6.

Rules out: a model that changes a plan without the runner asking, and any default
that is not the safest one.

---

## The AI picks typed intents; the engine computes every number

2026-11-25

Decided: every path that changes a plan goes through one pipeline. A model returns
typed, confidence-scored decisions (volume intent, quality-day count, long-run
delta), each an enum from a closed set, and the engine turns those into every
distance and pace. A missing or out-of-set answer is dropped and the deterministic
plan stands.

Why: a free-form model instruction could write a number the engine owns. Typed
enums keep the AI deciding what to change and why while the numbers stay the
engine's (`packages/shared/src/plan/change.ts`). With no key or on any failure the
adapt is exactly the deterministic one (PR #238).

Rules out: model-authored distances or paces, and any plan change that does not go
through this pipeline.

---

## Jev runs through OpenRouter, with no separate TypeSafe key

2026-11-25

Decided: the Jev decisions model (the coach safety classifier and the plan-change
pipeline) is served through OpenRouter's decisions API on the existing
`OPENROUTER_API_KEY`. Model id `typesafe/jev-1.14`, with `~typesafe/jev-latest` as
the rolling alias. No `TYPESAFE_API_KEY`.

Why: the app already requires the OpenRouter key for coach chat, so one key serves
both and the owner has one fewer secret to set. The client resolves to null on
every failure, so a missing key or model leaves the classifier a no-op (PR #239,
PLAN.md section 12.1).

Rules out: a second provider key for Jev, and any Jev call that throws instead of
falling back.

---

## The main session reads a subagent's diff before merging

2026-11-25

Decided: the main session reads the changed code in every subagent PR before
merging, and confirms three things: the change does what the brief asked, it does
not weaken an existing test or assertion to pass, and any claim it makes about the
research or data it cites actually holds in the code. A green CI gate is evidence,
not a review.

Why: a passing test count and the session's own summary do not show whether a test
was quietly relaxed or a claim is false. Reading the diff is the only way to catch
that (PR #237, AGENTS.md, Delegation).

Rules out: merging on a green check alone, and treating a subagent's summary as
proof.

---

## Units are presentation; the engine is unit-free

2026-11-22

Decided: the engine computes in metric (km, seconds per km) and stores metric. Km
and mile conversion and pace display happen at the edge, driven by the runner's
settings. Units are never baked into the engine or the stored prescriptions.

Why: one unit-free engine keeps the plan maths simple and the stored data
consistent, and lets the display switch without a rebuild. The preference lives in
`settings.prefs`, not a new column (AGENTS.md, Architecture conventions; M2 in
PLAN.md).

Rules out: unit branches in the engine, and any stored prescription that assumes
kilometres or miles.
