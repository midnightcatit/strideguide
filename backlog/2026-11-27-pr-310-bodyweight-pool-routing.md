# New bodyweight entries sit in a pool the engine never reads

From CodeRabbit on PR #310 (thread
[PRRT_kwDOV3qHEs68rC1C](https://github.com/midnightcatit/strideguide/pull/310#discussion_r4716438539)).

**Finding.** `poolFor` reads `FREEWEIGHT_MOVES` only for dumbbells, barbell and
kettlebell, so the new hanging raises, hangs and other bodyweight entries added
to that array never reach `circuitFor`, not even in full-gym mode. `ALL_MOVES`
lookup does not make a move selectable.

**Why deferred.** Non blocking: the moves are inert data, nothing prescribes
them wrongly. They are simply unreachable until re-routed.

**Pick it up when.** The exercise catalog is touched next. Fix: move those
entries into `BODYWEIGHT_PROGRESSIONS` (or add a bodyweight arm to `poolFor`),
then a test that a full-gym bodyweight circuit can select one of them.
