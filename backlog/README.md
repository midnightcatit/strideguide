# Backlog

Deferred findings from reviews (CodeRabbit and human), kept so nothing
addressable is lost when a PR is merged without applying it.

## What goes in here

A finding a review raised and we chose not to apply in that PR: the comment
carried no suggested diff, the fix needs a design call, or it is deliberately
out of scope for the PR it came from. Findings that were applied do not come
here.

## Convention

One file per finding, named `<date>-<pr-or-source>-<short-slug>.md`, for
example `2026-11-27-pr-293-custom-workout-step-cap.md`. Each file states:

- the finding, as the review wrote it (a faithful quote is fine),
- where it was raised (PR and comment link or thread id),
- why it was deferred,
- what applying it would mean, when that is known.

## Picking it up

Backlog entries are candidate follow-up work. An entry becomes work when
someone picks it for a PR, and then the file is deleted or updated to point
at the PR that did it.
