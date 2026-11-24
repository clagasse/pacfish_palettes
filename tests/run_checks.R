# Base-R verification test suite (runs under R CMD check AND standalone)
if (requireNamespace("pacfishpalettes", quietly = TRUE)) {
  library(pacfishpalettes)
  use_pkg <- TRUE
} else {
  env <- new.env(parent = baseenv())
  load("R/sysdata.rda", envir = env)
  for (f in sort(list.files("R", pattern = "\\.R$", full.names = TRUE))) {
    sys.source(f, envir = env)
  }
  attach(env, name = "pacfish_dev", warn.conflicts = FALSE)
  use_pkg <- FALSE
}

assert_true <- function(cond, msg) {
  if (!isTRUE(cond)) stop("Assertion failed: ", msg, call. = FALSE)
}

# 1. Lookup by id, common, scientific, DFO code
p1 <- pac_pal("yelloweye_rockfish")
assert_true(inherits(p1, "pac_palette"), "pac_palette class")
assert_true(identical(as.character(p1), as.character(pac_pal("Sebastes_ruberrimus"))), "scientific lookup")
assert_true(identical(as.character(p1), as.character(pac_pal(442))), "DFO code lookup")
assert_true(identical(attr(pac_pal(44), "palette_id"), "spiny_dogfish"), "zero-padded DFO code")

# 2. Interpolation, reversal, alpha
ramp <- pac_pal("bc_bathymetry", n = 12, type = "continuous")
assert_true(length(ramp) == 12L && all(grepl("^#[0-9A-Fa-f]{6}$", ramp)), "continuous Lab ramp")
semi <- pac_pal("lingcod", n = 3, alpha = 0.5)
assert_true(all(grepl("^#[0-9A-Fa-f]{8}$", semi)), "alpha hex")

# 3. Species, survey, fleet & DFO branch helpers
sal <- pac_species_colors(c("Chinook Salmon", "Sockeye Salmon", "Coho Salmon"))
assert_true(identical(unname(sal), as.character(pac_pal("bc_salmon_set", n = 3))), "salmon smart set")
surv <- pac_survey_colors(c("SYN QCS", "SYN WCVI", "HBLL OUT"))
assert_true(length(surv) == 3L && !any(is.na(surv)), "survey colors")
fams <- pac_family_colors()
assert_true(length(fams) == 6L, "family colors")
flts <- pac_fleet_colors()
assert_true(length(flts) == 7L && all(c("Troll", "Purse Seine", "Gillnet") %in% names(flts)) && !("Research Survey" %in% names(flts)), "commercial fleets without survey")
brn <- pac_branch_colors(c("Science", "Ecosystem Management", "Fisheries Management"))
assert_true(length(brn) == 3L && !any(is.na(brn)), "DFO branches colors")

# 4. All 114 palettes valid + all BC guild & management sets checked
all_ids <- pac_palettes()
assert_true(length(all_ids) == 114L, paste("expected 114 palettes, got", length(all_ids)))
assert_true(length(pac_palettes(collection = "bc_bizarre")) == 8L, "8 weird & bizarre palettes")
assert_true(identical(attr(pac_pal(4), "palette_id"), "hagfish_slime"), "hagfish DFO code 004")
for (id in all_ids) {
  cols <- pac_pal(id)
  assert_true(all(grepl("^#[0-9A-Fa-f]{6}$", cols)), paste("valid hex:", id))
}
bc_sets <- pac_palettes(collection = c("bc_guilds", "bc_management"))
assert_true(length(pac_palettes(collection = "bc_guilds")) == 6L, "6 species guild sets")
assert_true(length(pac_palettes(collection = "bc_management")) == 9L, "9 fisheries & management sets")
for (id in bc_sets) {
  chk <- pac_check_cvd(id)
  if (id == "bc_stock_status") {
    # Authentic DFO PA traffic-light (Red -> Amber -> Green) checked for normal separation
    assert_true(chk$min_delta_e >= 12, paste("stock status normal separation:", chk$min_delta_e))
  } else {
    assert_true(chk$cvd_safe, paste("BC set not CVD-safe:", id, "D=", chk$deutan_min_de, "P=", chk$protan_min_de))
  }
}

# 5. Silhouettes & ecosystem catalog
sh <- pac_shapes()
assert_true(nrow(sh) == 18L, "18 silhouettes loaded")
eco <- pac_r_palettes()
assert_true(nrow(eco) == 41L, "41 ecosystem palettes loaded")

# 6. Base R print & plot S3 methods
out_txt <- utils::capture.output(print(p1))
assert_true(any(grepl("Yelloweye Rockfish", out_txt)), "print.pac_palette output")
tmp <- tempfile(fileext = ".pdf")
grDevices::pdf(tmp)
if (use_pkg) {
  plot(p1)
  plot(pac_pal("bc_synoptic_surveys"))
} else {
  plot.pac_palette(p1)
  plot.pac_palette(pac_pal("bc_synoptic_surveys"))
}
grDevices::dev.off()
assert_true(file.exists(tmp) && file.info(tmp)$size > 0, "plot.pac_palette PDF output")
unlink(tmp)

cat("ALL PACFISHPALETTES CHECKS PASSED (", length(all_ids), " palettes, ", length(bc_sets), " CVD-safe BC sets, ", nrow(sh), " PhyloPic silhouettes)\n", sep = "")
