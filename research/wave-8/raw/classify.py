#!/usr/bin/env python3
"""Classify the Calistree harvest against Stride Guide's own taxonomy.

Reads research/wave-8/raw/calistree-datasheets.tsv and our existing names
(our-existing-names.txt) and writes calistree-classified.tsv plus per-partition
pool files for hand review. Pure local analysis, no network.
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW = HERE


def norm(name: str) -> str:
    s = name.lower()
    s = s.replace("-", " ").replace("'", "").replace(",", " ")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def load_ours():
    ours = set()
    for line in (RAW / "our-existing-names.txt").read_text().splitlines():
        line = line.strip()
        if line:
            ours.add(norm(line))
    return ours


# Calistree's own muscle-group datasheets (from sitemap_datasheets_muscles.xml
# and the hierarchy pages). Each rule matches the FIRST muscle a datasheet
# lists, which is the datasheet's primary emphasis.
CALISTREE_AREAS = [
    ("chest", ["pectoralis"]),
    ("back", ["latissimus dorsi", "rhomboid", "middle trapezius", "lower trapezius",
              "teres major"]),
    ("arms", ["biceps brachii", "coracobrachialis", "brachialis", "triceps brachii",
              "triceps"]),
    ("forearms", ["brachioradialis", "flexor carpi", "extensor carpi",
                  "flexor digitorum profondus", "flexor digitorum superficialis",
                  "flexor pollicis", "extensor pollicis", "extensor indicis",
                  "pronator", "supinator", "palmaris longus", "anconeus",
                  "=extensor digitorum"]),
    ("shoulders", ["upper trapezius", "trapezius", "deltoid", "anterior deltoid",
                   "middle deltoid", "posterior deltoid", "supraspinatus",
                   "infraspinatus", "teres minor", "subscapularis", "rotator cuff",
                   "serratus anterior", "levator scapulae"]),
    ("neck", ["sternocleidomastoid", "splenius", "longus capitis", "longus colli",
              "rectus capitis", "obliquus capitis", "semispinalis capitis",
              "longissimus capitis", "longissimus cervicis", "spinalis cervicis"]),
    ("spine", ["erector spinae", "spinalis", "longissimus", "iliocostalis", "multifidus",
               "rotatores", "interspinales", "intertransversarii", "transversospinales",
               "semispinalis thoracis", "semispinalis cervicis"]),
    ("abs", ["rectus abdominis", "transversus abdominis"]),
    ("obliques", ["external oblique", "internal oblique"]),
    ("core", ["quadratus lumborum"]),
    ("hip adductors", ["adductor", "gracilis", "pectineus"]),
    ("glutes and hips", ["gluteus", "piriformis", "gemellus", "obturator",
                         "quadratus femoris", "tensor fasciae latae", "iliacus",
                         "psoas"]),
    ("quadriceps", ["rectus femoris", "vastus"]),
    ("hamstrings", ["semitendinosus", "semimembranosus", "biceps femoris"]),
    ("thighs", ["sartorius", "popliteus"]),
    ("calves", ["gastrocnemius", "soleus", "tibialis posterior", "tibialis anterior",
                "fibularis", "flexor digitorum longus", "flexor hallucis longus",
                "extensor digitorum longus", "extensor hallucis longus"]),
    ("feet", ["flexor digitorum brevis", "flexor hallucis", "extensor hallucis brevis",
              "extensor digitorum brevis", "quadratus plantae",
              "abductor digiti minimi", "abductor hallucis", "interossei",
              "lumbrical"]),
]

# Stride Guide's picker groups (muscle-groups.ts), applied to the same anatomy.
OUR_GROUP_RULES = [
    ("Chest", ["pectoralis"]),
    ("Back", ["latissimus", "rhomboid", "trapezius", "teres major", "erector spinae",
              "spinalis", "longissimus", "iliocostalis", "multifidus", "rotatores",
              "interspinales", "transversospinales"]),
    ("Shoulders", ["deltoid", "supraspinatus", "infraspinatus", "teres minor",
                   "subscapularis", "serratus anterior", "levator scapulae"]),
    ("Arms", ["biceps brachii", "triceps brachii", "coracobrachialis", "brachialis",
              "brachioradialis", "forearm", "carpi", "pollicis", "pronator",
              "supinator", "palmaris", "anconeus"]),
    ("Glutes", ["gluteus", "piriformis", "gemellus", "obturator", "quadratus femoris",
                "tensor fasciae latae"]),
    ("Legs", ["quadriceps", "vastus", "rectus femoris", "hamstring", "semitendinosus",
              "semimembranosus", "biceps femoris", "adductor", "gracilis", "pectineus",
              "gastrocnemius", "soleus", "tibialis", "fibularis", "popliteus",
              "sartorius", "iliacus", "psoas", "flexor digitorum brevis",
              "flexor hallucis", "extensor hallucis", "quadratus plantae"]),
    ("Core", ["rectus abdominis", "transversus abdominis", "oblique",
              "quadratus lumborum"]),
]

# Movement pattern guess, from the exercise name.
PATTERN_RULES = [
    ("cardio", ["jump rope", "jumping rope", "burpee", "mountain climber", "run in place",
                "jog", "march", "high knees", "butt kick", "jumping jack",
                "star jump", "skip in", "footwork", "ladder", "bear crawl", "crab walk",
                "inchworm walk", "shuttle", "sprint", "sprawl", "seal jack"]),
    ("plyometric", ["jump", "hop", "bound", "skip", "leap", "plyo", "bounce", "rebound",
                    "spring", "explosive", "clap ", "snatch", "clean ", "swing"]),
    ("knee-extension", ["leg extension", "sissy", "terminal", "reverse nordic",
                        "tibialis raise", "knee extension"]),
    ("knee-flexion", ["leg curl", "nordic", "hamstring curl", "glute ham", "leg curl",
                      "curl with", "shin", "heel drive"]),
    ("calf", ["calf", "heel raise", "heel drop", "soleus", "ankle ", "toe walk",
              "pogo", "ankling", "foot "]),
    ("hinge", ["deadlift", "rdl", "romanian", "good morning", "swing", "hip thrust",
               "bridge", "pull-through", "kickback", "windmill", "press to handstand"
               " (no)", "hinge", "back extension", "hyperextension", "donkey",
               "superman", "reverse hyper", "good girl", "reverse plank", "arch",
               "hollow hold", "back lever"]),
    ("squat", ["squat", "lunge", "split squat", "step-up", "step up", "step down",
               "pistol", "cossack", "curtsy", "wall sit", "leg press", "hack squat",
               "shrimp", "skater squat", "box squat", "sit to stand", "chair stand",
               "dragon squat", "tuck jump squat", "shin box", "eagle", "horse stance",
               " elevate", "bulgarian", "thruster", "front rack", "lateral lunge",
               "side lunge", "knee tap"]),
    ("pull", ["pull-up", "pullup", "pull up", "chin-up", "chinup", "chin up", "row",
              "pulldown", "lat ", "face pull", "biceps curl", "bicep curl", "curl",
              "hang", "shrug", "rear delt", "muscle up", "inverted", "renegade",
              "upright row", "raise to", "scapula pull", "scapular", "pelican",
              "front lever", "yoke", "carry", "suitcase", "shrug"]),
    ("push", ["push-up", "pushup", "push up", "press", "bench", "dip", "fly",
              "handstand", "pike push", "overhead", "chest pass", "planche", "shoulder tap",
              "muscle-up to", "l-sit press"]),
    ("core", ["plank", "crunch", "sit-up", "situp", "leg raise", "hollow", "dead bug",
              "bird dog", "pallof", "twist", "rollout", "ab ", "abs ", "v-up", "boat",
              "side bend", "breathe", "breathing", "bracing", "bicycle", "flutter",
              "scissor", "windshield", "starfish", "dolphin", "levers", "column",
              "human flag", "side star", "toes to", "knees to", "windshield wiper",
              "bear hold", "hollow body", "arch body", "banana", "isometric"]),
    ("posterior-chain", ["back extension", "superman", "reverse hyper", "hip extension",
                         "donkey kick", "fire hydrant", "swimmer", "reverse plank"]),
]

# Equipment string -> our tier.
EQUIP_TIER_RULES = [
    ("machines", ["leg press", "smith machine", "cable machine", "double cable machine",
                  "lat pulldown", "leg extension machine", "leg curl machine",
                  "seated leg curl machine", "chest press machine", "pec deck",
                  "shoulder press machine", "hip abduction machine",
                  "hip adduction machine", "ab crunch machine", "ab wheel device",
                  "rowing machine", "treadmill", "elliptical", "assault bike",
                  "skierg", "stair", "climber machine", "ladder machine", "glute kickback",
                  "seated dip machine", "seated row machine", "preacher bench",
                  "roman chair", "nordic curl device", "sled", "back extension device"]),
    ("dumbbells", ["dumbbell", "kettlebell", "barbell", "hand-held weight",
                   "weight plate", "offcenter weight", "one-hand handle weight",
                   "handle weight", "free weight", "clutch flag device"]),
    ("bands", ["resistance band"]),
    ("bodyweight", ["none", "ground", "chair", "bench", "plyo box", "step platform",
                    "elevated surface", "elevated pushing surface", "free wall",
                    "yoga block", "towel", "slider", "strap", "staff", "wall",
                    "stability ball", "foam roller", "wobble balance board",
                    "stairs", "slant board", "pullup bar", "dip station", "parallel bars",
                    "low bar", "body-held weight", "weight vest", "weight belt",
                    "backpack", "ankle weight", "medicine ball", "jumping rope",
                    "trail", "swimming pool", "sled", "slackline"]),
    ("other", ["rings", "parallettes", "exercise partner", "stall bars", "flag pole",
               "hangboard", "monkey bars", "climbing", "hanging device",
               "pushing device", "side pulling device", "pulling device",
               "inversion", "neutral grip bars", "paddleboard", "ski", "skateboard",
               "roller", "unicycle", "football", "soccer", "volleyball", "golf",
               "boxing", "bicycle", "indoor bike", "rowing boat", "row bar",
               "snowboard", "footbag"]),
]


def first_hit(text: str, rules) -> str:
    for label, keys in rules:
        for k in keys:
            if k in text:
                return label
    return ""


LEVEL_MAP = {"Novice": "beginner", "Beginner": "beginner",
             "Intermediate": "intermediate", "Advanced": "advanced",
             "Elite": "out-of-scope", "Herculean": "out-of-scope"}


def calistree_area(anatomy: str) -> str:
    # The first muscle a datasheet lists is its primary emphasis.
    first = anatomy.split(";")[0].strip().lower()
    for area, keys in CALISTREE_AREAS:
        for k in keys:
            if k.startswith("="):
                if first == k[1:]:
                    return area
            elif first.startswith(k):
                return area
    return "whole body"


def our_group(anatomy: str) -> str:
    low = anatomy.lower()
    for group, keys in OUR_GROUP_RULES:
        for k in keys:
            if k in low:
                return group
    return "Other"


def pattern_guess(name: str) -> str:
    low = " " + norm(name) + " "
    return first_hit(low, PATTERN_RULES) or "core"


def equip_tier(equipment: str) -> str:
    low = equipment.lower()
    for tier, keys in EQUIP_TIER_RULES:
        for k in keys:
            if k in low:
                return tier
    return "other"


def main():
    ours = load_ours()
    rows = []
    lines = (RAW / "calistree-datasheets.tsv").read_text().splitlines()
    header = lines[0].split("\t")
    for line in lines[1:]:
        r = dict(zip(header, line.split("\t")))
        r["our_level"] = LEVEL_MAP.get(r["level"], "")
        r["calistree_area"] = calistree_area(r["anatomy"])
        r["our_group"] = our_group(r["anatomy"])
        r["pattern"] = pattern_guess(r["name"])
        r["tier"] = equip_tier(r["equipment"])
        n = norm(r["name"])
        alts = [norm(x) for x in r["alt_name"].split(",") if x.strip()]
        match = ""
        for label, cand in [("name", n)] + [("alt", x) for x in alts]:
            if not cand:
                continue
            for o in ours:
                to, tc = set(o.split()), set(cand.split())
                if o == cand:
                    match = label + "-exact"
                    break
                if len(to) >= 2 and len(tc) >= 2 and (to <= tc or tc <= to):
                    match = label + "-fuzzy:" + o
                    break
            if match:
                break
        r["have"] = match
        rows.append(r)

    cols = ["id", "slug", "name", "alt_name", "level", "our_level", "type",
            "equipment", "tier", "calistree_area", "our_group", "pattern",
            "have", "primary_muscles", "anatomy"]
    out = RAW / "calistree-classified.tsv"
    with out.open("w") as f:
        f.write("\t".join(cols) + "\n")
        for r in rows:
            f.write("\t".join(r[c] for c in cols) + "\n")
    print(f"wrote {len(rows)} rows to {out}")

    # quick pool counts for review
    def count(pred, label):
        n = sum(1 for r in rows if pred(r))
        print(f"{label}: {n}")

    count(lambda r: r["our_level"] in ("beginner", "intermediate", "advanced"), "in-scope level")
    count(lambda r: r["tier"] in ("bodyweight", "dumbbells", "bands", "machines"), "in-scope tier")
    count(lambda r: r["have"], "already-have match")
    count(lambda r: r["type"].startswith("flexibility"), "flexibility type")


if __name__ == "__main__":
    main()
