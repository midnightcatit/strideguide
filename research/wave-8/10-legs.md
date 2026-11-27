# Wave 8, partition 10: legs and front of hip

Workstream: wave-8 exercise documentation
Subtopic: legs and front of hip (the taxonomy's "Legs and front of hip" table)
Generated: 2026-11-27
Status: complete

One entry per candidate in the taxonomy's "Legs and front of hip" table
(`research/wave-8/01-candidates.md`, 51 candidates), each with what it trains, its movement
pattern, equipment, level, runner relevance (why to use it, and when it is the wrong tool), form
cues, common mistakes, and a recommendation line for the wave-2 data writer. The taxonomy's 25-item
skip list for this partition follows as a keep table. Sources are keyed `[S#]` and listed in full
near the end with a URL and the retrieved date; claims follow the claim schema, with evidence and a
confidence tag on the claim and the citation carrying the URL.

## Method, the fallback, and the reconciliation

- The brief said to read this partition from `origin/research/wave-8-taxonomy`:
  `git show origin/research/wave-8-taxonomy:research/wave-8/01-candidates.md`. That remote ref did
  not exist when this partition started. It was checked twice over roughly fifteen minutes (the
  remote ref was absent, and the sibling taxonomy worktree still held only raw name lists), so the
  documented fallback was used: Calistree's own muscle-group datasheets were scraped directly for
  this group, webfetch first and Firecrawl sparingly (four scrape calls, one of them a datasheet,
  `legs-m02n`, that never rendered and was not used). The raw capture is in
  `research/wave-8/raw/legs-calistree-capture.md`.
- The taxonomy branch then landed locally (it is not pushed to `origin` yet) with
  `00-taxonomy.md` and `01-candidates.md`. This file has been reconciled to it: the entries below
  follow the taxonomy's "Legs and front of hip" table (51 candidates, in the same slug set), and the
  taxonomy's skip list for the partition is carried as a keep table. Where the taxonomy assigned a
  move the brief's wording ("hip flexors", "adductors") pulled toward this partition to another
  partition (Core, or Mobility), a short boundary note at the end records it so the partitions do
  not double-document.
- Calistree is the taxonomy source, never the authority on training claims. No wording here is
  copied from Calistree. Muscle mapping comes from exrx.net, training claims from PubMed reviews
  and trials, and cues are written in our house style.

## Boundaries with the sibling partitions

- Posterior chain and calves: `research/wave-8-posterior`. The taxonomy's legs skip list contains
  calf raises and the Nordic and leg curls, which are posterior-partition work; they are noted as
  keep here because the taxonomy listed them, but the posterior partition owns their detail.
- Core, stability and plyometric: `research/wave-8-core`. The taxonomy put the hanging raises, the
  L-sit family, the scales, the hip airplane and the Copenhagen planks there, not here, even though
  they load the hip flexors and adductors. They are not re-documented here; see the boundary note.
- Mobility (stretches and holds): `research/wave-8-mobility` (the taxonomy's Mobility table). The
  holds this partition generated (deep squat hold, horse stance, the compression holds) are flagged
  for that data rather than the exercise table.
- Upper body: `research/wave-8-upper`. The lunge-and-press and overhead lunge carry an upper-body
  demand and are pruned here as combo moves.
- For the engine: `MovePattern` in `packages/shared/src/plan/machines.ts` has `squat`,
  `knee-extension`, `core` and `plyometric`, but no `adductor` or `hip-flexion` value. The taxonomy
  already rides the adduction and hip-flexion moves on `core` and the quad isolation on
  `knee-extension`. The `muscles` field is free text, so `muscles: ['adductors']` or
  `['hip flexors']` carries the detail; adding two enum values is a data change in `machines.ts`,
  not engine logic. The recommendation lines name the mapping per entry.

## Recommendation legend

- **take**: not yet in the catalog, worth adding as data.
- **keep**: already in the catalog (the taxonomy skip list), no new data needed.
- **prune**: do not add, with the reason given.
- **mobility**: route to the Mobility data (a stretch, hold or control drill), not the exercise table.

## A. Squat pattern (pattern `squat`)

Strength training improves the physiological determinants of distance running [S1], and maximal
lower-limb force shows the largest performance transfer of the strength modes studied [S2]. The
squat pattern is the engine's lead lower-body slot (docs/decisions.md, 2026-11-27). The quadriceps
are the knee extensors, and the rectus femoris also crosses the hip and flexes it [S11][S13]; the
adductor magnus also extends the hip, more so as the hip flexes past about 40 to 70 degrees [S14].

### `walking-lunge` (Walking lunge): take

- Trains: quadriceps, glutes, adductor magnus, plus a moving single-leg control demand [S11][S14].
  Pattern `squat`. Equipment: none (dumbbells optional). Level: beginner.
- Runner relevance: a lunging pattern that moves, which suits runners and trains hip extension range
  under control. Wrong tool for a beginner or a runner mid-taper: the balance cost and the fatigue
  add up fast.
- Cues: a long enough step that the front shin stays near vertical; stay tall; keep the steps in a
  straight line.
- Mistakes: short choppy steps; the torso pitching forward; rushing so the back knee drops hard.
- Recommendation: **take**. The moving single-leg load the static reverse lunge does not give, and
  it needs no equipment. Confidence high.

### `curtsy-lunge` (Curtsy lunge): prune

- Trains: quadriceps and glutes of the front leg, adductor magnus on the diagonal, hip external
  rotators for control [S11][S14]. Pattern `squat`. Equipment: none. Level: beginner.
- Runner relevance: adds a frontal-plane and rotation demand. Wrong tool for a knee or hip already
  complaining: the crossed step puts a valgus and rotation load through the knee many runners do
  not need.
- Cues: step behind and across, keep the pelvis level, front knee tracking with the toes.
- Mistakes: the front knee collapsing inward under the cross step; rotating the whole body.
- Recommendation: **prune**. The adductor and rotation stimulus is covered by the wide squat and
  the side-to-side movement without the knee valgus load. Confidence medium.

### `deep-lunge` (Deep lunge, related: split squat): prune

- Trains: quadriceps, glutes, adductor magnus, with the knee travelling far forward [S11][S14].
  Pattern `squat`. Equipment: none. Level: beginner.
- Runner relevance: a deep knee-over-toe range for the quads. Wrong tool as a separate entry: it is
  the split squat taken to the end of range, and the extra depth is a mobility question, not a new
  move.
- Cues: front shin can travel past the toes only as far as the ankle allows; keep the heel down.
- Mistakes: forcing depth past the ankle range so the heel lifts; the pelvis rotating to buy depth.
- Recommendation: **prune**. It is the existing split squat at its deepest range; keep the range
  intent in the mobility data and the loaded split squat as the engine entry. Confidence medium.

### `deep-squat` (Deep squat): prune

- Trains: quadriceps, glutes, adductor magnus, through a full-depth range [S11][S14]. Pattern
  `squat`. Equipment: none. Level: beginner.
- Runner relevance: the full-depth bodyweight squat. The knee-load review shows deep squatting with
  good technique does not raise passive-tissue risk and that the highest patellofemoral
  compression sits around 90 degrees, not at full depth [S5, confidence high].
- Cues: sit straight down to the deepest comfortable range, heels down, spine neutral.
- Mistakes: rounding the lumbar spine to buy depth; the heels lifting.
- Recommendation: **prune** as a separate entry. It is the existing `Bodyweight squat` at its
  deepest allowed range, so the depth rides as a cue on that entry, and the range goal goes to the
  Mobility data via `deep-squat-hold`. Confidence medium.

### `deep-squat-hold` (Deep squat hold): mobility

- Trains: a bottom-position isometric for hip, knee and ankle range, with the adductors and calves
  lengthened [S11][S14]. Pattern `squat`. Equipment: none. Level: beginner.
- Runner relevance: a range hold that also builds a little capacity at end range. It is a hold, not
  a reps exercise, so on the brief's rule it is flagged for the Mobility data.
- Cues: sit down between the hips, elbows inside the knees if helpful, keep the heels down, breathe.
- Mistakes: collapsing the lumbar spine; forcing depth with the heels up.
- Recommendation: **mobility** flag. A hold, and the engine's mobility sessions anchor on the
  runner's tight area, where a squat-pattern range hold fits. Confidence high.

### `horse-stance` (Horse stance): mobility

- Trains: an isometric hold in a wide squat, loading the adductors and quadriceps [S11][S14].
  Pattern `squat`. Equipment: none. Level: beginner.
- Runner relevance: a wide isometric hold for the adductors. It is a hold, so it is flagged for the
  Mobility data rather than the exercise table.
- Cues: feet wide with the toes forward or slightly out, hips low, torso tall, knees tracking out.
- Mistakes: the knees collapsing inward; cutting height; holding the breath.
- Recommendation: **mobility** flag. An isometric hold; if the engine wants a loaded adductor
  isometric, the wide squat covers the loaded version. Confidence high.

### `horse-walk` (Horse walk): prune

- Trains: lateral stepping in the low horse stance, adductors and quadriceps under a hold [S11].
  Pattern `squat`. Equipment: none. Level: beginner.
- Runner relevance: a lateral stepping drill in the wide stance. Wrong tool as an exercise entry: it
  is a drill, and the load is a bodyweight hold the wide squat already carries.
- Cues: stay low in the wide stance, step sideways without standing up, keep the knees out.
- Mistakes: standing up between steps; the knees caving in; short choppy steps.
- Recommendation: **prune**. A drill or warm-up, and the wide squat and horse stance cover the
  loaded version. Confidence medium.

### `wide-horse-stance` (Wide horse stance): mobility

- Trains: a wider, deeper horse stance hold for the adductors [S11][S14]. Pattern `squat`.
  Equipment: none. Level: beginner.
- Runner relevance: the deeper end range of the horse stance hold. It is a hold, so it is flagged
  for the Mobility data.
- Cues: as the horse stance, wider and lower within comfort, heels down.
- Mistakes: forcing depth until the feet roll in; the knees collapsing inward.
- Recommendation: **mobility** flag. A hold, and it belongs with the other adductor range holds.
  Confidence high.

### `wide-squat` (Wide squat): take

- Trains: adductor magnus and the other adductors (hip adduction from the wide stance), quadriceps
  and glutes (hip extension) [S11][S14]. Pattern `squat`. Equipment: none (dumbbells optional).
  Level: beginner.
- Runner relevance: the squat stance that puts the adductors under load, so a runner gets adductor
  strength and a squat in one move, and the wider stance suits many runners' builds. Wrong tool for
  a runner with a groin niggle or limited adductor range, where the narrower squat and a separate
  adduction move are safer.
- Cues: feet wide with the toes turned out, knees tracking over the toes, sit straight down, heels
  down, torso tall.
- Mistakes: the knees collapsing inward at the bottom; cutting depth with load; the feet turned out
  further than the knees can track.
- Recommendation: **take**. The adductor-biased squat, so the adductors get a loaded pattern without
  a machine. Confidence high.

### `plie-squat-with-tip-toes` (Plie squat with tip toes): prune

- Trains: the wide-stance squat plus a calf-raise at the top [S11][S14]. Pattern `squat`.
  Equipment: none. Level: beginner.
- Runner relevance: a wide squat that rises onto the toes, pairing quad, adductor and calf work.
  Wrong tool as its own entry: it is the wide squat plus a calf raise, both of which the engine can
  already carry separately.
- Cues: wide stance, sit down, drive up and rise onto the toes at the top.
- Mistakes: the knees caving in; losing balance on the toes under load.
- Recommendation: **prune**. Two existing patterns stacked; the wide squat and the calf raise cover
  it. Confidence medium.

### `box-shuffle` (Box shuffle): prune

- Trains: lateral step-ups done at speed, a quick-feet unilateral drill with quad and hip demand
  [S11]. Pattern `squat`. Equipment: a low box. Level: beginner.
- Runner relevance: a footspeed drill, not a strength move. Wrong tool for the strength table: it is
  a warm-up or drill, and its value is coordination, not force.
- Cues: stay low, quick light contacts, push off the box evenly both ways.
- Mistakes: heavy contacts; standing up between steps; a box too high.
- Recommendation: **prune**. A drill; keep it in the running-drill or warm-up library. Confidence
  medium.

### `deep-step-up` (Deep step up, related: step up): prune

- Trains: a high step-up demanding a deep single-leg drive, quadriceps and glutes [S11][S14].
  Pattern `squat`. Equipment: a high box. Level: intermediate.
- Runner relevance: a deeper single-leg push than the standard step-up. Wrong tool as a separate
  entry: it is the step-up with a higher box, and at height the rear-leg push and the knee stress
  both rise.
- Cues: plant the whole front foot, keep the torso tall, drive through the front leg only.
- Mistakes: pushing off the rear foot; a box so high the knee folds hard; losing balance.
- Recommendation: **prune**. A box-height variant of the existing step-up; keep the standard height
  and note the height cue there. Confidence medium.

### `narrow-stance-leg-press` (Narrow-stance leg press): prune

- Trains: the quadriceps with a narrow stance on the leg press [S11]. Pattern `squat`. Equipment:
  leg press. Level: beginner.
- Runner relevance: a quad-biased leg press. Wrong tool as its own entry: it is a stance cue on the
  leg press the engine already holds, not a new move.
- Cues: feet closer than shoulder width, lower to about 90 degrees, press through the whole foot.
- Mistakes: the back rounding off the pad; range so deep the pelvis tucks.
- Recommendation: **prune**. A stance cue on the existing `Leg press`. Confidence medium.

### `wide-stance-leg-press` (Wide-stance leg press): prune

- Trains: the adductors and glutes with a wide stance on the leg press [S11][S14]. Pattern `squat`.
  Equipment: leg press. Level: beginner.
- Runner relevance: an adductor-biased leg press. Wrong tool as its own entry: as the narrow-stance
  version, it is a stance cue on the existing leg press.
- Cues: feet wide with the toes out, knees tracking over the toes, press through the whole foot.
- Mistakes: the knees collapsing inward; the back rounding off the pad.
- Recommendation: **prune**. A stance cue on the existing `Leg press`; the wide squat covers the
  loaded adductor bias in a bodyweight pattern. Confidence medium.

### `one-leg-chair-squat` (One Leg Chair Squat): take

- Trains: quadriceps and glutes of the single working leg, with a low balance demand from the seat
  [S11][S14]. Pattern `squat`. Equipment: a chair or low box. Level: beginner.
- Runner relevance: the most accessible unilateral squat rung, because the chair gives a depth
  target and a safety net, a good first single-leg move before the split squat load or the pistol.
  Wrong tool once it is easy: the seat stop limits range, so progress to the split squat or the
  pistol.
- Cues: stand on one leg, sit back to the chair under control, touch and stand without a rock back.
- Mistakes: dropping onto the seat; pushing off with a lean; the knee collapsing inward.
- Recommendation: **take**. A clean beginner unilateral rung the bodyweight ladder is missing, and
  it needs only a chair. Confidence high.

### `one-leg-wall-sit` (One-leg wall sit): take

- Trains: the quadriceps isometrically on one leg, at the knee-flexed position [S11]. Pattern
  `squat`. Equipment: a wall. Level: beginner.
- Runner relevance: the unilateral isometric rung above the wall sit, scaling by time. Wrong tool as
  the main strength move: isometric endurance is not maximal force, and it is a hard jump from the
  two-leg version.
- Cues: one foot planted, the other lifted clear, back flat on the wall, knees near 90 degrees.
- Mistakes: creeping up the wall; letting the pelvis drop on the lifted side; holding the breath.
- Recommendation: **take** as the advanced rung of the wall sit (pair it with `wall-sit` so the
  isometric squat ladder has a beginner and an advanced step). Confidence high.

### `wall-sit` (Wall sit): take

- Trains: the quadriceps isometrically at the knee-flexed position [S11]. Pattern `squat`.
  Equipment: a wall. Level: beginner.
- Runner relevance: a no-load quad endurance hold, a good early rung and a leg rung on a heavy
  running week. Wrong tool as the main strength move: progression past a few minutes moves toward
  discomfort rather than adaptation.
- Cues: back flat on the wall, hips and knees near 90 degrees, whole foot down, breathe normally.
- Mistakes: creeping the hips up; holding the breath; uneven feet so one knee takes the load.
- Recommendation: **take**. A home isometric rung the bodyweight ladder lacks, scaled by time.
  Confidence high.

### `wall-lunge` (Wall lunge): prune

- Trains: the quadriceps as a bodyweight leg press against a wall, glutes secondary [S11]. Pattern
  `squat`. Equipment: a wall. Level: beginner.
- Runner relevance: a supported single-leg press. Wrong tool as its own entry: it duplicates the
  split squat and the step-up for stimulus, and the wall support removes the balance demand.
- Cues: back heel on the wall behind, front shin vertical, drive the back knee down and away.
- Mistakes: the front knee jamming forward; pushing off the front knee to rise.
- Recommendation: **prune**. Covered by the split squat and step-up, without the wall support.
  Confidence medium.

### `incline-lunge` (Incline lunge): prune

- Trains: the quadriceps through a long range with the front foot raised, glutes [S11]. Pattern
  `squat`. Equipment: a low box. Level: beginner.
- Runner relevance: a front-foot-elevated split squat that lengthens the working-leg range. Wrong
  tool as its own entry: it is the split squat with the front foot up, a variation rather than a
  distinct move.
- Cues: front foot on a low box, front shin vertical at the bottom, torso tall.
- Mistakes: a box so high the range breaks down; pushing off the rear foot.
- Recommendation: **prune**. A variation of the existing split squat. Confidence medium.

### `lunge-knee-crunch` (Lunge knee crunch, related: reverse lunge): take

- Trains: quadriceps and glutes of the front leg on the reverse lunge, then the hip flexors on the
  knee drive, so it mirrors a running stride [S11][S13]. Pattern `squat`. Equipment: none. Level:
  beginner.
- Runner relevance: a reverse lunge finished with a high knee drive, which chains the leg strength
  and the swing-phase hip flexion a runner uses, so it is a gait-like single-leg move. Wrong tool
  for a runner without clean lunge control, and it is a coordination move, not a load holder.
- Cues: reverse lunge under control, then drive the same knee to hip height with the torso tall.
- Mistakes: leaning back to lift the knee; losing balance and stepping wide; rushing the two halves.
- Recommendation: **take**. A distinct gait-like single-leg move that ties the lunge and the hip
  flexion together. Confidence medium.

### `lunge-and-press` (Lunge and press): prune

- Trains: quadriceps and glutes in the lunge, with an overhead dumbbell press [S11][S14]. Pattern
  `squat`. Equipment: dumbbells. Level: beginner.
- Runner relevance: a full-body combo. Wrong tool for this partition: the upper-body press belongs
  to the upper partition, and the combo adds trunk demand without a distinct leg stimulus beyond the
  lunge.
- Cues: lunge under control, then press overhead without losing the lunge position.
- Mistakes: the press stealing focus from the lunge; the front knee jamming.
- Recommendation: **prune**. A combo move that crosses into the upper-body partition and adds no
  distinct leg stimulus. Confidence medium.

### `overhead-lunge` (Overhead lunge): prune

- Trains: quadriceps and glutes in the lunge, with an overhead hold for trunk and hip demand
  [S11][S14]. Pattern `squat`. Equipment: dumbbells. Level: beginner.
- Runner relevance: a lunge with weight overhead, which raises the trunk demand. Wrong tool for this
  partition: the extra demand is trunk and shoulder, not legs, and the lower partition owns the
  lunge.
- Cues: weight locked overhead, ribs down, lunge without the arms drifting.
- Mistakes: the arms drifting forward; the lower back arching; short steps.
- Recommendation: **prune**. The overhead hold is an upper-body and trunk demand, and the lunge is
  already carried. Confidence medium.

### `weighted-deep-lunge` (Weighted deep lunge, related: dumbbell split squat): prune

- Trains: quadriceps, glutes, adductor magnus with dumbbells through a deep range [S11][S14].
  Pattern `squat`. Equipment: dumbbells. Level: beginner.
- Runner relevance: a loaded deep knee-over-toe lunge. Wrong tool as a separate entry: it is the
  existing dumbbell split squat at a deeper range, and the depth is a mobility question.
- Cues: dumbbells at the sides, front shin travelling as far as the ankle allows, heel down.
- Mistakes: the heels lifting; the pelvis rotating; range past the ankle limit.
- Recommendation: **prune**. A duplicate of the existing dumbbell split squat plus a depth cue.
  Confidence medium.

### `pistol-squat` (Pistol squat, related: assisted pistol squat): take

- Trains: quadriceps, glutes, adductor magnus of the single working leg, with a large balance and
  ankle-mobility demand [S11][S14]. Pattern `squat`. Equipment: none (a support for the assisted
  rung). Level: intermediate.
- Runner relevance: the top single-leg bodyweight strength rung and a balance challenge. Wrong tool
  for a runner without the ankle range, or as an in-season strength move: it is mobility-limited for
  many, and the assisted and half rungs are where most runners should stay.
- Cues: whole foot down, knee tracking over the toes, chest up, keep the free leg long, reach for a
  support only as far as needed.
- Mistakes: rounding the lumbar spine at the bottom; the knee collapsing inward; flinging the free
  leg as a counterweight.
- Recommendation: **take**. Add the full pistol as the advanced rung above the assisted entry the
  engine already holds. Confidence high.

### `half-pistol-squat` (Half pistol squat): take

- Trains: quadriceps, glutes of the single leg through a partial range, with a smaller balance and
  ankle demand than the full pistol [S11][S14]. Pattern `squat`. Equipment: none. Level:
  intermediate.
- Runner relevance: the first rung of the pistol ladder for a runner without the full range. Wrong
  tool once the full range is available: progress to the full pistol rather than adding load to a
  partial rep.
- Cues: one leg, sit to a comfortable depth with the heel down, knee tracking over the toes,
  control the rise.
- Mistakes: the heel lifting; dropping rather than lowering; the knee tracking inward.
- Recommendation: **take**. The middle rung of the pistol ladder, so assisted, half and full pistols
  form a clean progression. Confidence high.

### `elevated-pistol-squat` (Elevated pistol squat): prune

- Trains: the pistol with the working foot elevated, easing the ankle range demand [S11]. Pattern
  `squat`. Equipment: a low box. Level: intermediate.
- Runner relevance: a pistol variation that trades ankle range for the elevation. Wrong tool as its
  own entry: it is a pistol micro-variant, and the assisted and half rungs already cover the path.
- Cues: working foot on the box, heel down, knee over the toes.
- Mistakes: the box so high the range breaks down; losing balance; the knee caving.
- Recommendation: **prune**. A pistol micro-variant; the assisted, half and full rungs are enough.
  Confidence medium.

### `dragon-squat` (Dragon squat): prune

- Trains: a deep single-leg squat with the free leg threaded across, quadriceps and glutes [S11].
  Pattern `squat`. Equipment: none. Level: advanced.
- Runner relevance: an advanced single-leg squat. Wrong tool for nearly all runners: the threaded
  free leg and the deep range add skill and knee-travel load with no distinct running transfer over
  the pistol.
- Cues: one leg, free leg threaded across in front, sit down with the knee tracking.
- Mistakes: the knee collapsing inward; rounding the back; using the threaded leg as a prop.
- Recommendation: **prune**. An advanced variant above the pistol with no distinct runner transfer.
  Confidence medium.

### `foot-hold-hand-assisted-dragon-squat` (Foot-hold hand-assisted dragon squat): prune

- Trains: the dragon squat with hand assistance to build the range [S11]. Pattern `squat`.
  Equipment: none. Level: intermediate.
- Runner relevance: a stepped-down dragon squat for range work. Wrong tool as its own entry: it is a
  rung in the dragon-squat ladder, which is pruned as a whole.
- Cues: hold the working foot with one hand, sit down with the knee tracking, use the hand only for
  the hardest range.
- Mistakes: pulling hard with the hand and skipping the control; the knee caving.
- Recommendation: **prune**. A rung of the pruned dragon-squat ladder. Confidence medium.

### `shrimp-squat` (Shrimp squat): prune

- Trains: quadriceps and glutes of the working leg, with a heavy balance and knee-travel demand
  [S11]. Pattern `squat`. Equipment: none. Level: intermediate.
- Runner relevance: a very advanced single-leg squat. Wrong tool for nearly all runners: the knee
  travels far over the foot under single-leg load, and the pistol ladder already covers the advanced
  rung.
- Cues: hold the trailing foot behind, knee tracking over the toes, sit straight down.
- Mistakes: the knee caving in; rounding the back; holding the trailing foot so hard the knee is
  pulled around.
- Recommendation: **prune**. The pistol ladder covers the advanced rung; the shrimp adds
  knee-travel load and skill complexity with no distinct runner transfer. Confidence medium.

### `touchdown-squat` (Touchdown squat): prune

- Trains: a single-leg squat touching a box behind, controlled descent and drive, quadriceps and
  glutes [S11][S14]. Pattern `squat`. Equipment: a low box. Level: intermediate.
- Runner relevance: a single-leg squat with a depth target. Wrong tool as its own entry: it is close
  to the `one-leg-chair-squat` and the `quarter-pistol-squat-touchdown`, and one depth-targeted
  unilateral rung is enough.
- Cues: stand on one leg, sit back until the free heel touches the box, drive up under control.
- Mistakes: dropping onto the box; pushing off the free foot; the knee caving inward.
- Recommendation: **prune**. Redundant with `one-leg-chair-squat` and the touchdown family; keep one
  depth-targeted rung. Confidence medium.

### `quarter-pistol-squat-touchdown` (Quarter pistol squat touchdown, related: step up): prune

- Trains: a step-down from a small height, controlled knee tracking, quadriceps of the working leg
  [S11]. Pattern `squat`. Equipment: a step platform. Level: beginner.
- Runner relevance: a controlled step-down, the Patrick step. Wrong tool as its own entry: it is a
  step-down drill, and the engine already carries the step-up and the one-leg chair squat.
- Cues: stand on the step on one leg, lower the free heel to the floor under control, drive back up.
- Mistakes: dropping onto the floor heel; the knee collapsing inward; leaning on the free leg.
- Recommendation: **prune**. A step-down drill covered by the step-up and the chair squat. Confidence
  medium.

### `goblet-cyclist-squat` (Goblet cyclist squat, related: goblet squat): prune

- Trains: quadriceps with the heels raised on a slant board and the trunk slightly forward, a
  knee-dominant bias, rectus femoris involved [S11][S13]. Pattern `squat`. Equipment: a slant board
  and a kettlebell. Level: beginner.
- Runner relevance: a heel-raised goblet squat that biases the quads. Wrong tool as its own entry:
  it is the existing goblet squat with a heel wedge, so it adds a cue, not a move, and the leg
  extension and reverse Nordic already cover the quad and rectus femoris work.
- Cues: heels on the slant board, hold the bell at the chest, sit down over the mid-foot, chest up.
- Mistakes: the board tipping; range past comfort in the knees; treating it as a separate lift.
- Recommendation: **prune**. A goblet squat with a heel wedge; the quad bias is already covered by
  the leg extension and the reverse Nordic. Confidence medium.

## B. Knee extension (pattern `knee-extension`)

Open-chain knee extension is the least running-specific leg mode, but it is the cleanest way to load
the quadriceps without balance demand, and the reverse Nordic reaches the rectus femoris through the
hip, which the squat and the leg extension do not [S11][S13][S15].

### `reverse-nordic` (Reverse nordic): take

- Trains: the quadriceps, especially the rectus femoris, eccentrically, since the rectus femoris
  crosses the hip and the knee [S11][S13][S15]. Pattern `knee-extension`. Equipment: none (a band or
  support to assist). Level: advanced.
- Runner relevance: the clean way to load the rectus femoris, which is hard to reach with a squat or
  a leg extension, and it does so with far less knee compression than a sissy squat. Wrong tool for
  a runner who has not built basic eccentric knee control.
- Cues: kneel tall, keep the hips extended (no sitting back), lower the torso back as one line,
  catch on the way down or with a band; progress by slowing the lowering.
- Mistakes: the hips drifting back, which unloads the quads; dropping instead of lowering; no
  support while learning the range.
- Recommendation: **take**. The one entry here that reaches the rectus femoris safely, and it pairs
  with the existing Nordic curl on the posterior side. Confidence high.

### `assisted-reverse-nordic` (Assisted reverse nordic): take

- Trains: the quadriceps and rectus femoris eccentrically, with band or cable assistance [S11][S15].
  Pattern `knee-extension`. Equipment: a band or cable. Level: intermediate.
- Runner relevance: the entry rung of the reverse Nordic, letting a runner build the range and the
  eccentric control before the free version. Wrong tool once the free version is manageable:
  progress rather than adding assistance.
- Cues: kneel tall, band anchored so it helps on the way down, hips extended, control the lowering.
- Mistakes: letting the band take all the load; the hips sitting back; dropping into the bottom.
- Recommendation: **take**, as the entry rung beneath the free reverse Nordic, so the move has a
  beginner and an advanced step. Confidence high.

### `sissy-squat` (Sissy squat): prune

- Trains: the quadriceps with a strong knee-flexion bias and the rectus femoris [S11][S13]. Pattern
  `knee-extension`. Equipment: none (a support to learn). Level: advanced.
- Runner relevance: a hard bodyweight quad isolation. Wrong tool for most runners: it drives the knee
  into deep flexion under load, which loads the patellofemoral joint hard, and the reverse Nordic
  and the leg extension reach the quads with less joint stress.
- Cues: hips forward, knees travel over the toes, stay tall, control the descent, use a support
  until the range is earned.
- Mistakes: dropping into the bottom (the patellar load spikes); the hips drifting back into a half
  squat; no support while learning.
- Recommendation: **prune**. The reverse Nordic and the leg extension cover the quadriceps without
  the deep patellofemoral load; see the unverified list for the VMO claim often attached to it.
  Confidence medium.

### `half-sissy-squat` (Half sissy squat): prune

- Trains: the quadriceps through a partial knee-flexion range, the gentler entry to the sissy family
  [S11]. Pattern `knee-extension`. Equipment: none. Level: beginner.
- Runner relevance: a partial sissy squat. Wrong tool as its own entry: it is the entry rung of a
  pruned family, and the reverse Nordic entry rung covers the same need with less joint stress.
- Cues: as the sissy squat, to a partial depth, hips forward, control the range.
- Mistakes: driving past the earned range; the hips drifting back; no support.
- Recommendation: **prune**. A rung of the pruned sissy family; the assisted reverse Nordic is the
  better entry rung. Confidence medium.

### `assisted-sissy-squat` (Assisted sissy squat): prune

- Trains: the quadriceps with hand support, an open knee-angle strengthener [S11]. Pattern
  `knee-extension`. Equipment: none. Level: intermediate.
- Runner relevance: a supported sissy squat for range work. Wrong tool as its own entry: a support
  rung of the pruned sissy family.
- Cues: hands on a support, hips forward, control the range, reduce the hand help over time.
- Mistakes: leaning on the hands for the whole rep; dropping into the bottom.
- Recommendation: **prune**. A rung of the pruned sissy family. Confidence medium.

### `lying-leg-extension` (Lying leg extension): take

- Trains: the quadriceps in isolation, lying, with bodyweight [S11]. Pattern `knee-extension`.
  Equipment: none. Level: beginner.
- Runner relevance: a home open-chain quad option for a runner with no gym and no band, and an early
  rung before the machine. Wrong tool once easy: bodyweight alone runs out of load fast, so it
  becomes a high-rep finisher.
- Cues: lie on the side, straighten the top knee fully under control, squeeze at the top, lower
  slowly, keep the hip still.
- Mistakes: swinging the leg; partial range; arching the back to help.
- Recommendation: **take**. Fills the home gap in the knee-extension pattern; label it beginner and
  scale by slow tempo and range. Confidence high.

### `single-leg-leg-extension` (Single-leg leg extension): take

- Trains: the quadriceps of one leg in isolation on the machine [S11]. Pattern `knee-extension`.
  Equipment: leg extension machine. Level: beginner.
- Runner relevance: the single-leg rung of the leg extension, useful when one leg is weaker or for
  balance between sides after an injury. Wrong tool as the only knee-extension entry: the two-leg
  version loads more total weight, and single-leg machine work is slow.
- Cues: align the knee with the machine pivot, one leg at a time, full extension under control,
  lower slowly.
- Mistakes: swinging the weight; slamming into extension; the seat set so the pad digs in.
- Recommendation: **take**. The single-leg rung beside the existing two-leg `Leg extension`.
  Confidence high.

### `tibialis-raise` (Tibialis raise): take

- Trains: the tibialis anterior (ankle dorsiflexion and inversion), a shin and ankle muscle, not a
  quadriceps one [S19]. Pattern `knee-extension` (the taxonomy's mapping). Equipment: a wall (or
  none). Level: beginner.
- Runner relevance: the tibialis anterior controls foot clearance and the landing, so loading it
  supports the shin and the foot in running. Wrong tool as a quad move: the taxonomy files it under
  the knee-extension pattern, but the muscle is the shin, so it shares the lower-leg role with the
  calf work in the posterior partition.
- Cues: heels down, lift the forefoot and toes against the wall or a band, control the return, keep
  the knees soft.
- Mistakes: lifting the whole foot (that is ankle work, not tibialis); rushing; range so small it
  misses the end range.
- Recommendation: **take**, but flag it to the posterior partition as a lower-leg move that sits in
  the legs table (the taxonomy lists it here). Confidence high.

### `kettlebell-tibialis-raise` (Kettlebell tibialis raise): prune

- Trains: the tibialis anterior under a kettlebell load [S19]. Pattern `knee-extension`. Equipment:
  a bench and a kettlebell. Level: beginner.
- Runner relevance: the loaded version of the tibialis raise. Wrong tool as its own entry: it is the
  tibialis raise with a load, so one tibialis entry is enough.
- Cues: as the tibialis raise, with the kettlebell hooked over the forefoot, control the range.
- Mistakes: the bell slipping; using the hips to throw the foot up; range that misses the end.
- Recommendation: **prune**. A loaded variant of the single tibialis entry. Confidence medium.

## C. Hip flexion and adduction (pattern `core` in the taxonomy)

The hip flexors, chiefly the iliopsoas, drive the swing phase. As speed rises past about 7 m/s the
load shifts from the ankle to the hip, and the iliopsoas, gluteus maximus and hamstrings accelerate
the leg through swing [S4, confidence high]. The adductors adduct the hip and, for the magnus, also
extend it, more so as the hip flexes past about 40 to 70 degrees [S14]. Adductor strength matters
for groin health: the Copenhagen adduction was the highest-activation hip-adduction exercise in an
EMG study of elite players [S6, confidence high], an eight-week progressive Copenhagen program
raised eccentric hip adduction strength by 35.7 percent in a randomised trial [S7, confidence
high], the Hölmich dynamic adduction exercises reach strengthening intensity [S8], and physical
training for adductor-related groin pain held its benefit at 8 to 12 years [S9]. The banded hip
adduction was one of the two high-intensity dynamic adduction exercises in the EMG study alongside
the Copenhagen [S6, confidence high].

### `banded-knee-drive` (Banded knee drive): take

- Trains: the iliopsoas and the other hip flexors against band resistance, with the trunk braced
  [S12][S13]. Pattern `core`. Equipment: a short band. Level: beginner.
- Runner relevance: the home way to load the hip flexors past bodyweight, the handful of moves that
  can build hip-flexor force for the swing phase [S4]. Wrong tool when the runner has no anchor for
  the band: keep the standing knee raise as the bodyweight rung.
- Cues: stand tall with the pelvis level, drive the knee up to hip height against the band, control
  the return, keep the trunk still.
- Mistakes: leaning back to lift the knee higher; letting the band snap the leg back; hiking the
  working hip.
- Recommendation: **take**. The bands-mode rung for the hip-flexion pattern. Confidence high.

### `cable-knee-drive` (Cable knee drive): take

- Trains: the iliopsoas and the other hip flexors against a constant cable load, with the trunk
  braced [S12][S13]. Pattern `core`. Equipment: a cable machine. Level: beginner.
- Runner relevance: the gym way to load the hip flexors past bodyweight, the same role as the banded
  version. Wrong tool when the app models no cable: keep the banded version and the standing knee
  raise as the path.
- Cues: face away from the cable, strap or handle at the foot, drive the knee to hip height, control
  the return, keep the trunk still.
- Mistakes: leaning back; letting the weight pull the leg down fast; hip hiking.
- Recommendation: **take** as the machines-mode rung of the hip-flexion pattern, paired with the
  banded version. Confidence high.

### `cable-straight-leg-raise` (Cable straight leg raise): take

- Trains: the iliopsoas and the other hip flexors through a long straight-leg range on a cable
  [S12][S13]. Pattern `core`. Equipment: a cable machine. Level: beginner.
- Runner relevance: a loaded hip-flexion move through a long range, a step harder than the bent-knee
  drive because the leg stays long. Wrong tool for a runner without trunk control: the straight leg
  makes the lower back arch if the pelvis is not held.
- Cues: hold the trunk still and the pelvis tucked, lift the straight leg against the cable, control
  the return.
- Mistakes: the lumbar spine arching as the leg rises; leaning back; a short range hidden by speed.
- Recommendation: **take**. A distinct long-range loaded hip-flexion move in the gym. Confidence
  high.

### `banded-hip-adduction` (Banded hip adduction): take

- Trains: the hip adductors, with the band giving a rising load through the range [S14]. Pattern
  `core`. Equipment: a long band. Level: beginner.
- Runner relevance: the home rung for the adductors in the bands mode, and one of the two
  high-intensity dynamic adduction exercises in the EMG study alongside the Copenhagen [S6,
  confidence high]. Wrong tool once easy with a light band: the load ceiling is low, so move the
  strength work to the Copenhagen, which the taxonomy files under Core.
- Cues: the band anchored low, pull the working leg across the midline, control the return, keep the
  trunk still.
- Mistakes: rolling the pelvis back to help; letting the band snap the leg; short range.
- Recommendation: **take**. The bands-mode adductor rung, and a well-supported adduction exercise in
  the EMG study. Confidence high.

### `lying-hip-adduction` (Lying hip adduction): take

- Trains: the hip adductors, lying, without equipment [S14]. Pattern `core`. Equipment: none. Level:
  beginner.
- Runner relevance: the no-equipment adductor rung, easy to seed before the band and the Copenhagen.
  Wrong tool as the strength move: bodyweight lying adduction gives little resistance, so it is a
  beginner rung or a warm-up.
- Cues: lie on the side, lift the bottom leg toward the top leg, control the return, keep the
  pelvis still.
- Mistakes: rolling the pelvis back to help; swinging the leg; short range.
- Recommendation: **take**. The beginner adductor rung with no equipment. Confidence high.

### `cable-straight-leg-adduction` (Cable straight leg adduction): prune

- Trains: the hip adductors standing on a cable, with a constant load [S14]. Pattern `core`.
  Equipment: a cable machine. Level: beginner.
- Runner relevance: another cable adduction option in a gym. Wrong tool as its own entry: it is
  largely a duplicate of the adduction machine and the band for stimulus while adding a standing
  balance demand, so it adds catalog noise.
- Cues: stand tall at the cable, pull the working leg across and slightly in front, control the
  return, keep the trunk still.
- Mistakes: leaning the torso to swing the leg; standing so close the range is short; hip hiking.
- Recommendation: **prune**. The banded and lying adduction and the machine cover the stimulus.
  Confidence medium.

### `sitting-pike-compression` (Sitting pike compression): mobility

- Trains: an isometric hold lifting the straight legs toward the torso, the hip flexors against the
  trunk and a hamstring-adductor lengthening [S12][S14]. Pattern `core`. Equipment: none. Level:
  beginner.
- Runner relevance: a range and compression hold. It is a hold, so it is flagged for the Mobility
  data rather than the exercise table.
- Cues: sit tall, legs straight, lift the legs and draw the chest toward the thighs, breathe, hold.
- Mistakes: rounding the back to fake the lift; holding the breath; forcing past comfort.
- Recommendation: **mobility** flag. A hold, and the Mobility partition owns the compression holds.
  Confidence high.

### `one-leg-sitting-pike-compression` (One-leg sitting pike compression): mobility

- Trains: the same compression hold, one leg at a time, hip flexors and the lengthened hamstring
  [S12][S14]. Pattern `core`. Equipment: none. Level: beginner.
- Runner relevance: a one-leg compression hold. It is a hold, so it is flagged for the Mobility
  data.
- Cues: as the two-leg version, one leg lifted, the other relaxed or bent, hold the torso tall.
- Mistakes: rounding the back; holding the breath; forcing range.
- Recommendation: **mobility** flag. A hold, with the compression family. Confidence high.

### `sitting-straddle-compression` (Sitting straddle compression): mobility

- Trains: a seated compression hold in a straddle, the adductors and hamstrings lengthened and the
  hip flexors holding the legs up [S12][S14]. Pattern `core`. Equipment: none. Level: beginner.
- Runner relevance: an adductor and compression range hold. It is a hold, so it is flagged for the
  Mobility data.
- Cues: legs wide, sit tall, lift the legs and reach the chest forward, breathe, hold.
- Mistakes: rounding the back; forcing the straddle; holding the breath.
- Recommendation: **mobility** flag. A hold, and it is the adductor range work the Mobility
  partition carries. Confidence high.

### `pike-compression-flutter-kicks` (Pike compression flutter kicks): mobility

- Trains: flutter kicks held inside the pike compression position, hip flexors and trunk [S12].
  Pattern `core`. Equipment: none. Level: beginner.
- Runner relevance: a dynamic version of the compression hold. Wrong tool for the strength table: it
  is a hold with movement, and the compression family goes to the Mobility data.
- Cues: hold the pike compression, small alternating leg kicks, keep the trunk tall.
- Mistakes: losing the compression and lying back; big sloppy kicks; holding the breath.
- Recommendation: **mobility** flag. A compression hold with movement, with the family. Confidence
  medium.

## D. The taxonomy skip list for this partition (already in our catalog, keep)

The taxonomy lists these 25 Calistree exercises as already carried by our catalog. No new entry is
needed; keep them as they are. Note that the calf raises and the Nordic and leg curls are
posterior-partition work that the taxonomy duplicated here, and their detail lives in
`research/wave-8-posterior`.

| Calistree exercise | our entry it duplicates | note |
| --- | --- | --- |
| Bent-knee calf raise (`bent-knee-calf-raise`) | Bent-knee soleus raise | posterior detail |
| Bent-knee single-leg calf raise (`bent-knee-single-leg-calf-raise`) | Bent-knee soleus raise (single-leg) | posterior detail |
| Bulgarian split squat (`bulgarian-split-squat`) | Bulgarian split squat | keep |
| Butt kicks (`butt-kicks`) | Butt kicks (warm-up drill) | drill |
| Calf raise (`calf-raise`) | Calf raise, Double-leg calf raise | posterior detail |
| Clamshell (`clamshell`) | Clamshells (banded) | posterior detail |
| High knees (`high-knees`) | High knees (warm-up drill) | drill |
| Kneeling lunge chest up (`kneeling-lunge-chest-up`) | Kneeling hip flexor stretch | mobility |
| Kneeling quad stretch (`kneeling-quad-stretch`) | Quad stretch | mobility |
| Leg extension (`leg-extension`) | Leg extension | keep |
| Leg press (`leg-press`) | Leg press | keep |
| Nordic curl (`nordic-curl`) | Nordic hamstring curl, Assisted Nordic curl | posterior detail |
| Seated leg curl (`seated-leg-curl`) | Seated leg curl, Lying leg curl | posterior detail |
| Seated leg press (`seated-leg-press`) | Leg press (seated horizontal press) | keep |
| Seated leg press calf raise (`seated-leg-press-calf-raise`) | Seated calf raise | posterior detail |
| Single-leg calf raise (`single-leg-calf-raise`) | Single-leg calf raise, Single-leg calf raise off a step | posterior detail |
| Single-leg ledge calf raise (`single-leg-ledge-calf-raise`) | Single-leg calf raise off a step | posterior detail |
| Single-leg leg press (`single-leg-leg-press`) | Leg press (single-leg variation) | keep |
| Sliding leg curl (`sliding-leg-curl`) | Sliding leg curl | posterior detail |
| Smith machine calf raise (`smith-machine-calf-raise`) | Standing calf raise (bar path) | posterior detail |
| Standing quad stretch (`standing-quad-stretch`) | Standing quad stretch | mobility |
| Step up (`step-up`) | Step-up, Step-up onto a chair | keep |
| Supine hip flexor stretch (`supine-hip-flexor-stretch`) | Hip flexor stretch | mobility |
| Weighted calf raise (`weighted-calf-raise`) | Dumbbell calf raise | posterior detail |
| Weighted single leg calf raise (`weighted-single-leg-calf-raise`) | Single-leg dumbbell calf raise | posterior detail |

## Boundary note: moves the brief pulled in but the taxonomy routed elsewhere

The brief's wording ("hip flexors", "adductors") also covers moves the taxonomy put in the Core
partition or the Mobility partition. They are not re-documented here; the owning partition carries
them, with a cross-reference so the boundary is clear.

- Core partition (the taxonomy's "Core, stability and plyometric" table): `hanging-knees-to-chest`,
  `hanging-knees-to-elbows`, `hanging-leg-raises`, `chair-l-sit`, `l-sit-alternate-leg-lifts`,
  `tuck-l-sit-lift`, `boat-pose`, `lying-legs-raise`, `knee-copenhagen-plank`,
  `assisted-copenhagen-plank`, `copenhagen-plank` (in the core skip list), `front-scale`,
  `back-scale`, `hip-airplane`, `hip-hike`. These load the hip flexors or the adductors as a
  secondary role while the primary target is the trunk or a balance hold. The Copenhagen planks are
  the best-supported adductor exercise in the literature [S6][S7], so if the wave-2 writer wants an
  adductor strength entry, its strongest form lives in the Core table.
- Mobility partition (the taxonomy's "Mobility (stretches and holds)" table): `partial-middle-split`,
  `weighted-wall-straddle-stretch`, `sitting-straddle-stretch`, `standing-straddle-stretch`,
  `rocking-frog`, `frog-stretch`, `squat-to-90-90`, `deep-squat-internal-rotation`, `active-90-90`,
  `wall-quad-stretch`, `prying-squat`, `pigeon-squat`, `kneeling-lunge-hands-down`, and the rest.
  These are the adductor and hip-flexor range work, and the Mobility partition owns them.
- The four holds this partition generated (`deep-squat-hold`, `horse-stance`, `wide-horse-stance`,
  the compression holds) are flagged **mobility** above, matching the taxonomy's routing.

## Recommendation summary for the wave-2 data writer

- Take (add as data): `walking-lunge`, `one-leg-chair-squat`, `one-leg-wall-sit`, `wall-sit`,
  `wide-squat`, `lunge-knee-crunch`, `pistol-squat` (add the full rung), `half-pistol-squat`,
  `reverse-nordic`, `assisted-reverse-nordic`, `lying-leg-extension`, `single-leg-leg-extension`,
  `tibialis-raise`, `banded-knee-drive`, `cable-knee-drive`, `cable-straight-leg-raise`,
  `banded-hip-adduction`, `lying-hip-adduction`.
- Keep (already present): the 25 taxonomy skip-list items in section D.
- Prune (do not add): `curtsy-lunge`, `deep-lunge`, `deep-squat`, `horse-walk`,
  `plie-squat-with-tip-toes`, `box-shuffle`, `deep-step-up`, `narrow-stance-leg-press`,
  `wide-stance-leg-press`, `wall-lunge`, `incline-lunge`, `lunge-and-press`, `overhead-lunge`,
  `weighted-deep-lunge`, `elevated-pistol-squat`, `dragon-squat`,
  `foot-hold-hand-assisted-dragon-squat`, `shrimp-squat`, `touchdown-squat`,
  `quarter-pistol-squat-touchdown`, `goblet-cyclist-squat`, `sissy-squat`, `half-sissy-squat`,
  `assisted-sissy-squat`, `kettlebell-tibialis-raise`, `cable-straight-leg-adduction`.
- Mobility flag (route to the Mobility data): `deep-squat-hold`, `horse-stance`,
  `wide-horse-stance`, `sitting-pike-compression`, `one-leg-sitting-pike-compression`,
  `sitting-straddle-compression`, `pike-compression-flutter-kicks`.
- Pattern note: the taxonomy rides the adduction and hip-flexion moves on `core` and the quad
  isolation on `knee-extension`. The `muscles` field carries `adductors`, `hip flexors` or
  `tibialis anterior`; adding `adductor` and `hip-flexion` enum values to `MovePattern` is a data
  change in `machines.ts` if the writer wants them searchable as their own patterns.

## Known corrections for the consolidator

- The taxonomy's upper-body skip table maps Calistree's `hip-adduction-machine` (e1bp) to our
  `Ab crunch machine`, which is wrong: our catalog holds `Hip adduction machine` as its own entry
  (`our-existing-names.txt`), and the machine is an adductor move, not a crunch. The legs table
  rightly leaves it out of the skip list (it is a keep for the adductor group), so the mapping in
  the upper table should be corrected to `Hip adduction machine`, or moved to the adductor group in
  whatever form the adduction entries take.

## Unverified

Claims seen in coaching material that this partition could not substantiate, so they are not
published as fact and no entry above depends on them:

- That the sissy squat or a cyclist squat preferentially recruits the vastus medialis (the VMO).
  Common claim, no verified source found here; the pruned sissy entry does not rely on it.
- That a sissy squat is safe for the patellofemoral joint. Not supported here; the entry takes the
  conservative stance and prunes it in favour of the reverse Nordic (the knee-load review in [S5]
  sets the deep-flexion caution this rests on).
- That training the hip flexors directly improves stride length or running economy. Plausible from
  the swing-phase load in [S4], but no training study that isolates hip-flexor strength and measures
  running economy was found here, so none is claimed.
- That sitting shortens the hip flexors and must be stretched. Common claim, not verified here; the
  hip-flexion entries rest on the training role [S4], not on a posture-reversal claim.
- That the reverse Nordic increases rectus femoris fascicle length. The eccentric role is sound
  [S11][S15], but no verified architecture study was found here, so the entry claims the loading
  role only.
- Exact load or set prescriptions per exercise. This partition documents the moves; the set, rep,
  rest and phase bands are the engine's, already decided in docs/decisions.md [S10].

## Sources

All URLs retrieved 2026-11-27.

- [S1] Blagrove RC, Howatson G, Hayes PR. Effects of Strength Training on the Physiological
  Determinants of Middle- and Long-Distance Running Performance: A Systematic Review. Sports
  Medicine, 2018;48(5):1117-1149. systematic-review. https://doi.org/10.1007/s40279-017-0835-7
  (PMID 29249083).
- [S2] Berryman N, Mujika I, Bosquet L. Strength Training for Middle- and Long-Distance Performance:
  A Meta-Analysis. International Journal of Sports Physiology and Performance, 2018;13(1):57-63.
  meta-analysis. https://doi.org/10.1123/ijspp.2017-0032 (PMID 28459360; correction at
  https://doi.org/10.1123/ijspp.2018-0153).
- [S3] Lauersen JB, Bertelsen DM, Andersen LB. The effectiveness of exercise interventions to
  prevent sports injuries: a systematic review and meta-analysis of randomised controlled trials.
  British Journal of Sports Medicine, 2014;48(11):871-877. meta-analysis.
  https://doi.org/10.1136/bjsports-2013-092538 (PMID 24100287). Strength training reduced injuries
  to less than one third (RR 0.315, 0.207 to 0.480); overuse injuries were almost halved (RR 0.527).
- [S4] Dorn TW, Schache AG, Pandy MG. Muscular strategy shift in human running: dependence of
  running speed on hip and ankle muscle performance. Journal of Experimental Biology,
  2012;215(11):1944-1956. observational (biomechanics). https://doi.org/10.1242/jeb.064527
  (PMID 22573774). Above about 7 m/s the strategy shifts to faster swing, driven by the iliopsoas,
  gluteus maximus and hamstrings.
- [S5] Hartmann H, Wirth K, Klusemann M. Analysis of the load on the knee joint and vertebral column
  with changes in squatting depth and weight load. Sports Medicine, 2013;43(10):993-1008.
  narrative-review (systematic literature review). https://doi.org/10.1007/s40279-013-0073-6
  (PMID 23821469). Highest retropatellar compression near 90 degrees; deep squatting with good
  technique and progressive load does not raise passive-tissue risk; light half or quarter squats
  with supra-maximal loads are the riskier practice.
- [S6] Serner A, Jakobsen MD, Andersen LL, Hölmich P, Sundstrup E, Thorborg K. EMG evaluation of
  hip adduction exercises for soccer players: implications for exercise selection in prevention and
  treatment of groin injuries. British Journal of Sports Medicine, 2014;48(14):1108-1114.
  observational (EMG). https://doi.org/10.1136/bjsports-2012-091746 (PMID 23511698). Peak adductor
  longus activation ranged 14 to 108 percent of MVC across eight exercises; the Copenhagen adduction
  and the banded hip adduction were the high-intensity dynamic options.
- [S7] Ishøi L, Sørensen CN, Kaae NM, Jørgensen LB, Hölmich P, Serner A. Large eccentric strength
  increase using the Copenhagen Adduction exercise in football: A randomized controlled trial.
  Scandinavian Journal of Medicine and Science in Sports, 2016;26(11):1334-1342. rct.
  https://doi.org/10.1111/sms.12585 (PMID 26589483). Eight-week progressive program raised
  eccentric hip adduction strength 35.7 percent, compliance 91 percent.
- [S8] Krommes K, Bandholm T, Jakobsen MD, Andersen LL, Serner A, Hölmich P, Thorborg K. Dynamic hip
  adduction, abduction and abdominal exercises from the Hölmich groin-injury prevention program are
  intense enough to be considered strengthening exercises. International Journal of Sports Physical
  Therapy, 2017;12(3):371-380. observational. https://pmc.ncbi.nlm.nih.gov/articles/PMC5455186/
  (PMID 28593090).
- [S9] Hölmich P, Nyvold P, Larsen K. Continued significant effect of physical training as
  treatment for overuse injury: 8- to 12-year outcome of a randomized clinical trial. American
  Journal of Sports Medicine, 2011;39(11):2447-2451. rct. https://doi.org/10.1177/0363546511416075
  (PMID 21813441).
- [S10] American College of Sports Medicine. Progression Models in Resistance Training for Healthy
  Adults (position stand). Medicine and Science in Sports and Exercise, 2009;41(3):687-708.
  position-stand. https://journals.lww.com/acsm-msse/fulltext/2009/03000/progression_models_in_resistance_training_for.26.aspx
  (the engine's set, rep and rest bands already follow it; docs/decisions.md, 2026-11-27).
- [S11] ExRx.net. Thigh Exercises (quadriceps, hamstrings, hip adductors and adductor magnus
  exercise lists). coaching reference. https://exrx.net/Lists/ExList/ThighWt
- [S12] ExRx.net. Hip Exercises (hip flexors, abductors and external rotators exercise lists).
  coaching reference. https://exrx.net/Lists/ExList/HipsWt
- [S13] ExRx.net. Iliopsoas (muscle page: hip flexion, attachments). coaching reference.
  https://exrx.net/Muscles/Iliopsoas
- [S14] ExRx.net. Adductors (Hip) (muscle page: adduction, transverse adduction, hip extension by
  the magnus, sources). coaching reference. https://exrx.net/Muscles/Adductors
- [S15] ExRx.net. Reverse Nordic (assisted and band-assisted quadriceps exercise page). coaching
  reference. https://exrx.net/WeightExercises/Quadriceps/ASReverseNordicCable
- [S16] Hölmich P. Groin injuries in athletes: development of clinical entities, treatment, and
  prevention. Danish Medical Journal, 2015;62(12):B5184. narrative-review.
  https://pubmed.ncbi.nlm.nih.gov/26621401/
- [S17] Stensø J, Andersen TE, Harøy J. Adductor Strengthening Programme is successfully adopted but
  frequently modified in Norwegian male professional football teams: a cross-sectional study. BMJ
  Open, 2022;12(9):e060611. observational. https://doi.org/10.1136/bmjopen-2021-060611
- [S18] Calistree. Muscle-group datasheets and the wave-8 candidate harvest (taxonomy source only;
  no description text used): quadriceps https://calistree.app/datasheet/quadriceps-m00a, hip
  adductors https://calistree.app/datasheet/hip-adductors-m013, psoas major
  https://calistree.app/datasheet/psoas-major-m01e. Retrieved 2026-11-27.
- [S19] ExRx.net. Tibialis Anterior (muscle page: ankle dorsiflexion and inversion). coaching
  reference. https://exrx.net/Muscles/TibialisAnterior
