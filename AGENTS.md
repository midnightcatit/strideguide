# AGENTS.md

Guidance for AI agents (and humans) working in this repo. Keep changes small, verified, and
consistent with what's here.

**Read first.** Before you change the engine, the schema, the AI or the writing rules, read
[SYSTEM.md](./SYSTEM.md) (the system as it is now, and its boundaries) and
[docs/decisions.md](./docs/decisions.md) (the settled choices and their why). Intentions live in
[PLAN.md](./PLAN.md); the dev/deploy flow is in [README.md](./README.md).

## Commands

```bash
pnpm install
pnpm dev                 # api (wrangler dev :8787) + web (vite :5173)
pnpm typecheck           # tsc + svelte-check across all packages
pnpm -r --if-present run test   # vitest, packages/shared only (see testing philosophy)
pnpm build               # build api + web
pnpm db:generate         # schema.ts -> migration file
pnpm db:migrate:local    # apply to local D1
pnpm db:migrate:remote   # apply to production D1
pnpm deploy:api          # wrangler deploy (apps/api)
pnpm deploy:web          # build + deploy (apps/web)
```

Scope a command to one package with `pnpm --filter @strideguide/api <script>`.

## Web retrieval

- **Use the `webfetch` tool first** for any page fetch. It is free and covers ordinary pages.
- **Reach for Firecrawl only when `webfetch` cannot do the job**: JavaScript-rendered pages, blocked or
  challenged pages, site URL discovery, multi-page crawls, or structured extraction across sources.
- **The owner is on the Firecrawl free plan**, so credits are scarce and run out. Never spend them on a
  page `webfetch` could have fetched, and expect Firecrawl calls to sometimes fail with an
  out-of-credits error. When that happens, do not retry with different parameters; fall back to
  `webfetch` or carry on without it. See PLAN.md §7.5.

## Writing (every user-facing string)

All text a person can see (app copy, generated coach output, emails, errors, empty states) must read as
human-written. Follow the `human-writing` skill (`~/.kilo/skills/human-writing/SKILL.md`). Hard rules:

- **No em dashes.** Use commas, periods, colons or parentheses. En dashes are fine only in numeric
  ranges (e.g. `4:55–5:05`). Applies to code comments too.
- **No AI tells:** no hype ("thrilled", "revolutionary", "seamless", "unlock", "empower"), no hedging
  filler, no generic transitions ("let's dive in"), no buzzwords. Be specific and plain.
- **Mono is for data, never for prose.**
- **Generated content counts.** Any prompt that produces user-visible text (coach, summaries) must
  instruct the model to follow these rules.

If you touch copy, run a quick `grep -rn "—" apps packages` before you commit; it should be empty.

## Testing philosophy — test the core, not the surface

A small, sharp suite beats a large, clunky one. Tests exist to protect behaviour, not to raise a
number.

- **Add a test only when it protects real behaviour that could regress and is hard to catch by hand.**
  In this codebase that means: the plan engine (phase/volume/taper logic), pace & zone math, VDOT and
  unit conversion, session/ledger logic, and migration/serialization edge cases.
- **Never write tests to write tests.** No tests that merely mirror the implementation, assert that
  one function calls another, snapshot markup, or cover trivial getters/wrappers/config. If you can't
  name the failure a test prevents, don't add it.
- **Coverage is not a goal.** Don't add tests just because a file lacks one.
- **Prefer pure functions.** Keep decision logic pure and I/O-free so it's cheap to test — that is why
  the plan engine lives in `packages/shared` with no runtime imports.
- **Bug fixes get exactly one regression test** — the one that would have caught that bug.
- Test files are colocated as `*.test.ts` next to the code they cover.

Core paths currently covered: the plan engine and VDOT paces (`packages/shared/src/plan/*.test.ts`).
Add to that set deliberately, not broadly.

## Workflow

- **Work in an isolated worktree, not the shared checkout.** Any task that changes files runs in its
  own working tree. An Agent Manager session gets one automatically; for a plain branch, use
  `git worktree add`. Several sessions may share one repo directory, so editing there risks colliding
  with another session's uncommitted work. `git worktree list` shows what is checked out where.
- **Stage only the files you changed.** Use `git add <path>` (or review `git status` first), never a
  blanket `git add -A` or `git commit -a`, so a stray change from a parallel session is never swept
  into your commit.
- Branch → PR → **CI gate** (install → typecheck → test → build) → merge to `main` → auto-deploy
  (path-filtered, and each deploy is chained to the gate via `needs`). See README.
- **Migrations are additive by default** and auto-apply before the API deploy. Destructive changes
  (dropping columns/tables, rewriting data) go through the manual **DB Migrate** workflow, reviewed
  first.
- **Never commit secrets.** `.dev.vars` and `session-*.md` are gitignored; production secrets live in
  Cloudflare (`wrangler secret put`). The only GitHub secret is `CLOUDFLARE_API_TOKEN`.
- Keep PRs small and single-purpose; write commit messages that say what changed and why.

