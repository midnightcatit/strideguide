# Plan quality rubric

This is the criteria a generated plan must meet, written down so a plan can be
judged instead of eyeballed. Every line comes from the wave-6 research in
[plan-structure.md](./plan-structure.md); nothing here is invented. Each criterion
is marked **hard** (the engine must always satisfy it, and the backtest asserts it
on every generated plan) or **soft** (a target the plan should aim at, which the
evidence leaves room to flex). The backtest that enforces the hard ones is
[`packages/shared/src/plan/plan-quality.test.ts`](../../packages/shared/src/plan/plan-quality.test.ts).

## How to read this

The hard criteria are the structural promises the engine makes: the shape of a
week, the ceiling on a single run, the count and spacing of hard days, rest, the
taper and the post-race weeks. They are checked against the plan as delivered, so
the numbers a runner actually sees are the numbers tested.

The soft criteria are the parts the research says are a judgement call: the exact
long-run share, the exact progression rate, the exact taper depth. They are
described here so a change can be argued against them, but a plan is not failed
for landing near one end of the band rather than the other.

One convention runs through all of this: the engine's long run is plain easy
running, so it is **not** counted as a quality day. Wave-6 counts a long run as a
quality day only when it carries pace work, which this engine's long run does not.

## 1. Weekly volume progression ceiling

**Hard.** Across the build (base, build and peak phases), no week's running
volume may rise more than about thirty percent over the week two weeks before it.
This is the one part of the progression question with prospective evidence: a
one-year cohort of novice runners found that those who progressed by more than
thirty percent over two weeks had a higher rate of distance-related injury
(Nielsen et al. 2014, plan-structure section 6, constants item 9). The two-week
window is deliberate: a deload week steps the volume down on purpose, and the week
after it returns toward the trend, so a single-week comparison would flag the
normal stepback pattern.

**Soft.** The build should aim near ten percent a week. The famous ten percent
figure is coaching convention, not a proven rate, so the plan is judged on the
hard two-week ceiling, not on hitting ten percent exactly.

## 2. Long-run share and its ceiling

**Hard.** The long run is at most half the week's running volume, and never past
the goal's own maximum long-run distance. Wave-6 sets a hard ceiling near fifty
percent (plan-structure section 5, constants item 5) and a practical distance cap
per goal (item 8): the marathon tops out around 32 to 35 km, the half near 20 km,
and the shorter goals lower again. The engine holds both as hard constants, so the
delivered plan must keep them.

**Soft.** The share should fall as weekly volume rises: roughly 35 to 50 percent
at low beginner volume, roughly 25 to 30 percent at moderate to high volume. The
sources spread from 20 to 50 percent and wave-6 calls the exact percentage
genuinely unsettled, so the shape is a target, not a law.

## 3. Long-run arc reaching the goal peak

**Soft.** The long run should build toward the goal's own peak where the weeks
allow, so a half-marathon plan reaches a real half-marathon long run rather than
stopping at the base. Wave-6 section 5 gives the goal-relative peaks.

**Hard (the warning).** When the base and the weeks available cannot reach the goal
peak, the plan must say so rather than quietly shipping a short long run. A race
goal whose longest run stays under ninety percent of the goal peak carries a
plain warning.

## 4. Quality session count

**Hard.** A week carries at most two hard sessions, and a beginner at most one.
Wave-6 section 1 (constants item 1): two quality days for 5K and 10K and for
intermediate runners, one to two for the half and marathon, zero to one for
beginners. A recovery week carries none.

## 5. Hard-session spacing

**Hard.** Two hard sessions in a week sit at least three days apart, which is two
easy days between them. Daniels writes that a runner should always have two or
three easy days between quality days (plan-structure section 1, constants item 2).
The long run is kept off the hardest quality day, since it is already the heaviest
single session (section 3, constants item 7).

## 6. Rest days

**Hard.** Every week keeps at least one true rest day, and a beginner keeps two. A
rest day is a calendar day with no run, no strength work and no sport; mobility
does not count against it. Wave-6 section 7 (constants items 12 and 14): one to
two rest days for most runners, more for beginners, and no source schedules a
zero-rest week. The runner's available days are a ceiling, not a target, so a
runner who offers all seven days still gets a rest day.

## 7. No token runs

**Hard.** No running session is under fifteen minutes. Wave-6 section 2 (constants
item 3): the day after a long run is rest, cross-training or a real recovery run
of about 20 to 40 minutes, and a token sub-15-minute jog is not better evidenced
than rest. The engine's own shortest easy run exists to prevent exactly this, so
the delivered plan must never schedule one.

## 8. Taper reduction

**Hard.** Volume falls off the peak across the taper and never rises within it,
and the last taper week is lighter than the peak. The taper is the best-evidenced
part of plan structure: two meta-analyses agree that cutting volume while keeping
intensity improves performance (Bosquet et al. 2007; Wang et al. 2023,
plan-structure section 6, constants item 11).

**Soft.** The cut should land in the 41 to 60 percent band over about two weeks.
A short run-in may taper less deeply, and a longer one more, so the depth is a
target rather than a fixed rule.

## 9. Recovery weeks after the race

**Hard.** The goal's easy weeks follow the race week, carry easy running only (no
long run, no quality session and no strength work), and are not heavier than the
build peak. Wave-6 section 7 and the engine's own recovery-week rule both say the
weeks after a race are for easy running, so a week labelled recovery that is
heavier than the hardest build week is a contradiction.

## 10. Phase shape

**Hard.** A race plan runs base, then build, then peak, then taper, and the
heaviest build week lands before the taper starts. The race itself lands in a
taper week. Wave-6 sections 1 and 6: the plan builds, sharpens, then cuts volume
into the race, and the peak precedes the taper by construction. A profile that
ships no progression rules still gets this arc.

## What the backtest checks

The backtest generates a matrix of plans (every goal profile, beginner through
advanced, a low and a high weekly volume, three to seven available days, with and
without a target date, with and without saved schedule windows) and asserts each
hard criterion above on every plan. A failure names the exact inputs and the week.
The soft criteria are documented here so a change can be weighed against them, but
the backtest does not fail a plan for missing a soft target.
