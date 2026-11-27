#!/usr/bin/env python3
"""Cut the classified Calistree table into per-partition review pools."""
import csv
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW = HERE
TIER_SCOPE = {"bodyweight", "dumbbells", "bands", "machines"}
LEVEL_SCOPE = {"beginner", "intermediate", "advanced"}

with (RAW / "calistree-classified.tsv").open() as f:
    rows = list(csv.DictReader(f, delimiter="\t"))

in_scope = [r for r in rows if r["tier"] in TIER_SCOPE and r["our_level"] in LEVEL_SCOPE]

def pool(name, pred):
    sel = [r for r in rows if r["tier"] in TIER_SCOPE and r["our_level"] in LEVEL_SCOPE and pred(r)]
    sel.sort(key=lambda r: (r["have"] != "", r["calistree_area"], r["name"]))
    cols = ["id", "name", "alt_name", "our_level", "tier", "equipment", "pattern",
            "have", "primary_muscles"]
    with (RAW / f"pool-{name}.tsv").open("w") as f:
        f.write("\t".join(cols) + "\n")
        for r in sel:
            f.write("\t".join(r[c] for c in cols) + "\n")
    print(name, len(sel))

pool("legs-front-hip", lambda r: r["our_group"] == "Legs" and r["pattern"] in ("squat", "knee-extension", "posterior-chain") or "iliacus" in r["anatomy"].lower() or "psoas" in r["anatomy"].lower() or "adductor" in r["anatomy"].lower())
pool("posterior-calves", lambda r: r["our_group"] == "Legs" and r["pattern"] in ("hinge", "knee-flexion", "calf") or "gluteus" in r["anatomy"].lower() or "hamstring" in r["anatomy"].lower() or "gastrocnemius" in r["anatomy"].lower() or "soleus" in r["anatomy"].lower() or "piriformis" in r["anatomy"].lower())
pool("core-stability-plyo", lambda r: r["our_group"] == "Core" or r["pattern"] in ("core", "plyometric") or "balance" in r["type"] and "flexibility" not in r["type"])
pool("upper-body", lambda r: r["our_group"] in ("Chest", "Back", "Shoulders", "Arms") and r["pattern"] in ("push", "pull"))
pool("mobility", lambda r: "flexibility" in r["type"] or r["pattern"] == "core" and "breathe" in r["name"].lower())
pool("other-groups", lambda r: r["our_group"] in ("Other", "Cardio") or r["tier"] == "other")
