"""
Fetch CC0 / CC-BY silhouettes from PhyloPic API v2 (https://api.phylopic.org)
for BC & Pacific Region marine taxa, with crisp anatomical SVG fallbacks so
both the R package and GitHub Pages work 100% offline.

Outputs:
  - inst/silhouettes/<key>.svg
  - docs/assets/silhouettes/<key>.svg
  - inst/silhouettes/manifest.json
  - inst/silhouettes/ATTRIBUTION.md
"""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INST_SIL = ROOT / "inst" / "silhouettes"
DOCS_SIL = ROOT / "docs" / "assets" / "silhouettes"

# Taxa mapped to silhouette keys used across pacfishpalettes
TAXA = [
    ("sebastes", "Rockfish", ["Sebastes", "Sebastidae", "Scorpaeniformes"]),
    ("flatfish", "Flatfish", ["Hippoglossus stenolepis", "Hippoglossus", "Pleuronectidae"]),
    ("lingcod", "Lingcod / Hexagrammid", ["Ophiodon elongatus", "Hexagrammidae", "Hexagrammos"]),
    ("sablefish", "Sablefish", ["Anoplopoma fimbria", "Anoplopomatidae", "Scorpaeniformes"]),
    ("gadid", "Cod / Hake", ["Gadus macrocephalus", "Gadus", "Gadidae"]),
    ("ratfish", "Spotted Ratfish", ["Hydrolagus colliei", "Chimaeridae", "Holocephali"]),
    ("skate", "Skate", ["Beringraja", "Raja", "Rajidae"]),
    ("shark", "Spiny Dogfish", ["Squalus", "Squalidae"]),
    ("salmon", "Pacific Salmon", ["Oncorhynchus tshawytscha", "Oncorhynchus", "Salmonidae"]),
    ("herring", "Pacific Herring / Forage", ["Clupea pallasii", "Clupea", "Clupeidae"]),
    ("tuna", "Albacore Tuna / Mackerel", ["Thunnus alalunga", "Thunnus", "Scombridae"]),
    ("crab", "Dungeness Crab", ["Metacarcinus magister", "Cancer", "Brachyura"]),
    ("prawn", "Spot Prawn", ["Pandalus", "Caridea", "Decapoda"]),
    ("bivalve", "Geoduck / Bivalve", ["Panopea", "Bivalvia"]),
    ("urchin", "Red Sea Urchin", ["Mesocentrotus", "Strongylocentrotus", "Echinoidea"]),
    ("octopus", "Giant Pacific Octopus", ["Enteroctopus dofleini", "Octopus", "Octopoda"]),
    ("abalone", "Pinto Abalone", ["Haliotis", "Gastropoda"]),
    ("seastar", "Ochre Sea Star", ["Pisaster ochraceus", "Asteroidea"]),
]

