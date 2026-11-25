# Race taper: the rules per distance and the research behind them

A short note recording why each goal profile tapers the way it does, so the
numbers are not arbitrary and a future change has something to argue with.

## What the evidence says

- Bosquet et al. 2007, "Effects of tapering on performance: a meta-analysis"
  (Med Sci Sports Exerc). Across the pooled studies, the best results came from a
  two-week taper that cut training volume by roughly 40 to 60 percent while
  keeping intensity and frequency, for about a 2 to 3 percent performance gain.
  Tapers shorter than about two weeks left performance on the table, and cutting
  intensity hurt.
- Mujika and Padilla, "Scientific bases for precompetition tapering strategies"
  (Med Sci Sports Exerc, 2003). Taper duration scales with the event: roughly one
  to two weeks for short events, up to two to three weeks for a marathon. Volume
  comes down progressively, intensity stays.
- Short-event work (5K and 10K) supports a shorter, sharper taper: the aerobic
  base is not the limit, so a two-week cut that keeps the sharp sessions is
  enough.

## What the engine does

`volumeCurve` in `packages/shared/src/plan/engine.ts` shapes each week. A taper
week is `peak * (1 + volumeStep) ^ (index + 1)`, so a negative `volumeStep` cuts
volume geometrically off the peak. The number of taper weeks comes from the
profile's `progressionRules` in `packages/shared/src/goal-profiles.ts`.

Intensity is held, not cut: in the taper phase the engine still runs one quality
slot hard (`hardCount` is 1 for base and taper), and the rest of the quality slots
run easy. So volume falls and the sharp work stays, which is what the evidence
asks for.

## The rules per distance

| Profile | Taper weeks | Volume step | Total cut at the race |
| --- | --- | --- | --- |
| 5K | 2 | -0.35 | about 58 percent |
| 10K | 2 | -0.30 | about 51 percent |
| Half marathon | 2 | -0.30 | about 51 percent |
| Marathon | 3 | -0.25 | about 58 percent |
| Whole fitness | none | n/a | no race date, so no taper |

The two-week taper is the floor for a race goal, per Bosquet. The marathon gets a
third week because the event is long enough to need the longer freshening, per
Mujika. The volume steps all land inside the 40 to 60 percent band the
meta-analysis found best.

## Follow-ups

- The final week is shaped by volume only. A day-level race-week shape (a short
  sharpener a few days out, easy days in the last two) is a possible next step,
  but it needs the plan to place the race session itself, which it does not do
  today. The Today view shows the race as a card on the target date.
- These numbers are a starting point from the evidence, not a per-runner fit. A
  future pass could scale the taper to the runner's own training load.
