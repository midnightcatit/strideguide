#!/usr/bin/env python3
"""Generate research/wave-8/00-taxonomy.md: the Calistree taxonomy, mapped to ours."""
import csv
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW = HERE

AREAS = [
	"chest", "back", "shoulders", "arms", "forearms", "abs", "obliques", "core",
	"glutes and hips", "hip adductors", "hamstrings", "quadriceps", "thighs",
	"calves", "feet", "spine", "neck", "whole body",
]
AREA_NOTE = {
	"chest": "chest (pectorals)",
	"back": "back (lats, rhomboids, mid and lower traps, teres major)",
	"shoulders": "shoulders (deltoids, rotator cuff, serratus, upper traps)",
	"arms": "arms (biceps, triceps, brachialis)",
	"forearms": "forearms (grip, wrist, elbow muscles)",
	"abs": "abs (rectus abdominis, transversus abdominis)",
	"obliques": "obliques",
	"core": "core (quadratus lumborum)",
	"glutes and hips": "glutes and hips (glutes, deep hip rotators, hip flexors)",
	"hip adductors": "hip adductors (groin)",
	"hamstrings": "hamstrings",
	"quadriceps": "quadriceps",
	"thighs": "thighs (sartorius, popliteus)",
	"calves": "calves and shank (gastrocnemius, soleus, tibialis, fibularis, long toe flexors)",
	"feet": "feet (intrinsic foot muscles)",
	"spine": "spine (erector spinae and deep spinal muscles)",
	"neck": "neck",
	"whole body": "whole body (exercises whose first-listed muscle sits outside the named buckets)",
}


