# Designing the load model: fitness, fatigue and form for Stride Guide

A wave-6 design note. It answers the gap named in `plan-systems-landscape.md`
section 7.2 and listed as item 1 in section 8: our adaptation is band-based rules,
not a continuous model. The leaders move load against a phase-level fitness
target (Athletica), retrain a model daily (AI Endurance), or re-simulate the plan
before every session (TrainerRoad). We have no fitness or fatigue model at all.

This document is a design, not code. It covers how to score one session's load,
what the fitness/fatigue/form curves are and how well they are really validated,
how adaptation should target a phase fitness goal inside the safety ceilings the
engine already enforces, how the model would fit the code we have, the failure
modes to avoid, and how we would know it works. The companion task is the
plan-quality rubric and backtest (section 8 item 3 of the landscape); section 6
ties the evaluation to it.

## How to read this

Each claim is marked **documented** (a source was fetched and is quoted),
**inference** (reasoned from documented material), or **convention** (widely
practised, not established by trial). Where a number is a product's own choice
rather than a measured constant, it is labelled as such. The research used
`webfetch` first; peer-reviewed abstracts came through the Europe PMC REST API,
and one publisher page that renders only with JavaScript (the IJSPP commentary)
was read through its indexed abstract.

The through-line is the one the landscape already set: the numbers stay
deterministic, the model is a bounded lens, and the safety ceilings the engine
owns are never overridden by the model. The single most important finding here is
that the impulse-response model does not produce a sensible plan on its own, so
it can inform the plan but cannot be the plan.

## 1. Scoring one session's load

A load model needs one number per session. The field has several ways to get it,
and they are not interchangeable. The candidates, what each needs, and whether we
can honestly compute it:

| Measure | Inputs it needs | What we have | Main limit | Verdict for us |
|---|---|---|---|---|
| Banister TRIMP (HR) | duration, average HR, resting HR, max HR, sex | duration, average HR (sometimes), resting HR (health data), age; no stored max HR, no sex | average HR hides interval structure; needs a max HR we do not store | optional, estimated |
| Edwards TRIMP | minutes in each of five HR zones | HR zones not stored; average HR only | needs per-minute HR, not an average | not yet |
| Lucia TRIMP | minutes in three threshold-bounded zones | no ventilatory thresholds | needs lab or HR-zone time | no |
| iTRIMP | personal lactate/HR curve from a lab test | no lab test | requires a treadmill lactate test | no |
| TSS (power) | power meter, FTP | no power meter | needs a power meter | no |
| rTSS (pace) | time series of pace and elevation, threshold pace | distance, duration, average pace; threshold pace from VDOT; no true grade correction | average pace hides surges; no NGP grade correction | yes, simplified |
| hrTSS | time in HR zones by lactate threshold HR | no LTHR stored | "less accurate" than pace, poor for intervals | optional |
| session-RPE (sRPE) | RPE (CR-10) and duration | both already logged | subjective; confounded by mood, sleep, heat | primary |