# Clean, anatomically recognizable fallback SVG paths (viewBox="0 0 120 60")
FALLBACK_SVGS: dict[str, str] = {
    "sebastes": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M12 31 C16 20, 29 14, 44 13 L48 7 L54 11 L59 6 L64 11 L70 8 L76 13 C86 15, 93 20, 99 25 L114 15 L109 30 L114 45 L99 35 C92 41, 82 46, 68 47 L63 53 L54 47 C38 47, 23 43, 14 35 L9 32 Z M32 23 A3 3 0 1 0 32 29 A3 3 0 1 0 32 23 Z"/></svg>',
    "flatfish": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M10 30 C18 15, 42 5, 68 9 C84 12, 95 20, 102 26 L115 17 L111 30 L115 43 L102 34 C95 40, 84 48, 68 51 C42 55, 18 45, 10 30 Z"/></svg>',
    "lingcod": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M8 31 C15 22, 28 18, 44 17 L50 11 L66 15 L78 13 L92 19 L101 25 L114 17 L111 30 L114 43 L101 35 C90 42, 74 44, 58 43 L48 48 L40 42 C26 41, 15 38, 8 31 Z"/></svg>',
    "sablefish": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M7 31 C16 23, 32 20, 50 19 L58 13 L66 19 L79 15 L87 21 L100 26 L114 16 L108 30 L114 44 L100 34 C87 39, 75 42, 58 41 L44 43 C27 42, 14 38, 7 31 Z"/></svg>',
    "gadid": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M9 32 C16 20, 30 15, 46 15 L52 10 L61 16 L69 11 L78 17 L88 15 L99 25 L113 17 L110 30 L113 43 L99 35 L86 43 L74 41 L64 46 L54 42 C36 43, 21 41, 13 36 L11 40 L9 32 Z"/></svg>',
    "ratfish": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M10 30 C16 19, 28 15, 40 16 L44 5 L52 19 C64 21, 78 26, 116 30 C78 33, 64 38, 50 40 L44 52 L34 39 C22 39, 13 36, 10 30 Z"/></svg>',
    "skate": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M8 30 L38 7 C52 9, 62 18, 69 24 L114 28 L114 32 L69 36 C62 42, 52 51, 38 53 L8 30 Z"/></svg>',
    "shark": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M8 33 C18 24, 34 21, 50 20 L57 9 L64 21 L82 23 L88 17 L93 24 L102 26 L116 11 L109 29 L114 39 L101 34 C86 38, 66 40, 48 39 L38 49 L32 39 C20 39, 12 37, 8 33 Z"/></svg>',
    "salmon": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M8 30 C16 20, 34 15, 55 16 L63 10 L71 17 C81 18, 88 21, 93 23 L96 19 L99 24 L114 14 L108 30 L114 46 L99 36 C88 41, 74 44, 56 44 L48 49 L42 43 C25 42, 14 38, 8 30 Z"/></svg>',
    "herring": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M10 30 C20 21, 40 18, 60 19 L66 13 L73 20 C84 21, 93 24, 100 26 L115 15 L107 30 L115 45 L100 34 C88 39, 72 41, 54 41 C34 41, 18 37, 10 30 Z"/></svg>',
    "tuna": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M7 30 C18 17, 42 12, 65 15 L72 6 L78 16 C88 18, 96 22, 103 26 L116 11 L109 30 L116 49 L103 34 C94 39, 82 43, 66 45 L58 53 L52 44 C32 44, 16 39, 7 30 Z"/></svg>',
    "crab": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M36 24 C42 14, 78 14, 84 24 C90 34, 82 46, 60 46 C38 46, 30 34, 36 24 Z M38 22 C28 16, 22 10, 26 6 C32 8, 34 14, 42 18 M82 22 C92 16, 98 10, 94 6 C88 8, 86 14, 78 18 M34 30 L16 26 L12 34 M34 36 L16 38 L14 46 M38 41 L24 49 L22 55 M86 30 L104 26 L108 34 M86 36 L104 38 L106 46 M82 41 L96 49 L98 55" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "prawn": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M18 30 C26 18, 48 14, 70 20 C84 24, 96 32, 106 42 L94 46 C86 37, 74 32, 60 31 C44 30, 30 33, 22 39 L12 34 Z M20 26 L6 16 M22 24 L8 22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    "bivalve": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M26 30 C26 16, 46 10, 68 14 C82 17, 90 22, 92 26 L108 24 C112 24, 112 36, 108 36 L92 34 C90 40, 80 46, 66 48 C44 50, 26 44, 26 30 Z"/></svg>',
    "urchin": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><circle cx="60" cy="30" r="15" fill="currentColor"/><g stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="60" y1="5" x2="60" y2="55"/><line x1="35" y1="30" x2="85" y2="30"/><line x1="42" y1="12" x2="78" y2="48"/><line x1="78" y1="12" x2="42" y2="48"/><line x1="49" y1="7" x2="71" y2="53"/><line x1="71" y1="7" x2="49" y2="53"/><line x1="37" y1="19" x2="83" y2="41"/><line x1="83" y1="19" x2="37" y2="41"/></g></svg>',
    "octopus": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M46 22 C46 10, 74 10, 74 22 C74 30, 69 34, 60 34 C51 34, 46 30, 46 22 Z"/><path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M50 32 C42 38, 32 36, 22 44 M53 33 C46 42, 40 48, 30 53 M57 34 C55 44, 52 50, 46 55 M63 34 C65 44, 68 50, 74 55 M67 33 C74 42, 80 48, 90 53 M70 32 C78 38, 88 36, 98 44"/></svg>',
    "abalone": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" fill-rule="evenodd" d="M22 33 C22 17, 44 10, 68 12 C88 14, 98 22, 96 34 C94 46, 74 50, 50 48 C30 46, 22 42, 22 33 Z M44 21 A2.5 2.5 0 1 0 44 26 A2.5 2.5 0 1 0 44 21 Z M54 18 A2.5 2.5 0 1 0 54 23 A2.5 2.5 0 1 0 54 18 Z M65 17 A2.5 2.5 0 1 0 65 22 A2.5 2.5 0 1 0 65 17 Z M76 18 A2.5 2.5 0 1 0 76 23 A2.5 2.5 0 1 0 76 18 Z"/></svg>',
    "seastar": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="currentColor" d="M60 6 L67 22 L85 21 L71 33 L77 51 L60 40 L43 51 L49 33 L35 21 L53 22 Z"/></svg>',
}