def main():
	with (RAW / "calistree-classified.tsv").open() as f:
		rows = list(csv.DictReader(f, delimiter="\t"))

	by_area: dict[str, list[dict]] = {a: [] for a in AREAS}
	for r in rows:
		by_area[r["calistree_area"]].append(r)

	level_counts = Counter(r["level"] for r in rows)
	type_counts = Counter(r["type"] for r in rows)
	equip_counts = Counter(r["equipment"] for r in rows)
	have_count = sum(1 for r in rows if r["have"])
	tier_counts = Counter(r["tier"] for r in rows)

	L = []
	add = L.append

	add("# Wave 8 taxonomy: the Calistree exercise library")
	add("")
	add("Calistree (calistree.app) is a bodyweight-first fitness app with a large public exercise")
	add("library. Its own mission statement says the exercise library is freely available for")
	add("everyone to use in their training. The owner approved using Calistree as a reference for")
	add("wave 8: its names and organization are cited facts here, and every description in these")
	add("wave-8 documents is written in our own words, never copied.")
	add("")
	add("## What was harvested and how")
	add("")
	add("- Sitemaps listed every datasheet: 4 exercise sitemaps, one muscle sitemap, one")
	add("  equipment sitemap. robots.txt allows all crawlers on everything except account pages.")
	add("- All 1,961 exercise datasheet pages were fetched into raw/pages/ (about 17 MB of HTML,")
	add("  no videos). Each page is server-rendered and carries the exercise name, level, exercise")
	add("  types, equipment and muscles in its meta description and JSON-LD, so no JavaScript")
	add("  rendering was needed and Firecrawl was not spent.")
	add("- raw/parse-datasheets.py parsed the pages into raw/calistree-datasheets.tsv (one row per")
	add("  exercise: id, slug, name, alternate names, level, types, equipment, primary muscles,")
	add("  full anatomy list). raw/classify.py added the mapping columns and the dedupe match")
	add("  against our catalog; raw/matched-names.tsv holds the 260 name matches.")
	add("- Dedupe baseline: our 195 catalog names (exercises.ts, machines.ts, bodyweight.ts,")
	add("  stretches.ts, mobility.ts) are in raw/our-existing-names.txt.")
	add("- Sources: https://calistree.app/sitemap.xml, the /exercises index page, and the")
	add("  datasheet pages themselves, for example")
	add("  https://calistree.app/datasheet/nordic-curl-e0ee. Muscle-hierarchy pages cited below.")
	add("")
	add("## Headline numbers")
	add("")
	add(f"- {len(rows)} exercises total.")
	add("- After dedupe, 260 entries match our 195-name catalog; 1,701 are names our")
	add("  catalog does not carry in any form.")
	add("")
	add("## Calistree's organization")
	add("")
	add("### Levels")
	add("")
	add("Six named levels: Novice (697), Beginner (555), Intermediate (391), Advanced (207),")
	add("Elite (80) and Herculean (31). We map Novice and Beginner to our beginner, Intermediate")
	add("to our intermediate, Advanced to our advanced. Elite and Herculean are skill-sport")
	add("territory (planche, one-arm chin-ups, human flag) and out of scope for a running app.")
	add("")
	add("### Exercise types")
	add("")
	add("Each datasheet carries one or more types: strength (935 carry strength alone),")
	add("flexibility (589 carry it), balance (376) and cardio (166), often combined. Calistree")
	add("folds stretches, yoga asanas and mobility holds into the same list with a flexibility")
	add("type, which is convenient: our mobility focus areas can be fed from the flexibility")
	add("slice alone.")
	add("")
	add("### Muscle taxonomy")
	add("")
	add("Calistree organizes muscles as a hierarchy of datasheet pages: whole body splits into")
	add("upper body, core and lower body; upper body into back, chest, shoulders, arms, biceps,")
	add("triceps, forearms, rotator cuff and neck; core into abs, obliques, pelvis and spine;")
	add("lower body into glutes, hamstrings, hip adductors, quadriceps and a legs bucket that")
	add("holds the shank and foot muscles (tibialis anterior, gastrocnemius, soleus, fibularis,")
	add("flexor hallucis and digitorum, popliteus). Sources:")
	add("https://calistree.app/datasheet/whole-body-m03y,")
	add("https://calistree.app/datasheet/upper-body-m03z,")
	add("https://calistree.app/datasheet/core-m040,")
	add("https://calistree.app/datasheet/lower-body-m041,")
	add("https://calistree.app/datasheet/legs-m02n,")
	add("https://calistree.app/datasheet/back-m00z,")
	add("https://calistree.app/datasheet/chest-m02l,")
	add("https://calistree.app/datasheet/glutes-m02p,")
	add("https://calistree.app/sitemap_datasheets_muscles.xml (full muscle list).")
	add("")
	add("The per-exercise grouping below is derived from the muscles each datasheet lists,")
	add("resolved to one area through that hierarchy using the first muscle the datasheet")
	add("names (its primary emphasis). Exercises whose datasheets list no muscles, mostly")
	add("locomotion and conditioning entries, sit under whole body.")
	add("")
	add("### Equipment taxonomy")
	add("")
	add("The equipment sitemap lists about 120 equipment datasheets, from none and ground to")
	add("rings, parallettes, stall bars, wobble boards, slacklines and machines. Top equipment")
	add("strings across the 1,961 exercises:")
	add("")
	add("| equipment | exercises |")
	add("| --- | --- |")
	for k, v in equip_counts.most_common(24):
		add(f"| {k} | {v} |")
	add("")
	add("### Compound flows")
	add("")
	add("90 entries (ids w001 to w02i) are combined movements: clean and press, thrusters,")
	add("squat press, burpee variants, jump-throughs. They are recipes of two base exercises")
	add("rather than new patterns.")
	add("")
	add("## Mapping to our categories")
	add("")
	add("### Our movement patterns")
	add("")
	add("| our pattern | what maps into it from Calistree |")
	add("| --- | --- |")
	add("| squat | squats, lunges, split squats, step-ups and step-downs, wall sits, leg press, pistol family |")
	add("| hinge | deadlifts, RDLs, good mornings, kettlebell swings, hip thrusts, kickstand work |")
	add("| knee-extension | leg extension, sissy squats, reverse nordic, tibialis raises (shin side) |")
	add("| knee-flexion | leg curls (machine, band, slider, stability ball), nordic, glute-ham |")
	add("| calf | calf raises (straight and bent knee, ledge, donkey, machine), heel and toe walking, ankle strength |")
	add("| pull | rows, pulldowns, pull-up family, hangs, curls, shrugs, scapular work |")
	add("| push | push-up family, presses (dumbbell, barbell, machine, band), dips, flys |")
	add("| core | planks and side planks, hollow holds, crunch family, leg raises, pallof, woodchops, L-sits, carries |")
	add("| posterior-chain | back extensions, arch body, reverse hyperextension, prone holds |")
	add("| plyometric | jumps, hops, bounds, depth work, jump rope |")
	add("| cardio | jump rope variants, burpees, crawls, treadmill and machine cardio (we keep cardio in the library, not the engine catalog) |")
	add("")
	add("### Our machine muscle groups")
	add("")
	add("| our group | Calistree equivalent |")
	add("| --- | --- |")
	add("| Chest | chest |")
	add("| Back | back, plus their spine bucket for erectors and deep spinal muscles |")
	add("| Shoulders | shoulders plus their rotator-cuff and serratus entries |")
	add("| Arms | their arms, biceps and triceps buckets |")
	add("| Legs | quadriceps, hamstrings, hip adductors, and their legs bucket (calves, shank, feet) |")
	add("| Glutes | glutes and their glutes-and-hips bucket |")
	add("| Core | abs, obliques, and quadratus lumborum |")
	add("| Cardio | their cardio-type entries |")
	add("| Other | neck, spine-only, and whole-body-spanning entries |")
	add("")
	add("### Our equipment tiers")
	add("")
	add("| our tier | Calistree equipment that lands there |")
	add("| --- | --- |")
	add("| machines | leg press, seated leg press, smith machine, cable machine, double cable machine, lat pulldown machine, leg extension machine, seated leg curl machine, chest press machine, pec deck, shoulder press machine, hip abduction and adduction machines, ab crunch machine, roman chair, rowing machine, treadmill, elliptical |")
	add("| dumbbells | dumbbell, kettlebell, barbell, hand-held weight, weight plate, offcenter weight |")
	add("| bodyweight | none, ground, chair, plyo box, bench, step platform, elevated surface, free wall, stairs, yoga block, towel, slider, strap, stability ball, foam roller, and (with a note in 01-candidates.md) pullup bar and dip station |")
	add("| bands | long resistance band, short resistance band |")
	add("| out of our tiers | rings, parallettes, exercise partner, stall bars, flag pole, hangboard, monkey bars, climbing wall, slackline, wobble board, swimming pool, sled, jumping rope |")
	add("")
	add("### Our mobility focus areas")
	add("")
	add("| our focus | where the Calistree flexibility slice feeds it |")
	add("| --- | --- |")
	add("| hips-glutes | their glutes-and-hips, hip-adductor and piriformis stretches, 90-90 work |")
	add("| hamstrings-calves | their hamstring, calf and seated-fold stretches |")
	add("| ankles | their ankle mobility, heel-sit and knee-to-toe work |")
	add("| upper-back | their shoulder, lat, chest and thoracic-extension stretches (cobra, dislocates) |")
	add("| general | their whole-body flows, neck work and breathing entries |")
	add("")
	add("## Genuinely new categories Calistree has that we lack")
	add("")
	add("Recorded for the owner to broaden the goal list later; none is used by today's engine.")
	add("")
	add("| category | size in Calistree | what it is |")
	add("| --- | --- | --- |")
	add("| Handstand and inversion skills | 114 exercises | headstands, forearm stands, handstand lines, presses and walks |")
	add("| Gymnastic rings | 232 exercises mention rings | rings as a primary apparatus for push, pull and core |")
	add("| Parallettes | 107 | low bars for L-sits, planche leans, dips |")
	add("| Exercise partner | 92 | partner-assisted and partner-resisted moves |")
	add("| Free wall | 66 | wall handstand and wall-support line |")
	add("| Forearm, wrist, finger and grip work | 101 | forearm rotations, wrist flexion and extension, plate pinching, finger work |")
	add("| Compound flows | 90 | two-exercise combinations such as clean and press or thrusters |")
	add("| Neck training | 27 | neck flexion, extension, rotation and retraction, bridges |")
	add("| Elite and Herculean skill tier | 111 | planche, front lever, back lever, one-arm chin-up, human flag, muscle-ups |")
	add("| Balance apparatus | 49 | wobble board, slackline, unicycle, footbag, skateboard, roller skates |")
	add("| Climbing | hangboard, bouldering, top rope and lead climbing | climbing wall as a training modality |")
	add("| Sled work | 4 | sled push and pull, including treadmill sled |")
	add("| Swimming pool | 5 | water-based strength and cardio entries |")
	add("| Jump rope as equipment | 10 | skipping variants as their own exercise entries |")
	add("| Loaded walking | weight vest, backpack, ankle weights as equipment categories | rucking-adjacent loading |")
	add("")
	add("## Dedupe against our catalog")
	add("")
	add(f"- {have_count} of the 1,961 Calistree entries match our 195-name catalog by exact or")
	add("  token-overlap names (raw/matched-names.tsv). Examples both ways: their Nordic curl is")
	add("  our Nordic hamstring curl; their Horizontal row alt-names include our Inverted row.")
	add("- Each partition in 01-candidates.md ends with a skip list of the matches that matter,")
	add("  so the four research sessions do not re-research exercises we already carry.")
	add("- Where a Calistree exercise is a near-variant of ours but distinct enough to add (a")
	add("  ladder rung or a loadable version), it stays a candidate and the Have column names")
	add("  the overlap.")
	add("")
	add("## Full exercise list, organized by muscle group")
	add("")
	add("Every exercise with its Calistree level word and equipment string, grouped by the")
	add("muscle area its datasheet points to. The machine-readable version with slugs, URLs,")
	add("alternate names and full anatomy is raw/calistree-classified.tsv.")
	add("")
	for area in AREAS:
		items = by_area[area]
		if not items:
			continue
		items = sorted(items, key=lambda r: r["name"].lower())
		add(f"### {AREA_NOTE[area]} ({len(items)})")
		add("")
		for r in items:
			eq = r["equipment"] if r["equipment"] else "none"
			add(f"- {r['name']} ({r['level']}; {eq})")
		add("")
	add("## Files")
	add("")
	add("- raw/calistree-exercise-urls.txt: the 1,961 datasheet URLs from the sitemaps.")
	add("- raw/sitemap_exercises_01..04.xml, sitemap_muscles.xml, sitemap_equipment.xml: fetched sitemaps.")
	add("- raw/pages/: all fetched datasheet pages, named by exercise id.")
	add("- raw/parse-datasheets.py, raw/calistree-datasheets.tsv: parser and flat table.")
	add("- raw/classify.py, raw/calistree-classified.tsv, raw/matched-names.tsv: mapping and dedupe.")
	add("- raw/our-existing-names.txt: our catalog names used as the dedupe baseline.")
	add("- raw/pools-*.tsv: per-partition review pools used to curate the selection.")
	add("- raw/gen-candidates.py: generates 01-candidates.md from the curated selection.")
	add("- raw/fetch-datasheets.sh: the resumable crawl script.")
	add("")
	add("## Numbers, precisely")
	add("")
	tier_line = ", ".join(f"{k} {v}" for k, v in tier_counts.most_common())
	add(f"- Our-tier assignment across the harvest: {tier_line}.")
	add("")
	(HERE.parent / "00-taxonomy.md").write_text("\n".join(L) + "\n")
	print("areas:", {a: len(v) for a, v in by_area.items() if v})


if __name__ == "__main__":
	main()
