#!/usr/bin/env python3
"""Parse fetched Calistree datasheet pages into one TSV of metadata.

Reads pages/<id>.html next to this script, extracts from each page:
  - id (from filename)
  - slug (from canonical URL)
  - name (JSON-LD ExerciseAction name)
  - alternateName (JSON-LD)
  - level (Beginner / Intermediate / Advanced, from meta description)
  - type (strength / stretch / ... from meta description)
  - equipment (from meta description "Equipment: ...")
  - muscles (from meta description "Works the ...")
  - all anatomical structures listed in JSON-LD (secondary muscles)
Writes calistree-datasheets.tsv with tab-separated columns and a header.
"""
import html
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PAGES = HERE / "pages"
OUT = HERE / "calistree-datasheets.tsv"

META_RE = re.compile(r'<meta\s+name="description"\s+content="([^"]*)"')
CANON_RE = re.compile(r'<link\s+rel="canonical"\s+href="([^"]*)"')
LD_RE = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)


def parse_page(path: Path):
    raw = path.read_text(encoding="utf-8", errors="replace")
    ex_id = path.stem
    m = META_RE.search(raw)
    desc = html.unescape(m.group(1)) if m else ""
    canon = CANON_RE.search(raw)
    slug = canon.group(1).rsplit("/", 1)[-1] if canon else ""
    slug = slug.replace(f"-{ex_id}", "")
    name = alt = ""
    level = type_ = equipment = muscles = ""
    structures: list[str] = []
    ld = LD_RE.search(raw)
    if ld:
        try:
            data = json.loads(ld.group(1))
        except json.JSONDecodeError:
            data = {}
        for node in data.get("@graph", []):
            t = node.get("@type")
            if t == "ExerciseAction":
                name = node.get("name", "")
                alt = node.get("alternateName", "") or ""
                type_ = node.get("exerciseType", "") or ""
            elif t == "PhysicalActivity":
                if not name:
                    name = node.get("name", "")
                for a in node.get("associatedAnatomy", []):
                    if isinstance(a, dict) and a.get("name"):
                        structures.append(a["name"])
    # meta description carries level, type, equipment, primary muscle line
    dm = re.match(r"^(Novice|Beginner|Intermediate|Advanced|Elite|Herculean) (.+?) exercise",
                  desc)
    if dm:
        level = dm.group(1)
        if not type_:
            type_ = dm.group(2)
    else:
        dm2 = re.match(r"^(Novice|Beginner|Intermediate|Advanced|Elite|Herculean) exercise",
                       desc)
        if dm2:
            level = dm2.group(1)
    em = re.search(r"Equipment: ([^.]+)\.", desc)
    if em:
        equipment = em.group(1).strip()
    elif "No equipment needed." in desc:
        equipment = "none"
    wm = re.search(r"Works the ([^.]+?)\. Free", desc)
    if wm:
        muscles = wm.group(1).strip()
    return {
        "id": ex_id,
        "slug": slug,
        "name": name,
        "alt_name": alt,
        "level": level,
        "type": type_,
        "equipment": equipment,
        "primary_muscles": muscles,
        "anatomy": "; ".join(dict.fromkeys(structures)),
        "description": desc,
    }


def main():
    rows = []
    for p in sorted(PAGES.glob("*.html")):
        try:
            rows.append(parse_page(p))
        except Exception as e:  # noqa: BLE001
            print(f"skip {p.stem}: {e}", file=sys.stderr)
    cols = ["id", "slug", "name", "alt_name", "level", "type", "equipment",
            "primary_muscles", "anatomy", "description"]
    with OUT.open("w", encoding="utf-8") as f:
        f.write("\t".join(cols) + "\n")
        for r in rows:
            f.write("\t".join(r[c].replace("\t", " ") for c in cols) + "\n")
    print(f"wrote {len(rows)} rows to {OUT}")


if __name__ == "__main__":
    main()
