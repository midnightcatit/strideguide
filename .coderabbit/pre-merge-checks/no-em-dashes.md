---
id: no-em-dashes
name: No em dashes
mode: error
paths:
  - "apps/**"
  - "packages/**"
  - "docs/**"
  - "*.md"
exclude:
  - "**/*.generated.json"
  - "**/dist/**"
  - "**/.svelte-kit/**"
  - "**/.wrangler/**"
  - "**/node_modules/**"
---

AGENTS.md bans the em dash in app copy, generated text, comments and docs.

Fail when an added line contains an em dash character (U+2014). Use commas,
periods, colons or parentheses instead. An en dash (U+2013) is allowed only in a
numeric range such as 4:55-5:05.

Do not fail on a line that only removes an em dash. Do not fail on a code sample
that quotes an em dash on purpose and says so in the PR.
