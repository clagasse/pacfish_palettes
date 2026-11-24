# Build R/sysdata.rda from inst/palettes.json using base R only (no external deps needed)
# Run after data-raw/build_palettes.py (or data-raw/fetch_phylopic.py)

read_palettes_json <- function(path) {
  if (requireNamespace("jsonlite", quietly = TRUE)) {
    return(jsonlite::fromJSON(path, simplifyVector = FALSE))
  }
  # Fallback minimal parser using Python if jsonlite is unavailable
  stop("Please install 'jsonlite' or run `python data-raw/build_palettes.py` + `Rscript data-raw/build_palettes.R`.")
}

# Generate R/sysdata.rda cleanly via an intermediate R-native list written by Python
# or directly if jsonlite is available.
if (file.exists("data-raw/sysdata_source.R")) {
  dir.create("R", showWarnings = FALSE, recursive = TRUE)
  env <- new.env(parent = baseenv())
  sys.source("data-raw/sysdata_source.R", envir = env)
  save(list = ls(env, all.names = TRUE), envir = env, file = "R/sysdata.rda", compress = "xz")
  message("Wrote R/sysdata.rda with objects: ", paste(ls(env, all.names = TRUE), collapse = ", "))
} else {
  stop("Run `python data-raw/build_palettes.py` first to generate data-raw/sysdata_source.R")
}
