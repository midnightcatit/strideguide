# Decision log

A running record of decisions made in this repo, newest first. Entries are never
edited, only added. When a later decision replaces an earlier one, it gets a new
entry that names the old one and says what changed, so the trail of reasoning stays
intact even after the PR body is out of sight.

Each entry is short: a title, the date, what was decided, why, and what it rules
out. It cites the file or PR that shows the decision.

---

## Strength sessions rotate moves by a seed, and the lean becomes a pill

2026-11-28

Decided: the strength builder stops repeating one fixed circuit. Within each
pattern slot the move is a seeded pick from that slot's pool, seeded by a stable
hash of (plan seed, week, day, slot): the same seed always gives the same plan,
and different weeks or days differ. A move used in the last three strength
sessions is deprioritized, and when a tier's pattern pool is spent the builder
widens to bodyweight and then to any move rather than repeat, so nothing repeats
inside that window while the pools allow. The lower-body spine keeps its pattern
order (squat or leg press, hinge, knee flexion, calf) and its own exercise rotates
within its pattern, so the squat slot moves from leg press to hack squat across
weeks instead of staying fixed. The accessories are shuffled by the same seed. A
session picks its equipment tier first, from the runner's kit and prefs (machines,
dumbbell, band, bodyweight; barbell and kettlebell sit with dumbbell), and takes
its moves from that tier, topping up from bodyweight only when a pattern has no
move there, which is what makes a two-tier session. The session title is now a
composition read from the tiers the moves actually hold: one tier reads "Machine
circuit", "Bodyweight circuit", "Band circuit" or "Dumbbell circuit"; two read
"<A> and <B> circuit"; three or more read "Mixed circuit". The lean is no longer
the title. It becomes a prescription `focus` pill naming the parts the lean adds,
in the finer body-part vocabulary the workout filters already use, joined with
" + ", most-emphasized first, at most three parts, and "full body" for an unleaned
day; the card and the session detail render it as a pill. Reps now climb across a
phase's own weeks rather than stepping only at the boundary: base runs 10 then 11
then 12, the phase change resets with its drop to build's 8 and peak's 6, and RPE
drifts up a point across the phase (6 at the low end to 7 at the top). Sets keep
the existing rule. The two weekly strength days differ by more than the lean:
their accessory moves and order differ by the seed, and the spine stays.

Why: the owner saw a real 25-week production plan use 14 distinct moves across 336
slots, the same 8 moves in the same order for 40 of 42 strength sessions, and 2
sets of 10 reps everywhere, because a beginner sits at 2 sets and reps only moved
at phase boundaries, while the catalog now holds 227 moves. The phase arc, rest
bands and set rule are kept because they are the researched parts
(research/wave-7/17a, the 2009 ACSM position stand). The within-phase rep ramp is
not covered by the corpus, so it is backed by a wave-9 note
(research/wave-9/within-phase-progression.md) that cites the real progression
sources: the 2009 ACSM position stand (8 to 12 RM for novices, and a load increase
when the current load is performed for one to two reps over target, the
reps-before-load rule) and Kraemer and Ratamess, 2004. The exact numeric path is a
chosen encoding of that rule plus the phase arc, not a trial-tested curve, and the
note says so.

Rules out: one fixed circuit on every strength day; a fixed squat in the spine;
the lean as the title; a title that claims an equipment tier the moves do not
hold; a session whose mix the equipment mode cannot explain; a flat rep count
across a phase; and reading the ramp as research it is not. Supersedes the title
and the fixed-rotation parts of "Strength sessions are full-body with a lean, not
split days" and of "The week rotates the strength focus across the body": the lean
still exists and still adds rather than replaces coverage, the lower-body spine
still leads every session and still carries about two thirds or more of the
working sets, and the arc and set rule are unchanged.

---

## Strength sessions are full-body with a lean, not split days

2026-11-27

