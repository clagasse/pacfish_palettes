"""
Canonical palette builder & perceptual CVD auditor for pacfishpalettes.

Reads:
  - data-raw/palettes_spec.json
  - inst/silhouettes/manifest.json (if present)

Computes:
  - OKLab lightness, chroma, pairwise Delta E under Normal, Deuteranopia,
    Protanopia, and Tritanopia vision (Machado 2009 / Vienot linear sRGB)
  - Monotonicity check for sequential palettes
  - Automatic CVD rating ('safe', 'moderate', 'caution')

Writes:
  - inst/palettes.json
  - docs/data/palettes.json
"""

from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC_PATH = ROOT / "data-raw" / "palettes_spec.json"
SIL_MANIFEST = ROOT / "inst" / "silhouettes" / "manifest.json"
OUT_INST = ROOT / "inst" / "palettes.json"
OUT_DOCS = ROOT / "docs" / "data" / "palettes.json"

# Machado et al. (2009) severity=1.0 simulation matrices in linear sRGB
CVD_MATRICES = {
    "deutan": (
        (0.367322, 0.860646, -0.227968),
        (0.280085, 0.672501, 0.047413),
        (-0.011820, 0.042940, 0.968881),
    ),
    "protan": (
        (0.152286, 1.052583, -0.204868),
        (0.114503, 0.786281, 0.099216),
        (-0.003882, -0.048116, 1.051998),
    ),
    "tritan": (
        (1.255528, -0.076749, -0.178779),
        (-0.078411, 0.930809, 0.147602),
        (0.004733, 0.691367, 0.303900),
    ),
}


def hex_to_rgb(hex_code: str) -> tuple[float, float, float]:
    h = hex_code.strip().lstrip("#")
    if len(h) != 6:
        raise ValueError(f"Invalid hex color: {hex_code}")
    return (int(h[0:2], 16) / 255.0, int(h[2:4], 16) / 255.0, int(h[4:6], 16) / 255.0)


def srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def linear_to_srgb(c: float) -> float:
    c = max(0.0, min(1.0, c))
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1.0 / 2.4)) - 0.055


def simulate_cvd_linear(lin: tuple[float, float, float], kind: str) -> tuple[float, float, float]:
    m = CVD_MATRICES[kind]
    r = max(0.0, min(1.0, m[0][0] * lin[0] + m[0][1] * lin[1] + m[0][2] * lin[2]))
    g = max(0.0, min(1.0, m[1][0] * lin[0] + m[1][1] * lin[1] + m[1][2] * lin[2]))
    b = max(0.0, min(1.0, m[2][0] * lin[0] + m[2][1] * lin[1] + m[2][2] * lin[2]))
    return (r, g, b)


def linear_to_oklab(lin: tuple[float, float, float]) -> tuple[float, float, float]:
    r, g, b = lin
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

    l_ = math.copysign(abs(l) ** (1.0 / 3.0), l)
    m_ = math.copysign(abs(m) ** (1.0 / 3.0), m)
    s_ = math.copysign(abs(s) ** (1.0 / 3.0), s)

    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return (L, a, b_)


def oklab_dist(c1: tuple[float, float, float], c2: tuple[float, float, float]) -> float:
    # Scale by 100 so numbers feel familiar like CIELAB Delta E (0..100)
    return 100.0 * math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2)


def min_pairwise_delta(labs: list[tuple[float, float, float]]) -> float:
    best = 999.0
    n = len(labs)
    for i in range(n):
        for j in range(i + 1, n):
            d = oklab_dist(labs[i], labs[j])
            if d < best:
                best = d
    return round(best, 2) if n > 1 else 100.0


