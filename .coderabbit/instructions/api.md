---
id: api
name: API
paths:
  - "apps/api/**"
---

Cloudflare Worker API on D1. Auth is Google sign-in with a session cookie.

What to check:

- Auth. Every route that reads or writes user data must resolve the session and
  scope the query by user id. A query that drops the user id is a blocking
  finding.
- Input. Validate and clamp request bodies. A new field needs a bound, a type and
  a default.
- Rate limits. A new route that costs money or CPU goes through the shared limiter
  and gets a matching entry in the policy map. A prefix with no policy is a
  finding.
- Migrations. See the migration check. New SQL goes in `apps/api/drizzle` and is
  additive unless the PR says it goes through the DB Migrate workflow.
- Secrets. Read them from the Worker environment. Never log a token, a cookie or
  a key.
- Errors. Return the envelope the rest of the API uses and do not leak stack
  traces or SQL to the client.