Decided: every generated strength session keeps a lower-body spine in a fixed
priority order (a squat or leg-press pattern, a hip hinge, knee flexion, calf
work), followed by the lean's extra move for its area and then one or two
upper-body or core accessories. The day's focus adds to this spine rather than
replacing it. With two weekly strength sessions both lean legs and hips (their
first accessory alternating push and pull across the week); with three, two lean
legs and hips and one leans upper body and core; a single scheduled strength day
stays full-body with no lean. An upper-body accessory never displaces a
lower-body pattern: the spine leads every sequence, so a short session (a heavy
sport week trims the circuit to four moves) loses accessories before it loses
leg patterns. A chosen heuristic keeps about two thirds or more of the working
sets in the lower body, stated as a heuristic in the session's why. Lean days
carry plain titles ("Leg day", "Upper body day") and whys in plain body-part
words, with no "upper push" or "upper pull" jargon. Each why names only the
accessory work the built circuit actually holds, so a session too short for an
accessory says so instead of claiming whole-body work, and the why keeps the day
honest about what it does carry. The phase arc follows the research
too: the full requested count in base, at most two maintenance sessions through
a race build and peak with a set cut and the load kept, one short session in the
first taper week, and none in the final days before the race. When a phase asks
for fewer sessions, the dropped strength day goes quiet (a rest day) instead of
becoming more running, so the week's running days stay the same from the first
week to the last. This supersedes "The week rotates the strength focus across
the body" (2026-11-26): its focus vocabulary survives as the lean, but the
layout it produced (a legs day, an upper push day, an upper pull day)
concentrated most muscles into about one weekly exposure at the runner's two to
three sessions. Its rule-out lines (the same circuit every day, a bodybuilding
split that ignores running) still hold.

Why: research/wave-7/17a-strength-session-structure.json. The runner review
(Blagrove et al, 2018) reports 2 to 3 weekly strength sessions with a lower-limb
focus, and no runner trial compares splits with full-body structure; a
14-study meta-analysis (Ramos-Campo et al, 2024) found split and full-body
equivalent once weekly volume is equated, so full-body is a practical choice at
this session count, not a verdict against splits. Lower-body emphasis
dominates because maximal lower-limb force shows the largest performance
transfer (Berryman et al, 2018) and no runner-specific evidence says
upper-body training improves running, so upper-body work is a small accessory
dose and the first thing cut. The two-thirds set share is a chosen heuristic,
not a figure derived from the trials, and the why says so by keeping it a plain
claim about the session's shape. The maintenance and taper arc matches the
same file: cut to one or two sessions through build and peak with the load
kept, one short session early in the taper, nothing heavy in the final days.

Rules out: isolated leg, upper push or upper pull days at two to three weekly
sessions; an upper-body accessory taking a lower-body pattern's slot; heavy
strength in the final days before the race; and jargon like "upper push" in
user-facing text.

---

## Mobility anchors on the stated tight area and roams one stretch around it

2026-11-27

Decided: a generated mobility session is composed in the engine instead of
naming one library workout. The runner's voted focus (from their niggles,
terrain and sports, at any flexibility gap) anchors the session: the same two
static holds for that area at every session, two rounds of 30 to 45 seconds
each, never shortened by rotation. One roaming stretch per session rotates
through the other common runner areas along one shared order, so sessions and
weeks differ while the tight area's dose stays fixed, and a stretch never roams
twice before the whole order has cycled. When a week carries at least three
composed sessions, one of them anchors on the runner-up vote instead (with no
second vote, the next common runner area), while the stated focus keeps a clear
majority of the composed work. A favorite mobility workout weights the rotation
rather than overriding it: it takes every second session of the plan, so the
composed variants still cycle through the weeks it does not take. Every stretch
that targets a muscle counts toward that muscle's weekly dose, roaming overlaps
included; a drill that is a movement rather than a hold stays in the dynamic
warm-up and never counts as static dose; and nothing is scaled up past the
static plateau of about ten minutes a week per target muscle, though lower
weekly doses still produce gains. This annotates the earlier behaviour of
aiming the mobility routine at the runner's stated areas: the aim stays,
rotation is added around it.

Why: the engine named one library routine for every mobility session in the
plan, so the same stretches repeated everywhere. Research/wave-7/17b found that
range gains ride on cumulative weekly stretch time per muscle (about ten
minutes a week at the plateau, with lower doses still working), that how the
minutes are spread across the week matters less than showing up, and that
variety's value is coverage and adherence, so the routine composes as a fixed
anchor plus one rotating roam (research/wave-7/17b-stretch-variety-dose.json).
The anchor pair per focus is chosen so its targets do not overlap, which keeps
a daily anchor just under the plateau and leaves rotation nothing to shorten.

Rules out: shortening the anchor to make room for variety, swapping a high
frequency week down to a single session on the stated area, scaling mobility
volume up past the static plateau the way running volume scales, and a favorite
workout wiping out the variation it used to replace. The session detail's
stretch list now varies per session by construction.

---

## The CodeRabbit review is advisory, not a merge gate

2026-11-27

Decided: a PR merges on a green CI gate. The CodeRabbit review still runs and its findings are still
handled, but nothing waits on the review cycle. A comment carrying a suggested diff is applied
verbatim when it holds up; every other finding goes to `backlog/` with the reason and a permalink,
and the thread is resolved pointing at the entry. The one exception is a release blocker (a security
hole, data loss, a broken build or auth path), which is fixed before merge whatever the tag says.
`reviews.auto_review.auto_pause_after_reviewed_commits` is 0, so a branch with several quick commits
still gets reviewed instead of having its review paused (AGENTS.md "CodeRabbit review").