**Banister TRIMP.** The heart-rate formula most people mean by TRIMP is duration
in minutes times the heart-rate-reserve fraction times an exponential weighting
factor, where the reserve fraction is `(avgHR - restHR) / (maxHR - restHR)` and
the weighting is `0.64 x e^(1.92 x fraction)` for males and `0.86 x e^(1.67 x
fraction)` for females, derived from lactate profiles (Borresen and Lambert 2009,
*Sports Medicine*, equation 3, as reproduced by Coach AI's TRIMP explainer). It
is a single-number score that makes a harder session count disproportionately
more, which is the point of the exponential weighting. Its limits are real: it
uses the whole-session average heart rate, so it cannot see an interval session's
structure, and it needs a maximum heart rate we do not store. Firstbeat and
others address the average-HR problem with beat-to-beat data, which we do not
have.

**Edwards and Lucia TRIMP.** Edwards scores minutes in five HR zones by factors
one to five; Lucia uses three zones bounded by the ventilatory thresholds,
weighted one to three (Coach AI explainer, citing Edwards 1993 and Lucia et al.
2003). Both handle intervals better than the average-HR formula because they see
where the minutes were, but both need per-minute heart rate and zone boundaries
we do not currently hold.

**iTRIMP.** Uses the athlete's own lactate/HR curve to weight intensity, the most
physiologically faithful of the four, and the only one that needs a lab test
(Manzi et al. 2009, *Med Sci Sports Exerc*). Out of reach for a phone app.

**TSS, rTSS, hrTSS.** TrainingPeaks' family. Power-based TSS needs a power meter
and a functional threshold power (FTP): by definition one hour at FTP is 100
points (TrainingPeaks, "What Is TSS?"). rTSS replaces power with pace: normalized
graded pace (NGP) relative to the runner's functional threshold pace, times
duration, and TrainingPeaks calls it the "second most accurate" method, needing a
pace-and-elevation time series and a threshold pace (TrainingPeaks Help Center,
"Training Stress Scores Explained"). hrTSS uses time in heart-rate zones set by
lactate threshold heart rate and is described as "not as accurate as
Powermeter-based TSS or running Pace-based rTSS", and "less accurate for workouts
with highly fluctuating efforts". The whole family is proprietary and has no
peer-reviewed validation of its own; the seeded concept is Banister's TRIMP
(TrainingPeaks, "What Is TSS?").

**sRPE.** Session RPE is effort rating on the CR-10 scale times duration in
minutes, giving arbitrary units (Foster et al. 2001; Halson 2014, *Sports
Medicine*). It is the one measure we can compute for every logged run without a
power meter, a lab test or a stored threshold, because we already collect both
inputs. It is validated: Halson reports session-RPE correlates with summated
heart-rate zones at r = 0.88 to 0.95, and a 2023 meta-analysis in endurance
athletes found moderate-to-strong correlations with heart rate (r = 0.62 to 0.85)
(Liu et al. 2023, *PeerJ*). It is less precise for short, high-intensity reps and
it is subjective, influenced by mood, sleep and environment (Haddad et al. 2017).
Our own wave-1 and wave-4 notes already call it "the practical foundation for
load monitoring when lab measures are unavailable" and a validated internal-load
measure.

**What we actually have (read from the code).** `logs.run_stats` carries
`distanceKm`, `durationSec`, `avgPaceSecPerKm` and an optional `avgHr`, plus a
top-level `rpe`; connector `activities` carry `avgHr` and `maxHr`; the daily
`health_metrics` table carries resting HR, HRV, sleep, SpO2, respiratory rate and
night temperature. We hold VDOT-derived training paces, so a threshold pace
exists. We do **not** hold a power meter, a lab threshold, a stored maximum heart
rate, a lactate threshold heart rate, or the runner's sex. Age is stored (as a
birth year) and resting HR is available from health data.

**The honest recommendation.**

1. **Primary: sRPE load, `RPE x duration`.** It is the only measure we can compute
   from what we already collect, and it is the validated practical foundation in
   the literature. Use one scale (CR-10) and capture RPE consistently.
2. **Secondary, when RPE is missing: a pace-based score.** Duration-weighted
   average pace against the VDOT threshold pace, an rTSS-lite. Honest limits: we
   have no NGP grade correction and only an average pace, so it under-counts
   surges and over-counts on rolling routes. It is a fallback, not the primary.
3. **Optional, when average HR is present: a simplified hrTSS/TRIMP.** Estimated
   maximum HR from age (for example the Tanaka estimate, 208 minus 0.7 x age),
   resting HR from health data, and the average-HR reserve fraction. Honest
   limits: an age-estimated max HR is uncertain by roughly ten beats per minute,
   the average hides intervals, and the sex-specific weighting factor is
   unavailable to us, so a sex-neutral factor would be a simplification.

**Do not mix methods.** A direct study fitted the same model to the same training
data using Banister TRIMP, Lucia TRIMP, Edwards TRIMP, TSS and sRPE, and found the
methods "cannot be used interchangeably because they evolve differently": the day
before the performance on which training had its biggest positive influence
moved by up to 19.6 days depending on the method (Vermeire et al. 2021, *IJSPP*
16(9):1261). So pick sRPE as the canonical unit, store the score per session, and
never blend a pace-based score with an RPE-based one in the same curve. The score
is arbitrary units; it stays unit-free and metric-consistent, like every other
number in the engine.

## 2. The curves: fitness, fatigue and form as an impulse-response model

