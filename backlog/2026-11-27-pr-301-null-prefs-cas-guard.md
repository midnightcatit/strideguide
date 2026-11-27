# The compare-and-swap guard misses NULL prefs rows

From CodeRabbit on PR #301 (thread
[PRRT_kwDOV3qHEs68qcP-](https://github.com/midnightcatit/strideguide/pull/301#discussion_r4716182018)).

**Finding.** The compare-and-swap guard in
`apps/api/src/lib/prefs-store.ts` writes with
`WHERE settings.prefs = ?3`. In SQL, `NULL = NULL` is not true, and the
`prefs` column allows NULL. For a row holding NULL, the read returns null and
the guard never matches, so the write reports a conflict on every attempt and
the store answers 409 even with no other writer active. Every workout save for
that runner would fail.

**Why deferred.** The repository's own writers always store a non-null JSON
object, so the reviewer notes the state is likely unreachable today. Non
blocking under that reading, but the guard is one word from correct.

**Pick it up when.** `prefs-store.ts` or the settings schema is touched next.
The fix is to compare with `IS` instead of `=`:
`WHERE settings.prefs IS ?3` treats two NULL values as equal and still
compares non-null text exactly, so stale writes are still rejected. Add a
store test with a NULL row to pin it.