Why: the wait dominated the work. A paused or slow review held merges for tens of minutes at a time,
and the findings it produced were mostly handled by taking its own suggested diff or deferring them,
neither of which needs the review to finish first. Auto-pause, on by default at five reviewed
commits, was the specific cause of reviews stalling on busy branches; the config now turns it off.

Rules out: scheduling wakeups to wait on a review, merging with an unresolved thread that has no
backlog entry, and hand-writing fixes for findings that were never applied. The review stays useful
as advice; it just does not gate.

---

## CodeRabbit findings are applied by suggestion or backlogged, not hand-fixed

2026-11-27

Decided: review findings are cleared in two ways, and the main session stops
rewriting code in a loop for them. A comment that carries a suggested diff is
applied verbatim (its suggestion action) after the diff is read and the gate
passes; a comment CodeRabbit can fix itself is handed to it; and a finding we
do not apply is recorded in `backlog/` with the reason and the source link.
Only non-blocking findings are backlogged: a release-blocking one (a security
hole, data loss, a broken auth path) is fixed before merge, whatever the
review's severity tag says. Threads resolve against one of those two
outcomes, and a PR merges with the review green and no comment left open
(AGENTS.md "CodeRabbit review", backlog/README.md).

Why: three review rounds on the rest-card PR (#293) produced hand-written
fixes for every comment, which is slow, drifts the code away from what the
reviewer looked at, and spends session budget on prose-level findings. The
suggested diff is what the reviewer expects to see applied, and the backlog
keeps a genuine deferral visible instead of resolved by silence.

Rules out: merging with an open review thread, silently dismissing a finding,
and endless fix re-reviews over the same lines. Also out: backlogging a
release-blocking finding. The review is still read on its own: a suggestion is
applied only after the diff is verified, so a wrong suggestion is backlogged
or reworked rather than clicked through.

---

## Rest between strength sets is a band, and rest is an explicit card

2026-11-27

Decided: the engine gives every strength move its rest from a phase band instead
of a flat 75 seconds: 45 to 60 seconds in base, 75 to 90 in build, 90 to 120 in
peak, with the runner's level nudging inside the band (a beginner at the short
end, an advanced runner at the long end), snapped to five seconds. A plyometric
move always takes at least 90 seconds so every contact stays sharp. A taper
week keeps the build band and the post-race recovery weeks rest like the base.
The rest is now an explicit step in the guided sequence (`kind: 'rest'`): one
card after each set, where the card after a move's final set is the pause
before the next move, and the final set of the final move runs straight into
the cool-down, which stays rest-free. The player's implicit rest machinery is
gone: the "Rest now" button and the countdown it armed are replaced by the rest
card, which ticks by itself and can be extended 30 seconds at a time. The Skip
rest control confirms first and names what skipping costs, while moving through
the stage list passes a rest card with no prompt. The session's
length estimate is the sum of its parts (drills, work at about four seconds a
rep plus setup, and rest) instead of a flat 50 minutes. The detail page's
"What's to come" list stays work-focused, one row per move, with rest cards
visible only in the player's flow.

Why: the ACSM position stand on progression models (Med Sci Sports Exerc,
2009;41(3):687-708) recommends two to three minutes between sets of heavy core
lifts and one to two minutes for assistance work, and a review of
time-efficient training (Iversen et al, 2021) advises one to two minutes for
untrained lifters and at least two minutes for trained ones. This app
prescribes strength at RPE 7 to 8 on purpose, so the bands sit at the short end
of that evidence. The flat 75 seconds paid the same rest for a 10-rep base
session and a 6-rep heavy one, and the rest lived outside the sequence, where
the runner could not see it coming or skip it knowingly
(`packages/shared/src/plan/rest.ts`, `engine.ts`,
`apps/web/src/lib/components/SessionPlayer.svelte`).

Rules out: one flat rest for every phase and level, an implicit rest that
starts whenever a set is marked done, and shrinking the work to fit a time
budget. Stored sessions that predate the change get rest cards at load time
(`withRestCards`), so no migration is needed.

---

## Plan warnings reach the runner

2026-11-27

Decided: the engine's `meta.warnings` are stored on the plan's params at
generation and shown on the plan overview as written, and the preview rebuild's
warnings ride on the preview response and show in onboarding on the screens the
runner lands on after the rebuild. This supersedes the follow-up note in "A
mid-week start opens with a short week, and the week floor follows the goal and
the runner", which said the rebuild warning is returned but not shown; it is
shown now.