**The model.** Banister and colleagues modelled performance as the balance of two
opposing responses to each training impulse: a slow-building fitness effect and a
fast-decaying fatigue effect. In discrete daily form, predicted performance on
day n is

```
P(n) = P0 + SUM over i of w(i) * [ k1 * exp(-(n-i)/t1) - k2 * exp(-(n-i)/t2) ]
```

where `w(i)` is the load of day i, `k1` and `k2` are the magnitudes of the fitness
and fatigue responses, and `t1` and `t2` are their time constants (Banister et al.
1975; Calvert et al. 1976; the equations as restated by Ceddia, Bondell and
Taylor 2025, arXiv:2505.20859). Fitness decays slowly, fatigue quickly, and form
is what is left when you subtract one from the other.

**The product convention.** TrainingPeaks' Performance Management Chart is the
reference implementation: fatigue (Acute Training Load, ATL) is "an exponentially
weighted average of that stress from the past seven days", fitness (Chronic
Training Load, CTL) is "an exponentially weighted average of the last 42 days",
and form (Training Stress Balance, TSB) is "Fitness minus Fatigue" (TrainingPeaks,
"What is the Performance Management Chart?"). Athletica documents the same three
numbers with the same windows: "Fitness (CTL) is your training load averaged over
roughly the last six weeks", "Fatigue (ATL) is your load averaged over roughly the
last week", "Form (TSB) is fitness minus fatigue" (Athletica methodology). In
discrete daily form this is a pair of exponentially weighted moving averages:
`CTL_today = CTL_yesterday + (load_today - CTL_yesterday) / 42`, and the same with
7 for ATL. This EWMA form is the product-friendly version of the impulse-response
sum, and it is the shape the whole field shares.

**Where the numbers come from.** The 7 and 42 are TrainingPeaks/Coggan convention,
not fitted constants. The original model estimated the time constants per athlete
by fitting the model to that athlete's own training and performance history
(Ceddia et al. 2025). Fitted values vary widely. One fourteen-week cycling study
of eight participants fitted `t1 = 38 days` (fitness) and `t2 = 1.9 days`
(fatigue); Busso's variable-dose-response model on a different dataset fitted
`t1 = 30.8`, `t2 = 16.8` and a third constant `t3 = 2.3` (both values as reported
by Ceddia et al. 2025, from the source studies' own tables). So there is no
universal pair, and the fatigue time constant in particular ranged from about two
days to about seventeen across two studies.

**How well is it actually validated.** The honest summary is: it fits
retrospectively and predicts poorly.

- **Retrospective fit can look good.** Applying the Banister model to nine
  swimmers gave a mean coefficient of determination of 0.79, range 0.61 to 0.97
  (reported by Ceddia et al. 2025). That is fitting a curve through data already
  seen, not prediction.
- **Predictive efficiency is "mitigated".** A peer-reviewed commentary states
  plainly that, "despite several improvements of FFMs and still being widely used
  nowadays, their efficiency for describing as well as for predicting a sport
  performance remains mitigated" (Imbach et al. 2022, *Sports Medicine Open*
  8:29). Its reasons are structural: the model is univariate (it sees only
  training load, ignoring sleep, life stress and nutrition), it treats two
  identical sessions at different stages as producing the same response, and it
  is sensitive to how load is quantified, which can create spurious associations
  between input and output.
- **The parameters are not stable.** A peer-reviewed commentary's conclusion is
  that "the parameter values are influenced by the starting parameter values, the
  modeling technique, and the input of the model. Also, the use of general
  constants should be avoided since they do not account for interindividual
  differences and differences between training-load methods" (Vermeire et al.
  2022, *IJSPP* 17(5):810). Its advice is to use the model "as a way to work more
  data-informed rather than working data-driven".
- **It does not produce a plan.** When the Banister model is optimised to
  maximise performance, the result is "either train maximally, or not at all":
  the optimal load is to train every day to the maximum until the break-even
  point, then stop (Ceddia et al. 2025). The model only produces periodisation
  and tapering when extra nonlinear terms are added. This is the single most
  important fact for this design: the model is a lens on fatigue and freshness,
  not a planner. Our engine owns periodisation, taper and the ceilings; the model
  must never be allowed to drive load upward on its own.

