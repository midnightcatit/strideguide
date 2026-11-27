---
id: docs
name: Documentation
paths:
  - "docs/**"
  - "*.md"
  - "AGENTS.md"
  - "SYSTEM.md"
  - "PLAN.md"
  - "README.md"
---

Documentation is part of the product and follows the same writing rules as the
app.

What to check:

- Writing rules. No em dashes. No hype, no filler, no generic transitions. Plain
  and specific. En dashes are fine only in numeric ranges.
- A settled decision belongs in `docs/decisions.md` with the why. If a change
  settles a choice and no entry was added, ask for one.
- `SYSTEM.md` describes the system as it is now. If the change alters the engine,
  the schema, the AI layer or the writing rules, that file should move with it.
- `AGENTS.md` carries the commands, the workflow and the writing rules. Keep it
  accurate when a command or a path changes.
- Do not let a doc claim behaviour the code does not have. A warning that is
  computed but never shown is the kind of drift to flag.
