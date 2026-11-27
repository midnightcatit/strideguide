---
id: plan-engine
name: Plan engine
paths:
  - "packages/shared/src/plan/**"
---

This is the plan engine. It is pure, with no runtime imports, so it stays cheap to
test. Read AGENTS.md and SYSTEM.md before judging a change here.

What to check:

- Purity. No I/O, no network, no database, no `Date.now()` in decision logic. A
  clock or random value must be injected.
- Maths. Phase, volume, taper, pace and zone calculations, VDOT and unit
  conversion. A change to a formula needs a test that would fail without it. If a
  test changes, check the expected value against the domain, not against the new
  output.
- Tests. A bug fix gets exactly one regression test. Flag a fix with no test, and
  flag a test that was loosened to make a change pass.
- A medium or large change with no test is a finding. Say what behaviour it
  protects and what would catch a regression.

Do not ask for a test on a trivial getter or a pure rename. Do not suggest a
snapshot test.
