---
id: tests-not-weakened
name: Tests are not weakened
mode: warning
paths:
  - "**/*.test.ts"
---

AGENTS.md: a green suite is evidence, not a review. A change that loosens an
assertion to make itself pass is a finding.

Fail when a change deletes an assertion, loosens an expected value, widens a
tolerance without a reason, skips a test, or changes an expectation to match new
output instead of checking the domain.

Pass when a test is added, when an assertion is tightened, or when a test is
rewritten because the old one tested the wrong thing and the PR says why.