**What is evidenced versus convention.** Evidenced directionally: the two-
antagonist response (slow fitness, fast fatigue), supercompensation, and the fact
that a taper sheds fatigue faster than it loses fitness. Convention: the exact
42/7 windows, the form bands (TrainingPeaks suggests being "slightly negative up
to positive 25" for race day, with sustained values below about -30 flagged as
extreme strain, which is coaching guidance rather than a published standard), and
the "5 to 8 CTL points per week" sustainable ramp (a widely repeated coaching
heuristic attributed to Joe Friel, repeated by TrainingPeaks rather than derived
independently). Not established: that the model predicts an individual's
performance well, or that any single constant applies across athletes or across
load methods.

**Recommendation.** Use the EWMA fitness/fatigue/form as a descriptive, relative
signal, with the conventional 42/7 as defaults exposed as tunables, and never as
a hard truth. Do not fit per-athlete constants: we have far too little data for
each runner, and the commentary above shows the fit is unstable and easily
overfitted. Compute in the pure engine, present as a trend, and let it move a
decision only at the margins.

## 3. Using it: a phase fitness target inside the existing safety ceilings

**The pattern to copy (documented).** Athletica describes exactly the bounded use
we want: "The model holds a fitness target for each phase and will move a
session's load to hit it, but never past a set of safety limits. Fatigue is not
allowed to run away from fitness. Form is not allowed to fall below a floor...
No single day is allowed to spike beyond a ceiling scaled to your current
fitness." Its load prescription is "a rule-based calculator with explicit,
auditable rules, not a black box" (Athletica methodology). That is the shape: a
target, a floor, a daily ceiling, and a deterministic calculator, all bounded.

**Mapping onto our engine.** The engine already produces a weekly volume curve
and a long-run arc, and it already enforces the roughly ten percent weekly
ceiling (`WEEKLY_STEP_CEILING`), the long-run share ceiling
(`LONG_RUN_SHARE_CEILING`), the taper (a 41 to 60 percent volume cut, per the
wave-6 taper constants) and the deload cadence. The load model adds three things,
and only three:

1. **A phase fitness target, derived from the plan's own curve.** The target band
   is read from the volume the engine already planned for that phase, not from an
   external ambition. The model's job is to check whether the plan's own ramp
   keeps the modelled form inside a sane band, and if not, to suggest easing. It
   never sets a distance or a weekly load.
2. **A form floor, scaled by experience.** Like Athletica, form (TSB) should not
   fall below a floor, and the floor is shallower for beginners and deeper for
   advanced runners. Crossing it only ever triggers an ease, never a change to
   the plan's architecture.
3. **A confirmation of the taper.** The model checks that modelled form is rising
   into race week, which is what the engine's taper is already designed to do. It
   reports, it does not design the taper.

