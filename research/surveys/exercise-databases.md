# Open exercise and workout databases: inventory and licensing

Survey date: 2026-11-23

Purpose: identify open or licensable sources of structured exercise data (names, muscles,
equipment, instructions) and per-exercise media that Stride Guide could ingest to grow its
workout and exercise catalog, and separate what is genuinely free to use commercially from what
is restricted. Licenses below were read from the actual repository LICENSE files and site terms
on 2026-11-23. Where a claim is unverified, it is marked as such.

## Summary table

| Source | URL | What it has | Size | Format | Media | License | Commercial verdict | Quality notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| yuhonas/free-exercise-db | https://github.com/yuhonas/free-exercise-db | name, force, level, mechanic, equipment, primaryMuscles, secondaryMuscles, instructions, category | 800+ exercises (about 873 JSON files) | JSON (one file per exercise, plus combined `dist/exercises.json` and NDJSON) | JPG photos of real people, often 2 per exercise | Unlicense (public domain, verified `LICENSE.md`) | Yes, unrestricted, no attribution required | Some fields null (force, mechanic, equipment). Image provenance is not documented in the repo; treat photos as usable but unverified in origin |
| Cawlumm/open-exercise-db | https://github.com/Cawlumm/open-exercise-db | Community-maintained catalog: muscles, equipment, step-by-step instructions, images, translations | Not stated, newer and growing | JSON, plus API and exports | Images (reuses free-exercise-db style photos) | Code MIT; exercise data CC0 1.0 (verified `LICENSE` and `DATA_LICENSE`) | Yes, data is CC0 | Successor-style fork of free-exercise-db; community submissions, so quality is variable |
| hasaneyldrm/exercises-dataset | https://github.com/hasaneyldrm/exercises-dataset | category, body part, equipment, target, muscle group, steps, 10 languages | 1,324 exercises | JSON plus JSON Schema | 1,324 animated GIFs and 1,324 180x180 thumbnails, all © Gym visual | Code, structure, instructions MIT; media explicitly excluded, © Gym visual | Data: yes under MIT (retain notices). Media: no, needs your own Gym visual license | Media is the trap; the MIT label does not cover the GIFs and thumbnails |
| wger | https://github.com/wger-project/wger | Exercise wiki: muscles, equipment, categories, images | About 973 entries | REST API, Django models, exportable | About 394 images, user-contributed | Code AGPL-3.0-or-later; exercise and ingredient data Creative Commons "see individual entries"; docs CC-BY-SA-4.0 | Data: yes if per-entry CC is honored (some entries are share-alike). Code is AGPL, which matters only if you self-host modified server code | Community-managed, variable depth; strong shared taxonomy and API |
| RepDB/exercise-dataset (free tier) | https://github.com/RepDB/exercise-dataset | Muscles, equipment, instructions, EN/DE/ES/FR | 708 exercises (701 illustrated) | JSON | About 1,231 flat WebP images, 512x512, AI-generated | Free tier: personal and commercial use in apps with attribution "Exercise data by RepDB (repdb.co)"; no redistribution as a dataset; no generative-AI derivation; paid preview animations excluded | Yes in-app with attribution; not as a redistributed dataset | Original AI images, clean structure; a sui generis database right is claimed over structure |
| ExerciseDB (ExerciseDB.io / AscendAPI) | https://exercisedb.io , https://docs.ascendapi.com | Target and secondary muscles, body parts, equipment, instructions; Pro adds taxonomy and relationships | About 1,500 exercises | Paid files plus hosted API | Animated GIFs at 180, 360, 720, 1080 | Paid, non-exclusive, non-transferable, platform-neutral license; no resale or redistribution as raw files or API; AscendAPI RapidAPI license is revocable | Yes inside a product you buy the license for; no redistribution | Expert-validated claim by vendor. Note the linked GitHub repo shows an AGPL file with no source code, so the API terms are what apply |
| MuscleWiki API | https://api.musclewiki.com | 1,900+ exercises, 45 muscle groups, routines and workouts endpoints, up to 14 languages | 1,900+ exercises, 7,700+ videos | Hosted API (key required) | Video demonstrations, front and side | Paid plans include commercial use; requires a verbatim disclosure in your Terms or Privacy Policy and keeping MuscleWiki branding in the video; caching limits; no redistribution | Yes on paid plans, with attribution conditions | Large video library; hosted only, no bulk file download |
| ExRx.net | https://exrx.net | 2,200+ exercise library, muscles, mechanics, technique | 2,200+ exercises | HTML site, licensed API | Site images and diagrams | Proprietary compilation, copyrighted, registered with the US Library of Congress; commercial reuse requires written permission via its Content Licensing program | No without a paid license | High authority, but explicitly closed to compiling and reuse |
| ACE exercise library | https://www.acefitness.org/resources/everyone/exercise-library/ | Exercise library with step-by-step instructions | Not stated | HTML pages, PDF (Fit Facts) | Photos and PDFs | ACE Terms of Use, copyrighted; Fit Facts content license agreement governs reuse | No without an agreement | Educational and marketing content, not an open dataset |
| ACSM resources | https://acsm.org | Position stands, resource manuals, MSSE journal content | Not applicable (prose and journals) | HTML, PDF, journals | Figures and images | All content copyrighted; commercial use needs prior written permission, granted case by case; user must supply a copy of any work that uses the data | No without permission | Authoritative science, but the text and media are closed. The underlying findings are citable |
| Compendium of Physical Activities (2011, 2024) | https://pacompendium.com | MET values and 5-digit activity codes for physical activities | 2011: 821 codes (561 with measured MET values); 2024 update: 176 changes; plus Older Adult and Wheelchair compendia | Web tables, PDF appendix, Excel on request | None | Site states the Adult, Older Adult and Wheelchair compendia are "free to use for commercial purposes"; cite the source; do not change MET values or combine activities with different MET levels | Yes, free for commercial use with citation | The standard energy-cost reference in exercise science. Apps often still cite 2011; 2024 is current |
| OpenAlex | https://openalex.org | Research metadata across disciplines, including exercise science | 260M+ records | API and bulk download | None | CC0 public domain (verified on site) | Yes, metadata is CC0 | Use to find and cite studies; not a workout catalog |
| PubMed / PMC | https://pubmed.ncbi.nlm.nih.gov | Abstracts and indexing; full text for open-access PMC | 37M+ citations | API, web, XML | None | Abstracts are free to read but are not offered under a bulk reuse license; each article carries its own license (CC-BY, CC-BY-NC, or all rights reserved) | Metadata: generally fine to reference. Article text: only as each article's license allows; NC articles are not commercial-usable | The best route to per-exercise EMG and effect evidence, as citations rather than a dataset |
| Wikidata / Wikimedia | https://www.wikidata.org | Exercise items (for example push-up, squat) as entities | Sparse coverage | Linked data, SPARQL | Commons images, separate licenses | Wikidata CC0; Wikipedia text CC-BY-SA; Commons files vary | Yes for CC0 items | No fitness attribute schema (muscle, equipment); not usable as a catalog |
| NHS / Health Canada / WHO physical activity content | https://www.nhs.uk , https://www.canada.ca , https://www.who.int | Physical activity guidelines, not exercise catalogs | Not applicable | HTML, PDF | Illustrations | UK content often under the Open Government Licence; WHO guidelines are CC BY-NC-SA 3.0 IGO (non-commercial) | Mixed. WHO is non-commercial; UK OGL content generally reusable with attribution | Authoritative for guidance and messaging, not a source of named exercises |
| "Open Fitness" / open-fit datasets | (no single canonical entity) | No single maintained dataset by this name | Not applicable | Not applicable | None | Not applicable | Not applicable | The usable open datasets are the GitHub projects above; the "open fitness" name does not resolve to one authoritative source |

