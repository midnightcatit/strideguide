---
id: shared-domain
name: Shared domain
paths:
  - "packages/shared/src/**"
exclude:
  - "packages/shared/src/plan/**"
---

Pure domain code shared by the API and the web app. No runtime imports.

What to check:

- Purity. No I/O, no framework imports, no browser or Worker globals.
- Tests are colocated as `*.test.ts`. Add a test only when it protects behaviour
  that could regress and is hard to catch by hand. Flag a test that only mirrors
  the implementation or asserts that one function calls another.
- Writing rules. `writing.ts` holds the shared guard. Any change there must keep
  the em dash ban and the filler and hype filters, and the guard tests must not be
  weakened.
- A change to the system graph or docs generator must keep the invariant test
  green and update `docs/decisions.md` when a choice is settled.
