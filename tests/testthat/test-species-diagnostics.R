test_that("species, family, and survey helpers return consistent named vectors", {
  sal <- pac_species_colors(c("Chinook Salmon", "Sockeye Salmon", "Coho Salmon"))
  expect_equal(names(sal), c("Chinook Salmon", "Sockeye Salmon", "Coho Salmon"))
  expect_equal(unname(sal), as.character(pac_pal("bc_salmon_set", n = 3)))

  gld <- pac_species_colors(c("Yelloweye Rockfish", "Pacific Halibut", "Sablefish"), by = "guild")
  expect_length(gld, 3L)
  expect_true(all(grepl("^#[0-9A-Fa-f]{6}$", gld)))

  surv <- pac_survey_colors(c("SYN QCS", "SYN WCVI", "HBLL OUT"))
  expect_equal(names(surv), c("SYN QCS", "SYN WCVI", "HBLL OUT"))
  expect_false(any(is.na(surv)))

  fam <- pac_family_colors()
  expect_length(fam, 6L)

  flt <- pac_fleet_colors()
  expect_length(flt, 7L)
  expect_true(all(c("Troll", "Purse Seine", "Gillnet") %in% names(flt)))
  expect_false("Research Survey" %in% names(flt))

  brn <- pac_branch_colors(c("Science", "Ecosystem Management", "Fisheries Management"))
  expect_length(brn, 3L)
  expect_false(any(is.na(brn)))
})

test_that("CVD diagnostics match canonical metadata and flag BC guild & management sets as safe", {
  sets <- setdiff(pac_palettes(collection = c("bc_guilds", "bc_management")), "bc_stock_status")
  for (id in sets) {
    chk <- pac_check_cvd(id)
    expect_true(chk$cvd_safe, info = paste(id, "D=", chk$deutan_min_de, "P=", chk$protan_min_de))
  }
  st <- pac_check_cvd("bc_stock_status")
  expect_gte(st$min_delta_e, 12)

  sim <- pac_simulate_cvd(c("#FF0000", "#0000FF"), "deutan")
  expect_length(sim, 2L)
  expect_true(all(grepl("^#[0-9A-Fa-f]{6}$", sim)))
})

test_that("PhyloPic silhouettes table is populated", {
  sh <- pac_shapes()
  expect_gte(nrow(sh), 18L)
  expect_true("sebastes" %in% sh$id)
  expect_true("salmon" %in% sh$id)
})
