# Wave 8, partition 13: upper body (push, pull, posture)

- **Workstream**: strength exercise catalog, upper body
- **Subtopic**: chest, shoulders, triceps (push); back, biceps (pull); upper back and posture work
- **Generated**: 2026-11-26
- **Taxonomy source**: Calistree muscle-group library (chest, back, shoulders, biceps, triceps groups). Calistree is the taxonomy source only. It is not the authority on training claims, and nothing here copies its descriptions.

## Provenance note: how the candidate list was obtained

The brief said to take the upper-body partition from `research/wave-8/01-candidates.md` on the parallel branch `research/wave-8-taxonomy`. That branch was checked twice over roughly 15 minutes (initial check, then after waits of 4 and 8 minutes) and never appeared on the remote, and no other `wave-8` research branch exists there either.

The approved fallback was to scrape Calistree's own list for this partition. That fallback was carried out and it failed for a structural reason worth recording for future waves:

- Webfetch (free) of `https://www.calistree.com/` works and confirms the library is organized by muscle group with data-sheet pages for chest (`calistree.app/datasheet/chest-m02l`), back (`back-m00z`), shoulders (`shoulders-m03b`), biceps (`biceps-m02y`), and triceps (`triceps-m02m`). That group taxonomy is the anchor used here.
- The data-sheet pages themselves are a Flutter web app that loads its data from Firestore at runtime (the CSP allows `firestore.googleapis.com` and the app shell references the `calistree.appspot.com` bucket). The HTML served is an empty shell: no exercise text exists in the page markup.
- Two Firecrawl text scrapes of the chest and back data sheets returned only the Flutter shell (the tell-tale "flutter typography measurement" span). A crawler user-agent probe (curl as Googlebot) confirmed no prerendered DOM for bots. Two full-page screenshots of the chest data sheet painted the muscle illustration, tabs, and "Joint movements" header but the exercise list sits below the viewport and text fonts did not paint reliably in the headless browser, so no exercise names were recoverable. That was the fourth and last Firecrawl call.
- Sitemaps exist (`calistree.app/sitemap.xml`, `sitemap_datasheets_muscles.xml`, four exercise sitemaps) but only list data-sheet URLs; the pages behind them render nothing readable.

So: the per-exercise Calistree candidate list for this partition could not be retrieved with the tools and budget allowed. Rather than fabricate "Calistree's list", the candidate set below is the partition's canonical exercise set for runners, assembled from the confirmed Calistree group structure, cross-checked against the repo's own catalogs (`packages/shared/src/plan/{exercises,bodyweight,machines}.ts` and the wave-5 strength research), and cited exercise by exercise to established exercise-science references. If `01-candidates.md` lands later, this file can be reconciled against it the same way the other partitions reconcile theirs.

## Runner-relevance framing (applies to every entry)

Per the repo's own research (research/wave-7/17a-strength-session-structure.json and the wave-5/17a decision line), upper-body work for runners is a small accessory dose: one or two exercises, one to two times per week, programmed after the lower-body prescription, first thing to cut when time is short. There is no direct evidence that upper-body training improves running performance. What a small upper-body set buys:

- Posture under fatigue: training the scapular retractors (middle trap, rhomboids), posterior deltoid, and serratus anterior supports holding an upright carriage and an open chest late in a long run. This is a plausible, modest claim about muscle function, not a claim about injury prevention.
- Arm drive: Moore's 2016 review lists "maintaining arm swing" among the intrinsic factors beneficial for running economy. That supports keeping the arm carriage stable and free; it does not say arm-strength training makes runners faster, and this file does not claim that (Moore 2016, see claims).
- Muscular balance and gym adherence: pressing and pulling patterns at an accessory dose keep the gym session feel complete, which the wave-7 session-structure research treats as an adherence aid.

Dose rationale follows the 2026 ACSM position stand: progressive resistance training with 2-3 sets at each session and at least 2 sessions per week is enough for strength gains in healthy adults, which is the ceiling this accessory dose should respect (Currier et al. 2026, claims below).

The recommended take set resolves to six patterns, each with equipment paths the engine already models: horizontal push (push-up / machine chest press), vertical push (overhead press / pike press), vertical pull (pull-up / lat pulldown), horizontal pull (seated row / one-arm dumbbell row / inverted row), elbow flexion (curl), elbow extension (pushdown), plus three low-load posture drills (band pull-apart, face pull, prone Y-T-W). Everything else in the partition is a prune.

---

## Chest (horizontal push)

### 1. Push-up

