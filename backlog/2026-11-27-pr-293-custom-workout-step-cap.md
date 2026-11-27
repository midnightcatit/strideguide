# Custom strength workouts can exceed the 200-step block cap

From CodeRabbit on PR #293 (thread PRRT_kwDOV3qHEs68oCa_).

**Finding.** Custom strength workouts now emit one step per set and one rest
step between sets, all in one block. A workout with 101 or more total sets
produces more than 200 steps, and `prescriptionSchema` rejects any block with
more than 200. A valid custom workout can therefore make the whole week-one
save fail, and the runner has to remove moves or sets before the edited week
saves.

**Why deferred.** Needs a design call, not a mechanical fix: either split the
custom workout across blocks so each stays inside the cap, or raise the block
limit on purpose and say what it protects. Choosing one changes the preview
contract.

**Pick it up when.** Custom workouts are in scope again. Until then, a custom
session over roughly 100 total sets is unusable, which the builder's own
limits make unlikely but not impossible.
