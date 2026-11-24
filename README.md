# pacfishpalettes

**British Columbia & Pacific Region Marine Colour Palettes + Interactive R Palette Studio**

`pacfishpalettes` is a dual-purpose repository combining:
1. A lightweight, zero-dependency-core **R package** (`pacfishpalettes`) providing bespoke colour palettes for British Columbia groundfish, Pacific salmon, pelagics & forage fish, commercial shellfish/invertebrates, and CVD-safe Pacific Region fisheries management sets — integrating ergonomics from **`fishualize`**, **`gfsynopsis`**, **`paletteer`**, **`cols4all`**, and **PhyloPic**.
2. An **interactive GitHub Pages Palette Studio** (`docs/`) for searching, comparing, colour-vision-deficiency (CVD) auditing, mixing, previewing on fisheries plots, and exporting ready-to-paste R code across both bespoke BC palettes and 9 top R palette packages.

---

## Palette Collections (114 Palettes)

| Collection | Count | Highlights |
| :--- | :---: | :--- |
| **BC Groundfish (`bc_groundfish`)** | 31 | Comprehensive `gfsynopsis`-aligned coverage: 14 rockfishes & thornyheads (*Sebastidae*), 7 flatfishes (*Pleuronectidae*), Lingcod & Kelp Greenling (*Hexagrammidae*), Sablefish, Pacific Cod, Walleye Pollock, Pacific Hake, Spotted Ratfish, Big & Longnose Skates, and Spiny Dogfish |
| **Pacific Salmon (`bc_salmon`)** | 6 | Chinook, Sockeye, Coho, Pink, Chum, and Steelhead |
| **Pelagics & Forage (`bc_pelagics`)** | 6 | Pacific Herring, Albacore Tuna, Pacific Sardine, Eulachon, Pacific Mackerel, Northern Anchovy |
| **Shellfish & Marine (`bc_invertebrates`)** | 7 | Dungeness Crab, Spot Prawn, Pacific Geoduck, Red Sea Urchin, Giant Pacific Octopus, Pinto Abalone, Ochre Sea Star |
| **Weird & Bizarre (`bc_bizarre`)** | 8 | Surreal, electric & unusual BC marine life: Opalescent Nudibranch, Pacific Spiny Lumpsucker, Grunt Sculpin, Blue-Fleshed Lingcod (Biliverdin), Strawberry Anemone Wall, Abyssal Bioluminescence, Fried Egg Jellyfish, and Pacific Hagfish Slime |
| **Species Guilds & Assemblages (`bc_guilds`)** | 6 | Mathematically verified **CVD-safe** multi-species palettes: `bc_groundfish_guilds`, `bc_rockfish_set`, `bc_flatfish_set`, `bc_salmon_set`, `bc_pelagic_set`, `bc_invertebrate_set` |
| **Fisheries, Management & Ecosystem (`bc_management`)** | 9 | Mathematically verified **CVD-safe** operational & ecosystem palettes: `bc_fleets` (Bottom Trawl, Midwater Trawl, Hook & Line, Trap, Troll, Purse Seine, Gillnet), `dfo_branches` (Science, Fisheries Management, Ecosystem Management, Conservation & Protection, Indigenous & Treaty, Policy & Economics), `dfo_science_divisions`, `bc_pacific_fisheries`, `bc_synoptic_surveys`, `bc_pfma_regions`, `bc_bathymetry`, `bc_stock_status`, `bc_ocean_anomaly` |
| **Integrated R Packages (`r_ecosystem`)** | 41 | Curated flagship palettes from `viridis`, `scico`, `khroma`, `RColorBrewer`, `rcartocolor`, `fishualize`, `PNWColors`, `MetBrewer`, and `ggsci` (with `paletteer` IDs) |

---

## Installation

```r
# install.packages("remotes")
remotes::install_github("<your-org-or-user>/pacfishpalettes")
```

## Quick Start in R