## Usable today

These are safe to ingest into a commercial PWA with little or no legal risk.

1. yuhonas/free-exercise-db (Unlicense). Names, primary and secondary muscles, equipment, level,
   mechanic, force, and text instructions for 800+ exercises. Public domain, no attribution
   required. This is the most straightforward structural catalog. Caveat: the provenance of the
   JPG photos is not documented in the repo, so if photos matter, verify before shipping them.
2. Cawlumm/open-exercise-db (data CC0). A community-maintained catalog with muscles, equipment,
   instructions and translations. Data license is clear. Verify image provenance the same way.
3. RepDB free tier. 708 exercises with original AI-generated flat images, EN/DE/ES/FR, usable
   in-app with the attribution link. Not for republishing as a dataset.
4. Compendium of Physical Activities (2024, with 2011 as a fallback). MET values for activities,
   explicitly free for commercial use with citation and no alteration of MET values. This is the
   best source for energy-cost data to back calorie and intensity estimates.
5. OpenAlex (CC0) for research citations, and PubMed/PMC for open-access full text, to attach
   evidence to specific exercises or coaching claims.

## Avoid or restricted

1. hasaneyldrm/exercises-dataset media. The JSON is MIT, but every GIF and thumbnail is © Gym
   visual and is not covered by MIT. Do not reuse the media without your own Gym visual license.
   The instruction text is usable under MIT.
2. ExRx.net. Copyrighted proprietary compilation; commercial use requires a paid license. Do not
   scrape or compile it.
3. ACE, ACSM, and most certification-body libraries. Copyrighted, commercial reuse needs written
   permission. Use them for reading and citation, not for ingestion.
