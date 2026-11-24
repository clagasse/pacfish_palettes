#' Browse Curated Flagship R Ecosystem Palettes
#'
#' Lists the top R colour packages integrated into \pkg{pacfishpalettes}
#' (`viridis`, `scico`, `khroma`, `RColorBrewer`, `rcartocolor`, `fishualize`,
#' `PNWColors`, `MetBrewer`, `ggsci`) along with their `paletteer` identifiers
#' and CVD safety scores.
#'
#' @param package Optional package name filter (e.g. `"scico"`, `"fishualize"`,
#'   `"PNWColors"`, `"viridis"`).
#' @param type Optional type filter (`"discrete"`, `"sequential"`, `"diverging"`).
#' @param cvd_safe Logical; if `TRUE`, return only palettes rated CVD-safe.
#'
#' @return A `data.frame` of integrated external R palettes.
#' @export
#'
#' @examples
#' pac_r_palettes(package = "scico")
#' pac_r_palettes(cvd_safe = TRUE)
pac_r_palettes <- function(package = NULL, type = NULL, cvd_safe = FALSE) {
  df <- .pac_palettes_meta[.pac_palettes_meta$collection == "r_ecosystem", , drop = FALSE]
  if (!is.null(package)) {
    df <- df[tolower(df$package) %in% tolower(package), , drop = FALSE]
  }
  if (!is.null(type)) {
    df <- df[tolower(df$type) %in% tolower(type), , drop = FALSE]
  }
  if (isTRUE(cvd_safe)) {
    df <- df[isTRUE_vec(df$cvd_safe), , drop = FALSE]
  }
  keep <- c("id", "name", "package", "paletteer_id", "type", "n_colors", "cvd_safe", "cvd_rating", "notes")
  out <- df[, keep, drop = FALSE]
  rownames(out) <- NULL
  out
}

#' Open the Interactive `pacfishpalettes` Palette Studio
#'
#' Opens the GitHub Pages Palette Studio in your default web browser (or the
#' local `docs/index.html` file if running inside a cloned repository with
#' `local = TRUE`).
#'
#' @param url Character URL to the hosted GitHub Pages Palette Studio.
#' @param local Logical; if `TRUE` and `docs/index.html` exists in the current
#'   working directory, open the local file instead.
#'
#' @return Invisibly returns the opened URL or path.
#' @export
pac_browse <- function(url = "https://pacfishpalettes.github.io/pacfishpalettes/",
                       local = FALSE) {
  target <- url
  if (isTRUE(local) && file.exists("docs/index.html")) {
    target <- normalizePath("docs/index.html", winslash = "/")
  }
  utils::browseURL(target)
  invisible(target)
}