```r
library(pacfishpalettes)
library(ggplot2)

# 1. Lookup by palette ID, common name, scientific name, or DFO/HART species code
pac_pal("yelloweye_rockfish")
pac_pal("Sebastes_ruberrimus", n = 5)
pac_pal(442)                   # Yelloweye Rockfish (DFO code 442)
pac_pal(44)                    # Spiny Dogfish (zero-padded DFO code 044)

# 2. Smooth CIE Lab interpolation, trimming, and reversal
pac_pal("bc_bathymetry", n = 10, type = "continuous")
pac_pal("sablefish", n = 6, begin = 0.1, end = 0.9, direction = -1)

# 3. Drop-in ggplot2 scales (discrete _d, continuous _c, binned _b)
ggplot(iris, aes(Sepal.Length, Sepal.Width, colour = Species)) +
  geom_point(size = 2.5) +
  scale_colour_pac_d("bc_salmon_set")

# 4. gfsynopsis / Pacific fisheries named-vector helpers
cols <- pac_species_colors(c("Chinook Salmon", "Sockeye Salmon", "Coho Salmon"))
surv <- pac_survey_colors() # SYN QCS, SYN HS, SYN WCVI, SYN WCHG, HBLL OUT, HBLL INS
fams <- pac_family_colors() # Rockfish, Flatfish, Roundfish, Hexagrammids, Sablefish, Elasmobranchs

# 5. Add PhyloPic / bundled BC marine species silhouettes (fishualize-style)
ggplot(mtcars, aes(wt, mpg)) +
  geom_point() +
  add_pac_shape("yelloweye", xmin = 4.2, xmax = 5.3, ymin = 28, ymax = 34,
                fill = pac_pal("yelloweye")[2])
# Or delegate to rphylopic using the stored PhyloPic UUID:
# add_pac_shape("salmon", xmin = 4, xmax = 5, ymin = 25, ymax = 32, use_rphylopic = TRUE)

# 6. Pure-R perceptual & CVD safety audit (Machado 2009 + OKLab ΔE)
pac_check_cvd("bc_groundfish_guilds")
pac_simulate_cvd(pac_pal("bc_salmon_set"), "deutan")

# 7. Browse integrated R packages or launch the interactive Studio
pac_r_palettes(cvd_safe = TRUE)
pac_browse()
```

---

## Interactive GitHub Pages Palette Studio

The static web studio lives in `docs/` (zero build step required):
- **GitHub Pages:** Enable Pages in repository settings (**Deploy from GitHub Actions** using `.github/workflows/pages.yml`, or directly from `main /docs`).
- **Local Preview:**
  ```bash
  python -m http.server 8000 -d docs
  # Open http://localhost:8000
  ```

### Features
- Instant search across species common names, scientific names, DFO species codes, taxonomic families, and R packages.
- **Global Vision Simulator** (Normal, Deuteranopia, Protanopia, Tritanopia, Grayscale) applied live across every swatch, silhouette, and fisheries preview chart.
- **Live Fisheries SVG Plot Previews:** `gfsynopsis`-style Survey Biomass Index, Multi-Species Catch Composition, BC Shelf Spatial CPUE Grid, and Length-Frequency Bars.
- **Custom BC Palette Composer:** Mix & match swatches from any species or R package and audit combined CVD separability in real time.
- **One-Click R Export:** `pacfishpalettes`, standalone `ggplot2` manual vectors, `paletteer`/upstream package code, named vectors, and HEX/CSS.

---

## Rebuilding the Registry & Silhouettes

The canonical specification lives in `data-raw/palettes_spec.json`. To refresh PhyloPic silhouettes and sync both the R package and GitHub Pages catalog:

```bash
python data-raw/fetch_phylopic.py   # Fetches CC0/CC-BY PhyloPic v2 SVGs + ATTRIBUTION.md
python data-raw/build_palettes.py   # Audits OKLab CVD safety -> inst/palettes.json + docs/data/palettes.json
Rscript data-raw/build_palettes.R   # Builds R/sysdata.rda
```

## Attribution

- **Silhouettes:** Sourced from [PhyloPic](https://www.phylopic.org/) (CC0 1.0 Public Domain and CC BY contributors). Full per-taxon creator credits and PhyloPic UUIDs are recorded in [inst/silhouettes/ATTRIBUTION.md](inst/silhouettes/ATTRIBUTION.md).
- **Inspirations & Integrated Packages:** `fishualize`, `gfsynopsis` / `gfplot`, `paletteer`, `cols4all`, `viridis`, `scico`, `khroma`, `RColorBrewer`, `rcartocolor`, `PNWColors`, `MetBrewer`, and `ggsci`.
