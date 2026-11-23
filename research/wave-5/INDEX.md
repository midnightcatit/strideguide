# Wave 5: catalog expansion research (2026-11-23)

Research-only pass to grow the workout, exercise and stretch knowledge base with cited
evidence, and to answer two open questions: what open exercise databases exist, and how
feasible form/movement animations are. Nothing here is wired into the app yet.

Produced by 15 parallel research subagents. Totals: 12 claim files, about 320 claims and
about 217 proposed catalog candidates, plus 3 decision documents under `surveys/` (see
below).

## Claim files (JSON, same schema as waves 1 to 4)

| File | Area | Claims | Candidates | Headline |
| --- | --- | --- | --- | --- |
| 13a-dumbbell-freeweight-exercises.json | Strength: dumbbells | 30 | 16 | Heavy loads (about 80 to 90% 1RM) and single-leg work drive economy; injury-prevention language must stay measured |
| 13b-barbell-kettlebell-power.json | Strength: barbell, KB, plyometrics | 26 | 14 | Heavy plus plyometric work both raise economy; kettlebell running-specific evidence is thin (flagged unverified) |
| 13c-minimal-equipment-bands-home.json | Strength: home kit | 25 | 16 | Bands match weights at matched effort; isometrics and low-load near-failure work progress with little kit |
| 13d-bodyweight-progressions.json | Strength: progressions | 27 | 22 | Full beginner to advanced ladder per pattern; Nordic curls and balance work carry the injury evidence |
| 13e-machine-catalog-additions.json | Strength: machines, cables | 28 | 20 | Machines match free weights at matched effort; hip abduction and posterior chain are the highest value |
| 14a-stretch-library.json | Mobility: static and PNF | 25 | 22 | 30 to 45s holds match 60s+ for range; long holds before hard running cost power |
| 14b-dynamic-mobility-drills.json | Mobility: warm-up | 24 | 22 | Dynamic work beats static before running; RAMP structure and about 7 to 10 minutes is the sweet spot |
| 14c-foam-roll-self-myofascial.json | Recovery: self-myofascial | 25 | 15 | Rolling helps flexibility and soreness a little; the mechanism is neural, not tissue release |
| 14d-yoga-pilates-breath.json | Mobility: yoga, Pilates, breath | 30 | 18 | Yoga and Pilates help range, balance and core control, not endurance; slow breathing helps sleep |
| 15a-running-workout-variations.json | Running: session types | 28 | 20 | Norwegian 4x4, cruise intervals, downhill reps, the 10% rule and taper evidence |
| 15b-running-drills-mechanics.json | Running: form and drills | 29 | 17 | Cadence is a load tool not a speed fix; foot strike is individual; drills are skill work |
| 16a-cross-training-modalities.json | Cross-training | 23 | 15 | Cross-training holds VO2max for weeks and substitutes some easy volume, but not economy or impact loading |

Each file also carries `summary_tier_a`, an `unverified` list, and `notes`. The
`catalog_candidates` arrays are proposed entries in our app shapes (exercise, drill, or
workout), ready to be lifted into code after review.

## Decision documents

- `surveys/exercise-databases.md`: open exercise and workout databases, licensing, and
  the direct answer to the science-community question.
- `surveys/exercise-media-animation.md`: feasibility of form animations and video, with a
  recommended path and costs.
- `surveys/gym-equipment-inventories.md`: what common gym chains and home setups actually
  have, mapped to a wider machine catalog.

## What this unlocks

- Strength catalogs beyond the current 8 machines and 12 bodyweight moves: dumbbells,
  barbell, kettlebell, bands and home kit, plus a full bodyweight progression ladder.
- A stretch and mobility library roughly triple the current size, with dose and timing
  evidence (holds, dynamic warm-up, foam rolling, yoga and Pilates, breathwork).
- More running session types (cruise intervals, Norwegian 4x4, Yasso 800s, marathon pace,
  cut-downs, downhill reps) and a form and drills section.
- Cross-training sessions (bike, swim, row, elliptical, aqua run, stairs, incline walk).

## Open questions for the build phase (not decided here)

1. How much of the candidate data to lift into code, and in what order.
2. Whether to widen the machine catalog with per-gym presets (the plumbing already exists
   in `catalog.ts` and `EquipmentPreference`, so this needs data, not schema).
3. The animation path: the survey recommends short self-hosted silent loops from a
   licensed source over YouTube embeds, starting with a small set of the moves people get
   wrong. See the survey for the phased plan and costs.

## Provenance

All citations claim a resolvable DOI or URL. Points that could not be substantiated sit in
each file's `unverified` array and are not published as fact. Deep-dive follow-up topics
deferred (for future waves): injury rehabilitation protocols, altitude and heat, masters
and female-specific physiology, and strength programming periodisation depth.
