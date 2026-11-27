# Wave 8: Calistree taxonomy harvest (2026-11-27)

Research-only pass to harvest the exercise taxonomy of calistree.app, dedupe it against
our own catalog, and select the candidates the engine exercise database will take. The
owner approved Calistree as a reference: its names and organization are cited facts, and
every description written here is our own words.

## Files

| File | What it is |
| --- | --- |
| 00-taxonomy.md | The full Calistree list (1,961 exercises) organized by muscle group with level and equipment, the mapping to our movement patterns, machine muscle groups, equipment tiers and mobility focus areas, and the new categories Calistree has that we lack |
| 01-candidates.md | The 208 selected candidates in four partitions matching the parallel research sessions (legs and front of hip; posterior chain and calves; core, stability and plyometric; upper body), plus a mobility section, plus per-partition skip lists of the 129 Calistree entries our catalog already carries |
| raw/ | Evidence: fetched sitemaps, all 1,961 datasheet pages, the parsed flat table, the classifier, the match list, and the generators that produce both documents |

## Method in one paragraph

The Calistree sitemaps listed every datasheet, robots.txt allows crawling, and every
datasheet page renders its name, level, types, equipment and muscles server-side in the
meta description and JSON-LD. So all 1,961 pages were fetched with plain curl (no videos,
no Firecrawl spend), parsed into one table, classified against our catalog, and curated
by hand into the candidate partitions. Calistree's levels map to ours as Novice/Beginner
= beginner, Intermediate = intermediate, Advanced = advanced; Elite (80) and Herculean
(31) are skill-sport work and were left out of the candidates.

## Status

Documents complete, awaiting review. No code changed.
