# Generated strength sessions can land under the runner's time preference

Found during the coordinator's review of PR #293, where the session length
estimate became an honest sum of work plus rest. No review thread exists for
it (it was raised in review chat, not on the PR), so the source is the code
itself: `packages/shared/src/plan/engine.ts`, `strengthSession` and
`strengthWorkout`.

**Finding.** The circuit is sized from the runner's `sessionMinutes`
preference, but the new estimate counts only what the drills and sets actually
take. In the base phase a session can come out below the preference: about 38
minutes of work plus rest against a 45-minute preference. `durationMin` now
reports the real length, so the schedule and the display are honest, but the
plan quietly under-delivers the time the runner asked for.

**What deciding it means.** Either the generator sizes circuits to fill the
preference (more moves or sets, which changes volume and the growth story), or
the shorter session is accepted and the why says so, or the preference keeps
serving only as a ceiling. Phase-dependent sizing interacts with the taper and
peak bands, so it belongs with the plan-progression work rather than the
rest-card change that surfaced it.