- **Trains**: pectoralis major (sternal head, target), clavicular head, anterior deltoid, triceps as synergists; serratus anterior and pectoralis minor as stabilizers (ExRx, push-up).
- **Movement pattern**: horizontal push, compound.
- **Equipment**: bodyweight. Regressions: knees, hands elevated on a bar or bench (ExRx lists bent-knee and incline versions).
- **Level**: beginner entry point; progressions go to archer push-up, weighted push-up, and dips.
- **Runner relevance**: one compound press covers the whole accessory pressing dose with zero equipment; a stable trunk plank position also feeds the posture story. Claims stay modest: this buys pressing balance and trunk bracing, not running performance.
- **Form cues**: body straight from shoulders to heels; hands slightly wider than shoulders; lower under control and press to extended arms.
- **Common mistakes**: hips sagging or piking (the page's own comment: upper and lower body must be kept straight throughout); partial range at the bottom; flaring so wide that shoulders roll forward. A "push the floor away" finish at the top (push-up plus) adds serratus work (ExRx lists the push-up plus under serratus anterior).
- **Recommendation: take.** Already in the catalog (`bodyweight.ts` Push-up; `exercises.ts` Incline push-up, Backpack loaded push-up, Archer push-up), so this entry documents rather than adds.

```json
[
  {
    "topic": "push-up muscles",
    "claim": "The push-up targets the sternal pectoralis major with the clavicular head, anterior deltoid and triceps as synergists, and serratus anterior and pectoralis minor as stabilizers.",
    "evidence": "ExRx's push-up page lists target pectoralis major (sternal), synergists pectoralis major (clavicular), anterior deltoid, triceps brachii, coracobrachialis, and stabilizers including serratus anterior and pectoralis minor.",
    "confidence": "high",
    "citation": {"title": "Push-up", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/WeightExercises/PectoralSternal/BWPushup", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "push-up scaling",
    "claim": "Push-up difficulty can be regressed with knee or incline variations and progressed toward archer push-ups, weighted push-ups and dips, which lets one pattern serve a runner from beginner onward.",
    "evidence": "The ExRx push-up page lists easier variations (bent knee, edge of box or bench) and harder progressions (archer push-up, weighted push-up, chest dip).",
    "confidence": "high",
    "citation": {"title": "Push-up", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/WeightExercises/PectoralSternal/BWPushup", "retrieved_at": "2026-11-26"}
  }
]
```

### 2. Machine chest press (lever or cable)

- **Trains**: sternal pectoralis major (target), clavicular head, anterior deltoid, triceps (ExRx, lever chest press).
- **Movement pattern**: horizontal push, compound.
- **Equipment**: selectorized or plate-loaded lever machine; cable chest press as the same pattern.
- **Level**: beginner-friendly; the fixed path removes balance demands.
- **Runner relevance**: the loadable horizontal press for the gym path of the accessory dose; needs no spotting and no barbell skill.
- **Form cues**: chest at handle height, elbows just below shoulders, press to extended arms, return until the chest is slightly stretched (ExRx, lever chest press).
- **Common mistakes**: grip too wide, which ExRx flags as compromising range of motion; letting the elbow sit above shoulder height in the start position.
- **Recommendation: take** (gym/machine path of the horizontal push). Already in the catalog (`machines.ts` Chest press / pec deck).

```json
[
  {
    "topic": "machine chest press muscles",
    "claim": "The lever chest press targets the sternal pectoralis major with the clavicular head, anterior deltoid and triceps as synergists.",
    "evidence": "ExRx's lever chest press page lists target pectoralis major (sternal) and synergists pectoralis major (clavicular), anterior deltoid, triceps brachii, coracobrachialis.",
    "confidence": "high",
    "citation": {"title": "Lever Chest Press", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/WeightExercises/PectoralSternal/LVChestPress", "retrieved_at": "2026-11-26"}
  }
]
```

### 3. Barbell bench press

- **Trains**: same press family as the machine chest press (pectoralis major, anterior deltoid, triceps), with free-weight stabilization added.
- **Movement pattern**: horizontal push, compound.
- **Equipment**: barbell plus bench; spotter or rack for safety at real loads.
- **Level**: intermediate as a lift; the bench setup is a skill with its own technique history.
- **Runner relevance**: buys nothing the accessory dose needs beyond what the machine press, dumbbell floor press, and push-up already deliver, while adding setup cost, barbell skill, and the highest injury-consequence press.
- **Form cues**: not detailed here because the recommendation is a prune; the ExRx bench press page sits under the chest list for anyone who wants it.
- **Common mistakes**: loading context-free, bouncing the bar, thumbless grips.
- **Recommendation: prune.** A runner's accessory dose does not justify barbell-specific equipment and skill; the horizontal push pattern is fully covered by push-up, machine chest press, and dumbbell floor press.

```json
[
  {
    "topic": "bench press classification",
    "claim": "The barbell bench press is a compound horizontal press for the chest listed under pectoralis major (sternal) exercises.",
    "evidence": "ExRx's chest exercise list classifies the barbell bench press under General / pectoralis major, sternal, as a barbell basic exercise.",
    "confidence": "high",
    "citation": {"title": "Chest Exercises (list)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/Lists/ExList/ChestWt", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "dumbbell horizontal press alternative",
    "claim": "A dumbbell floor press already provides the free-weight horizontal press path in this catalog, so a barbell bench press adds equipment requirements without adding a missing pattern.",
    "evidence": "Repo catalog: exercises.ts carries 'Dumbbell floor press'; the wave-5 strength research established it as the runner-appropriate dumbbell horizontal press.",
    "confidence": "high",
    "citation": {"title": "Stride Guide exercise catalog (packages/shared/src/plan/exercises.ts)", "authors": "Stride Guide repo", "year": 2026, "venue": "repo-internal", "type": "coaching", "doi_or_url": "repo-internal:packages/shared/src/plan/exercises.ts", "retrieved_at": "2026-11-26"}
  }
]
```

### 4. Chest dip (parallel bars, bodyweight or assisted)

- **Trains**: pectoralis major (sternal), with pectoralis minor involvement and triceps; classified under the same chest list (ExRx chest list).
- **Movement pattern**: horizontal-to-vertical push, compound.
- **Equipment**: parallel bars (park) or an assisted dip machine (gym); the assisted pull-up / dip machine is already in `machines.ts`.
- **Level**: intermediate to advanced; the bottom position demands end-range shoulder extension under load.
- **Runner relevance**: at the accessory dose it is a progression, not a staple, and it is the upper-body press with the most shoulder end-range stress. ExRx itself lists the self-assisted and machine-assisted dip as the on-ramp.
- **Form cues**: keep the torso lean forward for chest emphasis, control the descent, do not sink past comfortable shoulder range.
- **Common mistakes**: dropping deep for depth's sake, shrugged shoulders at the bottom, jerky kips out of the hole.
- **Recommendation: prune** as a catalog entry for runners. If a lifter wants it, it already exists implicitly as the dip half of the `Assisted pull-up / dip` machine entry.

```json
[
  {
    "topic": "chest dip classification",
    "claim": "The chest dip is listed by ExRx as a bodyweight and weighted chest exercise, with assisted machine versions as the on-ramp.",
    "evidence": "ExRx's chest list places chest dip under body weight, weighted, assisted, and band-assisted categories, and the push-up page names dips as a push-up progression.",
    "confidence": "high",
    "citation": {"title": "Chest Exercises (list)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/Lists/ExList/ChestWt", "retrieved_at": "2026-11-26"}
  }
]
```

### 5. Close-grip push-up

- **Trains**: triceps emphasis within the push-up family; same press pattern with narrow hands (ExRx lists it under triceps).
- **Movement pattern**: horizontal push, triceps-biased variation.
- **Equipment**: bodyweight.
- **Level**: intermediate; the narrow position is harder on the wrists.
- **Runner relevance**: triceps already get pressing volume from the push-up and a dedicated elbow-extension accessory; a separate narrow-grip catalog entry is duplication.
- **Form cues**: hands under the mid chest, elbows brushing the ribs, same straight-body rule as the standard push-up.
- **Common mistakes**: letting the elbows flare once fatigue sets in; wrist discomfort from a very narrow hand position.
- **Recommendation: prune** as a separate entry; fold it into push-up progressions if variation is ever needed.

```json
[
  {
    "topic": "close-grip push-up role",
    "claim": "The close-grip push-up is a triceps-emphasized push-up variant rather than a distinct movement pattern.",
    "evidence": "ExRx lists the close-grip push-up under triceps bodyweight exercises, and the push-up page's comments point to it as a variant.",
    "confidence": "high",
    "citation": {"title": "Upper Arm Exercises (list)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/Lists/ExList/ArmWt", "retrieved_at": "2026-11-26"}
  }
]
```

## Shoulders (vertical push)

### 6. Dumbbell shoulder press (seated or standing overhead press)

- **Trains**: anterior deltoid (target), lateral deltoid, supraspinatus, triceps, middle and lower trapezius, serratus anterior (inferior digitations) as synergists; upper trapezius as stabilizer (ExRx, dumbbell shoulder press).
- **Movement pattern**: vertical push, compound.
- **Equipment**: dumbbells; the machine shoulder press is the same pattern on a fixed path (`machines.ts` Shoulder press already carries it).
- **Level**: beginner to intermediate; seated is the easier variant, standing adds trunk demand.
- **Runner relevance**: the loadable vertical push for shoulder balance in the accessory dose; pressing overhead also trains the scapular upward rotators (middle/lower trap, serratus) that the posture story leans on. Claims kept modest: shoulder balance and pressing competence, not running performance.
- **Form cues**: elbows below wrists at the start, press until arms are extended overhead, lower to the sides of the shoulders (ExRx preparation and execution text); ribs down, no lean-back.
- **Common mistakes**: arching the low back to press more, half-range reps at the top, taking dumbbells up without a deliberate set-up (ExRx links a mount-and-dismount clip for heavier dumbbells).
- **Recommendation: take** (free-weight path; machine press already covers the machine path). Already in the catalog (`exercises.ts` Dumbbell overhead press, `machines.ts` Shoulder press).

```json
[
  {
    "topic": "overhead press muscles",
    "claim": "The dumbbell shoulder press targets the anterior deltoid with lateral deltoid, supraspinatus, triceps, middle and lower trapezius, and serratus anterior as synergists.",
    "evidence": "ExRx's dumbbell shoulder press page lists exactly this target and synergist set, with upper trapezius and levator scapulae as stabilizers.",
    "confidence": "high",
    "citation": {"title": "Dumbbell Shoulder Press", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/WeightExercises/DeltoidAnterior/DBShoulderPress", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "accessory dose programming",
    "claim": "Two to three sets per exercise at two or more sessions per week is the evidence-backed dose band for strength in healthy adults, which the one-to-two-exercise upper-body accessory slot should respect.",
    "evidence": "The ACSM position stand (overview of reviews, 137 systematic reviews) reports voluntary strength enhanced by lifting heavier loads through a full range of motion for 2-3 sets, at the beginning of sessions, and 2 or more sessions per week.",
    "confidence": "high",
    "citation": {"title": "American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews", "authors": "Currier BS, D'Souza AC, Singh MAF, et al.", "year": 2026, "venue": "Medicine & Science in Sports & Exercise 58(4):851-872", "type": "position-stand", "doi_or_url": "https://doi.org/10.1249/MSS.0000000000003897", "retrieved_at": "2026-11-26"}
  }
]
```

### 7. Pike press (pike push-up)

- **Trains**: anterior deltoid pattern (vertical push) with the same press family as the overhead press in a bodyweight format; ExRx classifies the pike press under anterior deltoid bodyweight exercises.
- **Movement pattern**: vertical push, compound, bodyweight.
- **Equipment**: bodyweight plus a floor; the between-benches version is the loaded-feeling variant.
- **Level**: intermediate; requires decent shoulder flexibility to get the hip angle right.
- **Runner relevance**: the no-equipment vertical push path, so home users get shoulder balance without dumbbells. Keep the claim modest: it fills the vertical-push slot when equipment is absent.
- **Form cues**: hips high, head travels between the hands, control the descent, elbows track about 45 degrees from the ears.
- **Common mistakes**: turning it into a push-up by letting the hips drift forward; short range because the shoulders lack flexion mobility; doing it cold (it is shoulder-intensive).
- **Recommendation: take** (bodyweight path of the vertical push; a genuine catalog gap, since the current bodyweight set has no vertical push).

```json
[
  {
    "topic": "pike press classification",
    "claim": "The pike press is classified by ExRx as a bodyweight exercise for the anterior deltoid, serving as the bodyweight vertical push.",
    "evidence": "ExRx's shoulder exercise list places 'Pike Press (between benches)' with an elevated variant under anterior deltoid body weight exercises.",
    "confidence": "high",
    "citation": {"title": "Shoulder Exercises (list)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/Lists/ExList/ShouldWt", "retrieved_at": "2026-11-26"}
  }
]
```

### 8. Dumbbell lateral raise

- **Trains**: lateral deltoid (shoulder abduction); ExRx's lateral deltoid page describes abduction as its movement role.
- **Movement pattern**: shoulder abduction, isolation.
- **Equipment**: dumbbells; cable and machine variants exist.
- **Level**: beginner-technique but easy to swing-cheat.
- **Runner relevance**: an isolation for side delts at a dose where presses already load them; per set, it buys less than any of the takes. The catalog already carries it (`exercises.ts` Dumbbell lateral raise), so this entry documents rather than adds.
- **Form cues**: lead with the elbow to shoulder height, light weight, no swing.
- **Common mistakes**: momentum from the hips, shrugging the traps into the movement, raising above shoulder height with a rotated grip.
- **Recommendation: prune** from the recommended accessory set (keep it out of generated plans); it can remain available if the engine ever wants an isolation slot, but the runner dose does not need it.

```json
[
  {
    "topic": "lateral raise muscles",
    "claim": "The lateral deltoid's movement role is shoulder abduction, which is what the lateral raise trains.",
    "evidence": "ExRx's lateral deltoid page lists shoulder abduction (and flexion and transverse abduction) as its movements.",
    "confidence": "high",
    "citation": {"title": "Deltoid (Lateral)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Muscle Directory", "type": "coaching", "doi_or_url": "https://exrx.net/Muscles/DeltoidLateral", "retrieved_at": "2026-11-26"}
  }
]
```

### 9. Barbell upright row

- **Trains**: lateral deltoid and upper trapezius (elevation/abduction family); listed under lateral deltoid exercises by ExRx.
- **Movement pattern**: vertical pull-to-raise hybrid, isolation-to-compound.
- **Equipment**: barbell, dumbbells, or cable.
- **Level**: technique-sensitive; the loaded internal rotation at the top is the classic complaint.
- **Runner relevance**: redundant with rows and raises for every muscle it trains, and it is the most technique-contested shoulder exercise on the list, so it is a poor default for a generic plan.
- **Form cues (if ever used)**: narrow clean-grip width, pull to sternum height, elbows high, no wrist roll.
- **Common mistakes**: high pulls to chin height with internally rotated wrists; heave-and-drop reps.
- **Recommendation: prune.** Every muscle it trains is covered better by rows and presses in this partition, and its risk-to-benefit profile is the worst of the shoulder candidates.

```json
[
  {
    "topic": "upright row classification",
    "claim": "The upright row is classified by ExRx under lateral deltoid exercises (barbell, cable, dumbbell, machine variants).",
    "evidence": "ExRx's shoulder exercise list places the upright row (barbell, cable with rope, dumbbell, Smith) under the lateral deltoid section.",
    "confidence": "high",
    "citation": {"title": "Shoulder Exercises (list)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/Lists/ExList/ShouldWt", "retrieved_at": "2026-11-26"}
  }
]
```

## Triceps (elbow extension)

### 10. Triceps pushdown (cable); dumbbell triceps extension as the home variant

- **Trains**: triceps brachii (all three heads; target), with no synergists, since it is an isolation (ExRx, cable pushdown). The triceps' role is elbow extension, with the long head assisting shoulder extension (ExRx, triceps brachii page).
- **Movement pattern**: elbow extension, isolation.
- **Equipment**: high pulley cable in the gym; overhead dumbbell triceps extension at home (ExRx lists the dumbbell triceps extension and the machine triceps extension as siblings).
- **Level**: beginner-friendly.
- **Runner relevance**: one small elbow-extension accessory balances the pressing dose; the triceps page's long-head note is the reason the overhead dumbbell variant is worth naming as the home path (shoulder flexion stretches the long head).
- **Form cues**: elbows pinned to the sides, extend fully, stay close to the cable so resistance persists at the top (ExRx comments), let the elbow travel up slightly at the top of the motion.
- **Common mistakes**: leaning the whole bodyweight onto the stack, elbows drifting forward into a shoulder press, half-lockouts.
- **Recommendation: take** as the single elbow-extension accessory (gym path: cable pushdown; home path: dumbbell triceps extension). Already in the catalog as `machines.ts` Tricep extension, so this documents the variant mapping.

```json
[
  {
    "topic": "triceps pushdown muscles",
    "claim": "The cable pushdown isolates the triceps brachii (elbow extension) with no synergists.",
    "evidence": "ExRx's cable pushdown page lists target triceps brachii with no synergists, and its comments explain staying close to the cable so resistance persists at the top.",
    "confidence": "high",
    "citation": {"title": "Cable Pushdown", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/WeightExercises/Triceps/CBPushdown", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "overhead triceps variant rationale",
    "claim": "The triceps long head assists shoulder extension, so an overhead elbow-extension variant trains it across a stretched position; the dumbbell triceps extension is that home-path variant.",
    "evidence": "ExRx's triceps brachii muscle page lists elbow extension with long-head shoulder extension and adduction assists; the arm list shows the dumbbell and machine triceps extension siblings.",
    "confidence": "high",
    "citation": {"title": "Triceps Brachii", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Muscle Directory", "type": "coaching", "doi_or_url": "https://exrx.net/Muscles/TricepsBrachii", "retrieved_at": "2026-11-26"}
  }
]
```

### 11. Bench dip

- **Trains**: triceps with heavy pectoralis and anterior shoulder involvement at the stretched position; ExRx lists it under triceps bodyweight exercises.
- **Movement pattern**: elbow extension with a dip-type bottom.
- **Equipment**: a bench, box, or chair; heels-on-floor is the easy version.
- **Level**: beginner-looking but shoulder-unfriendly: the bottom position puts the shoulder in extension with internal rotation under load, a position many coaches avoid as a default.
- **Runner relevance**: nothing that the push-up plus pushdown does not already deliver, with worse shoulder mechanics.
- **Form cues (if used)**: keep the hips close to the bench, wrists stacked, elbows straight back, shallow depth.
- **Common mistakes**: deep sinking, shrugging into the ears, elbows flaring wide.
- **Recommendation: prune.** It exists in ExRx's triceps family, but the partition's triceps need are covered by the pushdown and the pressing volume; the shoulder-stretched bottom makes it the weakest bodyweight triceps candidate.

```json
[
  {
    "topic": "bench dip classification",
    "claim": "The bench dip is a bodyweight triceps exercise with heel-on-floor as the easier variant.",
    "evidence": "ExRx's arm exercise list places 'Bench Dip' with a 'heel on floor' variant under triceps body weight exercises.",
    "confidence": "high",
    "citation": {"title": "Upper Arm Exercises (list)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/Lists/ExList/ArmWt", "retrieved_at": "2026-11-26"}
  }
]
```

## Back (vertical and horizontal pull)

### 12. Lat pulldown

- **Trains**: latissimus dorsi (target); synergists include teres major, posterior deltoid, infraspinatus, teres minor, rhomboids, lower and middle trapezius, pectoralis minor, plus the elbow flexors (ExRx, cable pulldown).
- **Movement pattern**: vertical pull, compound.
- **Equipment**: cable or selectorized machine; ExRx lists lever front pulldowns and close-grip variants.
- **Level**: beginner-friendly; the loadable vertical pull for anyone without bodyweight pulling strength.
- **Runner relevance**: the gym path of the vertical pull; trains shoulder adduction/extension across a long range, which is the pulling half of upper-body balance. Claims modest: pulling balance and posture support, not running performance.
- **Form cues**: thighs under the supports, pull to the upper chest, return until arms and shoulders are fully extended (ExRx execution text); grip not too wide (ExRx flags wide grips as range-limited).
- **Common mistakes**: leaning back and rowing with the torso, pulling behind the neck, half-range reps that never let the shoulder extend fully.
- **Recommendation: take** (machine/cable path of the vertical pull). Already in the catalog (`machines.ts` Lat pulldown).

```json
[
  {
    "topic": "lat pulldown muscles",
    "claim": "The lat pulldown targets the latissimus dorsi with teres major, posterior deltoid, rhomboids, middle and lower trapezius, pectoralis minor and the elbow flexors as synergists.",
    "evidence": "ExRx's cable pulldown page lists this target and synergist set, and notes that too-wide grips compromise range of motion.",
    "confidence": "high",
    "citation": {"title": "Cable Pulldown", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/WeightExercises/LatissimusDorsi/CBFrontPulldown", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "latissimus dorsi function",
    "claim": "The latissimus dorsi is a shoulder adductor and extensor (strongest with the shoulder near neutral rotation), the defining action of pulldowns and pull-ups.",
    "evidence": "ExRx's latissimus dorsi muscle page lists shoulder adduction, extension, and internal rotation, with scapular depression assistance.",
    "confidence": "high",
    "citation": {"title": "Latissimus Dorsi", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Muscle Directory", "type": "coaching", "doi_or_url": "https://exrx.net/Muscles/LatissimusDorsi", "retrieved_at": "2026-11-26"}
  }
]
```

### 13. Pull-up (with assisted and band-assisted regressions)

- **Trains**: latissimus dorsi as the primary mover (same shoulder adduction/extension pattern as the pulldown), with teres major, posterior deltoid, rhomboids and middle/lower trapezius, and elbow flexors; chin-up (underhand) biases the biceps (ExRx back list).
- **Movement pattern**: vertical pull, compound, bodyweight.
- **Equipment**: bar (park, door, gym rack); machine-assisted and band-assisted versions as regressions (ExRx lists assisted, band-assisted, and self-assisted variants).
- **Level**: intermediate as an unassisted skill; the assisted variants make it beginner-accessible.
- **Runner relevance**: the bodyweight/park path of the vertical pull and the natural progression target for pulldown users. Same modest claims: pulling strength and carriage.
- **Form cues**: start from a dead hang with shoulders set down, pull the chest toward the bar, finish each rep fully extended; the chin-up grip is the biceps-biased sibling.
- **Common mistakes**: kipping for reps, partial range (never reaching full extension), shrugging the shoulders up into the ears during the pull.
- **Recommendation: take** (bodyweight path of the vertical pull, with the assisted machine already in the catalog as `Assisted pull-up / dip`).

```json
[
  {
    "topic": "pull-up family and regressions",
    "claim": "The pull-up sits in the latissimus dorsi exercise family with machine-assisted, band-assisted, self-assisted, and chin-up variants, which covers the full progression ladder for a bodyweight vertical pull.",
    "evidence": "ExRx's back exercise list groups pull-up, chin-up, and parallel-grip variants under latissimus dorsi with assisted and band-assisted subcategories.",
    "confidence": "high",
    "citation": {"title": "Back Exercises (list)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/Lists/ExList/BackWt", "retrieved_at": "2026-11-26"}
  }
]
```

### 14. Seated row (cable, or lever machine)

- **Trains**: general back: middle and lower trapezius, rhomboids, latissimus dorsi, teres major, posterior deltoid, infraspinatus, teres minor, elbow flexors, with erector spinae as a synergist and glutes/hamstrings as stabilizers (ExRx, cable seated row). The rhomboids and middle trap roles are scapular adduction, and the rhomboids hold the scapula against the thoracic wall (ExRx rhomboids and middle-trap pages).
- **Movement pattern**: horizontal pull, compound.
- **Equipment**: cable pulley; lever seated row machines (with or without chest pad) are the machine path.
- **Level**: beginner-friendly with attention to the lower-back note.
- **Runner relevance**: the signature posture exercise of the whole partition: scapular retraction plus hip-hinge-adjacent trunk posture under load. This is the accessory-dose entry with the clearest posture story, still framed as muscle function rather than injury prevention.
- **Form cues**: pull to the waist while the chest pushes forward and shoulders pull back; return to full extension with a mild forward stretch; no bouncing at the stretched end (ExRx execution and comments).
- **Common mistakes**: bouncing out of the stretched position, overloading before the lower back adapts (ExRx's comment says to add weight gradually), turning it into a backswing row with the torso.
- **Recommendation: take** (gym horizontal pull; the cable and lever paths are the same pattern). Already in the catalog (`machines.ts` Seated cable row, Seated row).

```json
[
  {
    "topic": "seated row muscles",
    "claim": "The seated row trains the general back musculature, including middle and lower trapezius, rhomboids, latissimus dorsi, posterior deltoid, and the elbow flexors, with erector spinae as a synergist.",
    "evidence": "ExRx's cable seated row page lists this target/synergist set and warns against pausing or bouncing at the stretched end.",
    "confidence": "high",
    "citation": {"title": "Cable Seated Row", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/WeightExercises/BackGeneral/CBSeatedRow", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "rhomboid retraction in rows",
    "claim": "Scapular adduction (retraction) by the rhomboids and middle trapezius is the biomechanical basis for calling horizontal pulls posture work.",
    "evidence": "ExRx's rhomboids page lists scapular adduction; the middle-trapezius page lists the same action and both sit in the seated row's synergist list.",
    "confidence": "high",
    "citation": {"title": "Rhomboids", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Muscle Directory", "type": "coaching", "doi_or_url": "https://exrx.net/Muscles/Rhomboids", "retrieved_at": "2026-11-26"}
  }
]
```

### 15. One-arm dumbbell bent-over row

- **Trains**: general back (middle/lower trapezius, rhomboids, latissimus dorsi, teres major, posterior deltoid, elbow flexors) with trunk stabilizers including obliques and quadratus lumborum (ExRx, dumbbell bent-over row).
- **Movement pattern**: horizontal pull, compound, unilateral.
- **Equipment**: a dumbbell and a bench (kneeling support version is ExRx's stated preparation).
- **Level**: beginner to intermediate; lighter loads let the form hold.
- **Runner relevance**: the dumbbell path of the horizontal pull and the unilateral option, which lets the engine pair it with the home dumbbell set it already models.
- **Form cues**: knee and hand on the bench, torso close to horizontal, pull to the ribs or just past horizontal upper arm, let the scapula articulate; do not rotate the torso to throw the weight (ExRx comments).
- **Common mistakes**: torso rotation to cheat, yanking from the shoulder in a stretched position, standing bent-over without support.
- **Recommendation: take** (dumbbell path of the horizontal pull). Already in the catalog (`exercises.ts` One-arm dumbbell row, Dumbbell row).

```json
[
  {
    "topic": "dumbbell row muscles and technique",
    "claim": "The one-arm dumbbell bent-over row trains the same general-back set as the seated row while the trunk resists rotation, and ExRx explicitly instructs not to rotate the torso to heave the weight.",
    "evidence": "ExRx's dumbbell bent-over row page lists the muscle set (middle/lower trapezius, rhomboids, latissimus dorsi, teres major, posterior deltoid, infraspinatus, teres minor, elbow flexors) with obliques, psoas, and quadratus lumborum as stabilizers, and its comments require a horizontal torso with scapular articulation.",
    "confidence": "high",
    "citation": {"title": "Dumbbell Bent-over Row", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/WeightExercises/BackGeneral/DBBentOverRow", "retrieved_at": "2026-11-26"}
  }
]
```

### 16. Inverted row

- **Trains**: same general-back set as the seated row (middle/lower trapezius, rhomboids, lats, posterior deltoid, elbow flexors) with trunk stabilizers, in a bodyweight format (ExRx, inverted row).
- **Movement pattern**: horizontal pull, compound, bodyweight.
- **Equipment**: a fixed bar at hip-to-waist height; suspension straps are the portable variant (`machines.ts` TRX row already carries the strap path).
- **Level**: the most scalable bodyweight pull: higher bar and knees bent for easier, feet elevated and single-arm for harder (ExRx's easier/harder notes).
- **Runner relevance**: the home/park horizontal pull and the best posture-to-strength bridge in the partition, since the body line doubles as a plank. Same modest posture framing as entry 14.
- **Form cues**: body straight, pull the chest to the bar, shoulders back and chest high at the top, arms fully extended at the bottom (ExRx execution text).
- **Common mistakes**: sagging hips, half reps, gripping so wide that the shoulder rolls forward.
- **Recommendation: take** (bodyweight path of the horizontal pull). Already in the catalog (`bodyweight.ts` Inverted row; `exercises.ts` Backpack inverted row, Feet-elevated inverted row, Suspension strap row, Table row).

```json
[
  {
    "topic": "inverted row scaling",
    "claim": "The inverted row scales from high-bar easier versions to feet-elevated and single-arm harder versions within the same bodyweight pattern, which makes it the scalable horizontal pull for mixed-level runners.",
    "evidence": "ExRx's inverted row page lists easier (high bar, on-hips) and harder (feet elevated, suspended one-arm, weighted) variants and gives the execution cues (body straight, pull to the bar, shoulders back).",
    "confidence": "high",
    "citation": {"title": "Inverted Row", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/WeightExercises/BackGeneral/BWSupineRow", "retrieved_at": "2026-11-26"}
  }
]
```

## Biceps (elbow flexion)

### 17. Dumbbell curl

- **Trains**: biceps brachii (target) with brachialis and brachioradialis as synergists (ExRx, dumbbell alternating curl). The biceps is a stronger elbow flexor with the forearm supinated (ExRx biceps page).
- **Movement pattern**: elbow flexion, isolation.
- **Equipment**: dumbbells; cable and barbell and machine curl variants exist.
- **Level**: beginner-friendly.
- **Runner relevance**: the single elbow-flexion accessory that balances pressing and pulling volume; keep it small (one slot at most) and claims modest: elbow-flexion balance, arm-carriage comfort during long holds, nothing beyond that.
- **Form cues**: elbows at the sides, supinate as the forearm rises, lower under control; a slight forward elbow travel at full flexion is normal (ExRx comments).
- **Common mistakes**: swinging the torso to start the rep, cutting the lowering phase, turning it into a front raise by letting the elbows drift forward.
- **Recommendation: take** (one elbow-flexion accessory; the machine bicep curl already covers the machine path). Already in the catalog (`machines.ts` Bicep curl).

```json
[
  {
    "topic": "biceps curl muscles",
    "claim": "The dumbbell curl targets the biceps brachii with brachialis and brachioradialis as synergists.",
    "evidence": "ExRx's dumbbell alternating curl page lists target biceps brachii and synergists brachialis and brachioradialis.",
    "confidence": "high",
    "citation": {"title": "Dumbbell Alternating Curl", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/WeightExercises/Biceps/DBCurl", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "supination effect on elbow flexion",
    "claim": "The biceps is a stronger elbow flexor when the forearm is supinated, which is why the curl cues a supinating grip rather than a fixed pronated one.",
    "evidence": "ExRx's biceps brachii muscle page states the biceps brachii is a stronger elbow flexor when the radioulnar joint is supinated.",
    "confidence": "high",
    "citation": {"title": "Biceps Brachii", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Muscle Directory", "type": "coaching", "doi_or_url": "https://exrx.net/Muscles/BicepsBrachii", "retrieved_at": "2026-11-26"}
  }
]
```

## Upper back and posture work

### 18. Band pull-apart

- **Trains**: scapular adduction (middle trapezius, rhomboids) with posterior deltoid involvement, in a horizontal band pull (ExRx muscle-function pages for the two scapular retractors and the posterior deltoid).
- **Movement pattern**: horizontal pull, low-load retraction.
- **Equipment**: an elastic band; the most equipment-light posture drill there is.
- **Level**: beginner.
- **Runner relevance**: the home-path posture drill: cheap, fast, repeatable between runs. Framed as scapular retraction training, not as a running-injury fix.
- **Form cues**: arms roughly straight at chest height, pull the band to the chest while the shoulder blades draw together, control the return; keep the neck relaxed.
- **Common mistakes**: shrugging the traps, arching the low back to fake range, band tension too heavy to allow a clean retraction.
- **Recommendation: take** (home path of the posture trio). Already in the catalog (`exercises.ts` Band pull-apart).

```json
[
  {
    "topic": "middle trap retraction",
    "claim": "The middle trapezius performs scapular adduction, the core action of a horizontal band pull.",
    "evidence": "ExRx's middle-trapezius page lists scapular adduction (plus elevation and upward rotation) as its movements.",
    "confidence": "high",
    "citation": {"title": "Trapezius (Middle Fibers)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Muscle Directory", "type": "coaching", "doi_or_url": "https://exrx.net/Muscles/TrapeziusMiddle", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "rhomboid retraction",
    "claim": "The rhomboids adduct the scapula and hold it against the thoracic wall, giving the band pull-apart its direct structural claim.",
    "evidence": "ExRx's rhomboids page lists scapular adduction and downward rotation and states the rhomboids hold the scapula against the thoracic wall.",
    "confidence": "high",
    "citation": {"title": "Rhomboids", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Muscle Directory", "type": "coaching", "doi_or_url": "https://exrx.net/Muscles/Rhomboids", "retrieved_at": "2026-11-26"}
  }
]
```

### 19. Face pull (cable high row to the face)

- **Trains**: posterior deltoid (transverse extension/abduction, which ExRx's posterior deltoid page describes as its strength), with the scapular retractors holding the shoulder blades; the external-rotation finish position leans on the posterior deltoid's documented external-rotation assist.
- **Movement pattern**: horizontal pull with high elbows, low-load upper-back drill.
- **Equipment**: cable stack with a rope; the machine rear-delt row is the fixed-path sibling (ExRx lists rear delt row variants for cable, dumbbell, and lever machines).
- **Level**: beginner-friendly, deliberately light.
- **Runner relevance**: the gym path of the posture trio; pairs with the band pull-apart for people without a band and with rows for people without a rope. Same modest framing: scapular retractors and posterior deltoid, not injury prevention.
- **Form cues**: rope at eye height, pull to the forehead with elbows high and wide, finish with a slight external rotation, control the return.
- **Common mistakes**: turning it into a heavy row (weight too high to finish the rotation), shrugging, standing so far back that the cable path drifts.
- **Recommendation: take** (gym path of the posture trio; a genuine catalog gap, since the machine rear-delt entry covers the fixed-path family but no rope/face-pull variant exists).

```json
[
  {
    "topic": "face pull muscular basis",
    "claim": "The face pull is a posterior-deltoid-dominant horizontal pull whose finish position uses the posterior deltoid's external-rotation assist alongside the scapular retractors.",
    "evidence": "ExRx's posterior deltoid page lists transverse extension, transverse abduction, extension, and external rotation as movements and notes the posterior deltoid can assist external rotation when the humerus is internally rotated.",
    "confidence": "medium",
    "citation": {"title": "Deltoid (Posterior)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Muscle Directory", "type": "coaching", "doi_or_url": "https://exrx.net/Muscles/DeltoidPosterior", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "rear delt row family",
    "claim": "The cable rope rear delt row and its machine variants sit in the same posterior-deltoid family, which is why the face pull is the rope-form gym path rather than a separate pattern.",
    "evidence": "ExRx's shoulder exercise list groups rear delt row variants (cable, with rope, dumbbell, lever machine) and reverse fly variants under posterior deltoid exercises.",
    "confidence": "high",
    "citation": {"title": "Shoulder Exercises (list)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/Lists/ExList/ShouldWt", "retrieved_at": "2026-11-26"}
  }
]
```

### 20. Prone Y-T-W

- **Trains**: scapular adduction and depression through the Y, T, and W positions: lower and middle trapezius, rhomboids, posterior deltoid; prone position keeps load low and honest. ExRx's middle-trap and rhomboids pages carry the retraction function; the lower-fiber trap is named on the middle-fibers page as part of the trapezius head set.
- **Movement pattern**: scapular retraction/depression drill, low load.
- **Equipment**: floor only; a light dumbbell or none.
- **Level**: beginner; load stays light by design.
- **Runner relevance**: the floor path of the posture trio and the natural filler between harder sets; also the drill a runner can do on a rest day. Framed identically: retraining retraction positions, not curing anything.
- **Form cues**: lift the arms with the shoulder blades, not the low back; keep the neck long; each letter position gets a brief pause; range ends where control ends.
- **Common mistakes**: turning it into a lumbar-extension arch, rushing reps, using enough load that the shoulder shrugs.
- **Recommendation: take** (floor path of the posture trio). Already in the catalog (`bodyweight.ts` Prone Y-T-W).

```json
[
  {
    "topic": "Y-T-W muscular basis",
    "claim": "Prone arm raises in Y, T, and W positions train scapular adduction and depression through the trapezius (middle and lower fibers) and rhomboids with posterior deltoid assistance.",
    "evidence": "ExRx's middle-trapezius page lists scapular adduction and names the upper, middle, and lower fiber heads; the rhomboids page adds scapular adduction and downward rotation.",
    "confidence": "medium",
    "citation": {"title": "Trapezius (Middle Fibers)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Muscle Directory", "type": "coaching", "doi_or_url": "https://exrx.net/Muscles/TrapeziusMiddle", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "Y-T-W scapular holding role",
    "claim": "The rhomboids' role of holding the scapula against the thoracic wall is the structural reason low-load retraction drills like the Y-T-W count as posture work rather than as strength training in the usual sense.",
    "evidence": "ExRx's rhomboids page states the rhomboids hold the scapula against the thoracic wall and lists scapular adduction and downward rotation.",
    "confidence": "medium",
    "citation": {"title": "Rhomboids", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Muscle Directory", "type": "coaching", "doi_or_url": "https://exrx.net/Muscles/Rhomboids", "retrieved_at": "2026-11-26"}
  }
]
```

### 21. Dumbbell shrug

- **Trains**: scapular elevation (upper trapezius); ExRx groups shrugs under trapezius upper-fiber exercises.
- **Movement pattern**: scapular elevation, isolation.
- **Equipment**: dumbbells, barbell, cable, or machine.
- **Level**: mechanically trivial, which is why it gets overused.
- **Runner relevance**: elevation is the one scapular action the posture story does not want more of, and the middle-fiber page's cited anatomy (Johnson 1994, quoted by ExRx) notes the fibers' transverse orientation acts to draw the scapula backward rather than to lift it, which further weakens the shrug's case as a posture tool for this population.
- **Form cues (if used)**: straight up and down, no rolling, brief hold at the top.
- **Common mistakes**: rolling the shoulders, using forearm/hip momentum, holding the breath under light loads.
- **Recommendation: prune.** The partition's upper-back needs are retraction- and depression-heavy; elevation work adds tension where runners need none.

```json
[
  {
    "topic": "shrug classification",
    "claim": "Shrugs are classified by ExRx under trapezius upper-fiber exercises (scapular elevation), which is the scapular action least aligned with the posture goal of this partition.",
    "evidence": "ExRx's back exercise list groups barbell, dumbbell, cable, lever, and Smith shrugs under 'Trapezius, Upper Fibers'.",
    "confidence": "high",
    "citation": {"title": "Back Exercises (list)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Exercise Library", "type": "coaching", "doi_or_url": "https://exrx.net/Lists/ExList/BackWt", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "upper trapezius fiber orientation",
    "claim": "The upper and middle trapezius fibers' essentially transverse orientation acts mainly to draw the scapula backward rather than to lift it, which weakens the shrug's case as a posture tool.",
    "evidence": "ExRx's middle-fibers trapezius page quotes Johnson (1994) arguing the transverse orientation of upper and middle fibers precludes the commonly depicted scapular elevation action; their role is to raise the scapula by rotating the clavicle or to draw the scapula and clavicle backwards.",
    "confidence": "medium",
    "citation": {"title": "Trapezius (Middle Fibers)", "authors": "ExRx.net", "year": 2026, "venue": "ExRx.net Muscle Directory", "type": "coaching", "doi_or_url": "https://exrx.net/Muscles/TrapeziusMiddle", "retrieved_at": "2026-11-26"}
  }
]
```

## Runner-relevance claims (shared by the whole partition)

```json
[
  {
    "topic": "upper-body work is accessory for runners",
    "claim": "The mechanisms by which strength training benefits distance running are dominated by lower-limb and running-economy factors; upper-body work belongs in a small accessory slot for balance, posture habits, and gym completeness, and no claim is made here that it improves running performance.",
    "evidence": "Blagrove, Howatson and Hayes's systematic review of strength training on the physiological determinants of middle- and long-distance running performance organizes the evidence around lower-limb strength, rate of force development, running economy, and neuromuscular factors; it does not identify upper-body training as a direct performance lever. The repo's own wave-7 session-structure research (17a-strength-session-structure.json) applies the same framing: one or two upper-body exercises at most, first to cut.",
    "confidence": "medium",
    "citation": {"title": "Effects of Strength Training on the Physiological Determinants of Middle- and Long-Distance Running Performance: A Systematic Review", "authors": "Blagrove RC, Howatson G, Hayes PR", "year": 2018, "venue": "Sports Medicine 48(5):1117-1149", "type": "systematic-review", "doi_or_url": "https://doi.org/10.1007/s40279-017-0835-7", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "arm carriage and running economy",
    "claim": "Maintaining arm swing is associated with better running economy in the biomechanics literature; this supports stable-arm-carriage posture work but does not justify claims that arm-strength training improves running performance.",
    "evidence": "Moore's review of modifiable biomechanical factors affecting running economy lists 'maintaining arm swing' among the intrinsic factors that appeared beneficial for RE, while concluding that recommending a general economical running technique should be approached with caution.",
    "confidence": "medium",
    "citation": {"title": "Is There an Economical Running Technique? A Review of Modifiable Biomechanical Factors Affecting Running Economy", "authors": "Moore IS", "year": 2016, "venue": "Sports Medicine 46(6):793-807", "type": "narrative-review", "doi_or_url": "https://doi.org/10.1007/s40279-016-0474-4", "retrieved_at": "2026-11-26"}
  },
  {
    "topic": "accessory dose ceiling",
    "claim": "The upper-body accessory slot should stay within small doses: 2-3 sets per exercise, at least 2 but usually 2 weekly strength sessions overall, with the upper-body picks appended after the lower-body prescription.",
    "evidence": "The 2026 ACSM position stand (an overview of 137 systematic reviews) reports strength gains from heavier loads through full range of motion for 2-3 sets at the beginning of sessions and 2 or more sessions per week; the wave-7 session-structure research programs upper-body accessory work last in the strength session.",
    "confidence": "high",
    "citation": {"title": "American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews", "authors": "Currier BS, D'Souza AC, Singh MAF, et al.", "year": 2026, "venue": "Medicine & Science in Sports & Exercise 58(4):851-872", "type": "position-stand", "doi_or_url": "https://doi.org/10.1249/MSS.0000000000003897", "retrieved_at": "2026-11-26"}
  }
]
```

## Take list summary

Six patterns, three posture drills, thirteen takes counting equipment paths (the engine selects by available equipment):

| # | Exercise | Path | Status |
|---|----------|------|--------|
| 1 | Push-up | bodyweight | take (existing) |
| 2 | Machine chest press | machine | take (existing) |
| 6 | Dumbbell shoulder press / machine press | dumbbell + machine | take (existing) |
| 7 | Pike press | bodyweight | take (new) |
| 10 | Triceps pushdown / dumbbell extension | cable + dumbbell | take (existing as Tricep extension) |
| 12 | Lat pulldown | machine/cable | take (existing) |
| 13 | Pull-up (+ assisted) | bodyweight + machine | take (existing assisted variant) |
| 14 | Seated row | cable/machine | take (existing) |
| 15 | One-arm dumbbell row | dumbbell | take (existing) |
| 16 | Inverted row | bodyweight | take (existing) |
| 17 | Dumbbell curl | dumbbell + machine | take (existing as Bicep curl) |
| 18 | Band pull-apart | band | take (existing) |
| 19 | Face pull | cable rope | take (new) |

Prunes: barbell bench press, chest dip, close-grip push-up, dumbbell lateral raise, upright row, bench dip, dumbbell shrug. (The fixed-path rear-delt family is already in the catalog as the `Rear delt / lateral raise machine`, which is why it appears as no new entry here; see entry 19.)

## Unverified (per README policy, not published as fact)

- "Upper-body posture work prevents running injuries": no citation in this partition supports it; the posture entries claim muscle-function training only.
- "Upper-body training improves running economy": the literature in hand supports maintaining arm swing as an economy factor, not training the arms as an economy intervention.
- Per-exercise Calistree level/equipment metadata for this partition: unretrievable this session (see provenance note). If the taxonomy branch lands, reconcile levels against `01-candidates.md`.

## Notes

- Sources used: ExRx.net exercise pages and muscle directory (coaching/kinesiology reference, each page retrieved 2026-11-26); Blagrove et al. 2018 systematic review (DOI resolved 2026-11-26); Moore 2016 review (Europe PMC, retrieved 2026-11-26); ACSM 2026 position stand (Europe PMC, retrieved 2026-11-26). PubMed article pages were blocked to the fetcher (cookie gate), so Europe PMC's REST API served the same records.
- Firecrawl usage this task: 4 scrape calls (2 text scrapes of chest/back data sheets, 1 screenshot attempt, 1 screenshot with 10 s wait). No further Calistree attempts were made after the mechanism was exhausted, per the retrieval policy.
- Consolidation hint: of the 13 takes, 11 already exist in the catalog under the names listed above; the genuine additions for the engine database are the pike press and the face pull, and the closest existing entries should absorb their variant mappings rather than spawn duplicates.
