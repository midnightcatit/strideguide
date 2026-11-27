# Wave 8, legs partition: Calistree capture notes

Retrieved: 2026-11-27

Note added after the fact: the taxonomy branch (`research/wave-8-taxonomy`) landed locally (it is
not yet pushed to `origin`) after this fallback capture began. `research/wave-8/10-legs.md` was then
reconciled to the taxonomy's "Legs and front of hip" table. This capture file records the fallback
work that stood in for the taxonomy while it was missing, and it is kept for the record.

The taxonomy branch `origin/research/wave-8-taxonomy` and its `01-candidates.md` did not exist
when this partition was written (checked twice over roughly 15 minutes, then the documented
fallback was used). Calistree's own muscle-group datasheets were scraped directly as the
candidate source for this partition. Four Firecrawl scrapes were spent in total:

1. `https://calistree.app/datasheet/legs-m02n` (no render wait): failed, the Flutter app never
   rendered. Not used.
2. `https://calistree.app/datasheet/quadriceps-m00a` (15 s render wait): scrape
   `01a21b56-59a5-70e9-a06f-3ddc1f83f484`. Used.
3. `https://calistree.app/datasheet/hip-adductors-m013` (15 s render wait): scrape
   `01a21b56-e1a9-743c-995e-79682361f710`. Used.
4. `https://calistree.app/datasheet/psoas-major-m01e` (15 s render wait): scrape
   `01a21b57-65a7-7630-880f-00922978a99f`. Used.

Calistree is the taxonomy source only. Nothing below is copied from Calistree; these are the
exercise lists that the three datasheets returned, filtered to the ones this partition
considered. Training claims live in `research/wave-8/10-legs.md` with their own sources.

## Quadriceps datasheet (m00a): the full datasheet returned roughly 450 exercises

Considered here (Calistree id in parentheses):

- squat family: half-squat (e049), deep-squat (e031), assisted-deep-squat (e01o), deep-squat-hold (e0xp)
- wall sit family: wall-sit (e0yu), one-leg-wall-sit (e0yv), banded-wall-sit (e0yw)
- barbell and smith: back-squat (e0h0), barbell-front-squat (e0h1), smith-machine-squat (e1e0)
- kettlebell and dumbbell: goblet-squat (e0jq), single-kettlebell-front-squat (e0jr), double-kettlebell-front-squat (e13j), single-dumbbell-front-squat (e13x)
- machines: leg-press (e1c1), seated-leg-press (e1c9), single-leg-leg-press (e1c5), single-leg-seated-leg-press (e1cd), smith-machine-squat (e1e0)
- lunges: forward-lunge (e03o), reverse-lunge (e0k3), walking-lunge (e0k4), deep-lunge (e0q1), curtsy-lunge (e0y4)
- split squats: bulgarian-split-squat (e02b), weighted-bulgarian-split-squat (e133), smith-machine-split-squat (e1dz)
- step: step-up (e0bb), no-touch-step-up (e15r), jumping-step-up (e0z0)
- side and deep singles: low-side-to-side-squat (e0e3), cossack-style, wide-squat (e004), plie-squat-with-tip-toes (e16l), horse-stance (e0is), wide-horse-stance (e0yb)
- pistols: pistol-squat (e07v), assisted-pistol-squat (e01t), half-pistol-squat (e048), quarter-pistol-squat (e19q), elevated-pistol-squat (e10g), plus wobble-board, slanted, rolling and sliding micro-variants
- shrimp: shrimp-squat (e0ac), advanced-shrimp-squat (e01c), curtsy-shrimp-squat (e0e9)
- sissy: sissy-squat (e0go), half-sissy-squat (e0gn), deep-sissy-squat (e0gp), assisted-sissy-squat (e0gq)
- reverse nordic: reverse-nordic (e0ef), assisted-reverse-nordic (e1e1)
- cyclist: cyclist-squat (e11n), goblet-cyclist-squat (e11o)
- jumps: jumping-half-squat (e0ex), jumping-deep-squat (e05x), box-jump (e0u4), depth-jump (e1a1), frog-jump (e0df), long-jump (e08m)
- sled: sled-push (e1av), sled-pull (e1aw), lateral-sled-pull (e1ax), treadmill-sled-push (e1cw)
- bodyweight knee extension: sitting-leg-extensions (e0gw), lying-leg-extension (e17w), assisted-sitting-leg-extensions (e0gc), banded-supine-leg-extensions (e1fp)
- machine knee extension: leg-extension (e1bz), single-leg-leg-extension (e1c0)
- carries and conditioning: stair-climbing (e1ap), ladder-climber (e1an), plus sports, yoga and burpee entries that were pruned wholesale (see 10-legs.md section F)