## CodeRabbit review

Every PR gets a CodeRabbit review. Before merging, wait for it and clear every addressable artifact,
not just the blocking ones.

- **Wait for the review, do not merge on the CI gate alone.** After opening a PR, schedule a wakeup
  (`cron_create` or `schedule_wakeup`) and check back when CodeRabbit has posted. Do not block the
  turn or poll in a loop. The review is asynchronous and can take a few minutes.
- **Read the review yourself.** The CodeRabbit check, its summary and its "no issues" line are
  evidence, not a review. Open the review comments and read them.
- **Do not hand-fix findings in a loop.** CodeRabbit is the fixer where it can be: apply a comment's
  suggested diff verbatim (its suggestion action), or hand the comment to CodeRabbit's fix when the
  comment offers one. Verify the suggested diff first (read it, run the gate): the button applies
  what the comment proposes, right or wrong.
- **Backlog what we do not apply.** A finding with no suggestion, a fix that needs a design call, or
  one deliberately out of scope goes to `backlog/` (see backlog/README.md): one file per finding
  with the finding, the reason, and the source link. Resolve the thread with a reply that points at
  the backlog entry. Nothing addressable stays open without a backlog entry.
- **Merge only when the review is complete and cleared.** The CodeRabbit check should be green, every
  comment resolved either applied or backlogged, and the CI gate should pass. If CodeRabbit is still
  reviewing, wait for the next wakeup.
- **This applies to delegated work too.** A subagent's PR is not ready to merge until the same review
  pass is done.

## Delegation (main session)

In the main session, delegate independent, read-heavy or parallelizable work with the Agent Manager,
one session per task, each in its own worktree. The `task` tool is the fallback: if an Agent Manager
call is rejected twice in a row, use `task` instead of retrying a third time, because three invalid
attempts in a row abort the turn.

- **Start sessions with the Agent Manager.** Each task gets its own worktree and its own session.
- **Start payload.** For a start request `action` is null, `mode` is `worktree`, `versions` is false,
  and the brief goes in `tasks[].prompt`. The top-level `prompt` is only read for `action: "prompt"`.
  A task that carries `model`, `variant`, `provider` or `agent` without its own `prompt` is rejected.
- **Each delegated prompt starts with a pre-plan.** Tell the session to research and verify first,
  rework the plan when a better or more nuanced approach exists and say so, then implement, then open a
  PR. Give it the goal, the constraints, the relevant files, and the verification steps.
- **Completion is a PR, not a message.** An Agent Manager session cannot wake the coordinator, so a
  brief must not rely on a completion message. Every brief ends by telling the session to open a PR
  against `main` when it finishes or blocks, with a clear title and a one-line status in the body, and
  never to merge or deploy. The coordinator finds finished work by checking the Agent Manager list and
  open PRs, not by waiting for a push.
- **The main session reviews and releases.** The main agent reviews every session PR, requests changes
  when warranted, merges to `main`, and verifies the auto-deploy. Sessions do not merge or deploy.
- **Review means reading the code.** A green CI gate, a passing test count and the session's own
  summary are evidence, not a review. The main session reads the changed code in every subagent PR
  before merging and confirms three things: the change does what the brief asked, it does not quietly
  weaken an existing test or assertion to pass, and any claim it makes about the research or data it
  cites actually holds in the code. When a change cannot be verified by reading (a query that only
  fails at runtime, a new provider that needs a live key), say so in the PR and either verify it
  another way or leave it unmerged.
- **The local config is per machine.** `.kilo/kilo.jsonc` is local and untracked (it holds
  credentials), so its settings and permissions apply to this machine only. The Agent Manager
  permission block was removed locally, not in git.
- Everything here still applies to delegated work: an isolated worktree, scoped `git add <path>`,
  additive migrations, no em dashes, tests in `packages/shared`.

## Tool retries

A tool call can be rejected before it runs because its arguments do not match its schema. When that
happens:

- **Never resend the same shape.** The same arguments will be rejected the same way.
- **Fix it once.** Read the error, change the shape, and send it a single time.
- **If it is rejected again, switch mechanism.** Do not try a third take on the same call. Use a
  different tool, or do the step by hand.
- **Three invalid attempts in a row abort the turn.** The count does not reset between calls, so a
  retry loop can burn the whole turn. One repair is the budget.
- **Read a large file in ranges.** For a file of a thousand lines or more, read it with `sed -n 'A,Bp'`
  (or find the part you need with `grep`) rather than trusting a `read` offset, which can keep
  returning the top of the file and truncating. Retrying it is wasted effort.
- **If the same call returns the same truncated result twice, change mechanism.** This is the same
  budget as the rejection rule above, not a new one.

The old failure this guards against: a brief sent in the top-level `prompt` with `model` or `variant`
on a task and no `tasks[].prompt`, which the tool rejects. `scripts/check-am-payload.mjs` checks that
shape before a call (`pnpm check:am-payload payload.json`, or pipe a payload in as stdin).