4. ExerciseDB.io and AscendAPI. Usable only with a purchased license, and redistribution as raw
   files or as an API is forbidden. Read the terms before any use.
5. MuscleWiki API. Usable on paid plans only, with attribution and branding conditions and caching
   limits. Not a free dataset.
6. WHO guidelines. CC BY-NC-SA 3.0 IGO is non-commercial, so it cannot be embedded in a commercial
   product.
7. wger code. AGPL-3.0 has a network copyleft clause. Pulling its exercise data via the API into
   your own product is fine if you honor the per-entry CC licenses, but do not copy its server code
   into a closed service without accepting AGPL obligations.

## Recommendation

1. Adopt yuhonas/free-exercise-db as the base exercise catalog, refreshed from Cawlumm/open-exercise-db
   where it adds coverage. Both are permissively licensed for commercial use, and the fields line up
   with a muscle, equipment, and instructions model. Normalize muscle and equipment names to your own
   vocabulary on ingest so the source stays swappable.
2. Use the 2024 Compendium of Physical Activities for MET values and intensity or calorie estimates.
   It is the peer-reviewed standard and it is explicitly free for commercial use. Cite it and keep
   MET values unmodified, as the terms require.
3. Attach research evidence through OpenAlex (CC0) and PubMed or PMC open-access articles, storing
   citations and short paraphrases rather than reproducing copyrighted text.
4. For media, treat images as a separate decision from data. The safest paths are free-exercise-db
   photos (verify provenance first), RepDB flat images (attribution required, in-app only), or your
   own illustrations. Do not ship Gym visual, ExRx, ACE, ACSM, or ExerciseDB media without a license.
5. If richer media becomes a priority, budget for one commercial license (ExerciseDB or MuscleWiki)
   and read the terms first, since both forbid redistribution and one requires branding.
6. Keep the Compendium MET table, the exercise catalog, and the media each isolated behind their own
   interface so licensing can change without a rework.

## Direct answer: is there a database of workouts in the science community we can use?

There is no single authoritative, peer-reviewed database of named workouts. The term "workout"
(push/pull/legs, tempo runs, a specific 5x5 plan) is not standardized in the research literature,
so no peer-reviewed catalog of named workouts exists to ingest.

What the science community does maintain, and what Stride Guide can use:

- The Compendium of Physical Activities is the closest thing to a scientific activity database.
  It maps roughly 800 to 1,000 physical activities to MET values and is the accepted energy-cost
  reference. It is free for commercial use with citation. This is genuinely usable today.
- Research literature databases, OpenAlex (CC0) and PubMed or PMC, let you find and cite
  per-exercise evidence (EMG activation, training effects, injury rates) but they are indexes of
  studies, not a structured exercise catalog. Each article's own license governs reuse of its text.
- Lab datasets (EMG, motion capture, biomechanics) exist but are scattered, non-standardized, and
  mostly not assembled into anything catalog-shaped.

So the honest answer is: use the Compendium for the science of energy cost, use the open catalogs
(the GitHub datasets) for exercise structure and media, and use OpenAlex and PubMed to attach
citations. None of those is a peer-reviewed "workout database", because that artifact does not
exist in the science community.

## Sources

- yuhonas/free-exercise-db, README and LICENSE.md, https://github.com/yuhonas/free-exercise-db
- Cawlumm/open-exercise-db, LICENSE and README, https://github.com/Cawlumm/open-exercise-db
- hasaneyldrm/exercises-dataset, LICENSE and README, https://github.com/hasaneyldrm/exercises-dataset
- wger, README license section, https://github.com/wger-project/wger and https://wger.de
- RepDB free-tier license, https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md and https://repdb.co
- ExerciseDB terms, https://exercisedb.io/terms and https://docs.ascendapi.com/products/edb-v1/overview
- MuscleWiki API terms, https://api.musclewiki.com/api-terms and https://api.musclewiki.com/faq
- ExRx.net Terms of Use, https://exrx.net/Notes/Legal
- ACE Terms of Use and Fit Facts license, https://www.acefitness.org/legal/terms-of-use/
- ACSM Terms of Use, https://acsm.org/terms-of-use/
- Compendium of Physical Activities, https://pacompendium.com and Ainsworth et al. 2011, Med Sci Sports Exerc 43(8):1575-1581
- OpenAlex about and licensing, https://openalex.org/about and https://openalex.org
- PubMed, https://pubmed.ncbi.nlm.nih.gov and PMC, https://pmc.ncbi.nlm.nih.gov
- Wikidata, https://www.wikidata.org
- WHO Guidelines on Physical Activity and Sedentary Behaviour (CC BY-NC-SA 3.0 IGO), https://www.who.int