Why: both warning sources were computed and then dropped. The generate route
built params without the engine's notes, and the preview route read only the
weeks out of the rebuild. The notes are already plain sentences about the plan,
so the surfaces show them as written, with no new wording of our own
(`apps/api/src/routes/plans.ts`, `apps/web/src/routes/progress/plan/+page.svelte`,
`apps/web/src/routes/onboarding/+page.svelte`).

Rules out: a warning the engine or the rebuild computed that never reaches the
runner, and reworded or invented warnings on the client. The stored engine
warnings stay the ones from generation: a preview rebuild does not re-derive
them, because the rebuild's own engine pass sits inside `rebuildFromWeekOne` and
its meta is not returned.

---

## Every PR waits for a complete CodeRabbit review before merge

2026-11-27

Decided: every PR gets a CodeRabbit review. After opening a PR, wait for the review
rather than merging on the CI gate alone, by scheduling a wakeup instead of blocking
the turn. Read the review comments yourself, resolve every addressable artifact
(nitpicks, outside-diff comments, inline comments and review summaries), and merge
only when the review is complete and clean and the CI gate passes. A subagent's PR
follows the same rule.

Why: the CodeRabbit check status alone does not show whether comments are still
open, so a passing check is not a review. The review is asynchronous and can take a
few minutes, so the wait is scheduled and the turn is not blocked. This applies to
delegated work too, because a subagent's PR is not ready to merge until the same
pass is done (`AGENTS.md`, PR #290).

Rules out: merging on a passing check alone, merging while CodeRabbit is still
reviewing, and merging with an addressable comment left open.

---

## The week rotates the strength focus across the body

2026-11-26

Decided: a strength day leans on a focus (legs and hips, upper push, upper pull,
core and stability) chosen by the session's position among the week's strength
days, and the moves within a focus rotate by the session index. One strength day
stays a full-body circuit, two split into legs and upper body, and three or more
rotate legs, upper push, upper pull and core. The why names the focus.

Why: the circuit picker always took the first move for each pattern, so every
strength session was identical and the owner saw the same machines week after
week. The catalog already carries a pattern and a muscle list per move, so the
split is a selection change, not new data. Legs lead because running loads them
most (`packages/shared/src/plan/catalog.ts`, `engine.ts`).

Rules out: the same circuit on every strength day, and a bodybuilding split that
ignores running.

---

## The system map's selected view is component state, not a derive of the hash

2026-11-26

Decided: the admin system map holds the selected view and node in component state,
seeds them from the URL hash on mount, writes the hash with `replaceState` for the
deep link, and reads the hash back through a `hashchange` listener. It no longer
derives the view from `page.url.hash`.

Why: `replaceState` updates the address bar but does not re-run a derive on
`page.url.hash`, so a tab click left the panel on the first view while a real hash
navigation still worked. The state is now the source of truth and the hash follows
it (`apps/web/src/routes/settings/admin/system/+page.svelte`,
`apps/web/src/lib/overlayHistory.svelte.ts`).

Rules out: deriving the rendered view from `page.url.hash` after a shallow-routing
write.

---

## A system-map edge carries a kind, and its long label shows only on the edge you are on

2026-11-26

Decided: every edge in the system map has a `kind` (flow, enforced, guarded,
decision, foreign-key), the canvas strokes it and the legend names it by that kind,
and the long condition label is drawn only on the edge under the pointer or focus
instead of on every edge at once. The authored pipeline and path views stay
hand-kept without a kind and the parser fills `flow`; the generated views set their
own. `validateGraph` now fails an edge with no kind.

Why: the owner found the edge labels clashing and taking space, and expected the
edges colour-coded like the node kinds. One grey line with a long label on each
edge read as noise. Each edge kind borrows the accent of the thing it points at, so
the diagram reads by meaning (`packages/shared/src/system-graph.ts`,
`packages/shared/src/system-graph-parse.mjs`,
`apps/web/src/lib/components/system/palette.ts`).

Rules out: an edge with no kind, and a label on every edge at once.

---

## A day insight is grounded in the facts and stored once per day

2026-11-26

Decided: the Today page's insights card writes one short read per day, on request,
from the day's logged planned sessions. Every figure in the reply must already
appear in the facts the engine and the runner's own logs supplied; a reply that
states any other number is dropped, the way a reworded reason is. The read is
stored one row per user and date with a fingerprint of the day's logs, so a second
visit shows the stored text and only a genuinely changed day is offered a fresh
read. The card stays out of the way until every workout on the day is logged or
skipped.

Why: the card is model-written prose about real training, so it is held to the same
bar as every other prose path (WRITING_RULES in the prompt, sanitizeText on the
reply, and now a number gate). Storing it once per day keeps the text stable while
the fingerprint keeps it honest when the logs move (`apps/api/src/lib/insights.ts`,
`apps/api/src/routes/insights.ts`).

Rules out: a model-authored number, a fresh model call on every visit, and
generating before all of a day's workouts are settled. Out of scope for now:
imported activities, which are dated by a UTC start time the server cannot place
on the runner's civil day, so only planned sessions are read.

---

## A mid-week start opens with a short week, and the week floor follows the goal and the runner

2026-11-26

Decided: a plan that starts after Monday opens with a genuinely short first week,
pro-rated to the days left in the calendar week the runner started in (a Thursday
start is four days, `firstWeekFraction`). Only the delivered first week is short;
the ramp chains on the normal curve, so the next whole week is the plan it always
was. The flat five-km weekly floor is replaced by a minimum derived from the goal
and the runner's experience (`weekFloorKm`): a beginner on a short goal may run a
genuinely short week, an experienced marathoner keeps a real one, and the floor
never drops below one real run. A week too light to hold a long run and a second
run becomes a single short easy run rather than a token jog, and a long run is not
repeated verbatim by a rebuild when the approved first week is unrealistic. The
rebuild returns a plain warning for that fallback, but it is not shown to the
runner yet (the preview route reads only the weeks, and no path carries a rebuild
or engine warning to a runner today), so surfacing it is a follow-up.

Why: a Thursday start used to pack a whole week into the days left in the real
week, so week one read as a full week the runner could not fit. One flat floor
also forced a beginner with a tiny base into a week heavier than they had run, and
a light plan repeated one easy length week after week. The long-run share now
falls on a smoothstep between the researched band (about 0.45 at low volume to
about 0.28 at high volume), and the midweek medium-long run appears from 60 km a
week where a real aerobic session fits rather than only at very high volume
(research/wave-6/plan-structure.md, sections 5 and 6). The no-token-run invariant
still holds, so the literal half-mile first run is below the fifteen-minute floor
the repo enforces and a beginner's shortest week is one real short run instead.

Rules out: a full first week on a mid-week start, a single flat weekly floor, and
repeating an unrealistic approved first week on a preview rebuild. It does not yet
rule in a visible warning: the fallback note is returned, not shown. See
`packages/shared/src/plan/engine.ts`, `rebuild.ts`, `engine.test.ts`,
`rebuild.test.ts`.

---

## A session whose modality has no run is not framed as one

2026-11-26

Decided: a mobility session's reason is about the mobility work, not a run. The
deterministic composer names the area the session's own title carries ("Hips and
glutes", "Hamstrings and calves") in its role line and, when the session is alone
on its day, in its day line; it keeps the "pairs with the run you already have
that day" line only when a run or strength session really shares the day. The
rephrase prompt now carries each session's modality with a rule that a strength,
mobility, walking or recovery session is not a run, so the model does not force a
running frame on a line that has none.

Why: the owner reported that mobility-only whys always read as if a run were
attached, and the role line ("keep your stride healthy") plus a rephrase prompt
blind to the modality were why (session-ses_dec5, owner report). The area comes
from the plan's own title, so nothing is invented, and the number invariant is
untouched: the gate still rejects a reworded line that adds a number the
deterministic reason did not have (`packages/shared/src/plan/why.ts`,
`packages/shared/src/plan/why-rephrase.ts`).

Rules out: describing a mobility, strength, walking or recovery line as a run,
and naming a focus area the plan did not name.

---

## A system-map node carries several links, not one

2026-11-26

Decided: each system-map node carries a list of links, one for each place it points:
its code, the test that guards it, the decision entry behind it and the pull request.
Each link is a kind, a short label and a target. A node with no real target carries no
links rather than a placeholder, and a link whose kind is unknown is a `doc` rather than
a guess.

Why: a node genuinely points at more than one place. The first shape carried a single
`href` because the graph data was briefed with one link while the page was briefed with
several, so the page was reconciled down to one source chip. The plural list matches what
a node is, and the parsers fill it: a rules node links to its SYSTEM.md section plus the
test file and the test name that enforces it, a why node links to its decision-log anchor
and any pull request the entry names, a data node links to the schema file, and a test
node links to its test file (`packages/shared/src/system-graph.ts`,
`packages/shared/src/system-graph-parse.mjs`).

Rules out: a single-link node, and a placeholder link where no target exists. The canvas
card keeps a count as its only hint, and the detail panel and the list row show one
labelled chip per link.

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
