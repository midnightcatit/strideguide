# The decision entry overstates the skip-rest confirmation guarantee

From CodeRabbit on PR #293 (thread PRRT_kwDOV3qHEs68oCbL).

**Finding.** The "Rest between strength sets is a band, and rest is an
explicit card" decision entry says the rest card "can only be skipped behind a
confirmation", but selecting the next move in "Workout stages" calls `jump()`
and then `armStep()` without confirmation. Only the dedicated "Skip rest"
control opens the confirmation. The doc claims behaviour the code does not
have.

**Why deferred.** No suggested diff, and the wording edit belongs with the
next documentation touch. The fix is one clause: scope the guarantee to the
skip control, or guard stage navigation during a rest.

**Pick it up when.** Any docs pass over the player or the decision log.
