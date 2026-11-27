# Distance-based recipe steps finish on the timer, not the distance

From CodeRabbit on PR #309 (thread
[PRRT_kwDOV3qHEs68rAle](https://github.com/midnightcatit/strideguide/pull/309#discussion_r4716423662)).

**Finding.** Some recipes in `packages/shared/src/plan/library-recipes.ts`
describe distance efforts (a 400 metre repeat, a mile) with an estimated time.
With auto-next on, `SessionPlayer` completes the step after that time regardless
of the distance covered, so a runner at 6 minutes per kilometre reaches about
3.67 km before the cooldown starts. The player does not use distance to decide
completion.

**Why deferred.** Non blocking: the recipe still runs, it just ends on time
rather than on the distance named in the text. Fixing it properly is a
behaviour choice, not a typo.

**Pick it up when.** The player or the recipe steps are touched next. Two
honest options: make the step text time-based and drop the distance claim, or
teach the player to complete distance steps on distance (bigger, and it changes
the player's contract).
