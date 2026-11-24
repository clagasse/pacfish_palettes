test_that("palette lookup works by id, common name, scientific name, and DFO code", {
  p1 <- pac_pal("yelloweye_rockfish")
  p2 <- pac_pal("Yelloweye Rockfish")
  p3 <- pac_pal("Sebastes_ruberrimus")
  p4 <- pac_pal("Sebastes ruberrimus")
  p5 <- pac_pal(442)
  p6 <- pac_pal("442")

  expect_s3_class(p1, "pac_palette")
  expect_equal(as.character(p1), as.character(p2))
  expect_equal(as.character(p1), as.character(p3))
  expect_equal(as.character(p1), as.character(p4))
  expect_equal(as.character(p1), as.character(p5))
  expect_equal(as.character(p1), as.character(p6))

  # Zero-padded DFO code for spiny dogfish ("044")
  dog <- pac_pal(44)
  expect_equal(attr(dog, "palette_id"), "spiny_dogfish")
})

test_that("interpolation, reversal, begin/end, and alpha work cleanly", {
  ramp <- pac_pal("bc_bathymetry", n = 12, type = "continuous")
  expect_length(ramp, 12L)
  expect_true(all(grepl("^#[0-9A-Fa-f]{6}$", ramp)))

  rev_pal <- pac_pal("bc_salmon_set", direction = -1)
  orig <- pac_pal("bc_salmon_set")
  expect_equal(as.character(rev_pal), rev(as.character(orig)))
  expect_equal(names(rev_pal), rev(names(orig)))

  trimmed <- pac_pal("sablefish", n = 5, begin = 0.2, end = 0.8)
  expect_length(trimmed, 5L)

  semi <- pac_pal("lingcod", n = 3, alpha = 0.5)
  expect_true(all(grepl("^#[0-9A-Fa-f]{8}$", semi)))
})

test_that("all palettes have valid hex codes and collections are populated", {
  all_ids <- pac_palettes()
  expect_gt(length(all_ids), 95L)
  expect_gt(length(pac_palettes(collection = "bc_groundfish")), 25L)
  expect_equal(length(pac_palettes(collection = "bc_salmon")), 6L)
  expect_equal(length(pac_palettes(collection = "bc_pelagics")), 6L)
  expect_equal(length(pac_palettes(collection = "bc_invertebrates")), 7L)
  expect_equal(length(pac_palettes(collection = "bc_bizarre")), 8L)
  expect_equal(length(pac_palettes(collection = "bc_guilds")), 6L)
  expect_equal(length(pac_palettes(collection = "bc_management")), 9L)

  for (id in all_ids) {
    cols <- pac_pal(id)
    expect_true(all(grepl("^#[0-9A-Fa-f]{6}$", cols)), info = id)
  }
})
