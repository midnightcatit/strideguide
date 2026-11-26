# Stride Guide — Build Plan

A goal-tailored training app for two runners, hosted free on Cloudflare at `run.midnightcatit.com`.
Blend of Runna (goal-driven, tailored plans) with strength training for the Planet Fitness machines,
plus a research-backed "why" layer for every workout and exercise.

> Status: **APPROVED — EXECUTING.** Research waves and the M0 scaffold are underway (see §19).
> This document captures every decision from the six-phase planning session.

---

## 0. How to read this

- Sections 1–5 are the **product** (what it is, who it's for, what it does).
- Sections 6–8 are the **brain** (AI, research program, data model).
- Sections 9–12 are the **build** (stack, design, infra).
- Sections 13–16 are the **reality check** (cost, risks, roadmap, prerequisites).
- Section 17 is the **decision log** — every choice, traceable.
- Section 18 is the **appendix** (Planet Fitness machines, glossary).

Subagents are used throughout the build, not just the research phase — see §7.6.

---

## 1. Vision

Runna adapts a training plan to a goal, but it's a black box and a subscription. Stride Guide does the
same job, tailored to **one couple**, and adds what Runna doesn't: every session and every machine comes
with a **researched explanation** of why it exists, what it trains, where you should feel it, and how it
serves *your* specific goal — written in a sports-scientist voice, cited, and expandable.

It is:
- **Goal-tailored** — Marathon, Half, 10K, 5K, or whole-fitness/health, each a profile.
- **Strength-integrated** — Planet Fitness machines are a first-class modality, logged set/reps/weight.
- **AI-native, but cheap** — AI generates plans and narration on events, stores the results, and serves
  stored content so runtime is effectively free and works offline.
- **Persistent and personal** — accounts, plans, logs, and progress stored in a real database.
- **Mobile-first** — an installable PWA usable at the gym and on the laptop, offline-capable.

---

## 2. Audience, goals, non-goals

**Audience (v1):** the two of you. **Auth:** Google sign-in. **Near-future:** a small friends/family
group, all authenticating with Google, via the same user model.

**Goals (v1 succeeds if):**
- A plan for a chosen goal is generated and adapts to missed sessions and manually-entered results.
- You can run a session from your phone at the gym, log runs and machine sets, and see adherence.
- Every session/machine explains its purpose with a short summary and an expandable cited deep-dive.
- It costs ~$0 recurring and survives offline.

**Non-goals (v1):**
- No native iOS/Android app, no watch/Garmin integration, no app-store distribution.
- No live background GPS tracking (manual entry now; device APIs later).
- No public sign-ups, no social graph, no marketplace. No marketing site.
- No medical advice; the app is a training aid, not a clinician.

---

## 3. Core domain model

```
User
 └─ UserGoal (picks a GoalProfile + target date + baseline + available days)
     └─ Plan (versioned, generated per event)
         └─ PlanWeek (has a narrative summary)
             └─ Session (run OR strength; carries prescription + explanation)
                 └─ Log (what actually happened: manual now, device later)
```

Cross-cutting:
- **Exercise library** — reference entries (esp. the 8 PF machines) with form, muscles, purpose.
- **Research sources** — the citation layer behind every explanation.
- **Explanations** — two tiers (summary + full/cited), attached to sessions, exercises, topics.
- **Sharing** — opt-in, per-user grants.

---

## 4. Goal Profiles — the engine's contract

One engine, many profiles. A profile declares:

- `slug`, `name`, `description`
- `modality_mix` — emphasis across **running**, **strength**, **mobility**, **recovery/cross-train**.
- `progression_rules` — weekly volume/intensity progression, deload cadence, taper.
- `success_metrics` — what the plan optimizes (race time, weekly volume, consistency, strength PRs).
- `required_inputs` — baseline (recent times, current weekly mileage, experience), days available.
- `session_types` — which session archetypes this profile uses.

Built-in v1 profiles: **Marathon, Half Marathon, 10K, 5K, Whole-fitness/health.**
Every endurance profile includes running **and** strength by construction (strength = injury prevention +
running economy); the profile tunes the ratio. Adding a profile later is data, not new code.

---

## 5. Feature specification (v1)

Priority: **P0** = required for v1 to be usable · **P1** = expected · **P2** = nice-to-have.

### 5.1 Plan generation + calendar — P0
- Onboarding: pick goal profile, target date, baseline, available days, equipment (PF machines known).
- Engine builds a versioned plan; AI writes session titles, purpose lines, and week summaries.
- Calendar: mobile week strip + scrollable timeline. Today's session is the hero.

### 5.2 Workout logging — P0
- **Runs:** distance, duration, avg pace, avg HR, split notes, perceived effort, notes.
- **Strength:** per-machine entry — sets × reps × weight, RPE, notes. Progression tracked over weeks.
- Prescribed-vs-actual view per session.

### 5.3 Research-backed library — P0
- Every session type and every PF machine has: purpose, targeted muscles/systems, "where you should
  feel it," and how it serves the active goal.
- **Two-tier:** inline "solid, lightly cited" summary + **"Read more"** deep, fully cited version.
- Voice: sports-scientist. Every claim traceable to a stored source.

### 5.4 Progress & analytics — P1
- Adherence, weekly volume, pace/HR trends, strength PRs, streak, prescribed-vs-actual deltas.

### 5.5 AI surfaces — P1
- Per-workout explanation (stored). Narrative weekly summaries (cron). Adaptive plan changes. Coach chat.
- **Configurable adaptation**: the runner chooses manual (adapt on tap, the default) or automatic (adapt
  nightly). The choice lives in `settings.prefs` and is what decides who the nightly adaptation queue
  contains. See §6.6.

### 5.6 Shared view (opt-in) — P1
- Independent accounts by default. Opt-in grants to see each other's calendar/progress.

### 5.7 Nutrition / sleep / recovery — P2
- Light logging + researched guidance tied to goals. Deferred depth; module scaffolded in v1.

### 5.8 Device stat import — P2 (deferred, explicit non-goal for v1)
- Manual entry ships in v1. Device APIs (Apple/Health Connect/ring) and any file import come **later**.

---

## 6. AI architecture

### 6.1 Model router (Cloudflare first, OpenRouter fallback)
1. Try **Cloudflare Workers AI** binding (`env.AI`) with a capable instruct model.
2. On error / rate limit / timeout → fall back to **OpenRouter** (cheap DeepSeek-class model).
3. On both failing → serve last-good/cached content or degrade gracefully (never a blank screen).
4. Record every call in `ai_jobs` (model used, tokens in/out, latency, error) for cost visibility.

### 6.2 Generate-on-event, then store (the cost lever)
AI runs only on **events**: new goal, week rollover, custom content added, missed/moved sessions,
nightly summary, manual refresh. Output is stored in D1 and read at runtime. An **`ai_cache`** table with
a deterministic key prevents re-billing identical asks (e.g., the same machine explanation).

### 6.3 Cron jobs (Cloudflare Cron Triggers, free)
- **Nightly:** generate the day's/week's narrative summary; evaluate adaptive adjustments.
- **Weekly:** plan review (missed sessions, load), regenerate what changed.
- **Tiered research refresh:** core science ~6 months; fast-moving items ~3 months; plus a manual
  "refresh now" trigger. See §7.4.

### 6.4 Coach chat (live)
In-app Q&A uses the same router per message. Grounded in the user's own plan/logs plus the KB.

### 6.5 Guardrails
Per-job token budgets, a daily spend cap, aggressive caching, and full logging. Content is generated
against the stored KB so answers cite real sources rather than free-associating.

### 6.6 Adaptation mode and the nightly queue

Adaptation is the one place the plan changes after it is built, so it is a preference the runner sets,
not a surprise. This section is designed here and not yet built (see the execution log).

**Two modes, one engine.** The runner picks a mode in **Settings > Plan**, stored as data in
`settings.prefs.adaptMode` (`manual` is the default, or `auto`). Both modes run the same deterministic,
instant `adaptPlan` used today: it rebuilds only the weeks that have not started, seeded with real recent
volume and a recent hard effort, and swaps a quality kind the runner rated down for one they rated up
where the phase allows. No AI is in the path, so neither mode can hang or bill.

- **Manual (default):** the plan changes only when the runner taps **Adapt my plan** on the
  suggested-adjustments card. Nothing runs in the background.
- **Automatic:** the runner opts in to let the plan adapt on its own. Only `auto` users are placed in the
  nightly queue.

**The nightly queue.** A Cloudflare Cron Trigger (free, alongside the nightly and weekly jobs in §6.3)
selects users whose `settings.prefs.adaptMode` is `auto`, then applies the same eligibility rules the
one-tap path uses, so automatic never means unguarded:

- **New signal required.** Skip unless there is enough new logged work since the last adaptation (a
  minimum count of new logs in the window). A quiet week changes nothing.
- **Bounded change.** Only weeks that have not started are touched, volume stays within the ~10 percent
  weekly ceiling, and the number of sessions and training days never changes. Past weeks, logs and
  session state are untouched.
- **Cooldown.** At most one automatic adaptation per rolling window (for example seven days), so a plan
  cannot thrash.
- **Visible and reversible.** Each automatic run records what changed (`plan_adaptations`: when, from
  which week, what swapped) and shows a note on Today (for example, "your plan adapted last night: two
  sessions swapped"). The runner can **revert** to the prior upcoming weeks, kept with the previous
  `plans.version`.
- **Never on a taper.** The closing weeks before a target date are left alone.

**Membership is the switch.** Whether a runner is in the queue is exactly whether their mode is `auto`
and they have new signal, so there is no separate list to maintain. Setting the mode back to `manual`
removes them from the next run.

**Data over code.** Mode, a notification preference (quiet or notify) and the cooldown live in
`settings.prefs`, not new columns. The adaptation record (`plan_adaptations`) is the only new table, and
it exists to audit what the queue did.

**Why later, not now.** v1 ships manual only, with a clear notice that the plan is never changed without
a tap. Automatic waits until the mode switch, the record and revert all exist, so an automatic change is
always something the runner asked for and can undo.

---

## 7. Research & content program

This is what makes Stride Guide "not just Runna." It runs as **execution**, after plan approval, using
**up to 30 internal `task` subagents** dispatched in parallel waves (not Kilo Agent Manager; I spawn them,
they research in parallel, and I consolidate). Output is a structured, cited knowledge base stored in D1.

### 7.1 Source rigor — **peer-reviewed first**
Primary: meta-analyses, systematic reviews, RCTs in sports/exercise science. Secondary: position stands
(ACSM etc.), well-regarded coaching sources, sports-medicine guidance. Every claim maps to a stored
`research_sources` row (title, authors, year, venue, type, DOI/URL, retrieved date).

### 7.2 Subagent workstreams (each 2–3 subagents; ~24–30 total)

| # | Workstream | What it produces |
|---|---|---|
| 1 | Running physiology & principles | Base/periodization, polarized vs pyramidal, zone models (HR/RPE/VDOT) |
| 2 | Workout-type mechanics | Easy, tempo, interval, long run, strides, hills: purpose, pacing, feel |
| 3 | Strength for runners | Curated exercises, running economy, injury prevention, programming |
| 4 | Planet Fitness machines | The 8 machines: form, muscles, mistakes, how to program them |
| 5 | Marathon specifics | Pacing, long-run progression, taper, race-day, fueling/hydration |
| 6 | 5K/10K/Half specifics | Distance-specific blocks, workouts, pacing |
| 7 | Whole-fitness/health | General health programming balancing cardio + strength |
| 8 | Mobility & recovery | Warm-up, cooldown, stretching, recovery modalities, strength-endurance |
| 9 | Nutrition / sleep / recovery | Fueling, sleep, recovery guidance tied to training |
| 10 | Injury prevention / load mgmt | Red flags, load progression, when to back off (with disclaimers) |
| 11 | Adaptive-planning best practice | How real coaches adjust for missed sessions, illness, travel |
| 12 | Pacing/zone tools | VDOT tables, HR zone math, RPE anchors — encoded as data |

**Waves:**
- **Wave 1 (foundation):** 1, 2, 11, 3
- **Wave 2 (goal-specific):** 4, 5, 6, 7
- **Wave 3 (supporting):** 8, 9, 10, 12

Each subagent returns **structured JSON** (topic → claim → evidence → citation), which I consolidate into
seeded `exercises`, `explanations`, and `research_sources` rows. Anything unverifiable is flagged, not
published as fact.

### 7.3 Two-tier content (per decision)
- **Tier A (inline):** 2–4 sentences, plain, sports-scientist voice, one or two key citations.
- **Tier B ("Read more"):** deep, multi-paragraph, fully cited, with the evidence chain.

### 7.4 Refresh cadence
Core science refreshes ~every 6 months; fast-moving items (pacing tables, nutrition guidelines) ~every 3
months; manual refresh always available. Versioned via `knowledge_base_versions` so a refresh is auditable
and reversible.

### 7.5 Tools & retrieval policy
**Retrieval order: WebFetch first, Firecrawl as fallback.** Firecrawl is on the **free tier**, so agents
try a plain page fetch first and only reach for Firecrawl when a page needs JS rendering, is blocked, or a
fetch fails/challenges. Batch the cheap WebFetch calls; reserve Firecrawl for what WebFetch can't get.
This applies to all web retrieval (research, refreshes, and any in-app live fetch). Cheap model for
consolidation. Research is a **one-time token cost**, then stored — it never re-bills at runtime.

### 7.6 Subagents everywhere — not just research
Subagents are encouraged across the **whole build**. Any task that is parallelizable, independent and
read-heavy is delegated rather than done serially. Prefer the Kilo Code **Agent Manager** (one session
per task, its own worktree); fall back to the dispatched `task` subagents when Agent Manager is not in
use. **Hard rule:** a delegated prompt carries a pre-plan (research and verify, rework the plan if there
is a better way, then implement, then open a PR), and the main session reviews every PR and is the only
one that merges and deploys.

| Phase | Where subagents are used |
|---|---|
| Research (M3) | The 12 workstreams above, in 3 waves (up to ~24) |
| M0 Scaffold | Verify Cloudflare / Google OAuth config against docs; survey SvelteKit + Hono + Drizzle-on-Workers patterns |
| M1 Plan core | Explore training-programming references feeding the engine; draft goal-profile parameter sets |
| M2 Logging | Investigate offline-sync patterns (service worker + IndexedDB); FIT/GPX parsing research |
| Design | Parallel exploration of session-card and layout variants, each returning a token proposal |
| M4 Intelligence | Compare Cron / Workers AI / OpenRouter patterns; draft prompt templates; evaluate routing strategies |
| Cross-cutting | Code-review passes, OAuth security review, accessibility audit, test authoring |

Budget: **up to 30 subagents across the whole effort**, dispatched in parallel waves, so independent work
never blocks on serial execution.

---

## 8. Data model (D1 / SQLite via Drizzle)

| Table | Purpose |
|---|---|
| `users` | id, email, google_sub, name, avatar_url, created_at |
| `sessions` | auth sessions: id, user_id, token_hash, expires_at, created_at |
| `goal_profiles` | slug, name, modality_mix, progression_rules, success_metrics (built-in + custom) |
| `user_goals` | user_id, goal_profile_id, target_date, baseline, available_days, status |
| `plans` | user_goal_id, version, generated_at, model, params, status |
| `plan_weeks` | plan_id, week_number, focus, summary_text, start/end date |
| `sessions_plan` | plan_week_id, day, slot, modality, type, title, prescription (JSON), duration, explanation_id |
| `exercises` | name, modality, machine, muscle_groups, form_notes, purpose, why_full, research_refs |
| `logs` | user_id, session_id, timestamps, run_stats (JSON), strength_sets (JSON), rpe, notes, source |
| `research_sources` | title, authors, year, venue, type, doi/url, retrieved_at |
| `explanations` | scope (session/exercise/topic), ref_id, summary, full, citation_ids, model, kb_version |
| `ai_jobs` | type, status, model_used, tokens_in/out, latency, error, timestamps |
| `ai_cache` | cache_key, response, model, ttl, created_at |
| `shares` | owner_user_id, viewer_user_id, scope, status |
| `nutrition_logs` / `sleep_logs` / `recovery_logs` | user_id, date, data (JSON), notes |
| `knowledge_base_versions` | tier, generated_at, refreshed_by, notes |
| `settings` | user_id, prefs (JSON) |

Indexes on `user_id`, `plan_id`, `session_id`, and `ai_cache.cache_key`. D1's free tier (5 GB, 5M row
reads/day, 100k writes/day) is orders of magnitude beyond what two users need.

---

## 9. Technical architecture

- **Frontend:** **SvelteKit** (PWA, offline-first), deployed as static assets to Cloudflare. Adaptive
  theming, installable to the home screen.
- **Backend:** **Hono on Workers** — API routes, auth handling, D1 access, AI router, cron handlers.
- **Data:** **D1 + Drizzle ORM** with migrations; typed schema; seed scripts for KB content.
- **Styling:** **Tailwind + our own design tokens** (see §11). Tokens defined once, consumed everywhere.
- **Offline:** service worker + IndexedDB. Load today's session and log offline; sync on reconnect
  (last-write-wins with per-record conflict notes).
- **AI:** Workers AI binding (primary) + OpenRouter (fallback), cron triggers, `ai_cache`.
- **Auth:** own Google OAuth + D1-backed sessions (httpOnly, secure cookies).

Sketch:

```
run.midnightcatit.com  →  SvelteKit app (static assets)  ─┐
                                                          ├─ Hono Worker API  → D1 (Drizzle)
PWA service worker ⇄ IndexedDB (offline queue) ───────────┘         │
                                                                    ├─ Workers AI (primary)
                                                                    ├─ OpenRouter (fallback)
                                                                    └─ Cron Triggers (summaries, refresh)
```

---

## 10. Auth & sharing

- **Google OAuth** flow → verify ID token → upsert `users` → issue session cookie stored in `sessions`.
- Because we own auth, **opt-in sharing** is native: a `shares` row lets one user grant another
  read access to their calendar/progress. Default is private.
- Security owned by us: httpOnly + Secure + SameSite cookies, short-lived sessions with rotation,
  CSRF protection on mutations, and input validation at the Hono layer.

---

## 11. Design system (frontend-design skill applied)

**World:** precision instrument **+** field notebook, with a tinge of training journal.
**Theme:** adaptive (system/time of day), both themes first-class.
**Color:** paper+ink crossed with cool technical.
**Type:** grotesque for display/prose, **mono for all data**.
**Signature:** **the session card.** Boldness spent there; everything else quiet.

### 11.1 Tokens

Color (light / dark):

| Token | Light | Dark | Role |
|---|---|---|---|
| `paper` | `#F4F5F2` | `#101318` | base surface (cool off-white / night) |
| `ink` | `#191C22` | `#E9EAE6` | primary text |
| `steel` | `#5A6473` | `#98A0AE` | secondary text, labels |
| `hairline` | `#D8DBD6` | `#2A2F38` | grid lines, dividers, tick marks |
| `signal` | `#E8A33D` | `#F2B451` | the one accent (instrument needle / amber) |

Rationale: amber-on-cool-steel is the **one risk** — it reads as an analog gauge needle, not the
acid-green/vermilion default and not the cream/terracotta default.

Type:
- **Display:** Space Grotesk (characterful, restrained).
- **Body:** IBM Plex Sans (technical pedigree, high legibility).
- **Data:** IBM Plex Mono with **tabular numerals** for pace, splits, reps, weight, HR.

Scale: `12 / 14 / 16 / 20 / 24 / 32 / 44`, weight steps `400 / 500 / 700`.

### 11.2 Signature — the session card

A single card that encodes, at a glance: goal tag, modality, workout type, the target (pace/zone or
sets×reps×weight), duration, a one-line purpose, and a tap-to-expand why-panel. Hairline tick marks
along an edge nod to the instrument world; mono numerals carry the data.

```
┌───────────────────────────────────────────────┐
│ MARATHON · W5          TEMPO              │╲   │   ← modality edge tick
│ ────────────────────────────────────────────── │
│ 6.0 km           ▓▓▓▓▓░  prescribed          │
│ 30:00            ▓▓▓▓░░  logged              │
│ ────────────────────────────────────────────── │
│ 4:55–5:05 /km    @ RPE 6–7                    │
│                                               │
│ Builds lactate clearance so goal pace feels   │
│ easier. You should feel "comfortably hard."   │
│ [ Read more ▾ ]                               │
└───────────────────────────────────────────────┘
```

### 11.3 Layout concept (mobile-first)

```
TODAY
┌───────────────────────────────┐
│  Stride Guide        ◐ theme │
├───────────────────────────────┤
│ M  T  W  T  F  S  S          │   ← week strip (today ringed)
├───────────────────────────────┤
│ [ SESSION CARD ]             │   ← hero
├───────────────────────────────┤
│ Log it        ▸              │
│ Why this?     ▸              │
│ Week so far   ▸              │
├───────────────────────────────┤
│ ⋯ timeline thread below      │   ← training journal spine
└───────────────────────────────┘
```

### 11.4 Motion, a11y, quality floor
- Motion: deliberate and minimal — one orchestrated moment (session-card load), quiet micro-interactions
  elsewhere; `prefers-reduced-motion` respected.
- Accessibility: keyboard focus visible, AA contrast on both themes (amber checked against `paper`),
  tap targets ≥44px, mono numerals still legible at 12px.
- Responsive down to mobile; laptop layout widens the calendar into a week grid.

### 11.5 Self-critique (per skill)
Avoids all three AI-default looks: not cream+serif+terracotta, not near-black+acid accent, not
broadsheet hairlines-only. The risk is amber-as-instrument-needle; if it reads as a generic accent in
build, revise rather than keep.

---

## 12. Infrastructure & delivery

- **Repo:** **monorepo** (pnpm workspaces) — `apps/web` (SvelteKit) + `apps/api` (Hono Worker) +
  `packages/shared` (types, Drizzle schema, tokens). **Owner: the GitHub account `midnightcatit`**,
  created and managed via the **GitHub MCP** (not the `gh` CLI). See §12.2 for the CLI fallback.
- **Hosting:** `run.midnightcatit.com`. Clean PWA scope, independent of the existing `midnightcatit`
  Worker that serves the apex. DNS via Cloudflare.
- **Deploy:** **GitHub + CI on push** (Workers Builds or a GitHub Action). I can drive deploys via the
  Cloudflare MCP too.
- **Environments:** **local + prod** only.
- **Secrets:** never typed into chat, never committed. Exact placement in **§12.1** — local values live in
  `apps/api/.dev.vars` (gitignored); production values go through `wrangler secret put` or the dashboard.
- **Marketing:** none in v1.

### 12.1 Secrets — where each value goes

| Secret | Local (dev) | Production | Sensitivity |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | `apps/api/.dev.vars` | `wrangler secret put GOOGLE_CLIENT_ID` | low (public id) |
| `GOOGLE_CLIENT_SECRET` | `apps/api/.dev.vars` | `wrangler secret put GOOGLE_CLIENT_SECRET` | **high** |
| `SESSION_SECRET` | `apps/api/.dev.vars` | `wrangler secret put SESSION_SECRET` | **high** |
| `OPENROUTER_API_KEY` | `apps/api/.dev.vars` | `wrangler secret put OPENROUTER_API_KEY` | **high** |
| `TYPESAFE_API_KEY` | `apps/api/.dev.vars` | `wrangler secret put TYPESAFE_API_KEY` | **high** (optional) |

`TYPESAFE_API_KEY` is the TypeSafe AI key for the Jev typed-decision model, used by the coach
safety classifier. It is optional: with it unset the classifier is skipped and the coach answers
normally, so the app runs unchanged without it. Get a key at <https://console.typesafe.ai/keys>.

**Local setup (step by step):**
1. I create a committed template `apps/api/.dev.vars.example` listing the five names with empty values.
2. Copy it: `cp apps/api/.dev.vars.example apps/api/.dev.vars`.
3. Open `apps/api/.dev.vars` **in your editor** and paste each value after its `=`. Do not paste these
   into chat. The file is in `.gitignore` and must never be committed.
4. Run locally: `pnpm dev` — Wrangler loads `.dev.vars` automatically.

**Production setup (step by step):**
1. `cd apps/api`
2. `wrangler secret put GOOGLE_CLIENT_ID` — paste when prompted. Repeat for
   `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `OPENROUTER_API_KEY`, `TYPESAFE_API_KEY`.
3. Alternative: Cloudflare dashboard → Workers & Pages → the API Worker → Settings → Variables → Secrets.
4. Verify: `wrangler secret list` (shows names only, never values).
5. Generate `SESSION_SECRET` yourself: `openssl rand -base64 32` (run it locally; keep the output off-chat).

**Rule for any agent (human or AI) helping with this:** values are entered only by the human, only into
`.dev.vars` (local) or via `wrangler secret put` / the dashboard (prod). Never request, echo, or print a
secret value in a conversation.

### 12.2 GitHub account — MCP-first, CLI fallback

**Primary:** all repo creation, file pushes, pull requests, and reviews go through the **GitHub MCP**,
authenticated as **`midnightcatit`**. Agents should use the MCP for this project.

**Fallback (only if the MCP is unavailable and an agent needs the CLI):** switch the `gh` CLI to the
`midnightcatit` account:
1. `gh auth login --hostname github.com --git-protocol https --web` — in the browser, sign in as **`midnightcatit`**.
2. `gh auth status` — confirm both accounts are listed.
3. `gh auth switch --user midnightcatit` — make it active.
4. `gh auth setup-git` — point git's credential helper at it.
5. Verify: `gh api user --jq .login` prints `midnightcatit`.
   To revert later: `gh auth switch --user sagyakwa`.

Note: the `midnightcatit` account is brand new (0 repos); finish its email/2FA setup first so
`gh auth login --web` succeeds.

---

## 13. Cost model

| Item | Cost | Notes |
|---|---|---|
| Domain | owned | already paid |
| Workers / static assets | $0 | 100k req/day free; far under |
| D1 | $0 | 5 GB, 5M reads/day free |
| Workers AI | $0 | free daily neuron allotment (primary model) |
| OpenRouter (fallback) | ~pennies/mo | cheap DeepSeek-class; cached, event-driven |
| Cron Triggers | $0 | free |
| R2 (later, media) | $0 when used | 10 GB free; must be enabled in dashboard |
| **Total recurring** | **~$0–$1/mo** | effectively $0 for two users |

One-time costs: research token spend (run once, stored) and your build time.

---

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Own-auth security | Standard OAuth hardening; httpOnly/CSRF; session rotation; review before launch |
| AI cost creep | Event-driven + cache; daily spend cap; token logging; CF AI primary |
| Research quality / hallucination | Peer-reviewed sources; structured claim→citation; flag unverifiable; versioned KB |
| Offline sync conflicts | Last-write-wins + per-record conflict notes; explicit sync UI |
| Sports-science nuance (zones, injury) | Zone/RPE models from cited sources; injury content carries disclaimers, never diagnosis |
| PWA iOS limits (background GPS) | Out of scope; manual entry + device APIs later |
| D1 write limits | Irrelevant at 2 users; monitor via `ai_jobs`/logs |
| Scope creep (P2 modules) | Strict P0→P1→P2 ordering; P2 deferred |

---

## 15. Roadmap & milestones

- **M0 — Scaffold:** monorepo, CI, D1 + Drizzle migrations, Hono skeleton, SvelteKit skeleton, deploy
  skeleton to `run.midnightcatit.com`, Google OAuth working. *(Subagents: verify Cloudflare/OAuth config, survey stack patterns.)*
- **M1 — Plan core:** goal profiles, engine, AI narration, calendar, session card UI. *(Subagents: training-programming references, profile parameter sets.)*
- **M2 — Logging + offline:** run stats, machine sets/reps/weight, PWA offline queue + sync. *(Subagents: offline-sync and parsing research.)*
- **M3 — Research layer:** run the subagent waves; seed KB; two-tier explanations; library; why-panels.
- **M4 — Intelligence:** progress/analytics, cron summaries, coach chat, AI router + cache + budgets. *(Subagents: routing/prompt pattern comparison.)*
- **M5 — Social + extras:** opt-in sharing, nutrition/sleep/recovery scaffold, adaptive adjustments.
- **M6 — Later:** device API imports (Apple / Health Connect / ring).

Research (M3) runs **in parallel** with M0–M2 once approved. Subagents are used throughout every
milestone (see §7.6) for parallel research, exploration, and review — up to 30 in total.

---

## 16. Prerequisites — what you need to connect

### Must-have before M0
1. **GitHub** — a repo for the monorepo under the **`midnightcatit`** account, created via the connected
   **GitHub MCP**. Do not use the `sagyakwa` CLI account for this project. (If the MCP is unavailable,
   the CLI fallback steps are in §12.2.) This is for the repo + CI-on-push.
2. **Google Cloud OAuth client** (the one thing people forget): a Google Cloud project + OAuth consent
   screen + OAuth **Client ID + Secret**, with redirect URI
   `https://run.midnightcatit.com/auth/google/callback` (and a localhost one for dev). I cannot create
   this for you — it's tied to your Google account.
3. **OpenRouter** — an **API key** (fallback model). Stored as a Worker secret.
4. **Cloudflare** — mostly done: MCP is now correctly authorized to
   `Samuelagyen@gmail.com's Account` (`3f513e4b…`). We still need to: **enable R2** in the dashboard
   (not required for v1, needed for M6), and confirm the token can create **D1**, **Workers**, and
   **DNS** records for the subdomain. Workers AI is free but must be enabled on the account.
5. **Local toolchain** — ✓ installed (Node 22, pnpm, wrangler, git, `gh`).

### Already connected
- **Cloudflare MCP** (re-authorized to the right account) — hosting, D1, DNS, deploys.
- **GitHub MCP** — authenticated as `midnightcatit`; repos, pushes, PRs.
- **Firecrawl MCP** — research retrieval.
- **Local toolchain** — Node 22, pnpm 12, wrangler 4, git, `gh` all present (gh CLI active account: `midnightcatit`).

### Generate during setup (I'll produce, you approve)
- `SESSION_SECRET`, D1 database, DNS record for `run.midnightcatit.com`, Worker secrets.

---

## 17. Decision log

| Decision | Choice |
|---|---|
| Folder / name | `strideguide` / "Stride Guide" |
| Audience | Two now, small Google-authed group later |
| Training scope | Goal-tailored; running + strength core |
| Goal model | Profiles per goal, one engine |
| V1 modules | All (import deferred; nutrition/sleep/recovery light) |
| Data input | Manual now, device APIs later |
| Plan engine | AI-native: generate-on-event + stored + cron + live chat |
| AI routing | Cloudflare Workers AI first, OpenRouter fallback |
| Sharing | Separate accounts, opt-in share |
| Research rigor | Peer-reviewed first |
| Research depth | Two-tier (summary + cited "read more") |
| Research method | Baked in now + tiered cron refresh (6mo core / 3mo fast-moving) |
| Research coverage | Runs, machines, mobility, nutrition/sleep/recovery, race strategy |
| Content voice | Sports-scientist |
| Frontend | SvelteKit |
| Backend | Hono on Workers |
| Data layer | D1 + Drizzle |
| Styling | Tailwind + custom tokens |
| Auth | Own Google OAuth + D1 sessions |
| Design world | Precision instrument + field notebook + tinge of journal |
| Theme | Adaptive |
| Color | Paper+ink × cool technical (amber instrument accent) |
| Type | Grotesque display/body + mono data |
| Signature | The session card |
| Repo | Monorepo (pnpm workspaces) |
| GitHub owner | `midnightcatit` account, MCP-first (CLI fallback: §12.2) |
| Web retrieval | WebFetch first, Firecrawl fallback (free tier) |
| Domain | `run.midnightcatit.com` |
| Deploy | GitHub + CI on push |
| Environments | Local + prod |
| Marketing | None in v1 |
| Research subagents | Up to 30 internal `task` subagents, parallel waves |
| Subagent policy | Encouraged everywhere appropriate — research, exploration, review, design, content; may not decide architecture or merge code |
| Adaptation mode | Runner-set, manual (default) or automatic; only automatic users join the nightly adaptation queue, with new-signal, cooldown, record and revert guards (§6.6) |

---

## 18. Appendix

### A. Planet Fitness machines (known at our location)
Seated row · Leg curl · Leg extension · Tricep extension · Leg press · Bicep curl · Back extension ·
Shoulder press.

(Account for these explicitly; also reference machines generally available at Planet Fitness when a plan
needs something not on this list, flagging that availability varies.)

### B. Glossary
- **Goal Profile** — a goal's definition (mix, progression, metrics).
- **Modality** — running / strength / mobility / recovery.
- **Session archetype** — e.g., easy, tempo, interval, long, machine circuit.
- **Two-tier explanation** — inline summary + expandable cited deep-dive.
- **KB** — knowledge base (seeded, versioned research content).

---

## 19. Execution log

### M0 — Scaffold (done, locally verified)

Monorepo built and green end-to-end:

- **Structure:** `apps/api` (Hono Worker), `apps/web` (SvelteKit PWA), `packages/shared`
  (Drizzle schema, domain types, design tokens, goal profiles). pnpm workspaces.
- **Data:** D1 + Drizzle schema (19 tables), migration `apps/api/drizzle/0000_*.sql` generated and
  applied to local D1 (39 statements). Seed run.
- **Auth:** own Google OAuth (server-side code flow, `state` + `nonce`, JWKS ID-token verification via
  `jose`), HS256 session cookie (signed with `SESSION_SECRET`), D1 `auth_sessions` ledger.
- **AI:** router Worker → Workers AI (primary) → OpenRouter (fallback), plus `ai_cache` + `ai_jobs`.
- **Web:** installable PWA with service worker, adaptive theme, and the signature session card.
- **Verified:** `pnpm -r typecheck` (0 errors/warnings), `pnpm build` (web + api), local D1 apply +
  seed, live `wrangler dev` smoke tests — `/api/health` 200, protected routes 401, `/auth/google` 302
  with the correct registered redirect URI and dev cookie, and Vite proxy of `/api` + `/auth` to `:8787`.
- **CI:** GitHub Action on push/PR (install → typecheck → build).

**Execution notes / deviations from plan:**

1. **Stack versions reconciled via live survey** — Hono 4.13.20, Drizzle 0.45.4 / drizzle-kit 0.31.11,
   Wrangler 4.166.0, zod 4.6.7, jose 6.2.18.
2. **SvelteKit version disputed** — a survey claimed SvelteKit 3 removes `svelte.config.js` and `$lib`.
   The scaffold pins a **known-good SvelteKit 2 + Svelte 5 + Tailwind 4** combo and verified it builds;
   revisit the SvelteKit 3 claim before upgrading.
3. **Drizzle migrations are flat** (`drizzle/0000_*.sql`), not nested — the roundtrip used
   `migrations_dir: "drizzle"` only.
4. **Workers AI `remote: true` requires a Cloudflare API token**, which broke `wrangler dev` in this
   non-interactive environment. Dev therefore runs `--local` and AI falls back to OpenRouter locally.
   Set `remote: true` (or provide a token) once Cloudflare auth is available.
5. **OAuth redirect base comes from `APP_ORIGIN`**, not the request origin: Wrangler dev rewrites the
   request host to the configured route, which otherwise produced an unregistered redirect URI.
6. **Dev vars** are injected via the `dev` script: `APP_ORIGIN=http://localhost:8787`,
   `WEB_ORIGIN=http://localhost:5173`.

### Security hardening (post-review)

An M0 security review (`research/surveys/m0-security-review.json`, 18 findings) was run by a
subagent and the high/medium issues are fixed:

- **Session revocation (M0-SEC-01/02):** `requireAuth` now looks up the `auth_sessions` ledger by
  token hash and rejects absent/expired/revoked rows; `revoked_at` added; logout revokes the row and
  the web client now calls the real `/auth/logout` (no swallowed errors).
- **CSRF (M0-SEC-03):** Origin allowlist middleware on all state-changing routes; verified 403 on
  missing/foreign Origin.
- **CORS (M0-SEC-05):** localhost origins allowed only when `ENVIRONMENT !== 'production'`.
- **Claims/algorithms (M0-SEC-07/08/10):** `email_verified` enforced; Google ID token pinned to
  `RS256`; session JWT pinned to `HS256`; `SESSION_SECRET` must be ≥32 bytes; verification failures
  return 400 not 500.
- **Nonce/state (M0-SEC-09):** non-empty nonce required; constant-time compare.
- **Cookies/lifetime (M0-SEC-04/11):** 14-day sessions and `__Host-` cookie prefix with `Secure`
  driven by `ENVIRONMENT`.
- **Abuse + prompts (M0-SEC-06/15):** D1 fixed-window rate limits on `/auth/*` (per IP) and
  `/api/ai/chat` (per user); client context treated as untrusted data, length-capped.
- **Hygiene (M0-SEC-13/16/18):** generic OAuth errors; SHA-256 cache key; error logs carry a
  correlation id, not raw errors.

Deferred (documented, not blocking): sliding session rotation, dedicated regression tests for the
revocation path, and moving AI grounding fully server-side (`M4`).

### Research — Waves 1–3 (complete)

All 24 workstream files landed (8 per wave), plus 3 stack surveys and an M0 security review — **469
cited claims, 361 unique sources** (deduplicated by DOI), from ~28 subagents.

Consolidated into the knowledge base via `pnpm research:consolidate` →
`apps/api/seed/seed-research.sql` (361 `research_sources` + 24 `explanations` rows), applied to local
D1 and verified.

Cross-cutting findings that shape the engine and plan content:

- The **10% weekly rule** has weak support (failed its only novice RCT). Prefer avoiding single-session
  distance spikes >10% of the longest run in the past 30 days.
- **Polarized vs pyramidal** are broadly equivalent in aggregate; the better choice is level-dependent.
- **Strength → running economy** is well-supported; runner-specific injury-prevention evidence is weaker.
- **ACWR** is contested (mathematical coupling) — use as a trend indicator, not a threshold.
- Zone cutoffs are conventions, not validated boundaries — expose the zone basis (%HRmax vs %HRR vs
  %LTHR) and prefer threshold-anchored zones.
- Taper ≈1–3 weeks at −41–60% volume, keeping intensity and frequency.

Deferred: tiered cron refresh of the KB (M4).

### M1 — Plan core (done, live)

- **Engine** (`packages/shared/src/plan`): deterministic generator — phase sequence
  (base → build → peak → taper), weekly volume curve with deloads and a taper, VDOT-derived training
  paces from a baseline race time, and Planet Fitness machine circuits. 12 vitest unit tests.
- **API**: `POST /api/plans/generate` creates a goal + plan + weeks + sessions with best-effort AI
  week summaries (deterministic template fallback); `GET /api/plans/current` returns weeks with their
  sessions. Added `sessions_plan.purpose` (migration 0002). Fixed D1 batch inserts (100 bound-parameter
  limit per statement). Made `/api/goals/profiles` public for onboarding.
- **Web**: onboarding (goal, race date, baseline, training days); home shows the week-strip calendar
  with today's hero session card and "week so far" — all bound to real plan data. Amber refined to a
  mark-only colour with `signal-ink` for text contrast (from the design review).
- **Shipped through the new pipeline**: PR #1 → CI (with tests) → merge → auto-deploy of api + web.
  Verified live; the remote D1 shows the `purpose` column.

### M2 — Logging + offline + units (done, live)

- **Units / settings**: shared metric↔imperial conversions + formatters (`packages/shared/units`);
  `GET/PUT /api/settings` (prefs JSON: `units`, `weekStart`); a KM|MI toggle; all distances and paces
  rendered through the user's preference. The engine and stored data remain metric.
- **Logging**: run logs (distance + duration → auto pace, HR, RPE) and strength logs (per-machine
  sets × reps × weight with repeat-last / add / remove set). `POST /api/logs` takes structured payloads;
  `GET /api/plans/current` returns logs. Session cards and the week strip gain an **additive** LOGGED/tick
  state; the calendar gets prev/next week navigation and per-week adherence.
- **Offline**: a localStorage outbox queues logs written offline and auto-flushes on reconnect (with a
  pending indicator and an optimistic "syncing" card state); the last plan is cached so the app renders
  offline.
- Shipped as PRs #4–#6, each through the CI gate.

### M3 — Guided workouts (started, live)

- **Structured steps** (`packages/shared`): sessions now carry a `workout` of blocks/steps —
  warm-up → set (with repeats) → recovery → cool-down — each step with distance/time + pace/zone/RPE.
  Built for tempo, interval, easy, long and strength (activation → machine circuit → cool-down). +2 tests.
- **Guided player** (web): a full-screen overlay with the stage breakdown, a current-step hero, a
  countdown (time-based steps) or elapsed timer, Start/Pause/Next/Prev, and finish → "Log it".
  Session cards gained a **Start** action.
- Verified end-to-end: an interval session stores as `1.5 km warm-up + 6 × (800 m + 800 m) + 1 km cool-down`.
- **M3b — machine drill-down + rest timer**: each strength step shows muscles, "where you feel it",
  3–4 form cues and common mistakes (from the researched catalog), plus a rest timer (90s / +30s / skip).
- **M3c — guided warm-up / cool-down routines**: quality runs and strength sessions open with timed
  dynamic warm-up drills and close with cool-down stretches, walked through by the player.
- **Remaining (optional)**: audio/haptic cues. Auto-advance by GPS is **out of scope** by design — the app
  has no live tracking (shareable stats only), so progression is manual/timer-based.

### M0–M3 shipped

Follow-up quality-of-life shipped alongside: a **Settings modal** (Appearance / Units / Account) replacing
the header toggles, and **service-worker auto-update** (bypass HTTP cache, check on load, reload once a new
worker takes control) so new deploys actually appear in the installed PWA.

### M4 — Automatic guided flow + Today/Week (done, live)

- **Engine**: every run step carries an estimated duration (so the whole workout auto-advances), strength
  steps carry `restSec`, and the circuit expanded to **8 machines** (legs, posterior chain, push/pull).
- **Player v2**: strength expands into **sets**, timed steps count down and auto-advance, and **rest runs
  automatically** — finish a set → rest starts → next set. Skip / +30s / jump-to-stage still available.
- **Navigation**: home is now **Today-only** (every session for today, each startable/loggable); the full
  week moved to **`/week`**; a bottom nav (**Today | Week**) and a shared plan store keep them in sync.

**M4c — intensity progression** (live): every session carries an **easy / steady / hard** band, shown as a
count-encoded ladder on the session card, week strip and week list (no colour). **Goal-pace sessions** are
introduced through build/peak and scale by race distance — half `2→3 × 3 km`, marathon `2→3 × 5 km`,
10K `3→4 × 2 km`, 5K `4→6 × 1 km` — with goal pace derived from VDOT (wave-4 research).

**M4d — pace-anchored onboarding** (live): a recent race time drives VDOT and the full pace set,
**previewed live** (easy / threshold / interval / goal) with a fallback to experience when none is given.

### M5 — Progress analytics + polish (done, live)

- **Analytics** (`packages/shared/analytics`, 8 tests): adherence, weekly volume (planned vs actual),
  completed intensity distribution, pace trend, personal bests, average RPE. Deliberately omits
  ACWR/monotony/strain (contested). Computed client-side from the plan store, so no new endpoint.
- **Progress tab** with honest marks only: adherence tick ledger, volume bars with planned ticks,
  intensity counts, pace dots (gated at 3+ points), PBs, and an empty state. Every panel is gated on
  sample size; no fabricated trends or decorative charts.
- **KB-backed "Why this?"**: each session archetype maps to its seeded knowledge-base topic
  (`EXPLANATION_REFS`); `GET /api/explanations?type=` returns the summary, parsed per-claim lines and
  real sources with DOI links. The card loads it on expand.
- **Units everywhere**: session titles no longer embed units; the client composes labels from plan data,
  so km/mi switches for distances and rep distances alike.
- **Human copy**: every em dash removed from UI copy and comments (punctuation instead). En dashes remain
  only in numeric ranges (e.g. `4:55–5:05`).
- **Navigation**: Today | Progress tabs; the full week is a summary reached from a button on Today.
- Rebuild moved into a Settings > Plan section.

**Still to come**: the AI coach/adaptation layer (M6).

### Card system + layout overhaul (done, live)

- **Primitives**: `Card` (paper = act here, sunken = read here) and `SectionHeader` (mono eyebrow +
  right meta). Rules: 12px card radius / 8px inner, hairline edges, **no shadows**, rules inset to the
  padding, **12px intra-group vs 28px section** rhythm, and a nesting rule (a paper card may hold one
  sunken well; never paper-in-paper).
- **Today rebuilt**: masthead, Today's session card(s) with a left amber/steel edge, a sunken
  "week so far" well (adherence ticks + volume against the plan cap), a **Why this session** card, and
  Quick actions. Rest days show a sunken state plus a next-session peek.
- **Why card**: collapsed one-line researched claim with a steel citation marker and a Details toggle;
  expanded adds per-claim lines with markers and a real SOURCES list (DOI links, KB version in the foot).
- **Week** and **Progress** moved onto the same primitives.

### M6 — AI layer (done, live)

- **Grounded coach chat**: `POST /api/ai/chat` builds context server-side (goal, this week's sessions,
  a knowledge-base reference for the session type, recent logs) so answers cite the user's own plan.
  Runs on Workers AI with an OpenRouter fallback, is rate-limited, and records an `ai_jobs` row. The
  style prompt bans em dashes and markdown. UI: a **Coach** tab with instrument-style rows, starters and
  loading/error states.
- **Adaptive suggestions** (`packages/shared/plan/adapt`, 5 tests): pure rules from the adaptive-rules
  research — missed sessions (absorb vs rebuild), volume under/over plan, three consecutive high-RPE
  sessions, and a single run that jumps over 10%. Surfaced as a **Suggested adjustments** card on Today
  with dismiss and a rebuild prompt. The plan is **never changed silently**.
- **Coach notes**: nightly + weekly cron jobs write a short note per active runner (AI text with a
  deterministic fallback) into a `summaries` table (migration 0003), shown as a Coach note card on Today.
- Navigation is now **Today | Coach | Progress**.

### Mobile-first layout pass (done, live)

- **Session carousel**: when a day has 2+ sessions they snap-scroll horizontally (322px cards with a
  peek and an honest tick rail) instead of stacking; a single session stays a plain card; at >=720px it
  becomes a 2-up grid.
- **Week restructured**: one sunken **7-cell load ledger** (intensity marks, logged ticks, today ring,
  selected state) replaces the week strip and the duplicate "this week" list; the selected day's carousel
  sits below. Week stays a focused view reached from Today, not a fourth tab.
- **Bottom tab bar**: a 56px ruler with a hairline, mono caps labels, three geometric marks (notch,
  reticle, ladder), a single amber sliding active indicator, and iOS safe-area padding.

### Deployed — live (M0 complete)

Provisioned and deployed via the Cloudflare MCP + Wrangler (account `3f513e4b…`):

- **D1** `strideguide-db` created; schema applied (23 tables incl. `d1_migrations` ledger); **361
  research_sources + 24 explanations** seeded remotely.
- **DNS:** `run.midnightcatit.com` (proxied AAAA placeholder).
- **Routes:** API Worker on `run.midnightcatit.com/api/*` and `/auth/*`; web Worker on
  `run.midnightcatit.com/*` (more specific routes win).
- **Secrets:** 4 production secrets set via `wrangler secret put` (fresh prod `SESSION_SECRET`).
- **Verified live:** `/` (200 HTML, "Stride Guide"), `/api/health` (200, `env=production`),
  `/api/goals/profiles` (401), `/auth/me` (200), `/auth/google` (302 with the registered prod
  redirect URI), and PWA assets (`/manifest.webmanifest`, `/service-worker.js`, `/icon.svg`).

Wrangler is now authenticated on this machine (two accounts available; `CLOUDFLARE_ACCOUNT_ID` must be
set to `3f513e4b8539944bdbbf5e1ff45f3af9` for account-scoped commands).

**Post-deploy fix (OAuth 500):** the login callback and logout returned `internal_error` in production
because Hono rejects deletion of a `__Host-`-prefixed cookie without a `Secure` attribute (`deleteCookie`
was called with only `{ path }`). Both deletes now pass `secure` (from `ENVIRONMENT`). Also, the
`/auth/*` route is now declared in `wrangler.jsonc` so deploys keep it (it had been added out-of-band).
Verified: synthetic callback → 400 `token_exchange_failed`, logout → 200 (with Origin) / 403 (without).

### Closed-loop intelligence (done, live)

Four phases, each through the CI gate:

- **Feedback capture**: a quick thumbs up or down on a finished workout, stored on `logs` (migration
  0009) and read back with the existing RPE.
- **Fitness state** (`packages/shared/src/plan/fitness`, 5 tests): a pure read of an effective VDOT from
  a recent hard effort, real recent weekly volume, effort trend, and the session types rated well or
  poorly. Plan generation seeds paces and volume from it.
- **Applied adaptation** (`packages/shared/src/plan/adaptive`, 4 tests): `adaptPlan` rebuilds only the
  weeks that have not started, from real training and feedback, and `POST /plans/adapt` applies it on one
  tap with no AI. The suggested-adjustments card gained **Adapt my plan**.
- **Grounded shaping**: the model shaping call receives the fitness read, and the engine applies a
  deterministic feedback bias (a kind rated down is replaced by one rated up where the phase allows).

### Planned — configurable adaptation (§6.6)

Manual adaptation is live (the one-tap **Adapt my plan**). Not yet built: the manual/automatic mode
switch in Settings, the nightly queue it gates, the `plan_adaptations` record, and revert. Designed in
§6.6, deferred until the mode switch exists so an automatic change is always opt-in and reversible.

