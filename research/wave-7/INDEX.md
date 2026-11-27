# Wave 7: session structure and stretch dosing research (2026-11-27)

Research-only pass answering two questions the earlier waves left open: how a runner's
two to three weekly strength sessions should be structured (full-body versus splits,
emphasis, placement, phase), and what actually drives range-of-motion gains from a
stretching programme, including whether exercise variety matters. Nothing here is wired
into the app yet.

Produced by one research session in this worktree. Totals: 2 claim files, 27 claims, no
catalog candidates (both files extend existing catalog coverage rather than proposing
new moves).

## Claim files (JSON, same schema as waves 1 to 6)

| File | Area | Claims | Headline |
| --- | --- | --- | --- |
| 17a-strength-session-structure.json | Strength: session structure | 14 | Full-body sessions with a lean, never isolated body-part days at 2 to 3 sessions per week; a two-way upper/lower split can work at 4 sessions, a three-way rotation needs about 6 |
| 17b-stretch-variety-dose.json | Mobility: stretch dosing and variety | 13 | Consistency plus about 10 minutes per week per target muscle drives ROM; variety is untested for ROM and serves coverage and adherence, so anchor routines on the runner's tight areas |

Each file also carries `summary_tier_a`, an `unverified` list, and `notes`. Both extend
rather than repeat wave-1/3a and 3b (strength programming) and wave-3/8a, 8c and
wave-5/14a to 14d (mobility and stretching), which remain authoritative for loads, sets,
exercise selection, warm-up roles and the stretch library itself.

## What 17a settles (and revises)

- **Full-body with a lean, not a split.** The frequency meta-analyses show frequency does
  not change the outcome once weekly volume is matched, so twice-weekly exposure is a
  practical default and weekly volume is the lever. At two to three sessions, every session
  keeps the core lower-body patterns (squat or leg press, hip hinge, knee flexion, calf)
  plus one or two upper or core accessories, and the session's focus adds one exercise or
  set rather than replacing coverage. This full-body-with-lean shape is a proposed synthesis,
  not a structure the runner review reports. Two sessions both lean legs and hips; three
  give two leg-lean sessions and one upper-plus-core-lean session.
- **Split thresholds depend on split type.** A two-way upper/lower split can give each muscle
  two weekly exposures at four sessions, while a legs/push/pull rotation needs about six;
  both are above the runner's realistic ceiling of two to three sessions. The one head-to-head
  trial (trained men) found total body at least as good for maximal strength, the runner's
  target quality; the split's only edge was regional quadriceps thickness.
- **Lower-body emphasis dominates.** About two thirds or more of working sets, a chosen
  heuristic rather than a figure derived from exercise counts (exercise counts do not map
  directly onto set ratios), supported by the largest effect for maximal-force training in
  the endurance meta-analysis. Upper-body work is a small accessory dose, programmed last and
  cut first; no runner-specific evidence it improves running.
- **Interference is managed by volume and placement, not session type.** Keep sessions at
  least 3 hours after a hard run and at least 24 hours before a key run (both when both
  apply), strength before any same-session running, and accept that running blunts some
  strength and explosive gains. Plyometrics go early in the session and mostly in base and
  build; explosive work can displace easy running rather than stack on it.
- **Phase arc.** Base: 2 to 3 heavy full-body sessions, plyometrics added once landing
  control is there. Build and peak: 1 to 2 sessions, load kept, sets cut. Taper: one short
  session early, nothing heavy in the final days (flagged, no runner-specific RCT).

This revises the 2026-11-26 decision "The week rotates the strength focus across the
body": the focus vocabulary (legs and hips, upper push, upper pull, core and stability) is
kept, but focus days that isolate a body part are replaced by full-body sessions with a
lean, for the per-muscle dose reasons above.

## What 17b settles

- **Dose is total weekly stretch time per muscle: the acute effect is maximised at about 4
  minutes per session and the chronic effect at about 10 minutes per week**, from a 189-study
  meta-regression. Lower weekly doses still produce gains; more than the plateau adds nothing.
  Weekly frequency, hold duration pattern and intervention length did not moderate gains, so
  when the minutes happen matters far less than whether they happen every week.
- **Prescription: 2 to 3 sets of 30 to 45 seconds per stretch**, preferring static or PNF over
  dynamic (dynamic still builds range, just less), at mild discomfort, after running or on
  rest days.
- **The mechanism is mostly stretch tolerance**, not tissue lengthening, over the first
  8 weeks, so range rises fast and needs continued practice to hold.
- **Specificity rules composition**: gains are joint- and mostly limb-specific and tight
  runners gain the most, so the runner's stated tight areas anchor the routine; everything
  else gets light maintenance at most.
- **Variety is untested for ROM.** No trial compares rotating stretches against repeating
  one routine. The strength analogue says systematic variety (coverage of regions) helps
  and random churn can hurt, so the recommended shape is a fixed anchor on the tight areas
  plus one rotating roaming stretch for coverage and adherence, never at the anchor's
  expense.
- **Progression lives inside the dose budget**: add sets, deepen end range, or lengthen
  holds within the 30 to 120 second band rather than adding minutes past the plateau.

## Open questions for the build phase (not decided here)

1. Whether to amend the engine's strength focus rotation to the full-body-with-lean shape
   and how the lean maps onto the catalog's pattern and muscle lists.
2. Whether the mobility builder should carry a per-muscle weekly stretch budget and a
   fixed anchor set, and how the runner's stated tight areas flow into it.
3. Whether full-ROM strength work should be credited against mobility needs in the plan.

## Provenance

All citations claim a resolvable DOI or URL and were re-verified against Europe PMC
metadata on 2026-11-27 (the wave-1 practice). Points that could not be substantiated sit
in each file's `unverified` array and are not published as fact; the largest of these is
the absence of any runner-specific trial of split versus full-body session structure, and
of any stretching-variety trial at all.