def audit_palette(colors: list[str], ptype: str) -> dict:
    lins = [tuple(srgb_to_linear(ch) for ch in hex_to_rgb(c)) for c in colors]
    normal_labs = [linear_to_oklab(x) for x in lins]
    lightness = [round(lab[0] * 100.0, 1) for lab in normal_labs]

    de_normal = min_pairwise_delta(normal_labs)
    de_cvd = {}
    for kind in ("deutan", "protan", "tritan"):
        sim_labs = [linear_to_oklab(simulate_cvd_linear(x, kind)) for x in lins]
        de_cvd[kind] = min_pairwise_delta(sim_labs)

    worst_cvd = min(de_cvd.values())
    rg_worst = min(de_cvd["deutan"], de_cvd["protan"])

    # Monotonicity check for sequential ramps
    diffs = [lightness[i + 1] - lightness[i] for i in range(len(lightness) - 1)]
    monotonic = all(d >= -3.0 for d in diffs) or all(d <= 3.0 for d in diffs)
    lightness_span = round(max(lightness) - min(lightness), 1)

    if ptype == "sequential":
        if monotonic and lightness_span >= 45.0 and rg_worst >= 7.0:
            rating = "safe"
        elif lightness_span >= 35.0 and rg_worst >= 5.0:
            rating = "moderate"
        else:
            rating = "caution"
    elif ptype == "diverging":
        # Diverging palettes should preserve strong separation between left & right wings under RG CVD
        left_lab = linear_to_oklab(simulate_cvd_linear(lins[0], "deutan"))
        right_lab = linear_to_oklab(simulate_cvd_linear(lins[-1], "deutan"))
        wing_sep = round(oklab_dist(left_lab, right_lab), 2)
        if wing_sep >= 18.0 and rg_worst >= 6.5:
            rating = "safe"
        elif wing_sep >= 12.0 and rg_worst >= 4.5:
            rating = "moderate"
        else:
            rating = "caution"
    else:
        # Discrete / categorical (calibrated to Okabe-Ito D=7.6/P=9.6 and Paul Tol Bright D=7.9/P=7.2)
        if rg_worst >= 7.0 and de_normal >= 10.0:
            rating = "safe"
        elif rg_worst >= 4.5 and de_normal >= 8.0:
            rating = "moderate"
        else:
            rating = "caution"

    return {
        "cvd_safe": rating == "safe",
        "cvd_rating": rating,
        "min_delta_e": de_normal,
        "cvd_min_delta_e": round(worst_cvd, 2),
        "deutan_min_de": de_cvd["deutan"],
        "protan_min_de": de_cvd["protan"],
        "tritan_min_de": de_cvd["tritan"],
        "lightness": lightness,
        "lightness_span": lightness_span,
        "monotonic": monotonic,
    }


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    sil_manifest = {}
    if SIL_MANIFEST.exists():
        sil_manifest = json.loads(SIL_MANIFEST.read_text(encoding="utf-8"))

    seen_ids = set()
    enriched = []
    for p in spec["palettes"]:
        pid = p["id"]
        if pid in seen_ids:
            raise ValueError(f"Duplicate palette id: {pid}")
        seen_ids.add(pid)
        colors = [c.upper() for c in p["colors"]]
        audit = audit_palette(colors, p["type"])
        item = dict(p)
        item["colors"] = colors
        item["n_colors"] = len(colors)
        item["audit"] = audit
        sil_key = item.get("silhouette")
        if sil_key and sil_key in sil_manifest:
            item["silhouette_meta"] = sil_manifest[sil_key]
        enriched.append(item)

    payload = {
        "meta": spec["meta"],
        "silhouettes": sil_manifest,
        "palettes": enriched,
    }

    OUT_INST.parent.mkdir(parents=True, exist_ok=True)
    OUT_DOCS.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    OUT_INST.write_text(serialized, encoding="utf-8")
    OUT_DOCS.write_text(serialized, encoding="utf-8")

    # Emit pure-R data source for R/sysdata.rda (zero external R deps needed)
    write_r_sysdata_source(payload, ROOT / "data-raw" / "sysdata_source.R")

    # Summary report
    by_col: dict[str, int] = {}
    sets_audit = []
    ref_ids = {"khroma_okabeito", "khroma_bright", "khroma_muted", "carto_safe", "brewer_dark2", "brewer_set2"}
    ref_audit = []
    for p in enriched:
        by_col[p["collection"]] = by_col.get(p["collection"], 0) + 1
        row = (p["id"], p["type"], p["audit"]["cvd_rating"], p["audit"]["min_delta_e"], p["audit"]["deutan_min_de"], p["audit"]["protan_min_de"], p["audit"]["tritan_min_de"])
        if p["collection"] in ("bc_guilds", "bc_management"):
            sets_audit.append(row)
        if p["id"] in ref_ids:
            ref_audit.append(row)

    print(f"Built {len(enriched)} palettes -> {OUT_INST.relative_to(ROOT)} & {OUT_DOCS.relative_to(ROOT)}")
    for k, v in by_col.items():
        print(f"  {k}: {v}")
    print("\nReference Palettes CVD Audit (N / D / P / T min OKLab dE):")
    for row in ref_audit:
        print(f"  {row[0]:24s} ({row[1]:10s}) -> {row[2]:8s} | N={row[3]:5.1f} D={row[4]:5.1f} P={row[5]:5.1f} T={row[6]:5.1f}")
    print("\nBC Management/Taxonomic Sets CVD Audit (N / D / P / T min OKLab dE):")
    for row in sets_audit:
        print(f"  {row[0]:24s} ({row[1]:10s}) -> {row[2]:8s} | N={row[3]:5.1f} D={row[4]:5.1f} P={row[5]:5.1f} T={row[6]:5.1f}")