## Hip adductors datasheet (m013)

Considered here:

- machines and cables: hip-adduction-machine (e1bp), cable-straight-leg-adduction (e1en)
- bands and floor: banded-hip-adduction (e165), lying-hip-adduction (e16n)
- copenhagen family: assisted-knee-copenhagen-plank (e0g1), knee-copenhagen-plank (e0g2), assisted-copenhagen-plank (e0g3), copenhagen-plank (e0g4), copenhagen-plank-with-movement (e0g5)
- wide squat bias: wide-squat (e004), plie-squat-with-tip-toes (e16l), side-staggered-squat (e0sq), low-side-to-side-squat (e0e3)
- splits: partial-middle-split (e0wm), sliding-side-split (e1fu), supported-partial-middle-split (e0xj), weighted-wall-straddle-stretch (e1b0), partial-front-split (e0xn), sliding-front-split (e1fo), standing-front-split (e16v), hanging-active-splits (e00x)
- holds: horse-stance (e0is), wide-horse-stance (e0yb), horse-walk (e0el)
- wide-stance leg press: wide-stance-leg-press (e1c3), wide-stance-seated-leg-press (e1cb)
- slides: sliding-leg-curl (e0em), one-leg-sliding-leg-curl (e0en), plus the glute bridge, hip thrust and deadlift families tagged to adductor magnus (left to the posterior partition)

## Psoas major datasheet (m01e)

Considered here:

- knee drive (psoas march style): cable-knee-drive (e1eg), banded-knee-drive (e12f), kettlebell-knee-drive (e10r), band-resistance-lying-knee-drive (e15w)
- standing and walking: high-knees (e002), one-leg-knee-up (e1a7), one-leg-halfway-up (e1a8)
- hanging: hanging-knees-to-chest (e04r), hanging-knees-to-elbows (e0ja), advanced-hanging-knee-raise (e0t2), hanging-leg-raises (e04s), hanging-leg-raises-toes-to-hands (e04t), hanging-l-scissors (e0jf)
- floor: lying-legs-raise (e06q), lying-alternating-leg-raise (e0zn), lying-leg-extension (e17w), hip-flexor-crunch (e1b3), cable-straight-leg-raise (e1eo)
- supports: forearm-support-leg-raise (e10y), forearm-support-one-leg-raise (e10z), forearm-support-knee-raise (e10x), forearm-support-one-knee-raise (e110), support-knees-to-chest (e0c6), support-legs-raises-to-l-sit (e0c7)
- holds: l-sit (e06a) and its tuck, straddle, parallettes and ring variants, front-scale (e0ax), one-leg-hold (w00u), boat-pose (e007) and tuck-boat-pose (e0ui)
- compression: sitting-pike-compression (e0an), sitting-straddle-compression (e0ap), one-leg-sitting-pike-compression (e0a9), weighted-sitting-compression (e0gx), sitting-leg-extensions (e0gw), stability-ball-pike-compression (e00s), pike-compression-flutter-kicks (e0zp), band-resisted-pike-compression (e164)
- dynamic core that also flexes the hip (handed to the core partition): dead-bug (e0ew) family, v-up (e008) and tuck-up (e0oo), mountain-climber (e070), hollow-body family, dragon-flag family, plank-jack, scissor-jump
- control drills: hip-airplane (e170), assisted-hip-airplane (e16f), active-90-90 (e0i9), standing-hip-circles (e16p), assisted-standing-hip-circles (e17d)
- running itself: running (e1ay), treadmill-running (e1ak) are tagged here (psoas load at speed) but are the engine's own sessions, not strength moves
