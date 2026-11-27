---
id: migrations-additive
name: Migrations stay additive
mode: warning
paths:
  - "apps/api/drizzle/**"
---

AGENTS.md: migrations are additive by default and auto-apply before the API
deploy. Destructive changes go through the manual DB Migrate workflow and are
reviewed first.

Fail when a new or changed migration drops or renames a column or table, or
rewrites existing rows, unless the pull request description says the change goes
through the DB Migrate workflow. Adding a column, a table or an index passes.

Pass when the change only adds. Pass when the PR says the destructive part was
reviewed and the workflow is intentional.