def r_str(val) -> str:
    if val is None:
        return "NA_character_"
    s = str(val).replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'"{s}"'


def r_chr_vec(vals: list[str] | None) -> str:
    if not vals:
        return "character(0)"
    return "c(" + ", ".join(r_str(v) for v in vals) + ")"


def write_r_sysdata_source(payload: dict, out_path: Path) -> None:
    lines = [
        "# Auto-generated by data-raw/build_palettes.py -- DO NOT EDIT BY HAND",
        "",
        ".pac_palettes_list <- list(",
    ]
    pal_entries = []
    for p in payload["palettes"]:
        cols = p["colors"]
        labels = p.get("labels")
        if labels and len(labels) == len(cols):
            pairs = ", ".join(f"{r_str(lbl)} = {r_str(c)}" for lbl, c in zip(labels, cols))
            pal_entries.append(f"  {r_str(p['id'])} = c({pairs})")
        else:
            pal_entries.append(f"  {r_str(p['id'])} = {r_chr_vec(cols)}")
    lines.append(",\n".join(pal_entries))
    lines.append(")\n")

    # Metadata data.frame
    cols_spec = [
        ("id", "chr"),
        ("name", "chr"),
        ("scientific_name", "chr"),
        ("common_name", "chr"),
        ("dfo_code", "chr"),
        ("collection", "chr"),
        ("group", "chr"),
        ("family", "chr"),
        ("type", "chr"),
        ("n_colors", "int"),
        ("package", "chr"),
        ("paletteer_id", "chr"),
        ("silhouette", "chr"),
        ("habitat", "chr"),
        ("notes", "chr"),
        ("cvd_safe", "lgl"),
        ("cvd_rating", "chr"),
        ("min_delta_e", "num"),
        ("cvd_min_delta_e", "num"),
    ]
    lines.append(".pac_palettes_meta <- data.frame(")
    col_lines = []
    for key, kind in cols_spec:
        vals = []
        for p in payload["palettes"]:
            if key in ("cvd_safe", "cvd_rating", "min_delta_e", "cvd_min_delta_e"):
                v = p["audit"].get(key)
            else:
                v = p.get(key)
            if kind == "chr":
                vals.append(r_str(v))
            elif kind == "int":
                vals.append(f"{int(v)}L" if v is not None else "NA_integer_")
            elif kind == "lgl":
                vals.append("TRUE" if v else "FALSE")
            elif kind == "num":
                vals.append(f"{float(v):.2f}" if v is not None else "NA_real_")
        col_lines.append(f"  {key} = c({', '.join(vals)})")
    col_lines.append("  stringsAsFactors = FALSE")
    lines.append(",\n".join(col_lines))
    lines.append(")\n")

    # Silhouettes metadata data.frame + polygon/path data
    sils = payload.get("silhouettes", {})
    lines.append(".pac_silhouettes_meta <- data.frame(")
    if sils:
        keys = list(sils.keys())
        lines.append(f"  id = {r_chr_vec(keys)},")
        lines.append(f"  label = {r_chr_vec([sils[k].get('label', k) for k in keys])},")
        lines.append(f"  taxon = {r_chr_vec([sils[k].get('taxon', '') for k in keys])},")
        lines.append(f"  source = {r_chr_vec([sils[k].get('source', 'bundled') for k in keys])},")
        lines.append(f"  phylopic_uuid = {r_chr_vec([sils[k].get('phylopic_uuid') for k in keys])},")
        lines.append(f"  attribution = {r_chr_vec([sils[k].get('attribution', '') for k in keys])},")
        lines.append(f"  license = {r_chr_vec([sils[k].get('license', 'CC0 1.0') for k in keys])},")
        lines.append(f"  file = {r_chr_vec([sils[k].get('file', '') for k in keys])},")
        lines.append("  stringsAsFactors = FALSE")
    else:
        lines.append("  id = character(0), label = character(0), taxon = character(0), source = character(0),")
        lines.append("  phylopic_uuid = character(0), attribution = character(0), license = character(0), file = character(0),")
        lines.append("  stringsAsFactors = FALSE")
    lines.append(")\n")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
