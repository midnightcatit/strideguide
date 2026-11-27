# The loaded leg extension is classed as bodyweight

From CodeRabbit on PR #310 (thread
[PRRT_kwDOV3qHEs68rC1I](https://github.com/midnightcatit/strideguide/pull/310#discussion_r4716438548)).

**Finding.** The loaded leg extension is classified as bodyweight, but its own
instructions require a band or an ankle weight and say not to perform it
without resistance. A beginner bodyweight circuit with a legs lean can select it
for the knee-extension slot, prescribing equipment the runner does not have.

**Why deferred.** The closest of the three to blocking, but it needs no code
change: it is one classification field. Non blocking under the rule because it
is a bad prescription in new data, not data loss, security or a broken build.

**Pick it up when.** The catalog is touched next, and treat it as the first of
the three. Fix: class the move as requiring a band or an ankle weight so the
bodyweight pools skip it, or drop it from the bodyweight set and keep it in the
band pool only.
