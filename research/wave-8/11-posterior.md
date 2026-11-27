# Wave 8, file 11: posterior chain and calves

workstream: wave-8 exercise documentation
subtopic: posterior chain and calves (hip hinge, hamstrings and knee flexion, glutes, lower back, calves and Achilles, ankles where relevant)
generated_at: 2026-11-27T05:20:00Z

## Provenance note (read first)

The parallel taxonomy branch `origin/research/wave-8-taxonomy` never appeared. Four bounded
checks over about fifteen minutes (three `git fetch origin research/wave-8-taxonomy` plus one
full `git fetch origin`) all found nothing; no `wave-8` branch existed on origin at check time.
Per the brief, this file was then built from Calistree's own web library instead of the
taxonomy branch. That required Firecrawl: the Calistree web app is a Flutter single-page app
that renders client-side, so plain `webfetch` returned only a loading shell (four attempts:
marketing homepage, hamstrings datasheet x2, one exercise datasheet). Four Firecrawl scrape
calls were spent, the budget the brief allowed, on the hamstrings datasheet (which renders the
whole leg-region exercise listing), the bent-knee calf raise page and the standing-toes-to-heels
page to recover the calf and ankle families. Calistree is the taxonomy source only: every
training claim below cites an exercise-science reference, never Calistree's copy.

One entry per base exercise, with Calistree's variants folded into the family entry. Calistree
IDs are the `e0xx`/`w0xx` slugs in its URLs, kept here so consolidation can join against the
catalog when the taxonomy branch lands. If the taxonomy's posterior partition differs from
this list, reconcile there; the flagged gaps are listed under Unverified.

How to read the recommendations: the engine's strength spine is squat or leg press, hip hinge,
knee flexion, calf work, then the day's lean (docs/decisions.md, "Strength sessions are
full-body with a lean"). Take or prune below is judged against those slots, at two to three
weekly strength sessions, with a runner's recovery budget. "Take" means the engine catalog
should carry it; "optional" means keep it in the catalog but do not spend a spine slot on it.

All web sources were retrieved 2026-11-27. Anatomy anchors come from OpenStax Anatomy and
Physiology 2e section 11.6,
https://openstax.org/books/anatomy-and-physiology-2e/pages/11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs
(hamstrings extend the hip and flex the knee, gluteus maximus extends the thigh, gluteus
medius abducts it, gastrocnemius plantarflexes and assists knee flexion, soleus plantarflexes
and holds posture, and the superficial calf muscles insert on the calcaneal/Achilles tendon).
The runner-strength umbrella claim used throughout, that strength training improves running
economy, time-trial performance and muscle-tendon stiffness in middle- and long-distance
runners, is from Blagrove, Howatson and Hayes 2018, Sports Medicine 48(5):1117-1149,
https://pubmed.ncbi.nlm.nih.gov/29249083/, retrieved 2026-11-27.

---

## A. Hip hinge

### A1. Romanian deadlift (barbell)

- Calistree: `romanian-deadlift-e0dx`; variants `smith-machine-romanian-deadlift-e1dy`,
  `cable-romanian-deadlift-single-leg-e1ek`, dumbbell and kettlebell forms.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: hip extension under load. The hamstring target with glute max, adductor magnus and
  erector spinae as movers of the same hinge pattern is documented for the stiff-leg family by
  ExRx, https://exrx.net/WeightExercises/Hamstrings/BBStraightLegDeadlift, retrieved
  2026-11-27. Hamstrings both extend the hip and flex the knee (OpenStax 11.6, URL above,
  retrieved 2026-11-27). The RDL keeps knees soft while the hips fold, so it loads the
  hamstrings at long muscle length.
- Pattern: hip hinge, both legs.
- Equipment: barbell (dumbbells, kettlebells or a Smith machine for the variants).
- Level: intermediate once the two-leg bodyweight hinge is owned; beginners can regress to A9.
- Runner value: this is the strongest single hinge for the spine's hinge slot. Lengthened
  hamstring loading is what a runner's swing and late-stance phase asks of the hamstring, and
  hamstring strength at long muscle length grew most where it was trained long (Maeo et al
  2021, Med Sci Sports Exerc 53(4):825-837, https://pubmed.ncbi.nlm.nih.gov/33009197/,
  retrieved 2026-11-27). Lower-limb strength work shows transfer to running economy and
  performance (Blagrove et al 2018, URL in header, retrieved 2026-11-27). Wrong tool when:
  the runner cannot brace and keep a neutral spine under load yet, or in the final days before
  a race (the phase arc already drops heavy strength there).
- Form cues: hinge at the hips, knees soft but still, push the hips back until a strong
  hamstring stretch, bar or weight close to the legs, spine neutral the whole way, no lowering
  past a mild stretch (ExRx's technique comments for the straight-leg family say exactly this,
  URL above, retrieved 2026-11-27).
- Common mistakes: turning it into a squat by bending the knees; letting the bar drift away
  from the legs; rounding the low back at the bottom; bouncing at the stretch instead of
  controlling it.
- Recommendation: take. This is the default hinge slot for a gym runner.
- Confidence: high.

### A2. Deadlift (conventional barbell)

