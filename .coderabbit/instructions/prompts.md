---
id: prompts
name: Prompts and generated text
paths:
  - "apps/api/src/lib/**"
  - "apps/api/src/routes/ai.ts"
  - "apps/api/src/cron.ts"
  - "packages/shared/src/writing.ts"
  - "packages/shared/src/writing-guard.ts"
---

Code that produces text a person reads: coach notes, session whys, day insights,
narration and summaries.

What to check:

- Every prompt that produces user-visible text must carry `WRITING_RULES` and the
  output must pass `sanitizeText`. A prompt without them is a blocking finding.
- The rules to enforce: no em dashes, no emoji, no markdown, no hype words, no
  filler, no invented research or citations, no medical advice.
- A prompt change must not weaken the writing guard or its tests. If a filter is
  relaxed, say why in the PR.
- The model must be told to say when it is uncertain rather than invent a study or
  a number.
- Check the fallback. If the model call fails, the code must still produce plain
  text that follows the rules.