**The bounded-change rule.** The model may move a future week's volume within
`[planned * (1 - maxEase), planned]`: it may ease or hold, never build past the
engine's own curve. This is the same bound the §6.6 nightly queue already
specifies ("volume stays within the ~10 percent weekly ceiling, and the number of
sessions and training days never changes"). Any conflict resolves toward the
safer bound, and a taper or recovery week is left alone.

**Precedence, stated explicitly.** Safety ceilings first, then the phase fitness
target, then readiness modulation, then narration. The model cannot raise load
above a safety bound; readiness cannot raise load above the plan; and the
deterministic plan stands if anything is missing or invalid.

**Continuous readiness as the modulator (the other gap).** The landscape's
section 7.2 notes that our readiness is a flag, not a curve: `recovery.ts` raises
a binary `strained` flag from resting HR, HRV, sleep, SpO2, respiratory rate and
night temperature against a personal baseline, and `adapt.ts` surfaces it as an
advisory "ease". The improvement is to turn that into a continuous score: a
z-score or a 0 to 100 readiness read against the runner's own baseline, with the
same inputs plus the RPE trend. The score then modulates the next week's load as
a bounded multiplier in `[0.85, 1.0]`: as readiness falls, the week eases; it can
never raise load above the plan. Two honest caveats carry over from our own
research: HRV-guided training's benefit for maximal aerobic capacity and endurance
performance is "small" and non-significant (Manresa-Rocamora et al. 2021), and a
2025 randomized trial found "no interaction effects between groups" between heart
rate, race-pace and HRV prescription (Ranieri et al. 2025). So readiness is a
channel to avoid unnecessary hard days, not a fitness optimizer, and the copy
should never promise otherwise.

**Manual by default.** The model computes and the engine proposes. Nothing
auto-applies outside the §6.6 mode switch, the bounded change, the cooldown, the
record and the revert.

## 4. Fit with what we have

**The engine (`packages/shared/src/plan/engine.ts`).** The plan already computes
every session's distance, duration, pace and intensity. A pure function can score
each planned session's load from those, so `PlannedSession` gains a `load` field
and `PlannedWeek` a summed `targetLoad`. This keeps the load maths in the pure,
unit-free engine, consistent with the rule that the engine owns the numbers.

**`fitness.ts`.** This is the natural home, or a sibling pure module
(`packages/shared/src/plan/load.ts`). It already reads logs into a `FitnessState`
(effective VDOT, recent weekly km, RPE trend, liked/disliked types, samples) with
no I/O and an injectable `now`. Add a load read to that state: per-session scores
from the logs, the daily CTL/ATL/TSB series, and the readiness score. It stays
pure and testable, which is exactly what the testing philosophy wants (the curve
math is decision logic that is cheap to test).

**`adapt.ts`.** The suggestions list gains a load/form adjustment kind, but it
stays advisory, like every other suggestion. The existing band rules (missed
sessions, volume under/over, fatigue, run-spike, cross-load, recovery) remain,
both as the fallback and as the safety net that still fires when the model is
silent.

**`adaptive.ts`.** `adaptPlan` already seeds the rebuild from `fitness` (recent
weekly km and a recent hard effort) and layers the model's per-week `WeekShape` on
top. It would additionally read the load curve: the phase fitness target and the
form floor feed the deterministic hold/ease decision, and the existing
bounded-change rule (future weeks only, volume inside the ceiling, session count
unchanged) keeps it safe. The `WeekShape` vocabulary already has `volumeIntent`
(ease/hold/build); the model's load read would set `ease` or `hold`, never
`build`.

**The API (`apps/api/src/routes/plans.ts`).** It already builds `fitnessState`
from the last 28 days of logs and passes it to `adaptPlan` and to the shaping
pass, and it already reads `crossLoad`. It would also build the load curve from
the same logs and pass it down. No new AI call, no new latency, and the plan path
stays instant and offline. `apps/api/src/lib/recovery.ts` and
`packages/shared/src/plan/recovery.ts` become the readiness score rather than the
binary flag.

**The stored shape.** The data is mostly already there:

- `logs.run_stats` already carries `distanceKm`, `durationSec`, `avgPaceSecPerKm`
  and an optional `avgHr`, plus `rpe`. The computed per-session load can be stored
  on the log (a small additive, nullable `load` column, or a field in
  `run_stats`) so history is not recomputed every read.
- The daily CTL/ATL/TSB series can be derived on read from the logs, or cached;
  either way it is a pure function of the logs.
- `plans.params` (the stored `PlanParams`) can carry the phase fitness target band
  for the plan.
- `settings.prefs` carries the tunables (the time constants, the form floor, the
  readiness weight) as data, not new columns, matching the "data over code" rule.

Any schema change is additive: a nullable `load` column on `logs`, nothing
destructive, so it goes through the normal auto-apply path rather than the manual
DB Migrate workflow.

**Cold start and graceful degradation.** This is the part to get right, because
both existing plans and brand-new runners have no load history.

- **No history.** CTL starts from zero, or is seeded from the first planned week's
  load so the curve is not anchored at a false floor. The model shows nothing
  until there are enough logged sessions to mean something (a few weeks), and it
  never invents a fitness number.
- **Existing plans with no load history.** Recompute the load curve from whatever
  logs exist; where there are none, the model stays silent and the band rules
  carry on exactly as today.
- **Missing RPE.** Fall back to the pace-based score. **Missing both.** Skip the
  session entirely: a zero would read as a rest day and drag the curve down
  wrongly, so an unscoreable session contributes nothing.
- **Strictly additive.** If anything is missing, invalid, or thin, the plan is
  exactly the current plan. The model can only ever ease or hold, so its failure
  mode is "no change", not "bad change".

## 5. Failure modes and what not to do

**Do not let the model drive load up.** Its own optimisation says "train
maximally or not at all" (Ceddia et al. 2025). The upward bound must come from
the engine and the cohort evidence, not the model: the single-session spike rule
(a run more than 30 percent over the previous 30-day longest run raised overuse
injury, Frandsen et al. 2025) and the weekly progression caution (Nielsen et al.
2014). The model eases or holds; it never builds.

**Ramps are heuristics, not laws.** The "10 percent rule" is coaching convention;
a randomized trial of 532 novice runners found injury incidence of 20.8 percent
on a 10 percent-rule program against 20.3 percent on a standard program, which is
noise (Buist et al. 2008, as reported by the Coach AI explainer). The "5 to 8 CTL
per week" ramp is a coaching heuristic too. Do not encode either as a hard rule;
the engine's existing ceilings are the load-bearing safety, and the load model
does not add another.

**Do not over-react to one hard week.** ATL is designed to spike from a single
big session and to decay within days. A single high-ATL day is expected
behaviour, not a reason to cut the plan. Require a sustained signal across
several days and honour the cooldown the §6.6 design already specifies, so a plan
cannot thrash on one session.

**ACWR as a threshold is out.** State it plainly, as our own research already
does. The ratio fails to normalise its numerator by its denominator, the 0.8 to
1.3 "sweet spot" is an unvalidated heuristic from an illustrative figure, the
running-specific evidence is inconsistent or even inverted, and the critique
recommends dropping it (Impellizzeri et al. 2020, 2021; our wave-1
`4b-load-management.json` and wave-4 `progress-metrics.json` both say do not
present it as a validated risk predictor). Do not ship it, and do not ship a
monotony or strain headline either: that evidence base is a single N=25 study and
the metrics multiply noisy quantities (Foster 1998; our wave-4 note).

**Do not mix load methods.** Vermeire et al. 2021 shows they "cannot be used
interchangeably". One method, one scale, stored per session.

**Do not present the model as predictive truth.** Its parameters are unstable,
general constants are discouraged, and the model is univariate and its predictive
efficiency is "mitigated" (Vermeire et al. 2022; Imbach et al. 2022). Present it
as a descriptive trend with named caveats.

**Do not promise that adaptive beats predefined.** The measured benefit is small
and often non-significant (Manresa-Rocamora et al. 2021; Ranieri et al. 2025).
Success here is a plan that stays inside its bounds and reacts sensibly, not a
promised performance gain, and the copy must say so.

**Do not let readiness raise load.** It may only lower it. And do not silently
auto-apply: manual by default, §6.6 gating for automatic.

## 6. How we would know it works

The evaluation ties directly to the plan-quality rubric and backtest task
(section 8 item 3 of the landscape). In descending order of what we can actually
do:

1. **Extend the rubric with load-model criteria.** The plan-quality rubric gains
   criteria that are specific to this model: modelled form never falls below the
   experience-scaled floor; the taper raises form into race week; no single day
   spikes beyond the fitness-scaled ceiling; and the model never pushes a week
   above the engine's own curve. These are scoreable by us against the wave-6
   constants, and by a coach in the Düking and Havers method the landscape
   describes.
2. **Backtest the invariants.** Run generated plans through the load model and
   assert the ceilings and progression invariants hold, as pure engine tests.
   This is the cheapest credible evidence and it belongs in `packages/shared`,
   colocated with the curve code, per the testing philosophy.
3. **A descriptive retrospective check on real logs.** On the runners' own logs,
   check whether the modelled form tracks how they actually felt (the RPE trend
   and the readiness score) and whether low form preceded reported strain. Report
   this as a correlation, explicitly not a prediction, because the model's
   predictive efficiency is mitigated (Imbach et al. 2022).
4. **Compare against the band-rule baseline.** The real question is whether the
   load model changes any decision the band rules would not. If it changes
   nothing, it adds nothing and the band rules stay. If it changes many things,
   suspect over-reaction. The bar is a small, explainable difference, and the
   model must be able to say why it moved a week.

**What would count as evidence for us.** The rubric score and the invariant tests
(the field's cheapest credible standard, per the landscape's section 5), a small
backtest on our own plans, and the readiness-versus-feel correlation as a
descriptive check. A controlled outcome trial, the strongest evidence in the
landscape's ranking, is out of reach for two users, and we should say so rather
than imply the model has been validated.

**Kill criterion.** If the load curve never changes a decision the band rules do
not, or if it degrades the plan's safety invariants, keep the band rules and the
model as a display only. The model earns its place in the decision path, or it
stays a trend line.

## Headline recommendation

Build the load model as a pure, deterministic lens in `packages/shared`, scoring
each session with sRPE (RPE times duration) as the primary measure, an rTSS-lite
pace fallback, and an optional estimated hrTSS. Compute fitness, fatigue and form
as exponentially weighted moving averages with the conventional 42 and 7 day
constants exposed as tunables, never as fixed truth. Let it move load only inside
the engine's existing safety ceilings, easing or holding but never building, with
a phase fitness target read from the plan's own curve, an experience-scaled form
floor, and a continuous readiness score that can only lower load. Keep it
strictly additive, so a missing input leaves the current plan untouched, and
manual by default, so nothing auto-applies outside the §6.6 gating. Say plainly
that adaptive training's measured benefit over predefined plans is small, and
that the model describes fatigue and freshness rather than predicting
performance.

## Sources

**Product documentation (fetched).**

- TrainingPeaks, "What is the Performance Management Chart?" (7-day fatigue, 42-day
  fitness, form as fitness minus fatigue; the form bands).
- TrainingPeaks, "What Is TSS?" (100 points for an hour at threshold; the family
  seeded from Banister's TRIMP).
- TrainingPeaks Help Center, "Training Stress Scores (TSS) Explained" (rTSS from
  NGP relative to functional threshold pace; hrTSS from time in LTHR-based zones;
  the accuracy ordering).
- Athletica, "Training Load: The Banister Model and How Athletica Applies It"
  (CTL/ATL/TSB windows; the phase fitness target inside guardrails; the form
  floor scaled by experience; the daily spike ceiling; the deterministic
  rule-based calculator).
- Coach AI, "What Is TRIMP? How to Calculate Training Impulse" (the Banister HR
  formula and its sex-specific weighting; the Edwards, Lucia and iTRIMP variants;
  the ACWR critique and the CTL ramp heuristic, with its own sources listed).

**Peer-reviewed and technical literature (abstracts fetched).**

- Banister EW, Calvert TW, Savage MV, Bach T. "A systems model of training for
  athletic performance." *Australian Journal of Sports Medicine* 1975;7(3):57-61.
  And Calvert TW, Banister EW, Savage MV, Bach T. *IEEE Trans Syst Man Cybern*
  1976;2:94-102. The original fitness-fatigue model.
- Morton RH, Fitz-Clarke JR, Banister EW. "Modeling human performance in running."
  *J Appl Physiol* 1990;69(3):1171-1177. doi:10.1152/jappl.1990.69.3.1171.
- Busso T. "Variable dose-response relationship between exercise training and
  performance." *Med Sci Sports Exerc* 2003;35(7):1188-1195.
  doi:10.1249/01.MSS.0000074465.13621.37.
- Imbach F, Sutton-Charani N, Montmain J, Candau R, Perrey S. "The Use of
  Fitness-Fatigue Models for Sport Performance Modelling: Conceptual Issues and
  Contributions from Machine-Learning." *Sports Med Open* 2022;8:29.
  doi:10.1186/s40798-022-00426-x. PMID 35239054. PMC8894528.
- Vermeire K, Ghijs M, Bourgois JG, Boone J. "The Fitness-Fatigue Model: What's
  in the Numbers?" *Int J Sports Physiol Perform* 2022;17(5):810-813.
  doi:10.1123/ijspp.2021-0494. PMID 35320776.
- Vermeire KM, Van de Casteele F, Gosseries M, Bourgois JG, Ghijs M, Boone J.
  "The Influence of Different Training Load Quantification Methods on the
  Fitness-Fatigue Model." *Int J Sports Physiol Perform* 2021;16(9):1261-1269.
  doi:10.1123/ijspp.2020-0662. PMID 33691278.
- Ceddia D, Bondell H, Taylor P. "Mathematical Modelling and Optimisation of
  Athletic Performance: Tapering and Periodisation." arXiv:2505.20859, 2025. The
  model equations, the fitted time constants, the Busso model, and the finding
  that optimising the Banister model recommends "train maximally or not at all".
- Borresen J, Lambert MI. "The quantification of training load, the training
  response and the effect on performance." *Sports Med* 2009. The sex-specific
  TRIMP weighting factors (equation 3).
- Manzi V, Iellamo F, Impellizzeri FM, D'Ottavio S, Castagna C. "Relation between
  individualized training impulses and performance in distance runners." *Med Sci
  Sports Exerc* 2009. iTRIMP.
- Foster C, Florhaug JA, Franklin J, et al. "A new approach to monitoring exercise
  training." *J Strength Cond Res* 2001;15(1):109-115. Session-RPE.
- Halson SL. "Monitoring training load to understand fatigue in athletes." *Sports
  Med* 2014;44(Suppl 2):S139-S147. doi:10.1007/s40279-014-0259-8.
- Liu Y, Li C, et al. "Session-RPE for quantifying the load of different training
  sessions in endurance athletes: a systematic review and meta-analysis." *PeerJ*
  2023;11:e15604. doi:10.7717/peerj.15604.
- Haddad M, Stylianides G, Djaoui L, Dellal A, Chamari K. "Session-RPE Method for
  Training Load Monitoring: Validity, Ecological Usefulness, and Influencing
  Factors." *Front Neurosci* 2017;11:612. doi:10.3389/fnins.2017.00612.
- Impellizzeri FM, Tenan MS, Kempton T, Novak A, Coutts AJ. "Acute:Chronic
  Workload Ratio: Conceptual Issues and Fundamental Pitfalls." *Int J Sports
  Physiol Perform* 2020;15(6):907-913. doi:10.1123/ijspp.2019-0864.
- Impellizzeri FM, Woodcock S, Coutts AJ, Fanchini M, McCall A, Vigotsky AD.
  "What Role Do Chronic Workloads Play in the Acute to Chronic Workload Ratio?
  Time to Dismiss ACWR and Its Underlying Theory." *Sports Med*
  2021;51(3):581-592. doi:10.1007/s40279-020-01378-6.
- Frandsen JSB, Hulme A, Parner ET, et al. "How much running is too much?
  Identifying high-risk running sessions in a 5200-person cohort study." *Br J
  Sports Med* 2025;59(17):1203-. doi:10.1136/bjsports-2024-109380.
- Nielsen RØ, Parner ET, Nohr EA, Sørensen H, Lind M, Rasmussen S. "Excessive
  progression in weekly running distance and risk of running-related injuries."
  *J Orthop Sports Phys Ther* 2014;44(10):739-747. doi:10.2519/jospt.2014.5164.
- Buist I, Bredeweg SW, van Mechelen W, et al. "No effect of a graded training
  program on the number of running-related injuries in novice runners: a
  randomized controlled trial." *Am J Sports Med* 2008. The 10 percent rule test.
- Manresa-Rocamora A, Sarabia JM, Javaloyes A, Flatt AA, Moya-Ramon M. "Heart
  Rate Variability-Guided Training for Enhancing Cardiac-Vagal Modulation,
  Aerobic Fitness, and Endurance Performance." *Int J Environ Res Public Health*
  2021;18(19):10299. doi:10.3390/ijerph181910299. PMID 34639599.
- Ranieri LE, Casado A, Martin D, et al. "Performance and Physiological Effects of
  Race Pace-Based Versus Heart Rate Variability-Guided Training Prescription in
  Runners." *Med Sci Sports Exerc* 2025;57(7):1510-1522.
  doi:10.1249/MSS.0000000000003671. PMID 39935030.
- Foster C. "Monitoring training in athletes with reference to overtraining
  syndrome." *Med Sci Sports Exerc* 1998;30(7):1164-1168. The monotony/strain
  N=25 origin.

**Internal research reused.**

- `research/wave-1/4b-load-management.json` (sRPE formula and validity; ACWR as a
  contested, non-threshold signal; monotony and strain as weak).
- `research/wave-4/progress-metrics.json` (sRPE validity; ACWR recommended to be
  dropped; the load measures and their support levels).
- `research/wave-6/plan-systems-landscape.md` (the gap, sections 7.2 and 8; the
  Athletica, TrainingPeaks and TrainerRoad comparison; the small adaptive-vs-
  predefined benefit).
- `research/wave-6/plan-structure.md` (the taper, the weekly ceiling and the
  long-run share the engine already enforces).
