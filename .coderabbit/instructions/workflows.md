---
id: workflows
name: CI and workflows
paths:
  - ".github/workflows/**"
---

GitHub Actions. The gate is install, typecheck, test, build. Deploys are
path-filtered and each one is chained to the gate with `needs`.

What to check:

- A deploy job must not run without the gate. If a new job skips `needs`, that is a
  blocking finding.
- Secrets. Workflows read secrets from GitHub. Never print one, never echo an
  environment dump, and never pass a secret to a step that only needs a boolean.
- Triggers. A `pull_request_target` workflow must not check out and run untrusted
  code with secrets available.
- Permissions. Set the least `permissions:` the job needs. A new job with no
  permissions block inherits the default, which is often too broad.
- Actions. Pin a third-party action to a tag or a SHA. Do not add an action from an
  unknown owner.
