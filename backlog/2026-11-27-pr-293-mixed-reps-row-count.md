# The detail list counts prescription rows, not moves

From CodeRabbit on PR #293 (thread PRRT_kwDOV3qHEs68oHla).

**Finding.** After the equal-reps merge condition landed, one move with sets
of 10 and 8 reps produces two rows in `collapseRests`. `SessionDetail` uses
the row count as the move count, so it displays "2 moves" for one move. The
suggested remedy: count distinct moves separately while keeping both
prescriptions visible, so the step-count text does not inflate.

**Why deferred.** No suggested diff, and the counting choice (distinct labels
versus rows, and what the "N moves" label then says) deserves one deliberate
look rather than a drive-by edit. Playback keeps every card either way; only
the detail summary is off, and only for mixed-rep sets.

**Pick it up when.** The session detail or preview list is touched next.