- Calistree: `deadlift-e0dw`; variant `banded-deadlift-e0fd`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: the whole posterior chain plus grip and trunk under heavy load; hip extension with
  large trunk-stabilization demand (erector spinae, glute max, hamstrings; OpenStax 11.6 and
  ExRx's hinge attribution, URLs above, retrieved 2026-11-27).
- Pattern: hip hinge from the floor, both legs.
- Equipment: barbell and plates.
- Level: intermediate to advanced; technique load is real.
- Runner value: heaviest possible hinge, so the cheapest way to make the posterior chain
  stronger overall (Blagrove et al 2018, URL in header, retrieved 2026-11-27). Buys general
  hip-extension strength and trunk tolerance for long-run fatigue. Wrong tool when: time or
  setup is scarce (the hinge slot is served by the RDL with less setup), or a runner has an
  active low-back complaint that bracing aggravates; the coach should redirect, not diagnose.
- Form cues: start with the bar over mid-foot, wedge the hips down until shins touch the bar,
  pull the slack out, brace, push the floor away, keep the bar against the legs, finish tall
  without leaning back. Begin light and add load gradually so the low back adapts (ExRx's
  comments on the straight-leg deadlift carry the same progression warning, URL above,
  retrieved 2026-11-27).
- Common mistakes: yanking the first rep off the floor with a rounded back; hyperextending the
  hips at the top; treating it as a back exercise and letting the hips shoot up first.
- Recommendation: take, as the heavy hinge for a runner with barbell access; the RDL is the
  everyday hinge and this is the strength ceiling move.
- Confidence: high on pattern and muscles; medium on runner-specific value (no runner trial
  isolates the conventional deadlift; the claim rides on the Blagrove umbrella).

### A3. Dumbbell deadlift

- Calistree: `dumbbell-deadlift-e13r`. https://calistree.app/datasheet/hamstrings-m00b,
  retrieved 2026-11-27.
- Trains: same hinge pattern as A2, hip extension plus trunk, with dumbbells.
- Pattern: hip hinge, both legs.
- Equipment: dumbbells.
- Level: beginner-friendly entry point to the barbell hinge.
- Runner value: the hinge slot for a home runner with no barbell. Same buy as A2 at a lower
  absolute load ceiling; free-weights and machines build similar strength when volume is
  equated, so the pattern matters more than the implement (Schwanbeck et al 2020,
  https://doi.org/10.1080/02640414.2020.1777346, as corrected in research/README.md,
  retrieved 2026-11-27).
- Form cues: dumbbells hang outside the shins, same wedge-brace-push sequence as A2, spine
  neutral.
- Common mistakes: holding the dumbbells too far in front; rushing the setup because a
  dumbbell deadlift feels light.
- Recommendation: take, as the equipment-parallel of the hinge slot for home runners.
- Confidence: high.

### A4. Kickstand (B-stance) deadlift

- Calistree: `kickstand-deadlift-e14z`. https://calistree.app/datasheet/hamstrings-m00b,
  retrieved 2026-11-27.
- Trains: single-leg-biased hinge, one hip loaded with the rear foot as a kickstand; glute max
  and hamstrings of the front leg carry most of it (hip extension attribution as in A1,
  retrieved 2026-11-27).
- Pattern: hip hinge, staggered stance.
- Equipment: barbell, dumbbells or kettlebell.
- Level: intermediate; the step between two-leg hinges and full single-leg hinges.
- Runner value: running is one ground contact at a time, so a staggered hinge trains hip
  extension with a small stability demand without the balance cost of A5 (Blagrove et al 2018
  umbrella, URL in header, retrieved 2026-11-27). Wrong tool when: a runner is not ready to
  control the pelvis at all (start at A9), or it replaces the two-leg hinge entirely and total
  hinge volume halves.
- Form cues: front shin near vertical, most load on the front foot, rear toes lightly kissing
  the floor, hips fold straight back, no trunk twist.
- Common mistakes: letting the rear leg carry half the load; hip drifts sideways as the hips
  fold; rotating the torso.
- Recommendation: take, as the hinge-side progression between A1 and A5.
- Confidence: medium (mechanics are well established; no trial isolates this exact variant).

### A5. One-leg deadlift (single-leg Romanian deadlift)

- Calistree: `one-leg-deadlift-e0ji`; variants `banded-single-leg-deadlift-e0fc`,
  `single-kettlebell-one-leg-deadlift-e0jj`, `single-dumbbell-one-leg-deadlift-e13w`,
  `double-dumbbell-one-leg-deadlift-e13v`. https://calistree.app/datasheet/hamstrings-m00b,
  retrieved 2026-11-27.
- Trains: unilateral hinge, hip extension plus balance and pelvic control; hamstring and glute
  max of the stance leg (attribution as in A1, retrieved 2026-11-27).
- Pattern: hip hinge, single leg.
- Equipment: dumbbells, kettlebell or a band.
- Level: intermediate to advanced.
- Runner value: the closest gym picture of running stance, one hip extending while the pelvis
  is controlled against rotation (Blagrove et al 2018 umbrella, URL in header, retrieved
  2026-11-27). Buys pelvic control that shows up as less hip drop at pace. Wrong tool when:
  the runner wobbles through the pattern with no load (stay at A9 first), or near a race when
  new balance demands would add unfamiliar stress.
- Form cues: hips square and level, back leg tracks straight behind as a counterweight, hinge
  until the back leg and trunk form one line, soft stance knee.
- Common mistakes: opening the hips to one side; rounding the back to reach further; turning
  it into a balance stunt with a tiny hinge range.
- Recommendation: take, as the unilateral hinge after A4.
- Confidence: high on pattern and muscles; medium on runner-specific value (umbrella-level
  claim).

### A6. Good morning

- Calistree: `good-morning-e0h2`; variants `seated-good-morning-e0pk`,
  `wide-squat-good-morning-e0zu`. https://calistree.app/datasheet/hamstrings-m00b,
  retrieved 2026-11-27.
- Trains: hip hinge with the bar on the shoulders; hamstrings target, glute max and adductor
  magnus synergists, erector spinae as a loaded stabilizer (ExRx,
  https://exrx.net/WeightExercises/Hamstrings/BBGoodMorning, retrieved 2026-11-27).
- Pattern: hip hinge, both legs.
- Equipment: barbell.
- Level: intermediate to advanced; the load sits on the spine, so bracing must be owned.
- Runner value: same hinge buy as A1 (Blagrove umbrella, URL in header, retrieved
  2026-11-27). It adds nothing the RDL does not already deliver for a runner, and the
  lever arm on the low back is less forgiving for the same hamstring stimulus.
- Form cues: bar on the upper traps, knees soft, hinge to near-parallel with a neutral spine,
  drive the hips forward to stand (ExRx technique, URL above, retrieved 2026-11-27).
- Common mistakes: hinging too deep into lumbar flexion; knees sliding forward; loading up
  before the pattern is owned.
- Recommendation: prune. Redundant with A1 for the hinge slot, with a worse risk-to-benefit
  shape for a runner's schedule.
- Confidence: high on attribution (ExRx); the prune is a catalog judgment, not an evidence
  claim.

### A7. Kettlebell swing

- Calistree: `two-hand-kettlebell-swing-e0jn`; variants `one-hand-kettlebell-swing-e0jo`,
  `alternate-arm-swing-e0jp`. https://calistree.app/datasheet/hamstrings-m00b, retrieved
  2026-11-27.
- Trains: ballistic hip hinge; swing EMG work shows strong hip and back muscle activation
  with measurable low-back load, so the swing trains the hinge explosively while the back
  stays isometric (McGill and Marshall 2012, J Strength Cond Res 26(1):16-27,
  https://pubmed.ncbi.nlm.nih.gov/21997449/, retrieved 2026-11-27).
- Pattern: ballistic hip hinge.
- Equipment: kettlebell (dumbbell swings work too).
- Level: intermediate; the hip snap is a skill.
- Runner value: trains hip extension speed and posterior-chain power without a max lift
  (Blagrove et al 2018 umbrella, URL in header, retrieved 2026-11-27). Buys a punchier
  stance push-off and a back that tolerates load while moving. Wrong tool when: the runner
  cannot yet own a quiet deadlift hinge, or it is programmed as conditioning with sloppy
  reps at the end of a hard day.
- Form cues: hike the bell back between the hips, hinge not squat, snap the hips and let the
  bell float, arms are ropes, exhale sharply at the top.
- Common mistakes: squatting the swing; lifting the bell with the arms; overextending the low
  back at the top.
- Recommendation: take as optional. A good ballistic hinge for runners who have the pattern,
  but it does not displace A1 in the spine.
- Confidence: high on EMG attribution (McGill and Marshall); medium on runner value.

### A8. Jefferson curl

- Calistree: `jefferson-curl-e00i`. https://calistree.app/datasheet/hamstrings-m00b,
  retrieved 2026-11-27.
- Trains: loaded end-range spinal flexion and hamstring stretch, segment by segment down the
  spine and back up.
- Pattern: loaded roll-down hinge.
- Equipment: light kettlebell or dumbbell.
- Level: advanced; progressive loading over months, not weeks.
- Runner value: the honest answer is narrow. It can build tolerance of the exact motion
  runners avoid, but its documented base is coaching practice, not trials, and the same
  hamstring-at-length stimulus is available from A1 and A5 with far less technique risk.
- Form cues: start light, tuck segment by segment, let the weight hang and deepen the
  hamstring stretch at the bottom, return the way you came down, never bounce.
- Common mistakes: loading too early; jerking through the low back; using it as a max-load
  hinge.
- Recommendation: prune. A deliberate end-range flexion project, not a catalog exercise for
  a runner's two to three weekly sessions; end-range work belongs to the mobility data if the
  owner wants it there.
- Confidence: low on training claims (no indexed trial); the prune is a catalog judgment.

### A9. One-leg hinge (bodyweight)

- Calistree: `one-leg-hinge-e13y`. https://calistree.app/datasheet/hamstrings-m00b,
  retrieved 2026-11-27.
- Trains: unilateral hip extension pattern with bodyweight as the only load; hamstrings and
  glute max of the stance leg (attribution as in A1, retrieved 2026-11-27), plus balance.
- Pattern: hip hinge, single leg, no load.
- Equipment: none.
- Level: beginner.
- Runner value: the on-ramp to every loaded hinge in this file, and a runner can own it
  anywhere, hotel room included. Buys the pelvic-control base that A4 and A5 load.
  Wrong tool when: a runner has already loaded hinges; then it is a warm-up drill, and the
  session's hinge slot should go to A1 or A5.
- Form cues: soft knee, hips fold straight back, free leg reaches back as a counterweight,
  ribs down, stand tall by squeezing the stance-side glute.
- Common mistakes: bending the free hip so the leg never becomes a counterweight; losing the
  neutral spine to reach further; letting the stance knee travel forward and turning it into
  a squat.
- Recommendation: take. The beginner hinge slot and the regression for A4 and A5.
- Confidence: high.

### A10. Hip airplane

- Calistree: `hip-airplane-e170`; variant `assisted-hip-airplane-e16f`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: single-leg stance with hip rotation and hinging under control; stance hip rotators,
  hamstrings and glutes working to hold the pelvis level (muscle actions per OpenStax 11.6,
  URL in header, retrieved 2026-11-27).
- Pattern: unilateral hinge plus rotation control.
- Equipment: none (a wall or pole to hold).
- Level: intermediate to advanced; slow and humbling.
- Runner value: pelvic-control training on one leg, the exact demand of running stance
  (Blagrove umbrella, URL in header, retrieved 2026-11-27). Buys steadier hips on technical
  ground. Wrong tool when: the runner cannot yet stand on one leg quietly, or when the
  session's hinge slot needs load rather than control.
- Form cues: hold a support lightly, hinge to a shallow single-leg RDL position, then rotate
  the whole body open and closed from the hip, pelvis level the entire time.
- Common mistakes: rotating from the trunk instead of the hip; letting the pelvis tilt;
  rushing the tempo.
- Recommendation: optional. Keep in the catalog as a motor-control piece; do not spend a
  spine slot on it.
- Confidence: low on specific evidence (coaching practice); mechanics claims anchored on
  OpenStax anatomy only.

### A11. Power clean family

- Calistree: `power-clean-e0h6`, `clean-e0k1`, `single-kettlebell-clean-e0jy`,
  `single-dumbbell-clean-e13u`, plus press and jerk combinations.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: explosive triple extension from the floor (hips, knees, ankles) with a barbell,
  dumbbell or kettlebell.
- Pattern: explosive hinge to catch.
- Equipment: barbell and plates (platform), or a KB/DB.
- Level: advanced; coaching-sensitive skill.
- Runner value: triple-extension power is a real quality, but for a runner's schedule the
  skill cost is high and the same explosive hip extension is available from A7 with a
  kettlebell and no catch.
- Form cues (if ever used): jump and shrug, elbows whip through, catch with the bar on the
  shoulders, absorb with soft knees. Not coached further here because the recommendation is
  prune.
- Common mistakes: pulling with the arms early; catching low with a rounded back.
- Recommendation: prune. Skill and equipment cost outweigh the marginal buy over A7 for
  runners; revisit only if a track-athlete persona asks for it.
- Confidence: high that the prune is the right catalog call; the underlying pattern claims are
  standard.

Also in the Calistree capture but not documented: `zercher-deadlift-e15l` (a bar-in-elbows
deadlift variant with no distinct runner buy; prune at list level), `banded-deadlift-e0fd`
(folded into A2), Smith machine and cable RDL variants (folded into A1).

---

## B. Knee flexion (hamstring curls)

### B1. Seated leg curl (machine)

- Calistree: `seated-leg-curl-e1bx`; variant `single-leg-seated-leg-curl-e1by`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: knee flexion with the hip flexed, which trains the hamstrings at long muscle
  length; seated curls grew more hamstring than prone curls in a controlled trial (Maeo et al
  2021, Med Sci Sports Exerc 53(4):825-837, https://pubmed.ncbi.nlm.nih.gov/33009197/,
  retrieved 2026-11-27). Hamstrings flex the knee and extend the hip (OpenStax 11.6, URL in
  header, retrieved 2026-11-27).
- Pattern: knee flexion, isolated.
- Equipment: seated leg curl machine.
- Level: beginner-friendly; the machine guides the path.
- Runner value: the engine's knee-flexion slot with the best documented hypertrophy case.
  Long-length hamstring work is the runner's buy: swing-phase stretch under load. Wrong tool
  when: no machine access (then B3 or B4), or the runner is two days from a race and the
  phase arc has already cut strength.
- Form cues: pads on the back of the ankle, hips pressed into the seat, curl to full bend,
  lower slowly through the whole range.
- Common mistakes: lifting the hips off the seat to finish a rep; dropping the weight
  instead of lowering it; half range at the top.
- Recommendation: take. This is the default knee-flexion slot for a gym runner.
- Confidence: high.

### B2. Nordic curl

- Calistree: `nordic-curl-e0ee`. https://calistree.app/datasheet/hamstrings-m00b, retrieved
  2026-11-27.
- Trains: eccentric hamstring strength at long length while the hip stays extended; bodyweight
  lowers with a partner or band catching the fall.
- Pattern: eccentric knee flexion, open chain.
- Equipment: none (a partner, a band or a fixed anchor for the ankles).
- Level: intermediate to advanced; most runners start with band-assisted reps.
- Runner value: the strongest evidence in this file for injury prevention: including the
  Nordic in a program halves hamstring injury rates across 8459 athletes (van Dyk, Behan and
  Whiteley 2019, Br J Sports Med 53(21):1362-1370,
  https://doi.org/10.1136/bjsports-2018-100045, retrieved 2026-11-27; the trials inside the
  meta used about ten weeks of twice-weekly progressions). Buys hamstring eccentric capacity
  that sprinting and fast downhills spend. Wrong tool when: first week of a new plan (the
  residual soreness is real), or the runner cannot keep hips extended and pikes instead,
  which turns it into a core exercise.
- Form cues: knees on a pad, ankles fixed, body straight from knees to head, lower as slowly
  as strength allows, hands ready to catch, pull back up by pushing the floor or with a band.
- Common mistakes: piking at the hips so the torso leads instead of the hamstrings; dropping
  uncontrolled into the floor; doing it daily and living sore.
- Recommendation: take. The knee-flexion slot with the best injury evidence; program it early
  in base phase and keep the dose small at first.
- Confidence: high.

### B3. Sliding leg curl

- Calistree: `sliding-leg-curl-e0em`; variant `one-leg-sliding-leg-curl-e0en`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: knee flexion plus hip extension together (the hamstring both extends the hip and
  flexes the knee, so the move closes both joints); load is self-chosen through friction.
- Pattern: combined hip extension and knee flexion, closed chain.
- Equipment: sliders, or a towel on a smooth floor.
- Level: beginner to intermediate; easy to regress by shortening the slide.
- Runner value: a no-equipment knee-flexion slot for home runners, with the hamstring
  working the way it works in late stance, lengthening at the knee while the hip extends
  (muscle actions per OpenStax 11.6, URL in header, retrieved 2026-11-27). Wrong tool when:
  no smooth floor or the runner's knee cannot tolerate the compression of the curl-in.
- Form cues: heels on sliders, hips lifted into a straight bridge line, pull the heels
  toward the hips by bending the knees while the hips stay up, slide out slowly.
- Common mistakes: hips sagging as the heels slide out; pushing with the arms; shortening
  the range so the hamstrings never lengthen.
- Recommendation: take. The no-equipment knee-flexion slot; pairs with B1 as the machine
  option rather than replacing it.
- Confidence: medium (mechanics are standard; no isolated trial).

### B4. Stability ball hamstring curl

- Calistree: `stability-ball-hamstring-curl-e00n`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: same combined pattern as B3 with a stability ball; adds a small balance demand.
- Pattern: combined hip extension and knee flexion.
- Equipment: stability ball.
- Level: beginner to intermediate.
- Runner value: same buy as B3 with the equipment many home runners already own (Blagrove
  umbrella, URL in header, retrieved 2026-11-27). Wrong tool when: the ball is unstable
  enough that the hamstring stimulus turns into a hip-control drill; then B3 is the cleaner
  choice.
- Form cues: hips high and level, curl the heels in until the soles rest on the ball, control
  the slide out.
- Common mistakes: hips dropping mid-set; using the arms to push; the ball wandering off-line.
- Recommendation: optional. Keep as the home alternative to B3 where a ball exists; the
  engine should pick one knee-flexion move per session, not both.
- Confidence: medium.

### B5. Leg curl with a band or cable

- Calistree: `banded-hamstring-curl-lying-e12c`, `banded-hamstring-curl-standing-e12d`,
  `cable-standing-hamstring-curl-single-leg-e1el`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: open-chain knee flexion against band or cable tension; hamstrings only
  (OpenStax 11.6, URL in header, retrieved 2026-11-27).
- Pattern: knee flexion, isolated, open chain.
- Equipment: band or cable stack and an ankle cuff.
- Level: beginner.
- Runner value: the lightest knee-flexion option, useful when a runner is regressing back
  after a hamstring niggle or when the machine and floor options are unavailable. Wrong tool
  when: it is the runner's only knee-flexion work for weeks, because the stimulus ceiling is
  low; move up to B1, B2 or B3.
- Form cues: anchor firm, curl to full knee bend, lower slowly against the tension, keep the
  thigh still.
- Common mistakes: swinging the whole leg for momentum; band slack at the top of each rep;
  cranking the tempo up.
- Recommendation: optional. A regression and travel option, not a spine slot.
- Confidence: medium.

### B6. Harop curl

- Calistree: `harop-curl-e116`. https://calistree.app/datasheet/hamstrings-m00b, retrieved
  2026-11-27.
- Trains: a two-phase hamstring move: a hinge to lengthen the hamstrings over the hip, then a
  knee flexion to gather the heels in, combining A1's and B3's joint actions.
- Pattern: combined hinge and knee flexion.
- Equipment: sliders or a smooth floor, sometimes a partner holding the feet.
- Level: advanced.
- Runner value: mechanically it is the full hamstring action in one move, but the pattern is
  technical, the load ceiling is low, and the two halves are already served better by A1 plus
  B3 (muscle actions per OpenStax 11.6, URL in header, retrieved 2026-11-27).
- Form cues: hinge forward with hips high, then curl the heels in without letting the hips
  drop, extend back out under control.
- Common mistakes: hips sagging during the curl; collapsing into the hinge; doing it before
  B3 is owned.
- Recommendation: prune. Interesting for a hamstring-focused block under supervision, not for
  the engine catalog.
- Confidence: low (no indexed trial; description is from movement mechanics only).

---

## C. Glutes and hip extension

### C1. Hip thrust

- Calistree: `hip-thrust-e0pj`; variants `deficit-hip-thrust-e10l`,
  `one-leg-deficit-hip-thrust-e10m`, `smith-machine-hip-thrust-e1ds`,
  `smith-machine-hip-thrust-single-leg-e1dr`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: hip extension into a locked, horizontally loaded position; gluteus maximus dominates
  the action (OpenStax 11.6, URL in header, retrieved 2026-11-27), and barbell hip thrust
  trials report high glute-max EMG with low quad involvement (Contreras et al 2015, J Appl
  Biomech 31(6):452-458, https://pubmed.ncbi.nlm.nih.gov/26214739/, retrieved 2026-11-27;
  bridge and hip-thrust variants also recruit multifidus, Kim and Jeon 2026, Physiother
  Theory Pract, https://pubmed.ncbi.nlm.nih.gov/42578527/, retrieved 2026-11-27).
- Pattern: hip extension, horizontal load.
- Equipment: bench plus barbell (dumbbells or a band work at lower loads).
- Level: beginner-friendly to set up, heavy versions are intermediate.
- Runner value: the highest-load glute-max move available without a hinge, and it is easy to
  progress without adding technique (Blagrove umbrella, URL in header, retrieved
  2026-11-27). Buys hip-extension strength that the stance push-off spends. Wrong tool when:
  the runner's week already carries heavy deadlifts and the session needs control work
  instead, or hip flexors pinch at full extension, which usually means the setup needs
  adjusting, not more load.
- Form cues: shoulder blades on the bench, shins vertical at the top, push through the heels,
  ribs down, squeeze to a straight line from knee to shoulder, no back arching past neutral.
- Common mistakes: pushing through the toes; hyperextending the low back at the top; feet
  too far forward so the hamstrings take over.
- Recommendation: take. The glute slot for a gym runner when the day's lean is glutes.
- Confidence: high.

### C2. Glute bridge (bodyweight)

- Calistree: `glute-bridge-e0eh`; variants `one-leg-glute-bridge-e0ei`,
  `elevated-glute-bridge-e0pl`, `one-leg-elevated-glute-bridge-e0pm`,
  `stability-ball-glute-bridge-e010`, `stability-ball-single-leg-glute-bridge-e00o`,
  `rings-glute-bridge-bent-legs-e08a`, `rings-glute-bridge-straight-legs-e08b`,
  `wall-bridge-raise-e0ys`. https://calistree.app/datasheet/hamstrings-m00b, retrieved
  2026-11-27.
- Trains: hip extension from the floor; glute max as the mover, hamstrings as synergists,
  with lumbopelvic control (OpenStax 11.6, URL in header, retrieved 2026-11-27; bridge
  variants show glute max and multifidus activation, Kim and Jeon 2026, URL above, retrieved
  2026-11-27). The single-leg and elevated variants raise the demand per rep.
- Pattern: hip extension, supine.
- Equipment: none.
- Level: beginner.
- Runner value: the first glute move a runner meets in this system, trainable anywhere, and
  the single-leg version doubles as pelvic-control work (Blagrove umbrella, URL in header,
  retrieved 2026-11-27). Wrong tool when: the runner needs more load than bodyweight gives
  and owns the pattern; then C1 or A1 takes the slot.
- Form cues: feet under the knees, heels down, ribs down, push through heels to a straight
  knee-hip-shoulder line, pause, lower with control.
- Common mistakes: arching the low back past neutral; pushing through the toes; hips
  sagging on the single-leg version.
- Recommendation: take. The beginner glute slot and the home glute move; progress to C1 or
  A1 rather than piling on ball and ring variants.
- Confidence: high.

### C3. 45-degree hip extension (back extension bench)

- Calistree: `45-degree-hip-extension-e1ci`; variants `single-leg-45-degree-hip-extension-e1cj`,
  `weighted-45-degree-hip-extension-e1ck`, `weighted-single-leg-45-degree-hip-extension-e1cl`,
  `weighted-roman-chair-back-extension-e1cy`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: hip extension with the trunk as the lever; ExRx's hyperextension classification
  names erector spinae as the target with glute max, hamstrings and adductor magnus as
  synergists (ExRx, https://exrx.net/WeightExercises/ErectorSpinae/BBHyperextension,
  retrieved 2026-11-27). Set up with the pad low and it becomes a loaded hinge; pad high and
  it becomes a lumbar extension move.
- Pattern: trunk and hip extension on a bench.
- Equipment: 45-degree or roman-chair bench, plate or dumbbell to load.
- Level: beginner bodyweight, intermediate loaded.
- Runner value: one move covers the lower-back endurance a long run asks for and hip-extension
  strength, and it loads the hamstrings at length in the hinge version (Blagrove umbrella,
  URL in header, retrieved 2026-11-27). Wrong tool when: the runner rounds into lumbar
  flexion under load and cannot hold neutral even unloaded.
- Form cues: pad at the hip crease for the hinge version, hinge down with a neutral spine to
  a mild hamstring stretch, drive the hips to stand tall, no bobbing at the bottom (ExRx's
  technique comments match: no pause or bounce, no lowering past a mild stretch, URL above,
  retrieved 2026-11-27).
- Common mistakes: hyperextending the spine at the top; bouncing out of the bottom; loading
  before the bodyweight hinge is clean.
- Recommendation: take. The lower-back slot of the spine, with the hinge version as default.
- Confidence: high.

### C4. Cable hip extension

- Calistree: `cable-hip-extension-e1ef`. https://calistree.app/datasheet/hamstrings-m00b,
  retrieved 2026-11-27.
- Trains: single-leg hip extension against cable resistance; glute max and hamstrings
  (OpenStax 11.6, URL in header, retrieved 2026-11-27).
- Pattern: hip extension, standing, single leg, open chain.
- Equipment: cable stack with ankle cuff.
- Level: beginner.
- Runner value: a low-load single-leg glute option for a gym runner; the same pattern exists
  at higher quality as A5 with load. The stimulus ceiling is low.
- Form cues: stand tall, slight forward lean, push the leg back from the hip without
  arching the low back, control the return.
- Common mistakes: arching the low back to extend further; swinging the leg; standing too
  far from the pulley so the cable pulls the balance off.
- Recommendation: prune. Redundant with A5 and C2 at a lower stimulus; keep only if a
  physical-therapy-flavored block wants isolated low-load glute work.
- Confidence: medium.

### C5. Donkey kick family

- Calistree: `donkey-kick-e0wk`, `straight-leg-donkey-kick-e0wl`,
  `glute-kickback-machine-e1bv`. https://calistree.app/datasheet/hamstrings-m00b, retrieved
  2026-11-27.
- Trains: hip extension from quadruped; glute max with hamstring help (OpenStax 11.6, URL in
  header, retrieved 2026-11-27).
- Pattern: hip extension, quadruped, open chain.
- Equipment: none (a machine variant exists).
- Level: beginner.
- Runner value: activation-level work. It warms a glute up but does not load it the way A1,
  C1 or C3 do, so it cannot hold a strength slot.
- Form cues: knee to 90 degrees, push the heel to the ceiling without arching the low back,
  ribs steady, slow return.
- Common mistakes: arching the low back and rotating the hips to get range; rushing tiny
  pumps.
- Recommendation: prune from strength. Keep the pattern as dynamic warm-up material, which
  per the engine's rules lives with the mobility and warm-up data, not the strength catalog.
- Confidence: medium.

### C6. Clamshell and reverse clamshell

- Calistree: `clamshell-e0ff`, `reverse-clamshell-e10c`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: hip abduction and external rotation from side-lying, which is gluteus medius and
  deep rotator work rather than glute max (glute medius abducts the thigh, OpenStax 11.6, URL
  in header, retrieved 2026-11-27). The reverse clamshell adds a side plank, so the same hip
  motion is loaded against bodyweight.
- Pattern: hip abduction and rotation, side-lying.
- Equipment: none (band optional).
- Level: beginner.
- Runner value: hip-abductor control is a plausible lever for hip and knee control at
  footstrike, but plain clamshells are too light to change strength; the reverse clamshell
  gives the same motion a real load. Wrong tool when: it crowds out the spine's bigger
  slots; it is an accessory at most.
- Form cues: heels together, hips stacked, open the top knee without rolling the pelvis back,
  slow in and out; reverse version holds the side plank while the top knee opens.
- Common mistakes: rolling the trunk backward to fake range; band so heavy the hip hikes;
  doing hundreds of light reps instead of progressing to loaded abduction work.
- Recommendation: take the reverse clamshell as an optional hip-stability accessory; keep the
  plain clamshell only as the beginner regression of the same line.
- Confidence: medium (anatomy anchored; the dose argument is coaching practice).

---

## D. Lower back (trunk extensors)

### D1. Bird dog

- Calistree: `bird-dog-e0in`; variant `double-bird-dog-e0lf`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: trunk extensor and hip-extensor control in quadruped; the classic extensor-exercise
  measurements of this pattern come from Callaghan, Gunning and McGill, who quantified lumbar
  spine load and muscle activity across extensor exercises including single-leg and opposite
  arm-leg raises (Phys Ther 78(1):8-18, https://pubmed.ncbi.nlm.nih.gov/9442191/, retrieved
  2026-11-27).
- Pattern: contralateral extension control.
- Equipment: none.
- Level: beginner.
- Runner value: a quiet, low-load way to build back-extensor endurance and the anti-rotation
  control that keeps the trunk steady over long runs (Blagrove umbrella, URL in header,
  retrieved 2026-11-27). Wrong tool when: the session needs load; bird dog is control work,
  not strength work.
- Form cues: long spine, reach the opposite arm and leg to their full length without letting
  the hips tilt, pause two counts, change sides slowly.
- Common mistakes: lifting the leg high and arching the low back; hips swinging side to side;
  rushing reps.
- Recommendation: take. The low-back control slot, especially for beginners and recovery
  weeks.
- Confidence: high.

### D2. Locust pose

- Calistree: `locust-pose-e0va`; variant `supported-locust-pose-e0vb`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: prone back extension hold; erector spinae and hip extensors holding the chest and
  legs up (muscle actions per OpenStax 11.6, URL in header, retrieved 2026-11-27).
- Pattern: isometric back extension.
- Equipment: none.
- Level: beginner.
- Runner value: real back-extensor endurance work, but as a held position it belongs with the
  mobility and holds data rather than the strength catalog, per the brief's rule that holds
  get flagged.
- Form cues: legs long, lift from the chest and hips together, neck neutral, breathe through
  the hold.
- Common mistakes: cranking the neck back; squeezing the glutes so hard the low back
  compresses; holding breath.
- Recommendation: flag for the mobility data (it is a hold). If the owner wants prone
  extension strength in the strength catalog instead, C3 covers it with progressive load.
- Confidence: medium.

### D3. Supine arch body hold

- Calistree: `supine-arch-body-hold-e0oy`; variants `one-leg-supine-arch-body-hold-e17y`,
  `arch-body-flutter-kicks-e1b2`. https://calistree.app/datasheet/hamstrings-m00b,
  retrieved 2026-11-27.
- Trains: gymnastics arch hold, an isometric back-extension position on the floor; erector
  spinae, glutes and hamstrings (OpenStax 11.6, URL in header, retrieved 2026-11-27).
- Pattern: isometric full-body extension.
- Equipment: none.
- Level: intermediate (the hold is easy to fake with lumbar compression).
- Runner value: posterior-chain endurance in one position; the flutter-kick variant adds
  hip-flexor work against the arch. For runners, D1 covers the same control goal with less
  spinal compression and more specificity.
- Form cues: press the belly button down, lift chest and legs a few centimeters, arms by the
  hips or overhead, hold and breathe.
- Common mistakes: compressing the low back to fake lift; letting the ribs flare; holding
  the breath.
- Recommendation: prune from strength; flag as a hold for the mobility data if wanted.
- Confidence: low (no runner-relevant trial).

### D4. Back scale

- Calistree: `back-scale-e0er`; variant `assisted-back-scale-e0y5`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: standing balance with one leg extended behind and the trunk leaned forward into an
  arabesque line; hip extension, back extensors and balance (muscle actions per OpenStax
  11.6, URL in header, retrieved 2026-11-27).
- Pattern: single-leg hold, balance skill.
- Equipment: none.
- Level: advanced balance skill.
- Runner value: it is a gymnastics balance, not a strength dose; A5 trains the same hip
  extension with load and a shorter balance demand.
- Form cues: stand tall, fold to a T, hips level, hold without wobbling.
- Common mistakes: locking the standing knee hard; twisting the hips open; chasing leg
  height by arching the low back.
- Recommendation: prune; flag as a hold if the mobility or skill data wants it.
- Confidence: low.

### D5. Bridge family (full backbends)

- Calistree: `bridge-e02a`, `elbow-bridge-e02g`, `bridge-pushup-e0i0`, `bridge-raise-e0s9`,
  `one-leg-bridge-e0sd`, `one-arm-bridge-e0sc`, `forearm-bridge-e0i3`,
  `wall-bridge-raise-e0ys`, `high-bridge-rotation-e0hx`, `wall-walk-bridge-e0sb`,
  `neck-bridge-e0i4`, and the straight-legs neck bridge set.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: full-body backbend skills; spinal extension, shoulder flexion overhead and hip
  extension together. This is gymnastics and yoga territory: part strength, part end-range
  mobility, part skill.
- Pattern: backbend hold or skill.
- Equipment: none (wall for some variants).
- Level: advanced for the full bridge; some raises are beginner.
- Runner value: little direct buy for a runner's engine sessions. The end-range spinal and
  shoulder extension is mobility work; `wall-bridge-raise-e0ys` alone is a plain hip
  extension raise and is already covered by C2.
- Form cues: not coached here (flagged, not cataloged).
- Common mistakes: pushing into a bridge with an unprepared spine or shoulders.
- Recommendation: flag for the mobility data. Prune from the strength catalog.
- Confidence: low as a training claim; the flag itself is a catalog judgment.

---

## E. Calves, Achilles and ankles

The runner case for this whole section: the calf muscles are the runner's engine brake,
plantarflexing every stride through the Achilles (OpenStax 11.6, URL in header, retrieved
2026-11-27), and the soleus in particular is a big contributor to running economy improvements
(Bohm, Mersmann, Santuz and Arampatzis 2021, Proc Biol Sci 288(1943):20202784,
https://pubmed.ncbi.nlm.nih.gov/33499791/, retrieved 2026-11-27). Calf raises with straight
knees bias the gastrocnemius, which crosses the knee; bent-knee raises take it out and bias
the soleus (ExRx notes the knee-straight rule on the standing calf raise and OpenStax
documents gastrocnemius origin on the femur, URLs above, retrieved 2026-11-27).

### E1. Bent-knee calf raise (soleus family)

- Calistree: `bent-knee-calf-raise-e0zs`; variants `bent-knee-single-leg-calf-raise-e0zt`,
  `assisted-bent-knee-calf-raise-e16e`. https://calistree.app/datasheet/bent-knee-calf-raise-e0zs,
  retrieved 2026-11-27.
- Trains: plantarflexion with the knee bent, which removes the gastrocnemius's contribution
  and biases the soleus (gastrocnemius originates on the femur, soleus on the tibia and
  fibula; both insert on the calcaneal tendon, OpenStax 11.6, URL in header, retrieved
  2026-11-27).
- Pattern: ankle plantarflexion, bent knee.
- Equipment: none bodyweight (a step edge for range; weight for load).
- Level: beginner to advanced by reps and load.
- Runner value: the highest-value calf exercise for distance runners. The soleus handles a
  large share of stance-phase braking and propulsion and its efficiency is tied to running
  economy (Bohm et al 2021, URL above, retrieved 2026-11-27; Blagrove umbrella, URL in
  header, retrieved 2026-11-27). Slow, heavy bent-knee raises on a step are the bread and
  butter. Wrong tool when: the goal is gastrocnemius power for sprinting or jumping, then
  E3 is the right knee angle.
- Form cues: ball of the foot on a step edge, knee bent, lower the heel to a full calf
  stretch, rise to the top, pause, lower slowly. Single-leg doubles the load without
  equipment.
- Common mistakes: tiny bobbing reps in the middle of the range; bouncing at the bottom;
  adding load before the full range is owned.
- Recommendation: take. This is the spine's calf slot for distance runners.
- Confidence: high.

### E2. Wall-sit calf raise

- Calistree: `wall-sit-calf-raise-e103`. https://calistree.app/datasheet/bent-knee-calf-raise-e0zs,
  retrieved 2026-11-27.
- Trains: soleus raise with the knees fixed at about 90 degrees against a wall; the deep
  knee bend removes gastrocnemius tension and isolates the soleus (same knee-angle logic as
  E1, retrieved 2026-11-27).
- Pattern: ankle plantarflexion, deep bent knee.
- Equipment: none.
- Level: beginner to intermediate.
- Runner value: a bodyweight soleus option for home runners; the 90-degree knee makes it the
  most isolated soleus raise in the list (Bohm et al 2021 for why the soleus matters, URL
  above, retrieved 2026-11-27). Wrong tool when: the runner's knees dislike deep wall-sit
  angles; use E1's standing bent-knee version instead.
- Form cues: back against the wall, knees at 90 degrees, raise and lower the heels through
  the full available range without letting the hips drop.
- Common mistakes: hips sinking as the set goes on; heels lifting off the floor instead of
  the feet pivoting on the forefoot.
- Recommendation: take as the no-equipment soleus option alongside E1.
- Confidence: medium (mechanics clear; no isolated trial).

### E3. Standing (straight-knee) calf raise

- Calistree: not surfaced in the captured leg-region listing; the calf family captured was
  the bent-knee raises, `wall-sit-calf-raise-e103`, `standing-toes-to-heels-e0b8`,
  `bunny-hop-e0dg`, `duck-walk-e0dh` and `plie-squat-with-tip-toes-e16l`. A straight-knee
  raise is the standard exercise-science counterpart to E1 and should exist in the full
  catalog; confirm the Calistree ID when the taxonomy branch lands (see Unverified).
- Trains: plantarflexion with the knee straight, which keeps the gastrocnemius under
  tension; ExRx classifies the standing calf raise with gastrocnemius as target and soleus
  as synergist (ExRx, https://exrx.net/WeightExercises/Gastrocnemius/BWStandingCalfRaise,
  retrieved 2026-11-27).
- Pattern: ankle plantarflexion, straight knee.
- Equipment: none bodyweight (step edge for range; dumbbell or machine for load).
- Level: beginner to advanced.
- Runner value: the gastrocnemius half of the calf pair; sprinting and uphill running lean
  on it, and it is the knee angle used in classic eccentric Achilles protocols (Alfredson,
  Pietila, Jonsson and Lorentzon 1998, Am J Sports Med 26(3):360-366,
  https://pubmed.ncbi.nlm.nih.gov/9617396/, retrieved 2026-11-27). Wrong tool when: the
  runner is rehabbing mid-portion Achilles pain without clinician guidance; the eccentric
  protocols are a treatment dose, not a general strength slot, and insertional cases use a
  different knee angle (Alfredson and Lorentzon 2000, Sports Med 29(2):135-146,
  https://pubmed.ncbi.nlm.nih.gov/10701715/, retrieved 2026-11-27).
- Form cues: knees straight but not locked, ball of the foot on the step edge, full stretch
  at the bottom, full rise at the top, controlled down (ExRx technique matches: keep knees
  straight, hold a dumbbell to make it harder, URL above, retrieved 2026-11-27).
- Common mistakes: bouncing; half range; letting the ankle roll outward as fatigue builds.
- Recommendation: take, conditional on the taxonomy confirming the Calistree entry; the
  engine's calf slot should hold both knee angles (E1 and E3), not one.
- Confidence: high on the exercise itself (ExRx); the Calistree presence is unverified.

### E4. Standing toes to heels

- Calistree: `standing-toes-to-heels-e0b8`.
  https://calistree.app/datasheet/standing-toes-to-heels-e0b8, retrieved 2026-11-27.
- Trains: rocking between toes and heels in place, ankle plantarflexion and dorsiflexion
  control plus balance (ankle joint actions; muscle actions per OpenStax 11.6, URL in header,
  retrieved 2026-11-27).
- Pattern: ankle rocker control, standing.
- Equipment: none.
- Level: beginner.
- Runner value: cheap ankle and foot control work, useful in warm-ups or as desk-break
  material. It is not a calf strength dose; do not let it stand in for E1 or E3.
- Form cues: feet hip width, weight shifts smoothly from toes to heels and back, tall
  posture, no knee wobble.
- Common mistakes: fast flailing; collapsing the arch; bouncing through the range.
- Recommendation: optional. Ankle control accessory, not a spine slot.
- Confidence: low (coaching practice).

### E5. Bunny hop

- Calistree: `bunny-hop-e0dg`. https://calistree.app/datasheet/hamstrings-m00b, retrieved
  2026-11-27.
- Trains: repeated two-foot hops; calf-Achilles stiffness and reactive strength (the
  superficial calf group acts on the Achilles through every contact, OpenStax 11.6, URL in
  header, retrieved 2026-11-27).
- Pattern: vertical plyometric.
- Equipment: none.
- Level: intermediate; plyometrics punish sloppy landings.
- Runner value: plyometric training improves distance-running performance and economy in
  trials (Spurrs, Murphy and Watsford 2003, Eur J Appl Physiol 89(1):1-7,
  https://pubmed.ncbi.nlm.nih.gov/12627298/, retrieved 2026-11-27). Buys tendon stiffness
  and ground-contact snap. Wrong tool when: the runner is new to strength work, is carrying
  an Achilles complaint, or the plan is in peak phase; the engine's rules already give
  plyometric moves at least 90 seconds of rest so every contact stays sharp (docs/decisions.md,
  rest-band decision).
- Form cues: land quietly on the midfoot with a stiff ankle, minimal knee bend, quick
  ground contacts, arms helping.
- Common mistakes: sinking into a squat between hops; sloppy heels; doing high volume while
  running volume is also climbing.
- Recommendation: optional. A starter plyo for the catalog with the rest-band rules applied;
  keep volume tiny.
- Confidence: medium (plyo-running evidence is trial-based; this specific move is not).

### E6. Duck walk

- Calistree: `duck-walk-e0dh`. https://calistree.app/datasheet/hamstrings-m00b, retrieved
  2026-11-27.
- Trains: walking in a deep squat position; heavy knee and hip flexion with calf and foot
  work.
- Pattern: deep-squat gait.
- Equipment: none.
- Level: intermediate mobility-strength hybrid.
- Runner value: little. A runner's knee-flexion strength and ankle work are served better by
  the squat partition and E1; the deep flexed-knee gait is a party trick with a real knee
  load.
- Form cues: heels down if possible, small steps, upright chest.
- Common mistakes: collapsing the arches; grinding the knees forward under load.
- Recommendation: prune.
- Confidence: low.

### E7. Plie squat with tip toes

- Calistree: `plie-squat-with-tip-toes-e16l`.
  https://calistree.app/datasheet/hamstrings-m00b, retrieved 2026-11-27.
- Trains: a wide-stance squat held or moved on the balls of the feet; combines adductor and
  quad work with calf raise work.
- Pattern: combo (squat plus raise).
- Equipment: none.
- Level: beginner.
- Runner value: combo moves dilute both halves; the engine's squat slot and calf slot are
  served better separately (see the squat partition and E1).
- Form cues: not coached here (pruned).
- Common mistakes: heels crammed on a narrow base; knees caving inward.
- Recommendation: prune.
- Confidence: low.

Also in the Calistree capture but not documented as strength: `ankle-swivels-e0z7` and
`standing-ankle-circles-e0au` (ankle mobility drills, not strength; flagged below), and
`basic-squats-plus-calves-w022` (a workout combination, not an exercise; out of scope for an
exercise entry).

---

## Flagged for the mobility data

Per the brief, holds and stretches move to the mobility dataset rather than the strength
catalog. From this partition, flagged:

- D2 locust pose (`locust-pose-e0va`, `supported-locust-pose-e0vb`): prone back-extension
  hold.
- D3 supine arch body hold (`supine-arch-body-hold-e0oy`,
  `one-leg-supine-arch-body-hold-e17y`, `arch-body-flutter-kicks-e1b2`): isometric arch hold.
- D4 back scale (`back-scale-e0er`, `assisted-back-scale-e0y5`): standing balance hold.
- D5 bridge family (`bridge-e02a` and kin): full backbend skills and end-range spinal
  extension; mobility and skill territory.
- E-adjacent ankle mobility: `standing-ankle-circles-e0au`, `ankle-swivels-e0z7`: ankle
  mobility drills, no strength dose.
- `flexible-ankles` objective on Calistree (https://calistree.app/, homepage listing,
  retrieved 2026-11-27) is likewise mobility, not this file's business.

## Unverified

- A standing (straight-knee) calf raise was not surfaced in the Calistree leg-region capture.
  It is a standard exercise (ExRx page exists and is cited in E3), but its Calistree ID is
  unverified until the taxonomy branch lands or a fresh scrape of the full catalog happens.
- Calistree's own difficulty levels and equipment tags were not captured (the Flutter app
  renders no text to the scraper), so every level line in this file is a documented estimate
  from movement mechanics and standard coaching practice, not a Calistree value.
- The harop curl's two-phase mechanics (B6), the hip airplane (A10) and the Jefferson curl
  progression (A8) have no indexed trials behind them; claims are kept to movement mechanics
  and marked low confidence.
- The Schwanbeck 2020 free-weights-versus-machines citation in A3 was not re-fetched this
  session; it is carried from research/README.md's known-corrections list, which records its
  correct identity.

## Notes

- This partition feeds three of the four spine slots: hinge (A1, A2, A3, A4, A5, A9), knee
  flexion (B1, B2, B3), calf (E1, E3). The glute and lower-back entries (C1 to C3, D1) are
  the lean candidates on a legs-and-hips day.
- Nothing here contradicts the phase arc: heavy hinge and calf load belongs in base and
  build, maintenance through peak, one short session early in the taper, none in the final
  days (docs/decisions.md, strength-session decision).
- Calistree links in this file were retrieved on 2026-11-27 through Firecrawl scrapes of the
  Flutter-rendered pages; the text was not readable, so only Calistree's exercise names and
  IDs are used, never its descriptions.
