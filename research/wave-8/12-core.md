# Wave 8, partition 12: core, stability and plyometric exercises for the engine database

```json
{
  "workstream": "exercise-catalog-expansion",
  "subtopic": "Trunk and obliques, anti-rotation and anti-extension, hip stability, and the plyometric and jump work the engine already reaches for",
  "generated_at": "2026-11-27T05:50:00Z"
}
```

## Provenance note

The parallel taxonomy branch (`research/wave-8-taxonomy`) carried no `research/wave-8/01-candidates.md`
after two bounded checks over roughly sixteen minutes (the branch exists locally but still points at
main's history, and the remote had no wave-8 branches at all). Per the brief I fell back to
Calistree's own list: webfetch returned only the app shell, and one Firecrawl scrape of
`https://calistree.app/datasheet/abs-m02r` returned only the Flutter canvas bootstrap ("flutter
typography measurement"), because Calistree's web app renders its library inside a canvas and no
text is extractable. One more Firecrawl call was not spent; the fallback failed. The candidate list
below is therefore built from the partition's own brief (trunk and obliques, anti-rotation and
anti-extension, hip stability, plyometrics and jumps) plus the moves the engine's catalog already
reaches for (`packages/shared/src/plan/exercises.ts`, `machines.ts`: plank, side plank, dead bug,
bird dog, cable woodchop / Pallof press, jump squat, box jump, pogo hops, depth drop). Calistree is
the taxonomy source only; no training claim below is taken from it.

Every claim cites its source with a URL and a retrieved date. Claims that could not be
substantiated are listed in `unverified` at the end and are not presented as fact.

The engine context these entries are written into: strength sessions are full-body with a lower-body
spine and one or two core accessories (docs/decisions.md, 2026-11-27), so trunk work here competes
for one or two accessory slots, not a dedicated core day. A plyometric move always rests at least
90 seconds (`packages/shared/src/plan/rest.ts`), which matches the quality-over-fatigue convention
for jumps.

---

## 1. Front plank (forearm plank, with progressions)

**Group:** trunk, anti-extension. **Pattern:** core (isometric hold). **Equipment:** none.
**Level:** beginner (progressions to intermediate).

**What it trains.** Isometric control of the anterior and lateral trunk: rectus abdominis, external
and internal obliques, with glutes and shoulder girdle holding the line. Surface EMG of the prone
bridge plank shows external oblique activity around 55 percent of a maximal voluntary contraction
and termination by abdominal fatigue in most participants, so the hold is a real oblique and
abdominal endurance dose at low spinal load (Devorski et al, 2022,
https://doi.org/10.1123/jsr.2020-0485, retrieved 2026-11-27T05:45:00Z). McGill places the plank in
his spine-sparing "big three" because a straight-body hold braces the trunk without repeatedly
flexing the lumbar spine under load (McGill, 2010, https://doi.org/10.1519/SSC.0b013e3181df452b,
retrieved 2026-11-27T05:50:00Z, type: coaching).

**Runner relevance.** Runners need the trunk to hold position over a moving pelvis for minutes at a
time, not to produce flexion force, so an anti-extension hold matches the demand better than a sit
up. A randomised trial in recreational and competitive runners found that six weeks of core
strength training improved 5000 m times versus control, though it did not change ground reaction
forces or lower-leg stability scores (Sato and Mokha, 2009,
https://doi.org/10.1519/JSC.0b013e31818eb0c5, retrieved 2026-11-27T05:20:00Z). The core work in that
trial was a varied circuit, so this is support for trunk training as a category, not proof that a
plank alone buys anything. The plank is the wrong tool for building trunk flexion strength or for
producing force; it is a low-load entry point, and a runner who can hold three minutes with good
form gets nothing more from longer planks, only from harder variants (more leverage, one fewer
point of support).

**Form cues.** Elbows under shoulders, one line from head to heels, ribs down, glutes squeezed so
the hips do not sag or spike. Breathe steadily rather than holding breath.

**Common mistakes.** Sagging hips (extension through the low back), hips high (relieving the abs),
holding the breath, chasing time past the point where form holds.

**Recommendation: take into the engine.** The engine already programs it; the entry documents why it
earns the accessory slot and what progression (long-lever, then shoulder taps) replaces a longer
hold.

---

## 2. Dead bug

**Group:** trunk, anti-extension. **Pattern:** core (opposite limb control). **Equipment:** none.
**Level:** beginner.

**What it trains.** Trunk control while the limbs move: the abdominals hold the ribs down and the
low back flat against the floor while opposite arm and leg extend, loading the anterior chain
through range rather than in a static hold. McGill's big-three framing puts this class of low-load
trunk control work (hold the trunk rigid, move limbs around it) ahead of loaded flexion for most
people because it trains stiffness without high lumbar shear (McGill, 2010,
https://doi.org/10.1519/SSC.0b013e3181df452b, retrieved 2026-11-27T05:50:00Z, type: coaching).

**Runner relevance.** Buys the ability to keep the ribs and pelvis stacked while the limbs swing,
which is the trunk skill of running stance and swing. It is the wrong tool for strength (loads are
too small) and for power; it is a control drill and warm-up dose. Evidence for trunk work as a
category in runners is the same Sato and Mokha trial cited above (https://doi.org/10.1519/JSC.0b013e31818eb0c5,
retrieved 2026-11-27T05:20:00Z); no trial isolates the dead bug, so the exercise-specific claim is
a movement-match argument, confidence medium.

**Form cues.** Low back flat on the floor the whole time, opposite arm and leg moving together,
reach long and slow, exhale as the limbs extend.

**Common mistakes.** Arching the low back as the leg extends, moving too fast, letting the
non-working arm come off the floor.

**Recommendation: take into the engine.** Already programmed; keep it early (base phase and warm-up
slots) because it is a control dose, not a strength one.

---

## 3. Bird dog

**Group:** trunk, anti-extension plus hip control. **Pattern:** core (opposite limb control, all
fours). **Equipment:** none. **Level:** beginner.

**What it trains.** Extensor chain and trunk bracing in one: the glute and spinal extensors lift the
opposite leg and arm while the trunk holds square. McGill measured which trunk exercises keep the
spine stable with low compressive load and the bird dog is one of the three he retained for that
reason (McGill, 2010, https://doi.org/10.1519/SSC.0b013e3181df452b, retrieved
2026-11-27T05:50:00Z, type: coaching).

**Runner relevance.** Buys trunk control plus hip extension from a stable trunk, a pattern that
mirrors stance: one leg drives back while the pelvis stays level. It is the wrong tool for load
(no external resistance) and it stalls quickly for strong runners unless progressed (hold, then
draw squares with the limb). Category-level runner evidence as above (Sato and Mokha, 2009,
https://doi.org/10.1519/JSC.0b013e31818eb0c5, retrieved 2026-11-27T05:20:00Z). Exercise-specific
evidence is the movement match, confidence medium.

**Form cues.** Reach heel and knuckles to opposite walls, hips square to the floor, low back
neutral rather than overarched, one steady breath per rep.

**Common mistakes.** Hiking the hip on the lifting side, arching the low back to lift the leg
higher, rushing reps.

**Recommendation: take into the engine.** Already programmed; it earns its slot as the all-fours
counterpart to the dead bug.

---

## 4. Hollow hold (hollow body)

**Group:** trunk, anti-extension at long lever. **Pattern:** core (isometric hold). **Equipment:**
none. **Level:** intermediate.

**What it trains.** The anterior trunk against a long lever: rectus abdominis and obliques holding
the ribs down and the low back flat while straight arms and legs sit off the floor, which is a
high-tension isometric for the whole anterior chain. Claims about specific activation levels in
the hollow hold are not established in the reviewed sources and go to `unverified`. The training
claim (a long-lever anterior hold with the lumbar spine kept flat) is the same anti-extension
logic McGill recommends over repeated loaded flexion (McGill, 2010,
https://doi.org/10.1519/SSC.0b013e3181df452b, retrieved 2026-11-27T05:50:00Z, type: coaching).

**Runner relevance.** Buys trunk stiffness under an extended lever, which is closer to late-race
trunk demand (holding a tall line when everything else is tired) than a short-lever crunch. It is
the wrong tool for anyone whose low back cannot stay flat; that runner should stay on planks and
dead bugs. No runner trial isolates the hollow hold; category evidence only (Sato and Mokha, 2009,
https://doi.org/10.1519/JSC.0b013e31818eb0c5, retrieved 2026-11-27T05:20:00Z), confidence medium.

**Form cues.** Press the low back into the floor first, then lift legs and shoulders only as far as
the back stays flat, toes pointed, arms by the ears for the long version, knees bent for the
short one.

**Common mistakes.** Losing the lumbar-flat contact (the tell is a gap under the back), shaking
through the neck, holding for time at the cost of position.

**Recommendation: take into the engine.** A genuine gap in the current catalog: the engine's trunk
holds stop at the plank. Add it as an intermediate progression after planks, short holds, quality
first.

---

## 5. Side plank (forearm side bridge, with progressions)

**Group:** obliques and anti-lateral-flexion. **Pattern:** core (isometric hold). **Equipment:**
none. **Level:** beginner (progressions to intermediate).

**What it trains.** The lateral trunk: obliques and quadratus lumborum holding the pelvis level
against gravity's side load. In the side-support EMG cited above, torso-elevated side support
produced external oblique activity around 78 percent of maximum, higher than the front plank in
the same study, and termination was most often shoulder fatigue or pain, which sets the practical
volume limit (Devorski et al, 2022, https://doi.org/10.1123/jsr.2020-0485, retrieved
2026-11-27T05:45:00Z). McGill retains the side bridge in the big three and notes it spares the
lumbar spine compared with loaded side-bending (McGill, 2010,
https://doi.org/10.1519/SSC.0b013e3181df452b, retrieved 2026-11-27T05:50:00Z, type: coaching).

**Runner relevance.** Buys the pelvis-level skill running depends on: every stance step loads the
stance hip side-on, and lateral trunk lean late in a run is a form-break. Quadratus lumborum and
hip abductor measures were lower in collegiate athletes who went on to lower-extremity injury in a
prospective study, which links (without proving causation) lateral trunk strength to injury risk
(Leetun et al, 2004, https://doi.org/10.1249/01.mss.0000128145.75199.c3, retrieved
2026-11-27T05:20:00Z). It is the wrong tool for force production or rotation power; it is an
endurance and control dose. A knee-down version is the beginner scale, and top-knee-bent versions
reduce shoulder demand.

**Form cues.** Stack the hips, elbow under shoulder, body one plane front to back, push the floor
away, breathe steadily.

**Common mistakes.** Hips drifting back or sagging down, rolling the chest toward the floor,
holding the side with shoulder pain instead of scaling to the knee.

**Recommendation: take into the engine.** Already programmed; it is the highest-value single trunk
hold for runners because it trains both obliques and the lateral hip line at once.

---

## 6. Pallof press (cable or band)

**Group:** obliques, anti-rotation. **Pattern:** core (isometric hold under rotary load).
**Equipment:** cable column or elastic band. **Level:** beginner (band) to intermediate (cable,
offset stance).

**What it trains.** Anti-rotation control: the obliques and deep trunk musculature resist the
implement's pull trying to spin the torso while the arms press out, lengthening the lever. Reviews
of core stability training converge on exercises that challenge the trunk's ability to resist
motion (dynamic stabilisation) over exercises that drive trunk motion itself (Huxel Bliven and
Anderson, 2013, https://doi.org/10.1177/1941738113481200, retrieved 2026-11-27T05:20:00Z), and the
Pallof press is the standard gym expression of that idea (McGill, 2010,
https://doi.org/10.1519/SSC.0b013e3181df452b, retrieved 2026-11-27T05:50:00Z, type: coaching,
confidence medium).

**Runner relevance.** Buys a still trunk against a twisting arm swing and terrain input, the same
pelvis-level skill the side plank trains but standing and under a live rotary load, which matches
running stance better than floor holds. The engine already treats it as the runner's anti-rotation
accessory ("keeps the pelvis steady while running" in the machine entry). It is the wrong tool for
raw oblique strength (light loads) and for anyone with no anchor point (bands need a fix point).

**Form cues.** Stand tall, press straight out, stop the torso from rotating, ribs down, one breath
per press, resistance from the side.

**Common mistakes.** Letting the torso rotate a few degrees per rep, arching the low back to press
further, using a band so heavy the press stalls at the chest.

**Recommendation: take into the engine.** Already programmed as "Cable woodchop / Pallof press";
documented here so the anti-rotation case is explicit. A band version belongs in the home
equipment profile.

---

## 7. Cable or band woodchop

**Group:** obliques, rotation. **Pattern:** core (rotational push). **Equipment:** cable column or
elastic band. **Level:** intermediate.

**What it trains.** Trunk rotation and hip-driven force transfer: the obliques, glutes and hip
rotators produce a diagonal push from high to low (or low to high), the one pattern here that
trains producing rotation rather than resisting it.

**Runner relevance.** Weakest link in the trunk chain for runners: running produces almost no
volitional trunk rotation (arm swing counter-rotates), so a rotation-power move buys little the
runner needs directly. Its real value is as a general trunk-strength dose and for the hip-turn
action in trails and sprints, which is why the engine keeps it as a secondary option behind the
Pallof press. It is the wrong tool as a runner's primary oblique work, and it invites end-range
twisting under load if coached loosely (McGill, 2010,
https://doi.org/10.1519/SSC.0b013e3181df452b, retrieved 2026-11-27T05:50:00Z, type: coaching).
No runner trial isolates the woodchop, confidence medium.

**Form cues.** Rotate the hips with the arms, weight transfers back foot to front foot, arms stay
straight, control the return.

**Common mistakes.** Chopping with the arms only, twisting the knee, slinging the cable and
catching it at the end range.

**Recommendation: take into the engine, secondary.** Keep it in rotation with the Pallof press but
let the anti-rotation press take the accessory slot first; the chop is the variation.

---

## 8. Russian twist

**Group:** obliques, rotation under flexion. **Pattern:** core (rotational flexion). **Equipment:**
plate, ball or none. **Level:** intermediate.

**What it trains.** Trunk flexion plus rotation in a seated hold: rectus abdominis and obliques.

**Runner relevance.** Little, and it carries a mechanical cost the better tools avoid. It loads the
lumbar spine in repeated flexion with rotation, the loading direction McGill's spine-sparing
program explicitly steers around (McGill, 2010, https://doi.org/10.1519/SSC.0b013e3181df452b,
retrieved 2026-11-27T05:50:00Z, type: coaching), and the modern core-stability literature
recommends resisting motion over driving it (Huxel Bliven and Anderson, 2013,
https://doi.org/10.1177/1941738113481200, retrieved 2026-11-27T05:20:00Z). Nothing a Russian twist
trains is missing from the plank, side plank, hollow hold and press set, and the twist does not
match any running demand.

**Form cues.** (For completeness, not endorsement.) Tall spine, rotate from the ribs not the arms,
slow tempo.

**Common mistakes.** Rounding the low back and slinging the weight, racing reps, holding the
breath.

**Recommendation: prune.** Low specificity for running and a loading direction the strong sources
caution about; the anti-rotation press and side plank cover the same muscles with less risk.

---

## 9. Clamshell

**Group:** hip stability. **Pattern:** core (hip abduction, side-lying). **Equipment:** none or
mini band. **Level:** beginner.

**What it trains.** Hip external rotation and abduction with the gluteus medius doing the work
while the pelvis stays stacked. Fine-wire EMG found the clam had the best gluteal-to-TFL activation
ratio of eleven common hip exercises (index 115, highest measured), meaning it preferentially loads
the glutes over the tensor fascia lata, the muscle that tends to take over in side-lying work
(Selkowitz et al, 2013, https://doi.org/10.2519/jospt.2013.4116, retrieved 2026-11-27T05:15:00Z).

**Runner relevance.** Buys the first rung of the hip-abductor ladder: the low-load activation dose
for a runner starting from weakness. Hip abductor weakness shows up repeatedly in runners with
overuse injury: injured recreational runners had weaker hip abductors on the injured side
(Niemuth et al, 2005, https://doi.org/10.1097/00042752-200501000-00004, retrieved
2026-11-27T05:25:00Z), and distance runners with iliotibial band syndrome were weaker on the
injured leg and returned to running alongside strength gains after a gluteus-medius-focused
program (Fredericson et al, 2000, https://doi.org/10.1097/00042752-200007000-00004, retrieved
2026-11-27T05:25:00Z). The clam's ceiling is low: once a runner can do it well, side-lying
abduction and loaded work take over. It is the wrong tool for strength at scale, and in a
maintenance context it is closer to a warm-up than a training dose.

**Form cues.** Stack the hips and keep them still, feet together, lift the top knee a short range
without rolling the pelvis back, slow tempo.

**Common mistakes.** Rolling the whole body open (the hip flexors take over), huge range, racing
reps.

**Recommendation: take into the engine, low dose.** Keep it as the beginner or warm-up rung; the
session text should never present it as the main hip strength work.

---

## 10. Side-lying hip abduction (straight-leg raise to the side)

**Group:** hip stability. **Pattern:** core (hip abduction, side-lying). **Equipment:** none or
ankle weight. **Level:** beginner.

**What it trains.** Gluteus medius through a straight-leg lever, with the gluteus maximus and the
hip's stabilisers working to hold the leg in line. In the comparison of twelve common exercises,
side-lying hip abduction produced the highest gluteus medius activity measured (81 percent of a
maximal voluntary contraction), beating clams (around 40 percent), lunges and hops
(Distefano et al, 2009, https://doi.org/10.2519/jospt.2009.2796, retrieved 2026-11-27T05:15:00Z).

**Runner relevance.** Buys actual hip-abductor strength, the muscle group the runner evidence
repeatedly ties to overuse injury (Niemuth et al, 2005, https://doi.org/10.1097/00042752-200501000-00004,
retrieved 2026-11-27T05:25:00Z; Fredericson et al, 2000,
https://doi.org/10.1097/00042752-200007000-00004, retrieved 2026-11-27T05:25:00Z; Leetun et al,
2004, https://doi.org/10.1249/01.mss.0000128145.75199.c3, retrieved 2026-11-27T05:20:00Z). It is
the progression above the clam and the no-equipment floor alternative to the banded walk. It is
the wrong tool once a runner is strong enough for standing loaded abduction or a banded walk,
where it becomes a warm-up.

**Form cues.** Top hip stacked directly over the bottom one, leg slightly back with the toe turned
down a touch, lift from the hip not the waist, no hip hike.

**Common mistakes.** Rolling back (turning it into a clam with a straight leg), swinging the leg,
lifting so high the pelvis tilts.

**Recommendation: take into the engine.** The no-equipment hip-stability anchor for home profiles;
pair with or progress from the clamshell.

---

## 11. Banded lateral walk (monster walk, side step)

**Group:** hip stability. **Pattern:** core (hip abduction, standing). **Equipment:** loop band.
**Level:** beginner to intermediate.

**What it trains.** Hip abduction and external rotation in a functional stance: gluteus medius on
both legs (the stance side works hardest, about 52 percent of maximum versus 35 percent on the
moving leg in resisted lateral band walking) plus the gluteus maximus and trunk stabilisers
holding the band tension (Youdas et al, 2012, https://doi.org/10.3109/09593985.2012.704492,
retrieved 2026-11-27T05:15:00Z). Fine-wire work gives the sidestep a strong gluteal-to-TFL ratio
(64, second only to the clam), so banded stepping preferentially loads the glutes over TFL at
moderate band tension (Selkowitz et al, 2013, https://doi.org/10.2519/jospt.2013.4116, retrieved
2026-11-27T05:15:00Z).

**Runner relevance.** Buys the standing hip control running actually uses (one leg abducting while
the other accepts load) and it needs almost nothing but a band, which fits the engine's home
profiles. It is the wrong tool as the sole hip-strength work: its dose is low compared with
squats, lunges and single-leg deadlifts, which produce higher gluteal activation in the same
comparison trials (Distefano et al, 2009, https://doi.org/10.2519/jospt.2009.2796, retrieved
2026-11-27T05:15:00Z). Heavier bands raise TFL involvement, so tension should stay moderate
(Selkowitz et al, 2013, same URL).

**Form cues.** Quarter-squat stance, band above knees or at ankles, knees pushed out over toes,
small steps, no leaning, feet never click together.

**Common mistakes.** Upright stiff-legged stepping, letting the knees fall in, huge steps that
snap the band slack.

**Recommendation: take into the engine.** Good accessory in base phase and home sessions; the stance
side is the working side, so coach the knee-out stance rather than the step.

---

## 12. Copenhagen plank (side plank with foot on bench, short lever first)

**Group:** hip stability, adductors. **Pattern:** core (isometric hold, lateral, adduction).
**Equipment:** bench or chair. **Level:** intermediate (short-lever knee version is the entry).

**What it trains.** The hip adductors of the top leg plus the lateral trunk of the bottom side, in
one hold: a side plank with the top foot (or knee) on a bench, hips lifted, top leg pressing down
into the bench.

**Runner relevance.** Weaker evidence in runners than the abductor work, which is why this gets a
hold rather than a take. The preventive evidence is from football: a three-times-a-week
pre-season Copenhagen adduction programme cut reported groin problems by 41 percent in male
semi-professional players (Harøy et al, 2019, https://doi.org/10.1136/bjsports-2017-098937,
retrieved 2026-11-27T05:25:00Z). In runners the picture is the opposite side of the hip:
injured recreational runners had weaker abductors but significantly stronger adductors on the
injured side, an abductor-to-adductor imbalance rather than a simple adductor weakness
(Niemuth et al, 2005, https://doi.org/10.1097/00042752-200501000-00004, retrieved
2026-11-27T05:25:00Z). So for a runner population the case is balance and groin tolerance, not a
clear deficit, and the dose must start at the short lever because the long-lever version loads
the adductors hard. It is the wrong tool for a beginner, for anyone with current groin or
pubic-bone symptoms, and as the default hip-stability move.

**Form cues.** Short lever first (knee on the bench), bottom elbow under shoulder, top leg
straight and light on the bench, hips one line, hold seconds not reps.

**Common mistakes.** Jumping to the foot-on-bench version, hips sagging, letting the top leg
dangle instead of pressing down.

**Recommendation: hold.** Real evidence base, wrong population so far: park it until the engine
needs an adductor or groin-tolerance move, and if taken later, ship the knee-supported version
only.

---

## 13. Single-leg balance (standing balance holds, eyes open then closed)

**Group:** hip stability, balance. **Pattern:** core (single-leg stance). **Equipment:** none.
**Level:** beginner.

**What it trains.** Standing balance on one leg: the stance hip's abductors and external rotators
holding the pelvis level while the brain manages sway.

**Runner relevance.** Thin, which is why this is a prune. Balance training added to general
activity improves balance-related motor skills, but the same review found resistance training
produced better results for jump height and sprint time, and running's balance demand is largely
trained by running itself (Hrysomallis, 2011, https://doi.org/10.2165/11538560-000000000-00000,
retrieved 2026-11-27T05:30:00Z). Every single-leg exercise the engine already holds (step-up,
single-leg deadlift, lunge, single-leg glute bridge) trains stance balance under load, which is
more dose than a free-standing hold gives. It is the wrong tool as catalogued strength work; it
belongs, if anywhere, as a warm-up drill.

**Form cues.** Tall stance, foot flat, eyes on a fixed point, then eyes closed for the harder
version.

**Common mistakes.** Gripping the floor with the toes, holding onto a wall for all the work,
wobbling longer than the hold is useful.

**Recommendation: prune.** No deficit the loaded single-leg work does not already cover; keep the
slot for loaded work.

---

## 14. Jump squat

**Group:** plyometric. **Pattern:** plyometric (vertical, both legs). **Equipment:** bodyweight.
**Level:** beginner to intermediate (fast, low amplitude).

**What it trains.** The stretch-shortening cycle in its simplest form: quadriceps, glutes and
calves dipping quickly and extending violently, training the legs to produce force quickly rather
than slowly.

**Runner relevance.** Strong category evidence for jump work in runners: a meta-analysis of 21
studies (511 endurance runners) found jump training improved time-trial performance (2 to 5 km,
moderate effect, g = 0.88) and, without any change in VO2max, improved jump performance, rate of
force development, sprint performance, reactive strength and running economy (small to moderate
effects) (Ramirez-Campillo et al, 2021, https://doi.org/10.1080/02640414.2021.1916261, retrieved
2026-11-27T05:30:00Z). The plyometric method also improved running economy at speeds up to about
12 km/h in a 2024 meta-analysis of strength-training methods in middle- and long-distance runners
(Llanos-Lagos et al, 2024, https://doi.org/10.1007/s40279-023-01978-y, retrieved
2026-11-27T05:30:00Z). The jump squat buys the vertical both-legs version of that; it is the wrong
tool for a runner with a current knee, achilles or calf niggle, in the final weeks before a race,
or on a day right before a hard run. Contacts must stay sharp: the engine's 90-second minimum rest
for plyometric moves carries the right message.

**Form cues.** Quick dip, violent extension, land quiet on the mid-foot with hips back, reset and
breathe between reps, low box of amplitude first.

**Common mistakes.** Deep slow squats between reps (turns plyo into conditioning), heavy stiff
landings, doing them tired.

**Recommendation: take into the engine.** Already programmed; keep amplitude low and contact
quality the standard.

---

## 15. Box jump

**Group:** plyometric. **Pattern:** plyometric (vertical jump to elevated target). **Equipment:**
sturdy box or step. **Level:** intermediate.

**What it trains.** Explosive hip and knee extension with a confidence and landing component:
quadriceps, glutes, calves and the trunk bracing through takeoff and landing. Jumping to a box
removes the landing impact that makes repeated jump squats the harder tool, so it lets a runner
train intent (fast extension) with less eccentric cost per rep.

**Runner relevance.** Same category evidence as the jump squat (Ramirez-Campillo et al, 2021,
https://doi.org/10.1080/02640414.2021.1916261, retrieved 2026-11-27T05:30:00Z; Llanos-Lagos et al,
2024, https://doi.org/10.1007/s40279-023-01978-y, retrieved 2026-11-27T05:30:00Z). Its specific
buy is intent and landing control without maximal impact, which suits the build phase before
harder jump work. It is the wrong tool when the box is too tall: a max-effort box jump with a
tucked finish trains a knee collapse pattern onto the box, not power. Step down, never jump down.

**Form cues.** Stand a step back, quick dip, jump and land both feet flat on the box, stand tall,
step off.

**Common mistakes.** Box too high (deep knee tuck to land), jumping down instead of stepping,
reps raced so landings get loud.

**Recommendation: take into the engine.** Already programmed; the documentation should pin the
"step off, never jump down" rule.

---

## 16. Pogo hops (ankle hops, straight legs)

**Group:** plyometric. **Pattern:** plyometric (short ground contacts, ankle-dominant).
**Equipment:** bodyweight. **Level:** beginner to intermediate (low dose).

**What it trains.** Ankle and foot stiffness: calves and the foot's springs bouncing off the ball
of the foot with minimal knee bend, the shortest ground-contact plyometric there is.

**Runner relevance.** The most running-specific jump work in the partition: running is
ankle-dominant and its performance gains from jump training ride on reactive strength and
stiffness rather than aerobic capacity (Ramirez-Campillo et al, 2021,
https://doi.org/10.1080/02640414.2021.1916261, retrieved 2026-11-27T05:30:00Z). Pogo hops buy
short-contact stiffness directly, and they need very little equipment or space. It is the wrong
tool for a runner with achilles or calf symptoms (it is nearly maximal achilles loading per
contact) and in any volume that turns contacts sloppy; doses should stay small (seconds of work,
full rest, the engine's plyo rest rule).

**Form cues.** Stiff ankles, knees mostly quiet, bounce off the balls of the feet, land where you
took off, tall and springy rather than deep.

**Common mistakes.** Bent-knee squatting hops, heavy flat-foot contacts, long sets that trade
stiffness for fatigue.

**Recommendation: take into the engine.** Already programmed and it is the best-matched jump work
for runners in the catalog.

---

## 17. Depth drop (drop landing, no rebound at first)

**Group:** plyometric. **Pattern:** plyometric (eccentric landing, then rebound). **Equipment:**
low box. **Level:** intermediate.

**What it trains.** Landing mechanics: stepping off a low box and absorbing the landing quietly
with hips and knees, training the quadriceps, glutes and calves to decelerate before (in the
advanced version) rebounding up.

**Runner relevance.** Buys downhill and fatigue-landing tolerance: deceleration control is the
skill that keeps late-run steps from turning into collapse landings, and jump-training gains in
runners include reactive strength without body-composition cost (Ramirez-Campillo et al, 2021,
https://doi.org/10.1080/02640414.2021.1916261, retrieved 2026-11-27T05:30:00Z). Keep the box low
(about knee height at most) and the landing silent; the rebound version (depth jump) is a much
higher-intensity tool and does not belong in the engine's default set. It is the wrong tool for a
runner without a landing-quality base and in the final race weeks.

**Form cues.** Step off (do not jump), land on both feet, absorb by sitting back with hips, chest
up, then stop or spring straight up only when landings are silent.

**Common mistakes.** Jumping off the box, tall-stiff landings that bang down, box too high,
rebounding before landing quality is there.

**Recommendation: take into the engine.** Already programmed; the entry should fix box height and
the step-off rule so the depth jump never sneaks in.

---

## 18. Broad jump (standing long jump)

**Group:** plyometric. **Pattern:** plyometric (horizontal, both legs). **Equipment:** flat
surface. **Level:** intermediate.

**What it trains.** Horizontal force production: glutes, quadriceps and calves extending forward
rather than up, with the trunk bracing through takeoff and a hip-dominant landing.

**Runner relevance.** Complements the vertical work in the catalog: running pushes the body
forward, and the runner-evidence base for jump training (economy, rate of force development,
reactive strength, time trials) does not require the jumps to be vertical (Ramirez-Campillo et
al, 2021, https://doi.org/10.1080/02640414.2021.1916261, retrieved 2026-11-27T05:30:00Z). The
broad jump buys a different force direction and a longer hip-dominant landing, both useful for
sprint-finish work and trail terrain. It is the wrong tool on hard unforgiving surfaces, in
fatigue, or for a runner still working on quiet vertical landings.

**Form cues.** Arms swing back then drive forward, extend through the hips, land soft with hips
back, stick the landing before the next rep.

**Common mistakes.** Landing tall and forward over the toes, chasing distance at the cost of
landing quality, doing it on concrete.

**Recommendation: take into the engine.** A real gap: the catalog's plyometrics are all vertical or
in-place. Add it as an intermediate variant alongside the jump squat.

---

## 19. Split jump (scissor jump, jumping lunge)

**Group:** plyometric. **Pattern:** plyometric (single-leg landing, alternating). **Equipment:**
bodyweight. **Level:** intermediate to advanced.

**What it trains.** Single-leg landing and push: each contact loads one leg through hip, knee and
ankle, alternating, which is the closest plyometric to running's one-leg-at-a-time contact.

**Runner relevance.** Highest specificity and highest cost of the jump set: single-leg landings
multiply impact per contact, and the runner evidence for jump training still holds
(Ramirez-Campillo et al, 2021, https://doi.org/10.1080/02640414.2021.1916261, retrieved
2026-11-27T05:30:00Z). But it is the wrong tool to start with: a runner should earn it through
lunges and quiet vertical landings first, and it does not belong in a base-phase week or in the
final weeks before a race. If the engine takes it, gate it behind level and phase, never behind
a beginner profile.

**Form cues.** Lunge depth first, jump straight up, switch legs in the air, land in the same
depth with the front knee tracking over the foot, quiet landings.

**Common mistakes.** Deep racing switches (knees click), landing stiff with the front knee caving,
long sets with decaying quality.

**Recommendation: take into the engine, gated.** Intermediate level and later phases only, small
doses; it is a progression of the jump squat, not a starting point.

---

## Flagged to the mobility or posterior partitions

- **Superman hold and back extension:** trunk extensors (spinal erectors) and posterior chain.
  Out of this partition's trunk-and-obliques scope; flag to the posterior-chain work so the
  extension work is documented next to the hinge patterns rather than here.
- **Single-leg glute bridge:** gluteus maximus and hip extension under load. The engine carries it
  under the hinge pattern; it belongs to the posterior or legs partition's documentation, not the
  trunk partition.

## Unverified

- "The hollow hold produces higher rectus abdominis activation than the plank" (no reviewed source
  measured the hollow hold; the claim is not made).
- "Copenhagen planks prevent groin problems in runners" (the preventive trial is in male
  semi-professional football players; no runner trial was found).
- Any specific EMG percentages for the Pallof press, woodchop or split jump (no reviewed source
  measured these exercises directly).

## Notes

Taxonomy fallback: the partition list was built from the brief's subgrouping because both the
taxonomy branch and Calistree's library were unreadable (one Firecrawl scrape spent, canvas-only
render). If the taxonomy branch lands later with candidates this file does not cover, those entries
can be appended in a follow-up pass. The partition's scope ends at trunk, obliques, hip stability
and jumps: posterior-chain and leg patterns belong to the other wave-8 partitions, and flagged
overlaps are listed above. Recommendation summary: take (16): front plank, dead bug, bird dog,
hollow hold, side plank, Pallof press, woodchop (secondary), clamshell (low dose), side-lying hip
abduction, banded lateral walk, jump squat, box jump, pogo hops, depth drop, broad jump, split
jump (gated); prune (2): Russian twist, single-leg balance; hold (1): Copenhagen plank.
