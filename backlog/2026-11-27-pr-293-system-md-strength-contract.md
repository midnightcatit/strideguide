# SYSTEM.md does not describe the new strength contract

From CodeRabbit on PR #293 (thread
[PRRT_kwDOV3qHEs68oCbP](https://github.com/midnightcatit/strideguide/pull/293#discussion_r4715153730)).

**Finding.** SYSTEM.md is unchanged by the rest-card change, but the path
instructions say the engine's description should move with the engine. The
per-set work/rest shape, the terminal-rest exception and the calculated
duration used by scheduling are not in the system description.

**Why deferred.** No suggested diff, and writing the contract description
properly is its own small doc task rather than a drive-by edit on a feature
PR.

**Pick it up when.** The next engine or system pass. Until then the decision
entry ("Rest between strength sets is a band, and rest is an explicit card")
carries the contract, and `packages/shared/src/plan/rest.ts` is the source of
truth.
