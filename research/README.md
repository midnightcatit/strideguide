# Research program

Cited knowledge-base source for Stride Guide, produced by parallel research subagents
(PLAN.md §7). Output is structured JSON, later consolidated into the seeded D1 tables
`research_sources`, `explanations`, and `exercises`.

## Layout

```
wave-1/  foundation: running physiology, workout mechanics, strength for runners, adaptive planning
wave-2/  goal-specific: PF machines, marathon, 5K/10K/half, whole-fitness
wave-3/  supporting: mobility/recovery, nutrition/sleep, injury prevention, pacing/zone tools
wave-4/  adaptive/deload rules
wave-5/  catalog expansion: strength variants (dumbbells, barbell/KB, bands, bodyweight, machines), a wider stretch and mobility library, more running session types, form drills, cross-training (see wave-5/INDEX.md)
surveys/ stack research (SvelteKit/Cloudflare, Hono/Drizzle/D1, Google OAuth on Workers). Wave 5 adds exercise databases, form-animation feasibility, and gym equipment inventories.
```

## Claim schema

Each file is:

```json
{
  "workstream": "...",
  "subtopic": "...",
  "generated_at": "<ISO>",
  "claims": [
    {
      "topic": "...",
      "claim": "...",
      "evidence": "...",
      "confidence": "high|medium|low",
      "citation": {
        "title": "...", "authors": "...", "year": 2020, "venue": "...",
        "type": "...", "doi_or_url": "...", "retrieved_at": "<ISO>"
      }
    }
  ],
  "summary_tier_a": "...",
  "unverified": [],
  "notes": "..."
}
```

## Source `type` allowlist

Extended beyond the initial narrow set, because subagents correctly needed more categories:

- `meta-analysis`, `systematic-review`, `rct`
- `observational`, `cohort` (prospective/retrospective training studies)
- `narrative-review`
- `position-stand` (ACSM etc.)
- `textbook`
- `coaching` (well-regarded coaching sources, books, practitioner guidance)

Claims whose evidence cannot be substantiated go in the file's `unverified` array and are
**not** published as fact.

## Retrieval policy

WebFetch first; Firecrawl (free tier) only as a fallback when a page needs JS rendering, is
blocked, or a fetch fails. Peer-reviewed sources preferred.

## Known corrections

Found during later passes (apply when consolidating):

- **Zourdos RPE/RIR** DOI is `10.1519/JSC.0000000000001049` (not the value used in wave-1).
- **Circuit-training meta-analysis** DOI is `10.1007/s40279-017-0773-4`.
- **Schwanbeck 2020** (`...3349`) is a free-weights-vs-machines study, not the cycling title used in wave-1.

## Consolidation (M3)

Wave outputs are merged into the D1 tables, deduplicated by DOI, and versioned via
`knowledge_base_versions`. Tier A (inline summary) comes from `summary_tier_a`; Tier B
("read more") is assembled from the cited `claims`.