def fetch_json(url: str, timeout: float = 12.0) -> dict:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "pacfishpalettes/0.1.0",
            "Accept": "application/vnd.phylopic.v2+json, application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_text(url: str, timeout: float = 12.0) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "pacfishpalettes/0.1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def normalize_svg(svg_text: str) -> str:
    # Strip xml/doctype headers and normalize fill to currentColor for clean tinting
    svg = re.sub(r"<\?xml[^>]*\?>", "", svg_text).strip()
    svg = re.sub(r"<!DOCTYPE[^>]*>", "", svg).strip()
    # Keep viewBox; remove fixed width/height on root <svg> so CSS scales cleanly
    m = re.match(r"(<svg\b[^>]*>)", svg, flags=re.IGNORECASE | re.DOTALL)
    if m:
        tag = m.group(1)
        tag = re.sub(r'\s(?:width|height)="[^"]*"', "", tag, flags=re.IGNORECASE)
        if 'fill=' not in tag.lower():
            tag = tag[:-1] + ' fill="currentColor">'
        svg = tag + svg[m.end():]
    svg = re.sub(r'fill="(?:#000000|#000|black|rgb\(0,\s*0,\s*0\))"', 'fill="currentColor"', svg, flags=re.IGNORECASE)
    svg = re.sub(r"fill:\s*(?:#000000|#000|black|rgb\(0,\s*0,\s*0\))", "fill:currentColor", svg, flags=re.IGNORECASE)
    return svg


def get_phylopic_build() -> int:
    root = fetch_json("https://api.phylopic.org/")
    return int(root["build"])


def extract_svg_from_image(it: dict, taxon: str) -> dict | None:
    links = it.get("_links", {})
    lic_href = (links.get("license", {}).get("href") or "").lower()
    if "zero/1.0" in lic_href or "publicdomain" in lic_href:
        lic_label = "CC0 1.0"
        rank = 0
    elif "licenses/by/" in lic_href:
        lic_label = "CC BY"
        rank = 1
    else:
        return None

    vec = links.get("vectorFile", {}).get("href")
    if not vec:
        return None
    svg_raw = fetch_text(vec)
    if "<svg" not in svg_raw.lower():
        return None
    attr = it.get("attribution") or "PhyloPic contributor"
    return {
        "rank": rank,
        "taxon": taxon,
        "source": "phylopic",
        "phylopic_uuid": it.get("uuid"),
        "attribution": attr,
        "license": lic_label,
        "license_url": links.get("license", {}).get("href", ""),
        "svg": normalize_svg(svg_raw),
    }


