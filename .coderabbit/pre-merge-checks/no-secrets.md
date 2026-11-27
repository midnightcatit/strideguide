---
id: no-secrets
name: No secrets in the diff
mode: error
---

Secrets live in Cloudflare (`wrangler secret put`) and in GitHub Actions
secrets. They never go in the repo. `.dev.vars`, `.env` and
`.kilo/kilo.jsonc` are local and gitignored.

Fail when an added line contains a credential, a private key, a bearer token, an
API key, a session signing secret or a `.dev.vars` value. Fail on a hardcoded
password or a Cloudflare API token, even in a comment or a test fixture.

Pass on a reference to a secret by name, an example value that is obviously fake
and labelled as such, or a local-only file that is gitignored.
