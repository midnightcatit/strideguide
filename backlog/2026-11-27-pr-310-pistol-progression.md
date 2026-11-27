# The pistol squat progression is reversed

From CodeRabbit on PR #310 (thread
[PRRT_kwDOV3qHEs68rC1E](https://github.com/midnightcatit/strideguide/pull/310#discussion_r4716438542)).

**Finding.** An intermediate runner can now be given `Pistol squat`, but not
`Assisted pistol squat`, which stays advanced. The full movement sits below its
own regression, so the levels are inverted.

**Why deferred.** Non blocking (a harder move offered a level early is a
progression nit, not a wrong prescription).

**Pick it up when.** The catalog is touched next. Fix: set the full pistol to
advanced, keep the half pistol at intermediate, and check the neighbouring
progression entries for the same inversion.