def query_phylopic(taxon_names: list[str], build: int) -> dict | None:
    """Query PhyloPic API v2 for a CC0 or CC-BY vector SVG matching the taxon list."""
    for taxon in taxon_names:
        q = urllib.parse.quote(taxon.lower())
        items = []
        # 1) Query /images directly using filter_name (must be lowercase in API v2)
        try:
            url = f"https://api.phylopic.org/images?build={build}&filter_name={q}&embed_items=true&page=0"
            data = fetch_json(url)
            items = data.get("_embedded", {}).get("items", [])
        except Exception:
            items = []

        # 2) Fallback: query /nodes and inspect embedded primaryImage
        if not items:
            try:
                nurl = f"https://api.phylopic.org/nodes?build={build}&filter_name={q}&embed_items=true&embed_primaryImage=true&page=0"
                ndata = fetch_json(nurl)
                for node in ndata.get("_embedded", {}).get("items", []):
                    prim = node.get("_embedded", {}).get("primaryImage")
                    if prim:
                        items.append(prim)
            except Exception:
                items = []

        if not items:
            continue

        candidates = []
        for it in items[:8]:
            try:
                res = extract_svg_from_image(it, taxon)
            except Exception:
                res = None
            if res:
                candidates.append(res)
                if res["rank"] == 0:
                    break
        if candidates:
            candidates.sort(key=lambda r: r["rank"])
            best = candidates[0]
            best.pop("rank", None)
            return best
    return None


def main() -> None:
    INST_SIL.mkdir(parents=True, exist_ok=True)
    DOCS_SIL.mkdir(parents=True, exist_ok=True)

    manifest = {}
    phylopic_hits = 0
    build = None
    try:
        build = get_phylopic_build()
        print(f"Connected to PhyloPic API v2 (build {build})")
    except Exception as exc:
        print(f"[Offline] PhyloPic unreachable ({exc}); using bundled anatomical SVG silhouettes.")

    for key, label, taxa in TAXA:
        entry = None
        if build is not None:
            try:
                entry = query_phylopic(taxa, build)
                if entry:
                    phylopic_hits += 1
                    print(f"[PhyloPic] {key:10s} <- {entry['taxon']} ({entry['license']}, {entry['attribution']})")
            except Exception as exc:
                print(f"[Warn] PhyloPic lookup failed for {key}: {exc}")

        if entry:
            svg_text = entry["svg"]
            meta = {
                "id": key,
                "label": label,
                "taxon": entry["taxon"],
                "source": "phylopic",
                "phylopic_uuid": entry["phylopic_uuid"],
                "attribution": entry["attribution"],
                "license": entry["license"],
                "license_url": entry["license_url"],
                "file": f"{key}.svg",
            }
        else:
            svg_text = FALLBACK_SVGS[key]
            meta = {
                "id": key,
                "label": label,
                "taxon": taxa[0],
                "source": "bundled",
                "phylopic_uuid": None,
                "attribution": "pacfishpalettes anatomical silhouette (CC0 1.0)",
                "license": "CC0 1.0",
                "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
                "file": f"{key}.svg",
            }

        (INST_SIL / f"{key}.svg").write_text(svg_text + "\n", encoding="utf-8")
        (DOCS_SIL / f"{key}.svg").write_text(svg_text + "\n", encoding="utf-8")
        manifest[key] = meta

    (INST_SIL / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    # Generate ATTRIBUTION.md
    attr_lines = [
        "# Silhouette Attribution & Licensing",
        "",
        "Silhouettes bundled in `pacfishpalettes` are sourced from **PhyloPic** (CC0 1.0 / CC BY) or bundled CC0 anatomical silhouettes.",
        "",
        "| Key | Group | Taxon | Source | Attribution | License | PhyloPic UUID |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
    ]
    for key, m in manifest.items():
        uuid_str = f"`{m['phylopic_uuid']}`" if m["phylopic_uuid"] else "—"
        attr_lines.append(
            f"| `{key}` | {m['label']} | *{m['taxon']}* | {m['source']} | {m['attribution']} | {m['license']} | {uuid_str} |"
        )
    (INST_SIL / "ATTRIBUTION.md").write_text("\n".join(attr_lines) + "\n", encoding="utf-8")
    print(f"\nWrote {len(manifest)} silhouettes ({phylopic_hits} from PhyloPic, {len(manifest) - phylopic_hits} bundled).")


if __name__ == "__main__":
    main()
