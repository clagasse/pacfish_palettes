#' Retrieve a BC & Pacific Region Marine Colour Palette
#'
#' Looks up a palette from \pkg{pacfishpalettes} by palette ID, display name,
#' common name, scientific name (`Genus_species` or `Genus species`), or DFO
#' 3-digit species code (e.g., `442` for Yelloweye Rockfish, `124` for Chinook
#' Salmon, `614` for Pacific Halibut). Supports smooth Lab interpolation,
#' reversal, trimming (`begin` / `end`), and transparency (`alpha`).
#'
#' @param name Character or numeric identifier: palette ID (e.g. `"yelloweye_rockfish"`,
#'   `"bc_salmon_set"`), common name (`"Yelloweye Rockfish"` or `"yelloweye"`),
#'   scientific name (`"Sebastes_ruberrimus"` or `"Sebastes ruberrimus"`), or
#'   DFO species code (`442`, `"442"`).
#' @param n Optional integer number of colours to return. If `NULL`, returns the
#'   native palette length. If `n` exceeds native length (or `type = "continuous"`),
#'   colours are smoothly interpolated in perceptual CIE Lab space.
#' @param type Either `"discrete"` (default) or `"continuous"`.
#' @param direction `1` (default) for normal order, `-1` to reverse.
#' @param begin,end Numeric values in `[0, 1]` specifying the start and end of
#'   the colour ramp to sample (useful for avoiding extreme light/dark endpoints).
#' @param alpha Numeric transparency in `[0, 1]`. Default `1` (opaque).
#'
#' @return A character vector of hex colours with class `c("pac_palette", "character")`
#'   and attributes `palette_id`, `palette_name`, `scientific_name`, `dfo_code`,
#'   and `palette_type`.
#' @export
#'
#' @examples
#' pac_pal("yelloweye_rockfish")
#' pac_pal("Sebastes_ruberrimus", n = 4)
#' pac_pal(442)
#' pac_pal("bc_bathymetry", n = 9, type = "continuous")
#' pac_pal("bc_salmon_set")
pac_pal <- function(name,
                    n = NULL,
                    type = c("discrete", "continuous"),
                    direction = 1,
                    begin = 0,
                    end = 1,
                    alpha = 1) {
  type <- match.arg(type)
  if (!direction %in% c(1, -1)) {
    stop("`direction` must be 1 or -1.", call. = FALSE)
  }
  if (!is.numeric(begin) || !is.numeric(end) || begin < 0 || end > 1 || begin >= end) {
    stop("`begin` and `end` must satisfy 0 <= begin < end <= 1.", call. = FALSE)
  }
  if (!is.numeric(alpha) || alpha < 0 || alpha > 1) {
    stop("`alpha` must be between 0 and 1.", call. = FALSE)
  }

  idx <- .resolve_palette_index(name)
  meta <- .pac_palettes_meta[idx, , drop = FALSE]
  base_cols <- .pac_palettes_list[[meta$id]]
  col_names <- names(base_cols)

  if (direction == -1) {
    base_cols <- rev(base_cols)
    if (!is.null(col_names)) col_names <- rev(col_names)
  }

  k <- length(base_cols)
  if (is.null(n)) {
    n <- k
  }
  n <- as.integer(n)
  if (is.na(n) || n < 1L) {
    stop("`n` must be a positive integer.", call. = FALSE)
  }

  if (type == "discrete" && begin == 0 && end == 1 && n <= k) {
    out <- unname(base_cols[seq_len(n)])
    if (!is.null(col_names)) names(out) <- col_names[seq_len(n)]
  } else {
    ramp <- grDevices::colorRampPalette(unname(base_cols), space = "Lab")
    grid_n <- 256L
    fine <- ramp(grid_n)
    lo <- max(1L, as.integer(round(begin * (grid_n - 1L))) + 1L)
    hi <- min(grid_n, as.integer(round(end * (grid_n - 1L))) + 1L)
    sub_fine <- fine[lo:hi]
    if (n == 1L) {
      out <- sub_fine[ceiling(length(sub_fine) / 2)]
    } else {
      picks <- as.integer(round(seq(1, length(sub_fine), length.out = n)))
      out <- sub_fine[picks]
    }
  }

  if (alpha < 1) {
    nms <- names(out)
    out <- grDevices::adjustcolor(out, alpha.f = alpha)
    if (!is.null(nms)) names(out) <- nms
  }

  structure(
    out,
    class = c("pac_palette", "character"),
    palette_id = meta$id,
    palette_name = meta$name,
    scientific_name = meta$scientific_name,
    dfo_code = meta$dfo_code,
    palette_type = meta$type,
    package = meta$package
  )
}

#' List Available Palettes
#'
#' Returns the IDs of available palettes in \pkg{pacfishpalettes}, optionally
#' filtered by collection, palette type, taxonomic family, group, or CVD safety.
#'
#' @param collection Optional character filter: one or more of `"bc_groundfish"`,
#'   `"bc_salmon"`, `"bc_pelagics"`, `"bc_invertebrates"`, `"bc_bizarre"`,
#'   `"bc_guilds"`, `"bc_management"`, `"r_ecosystem"`.
#' @param type Optional filter: `"discrete"`, `"sequential"`, or `"diverging"`.
#' @param family Optional taxonomic family or package name (case-insensitive).
#' @param group Optional species/set group (e.g. `"Rockfish"`, `"Flatfish"`, `"Salmon"`).
#' @param cvd_safe Logical; if `TRUE`, return only palettes rated CVD-safe.
#' @param include_external Logical; if `FALSE`, return only bespoke BC/Pacific
#'   palettes (`package == "pacfishpalettes"`). Default `TRUE`.
#'
#' @return A character vector of palette IDs.
#' @export
#'
#' @examples
#' pac_palettes(collection = "bc_groundfish")
#' pac_palettes(collection = "bc_guilds", cvd_safe = TRUE)
#' pac_palettes(collection = "bc_management", cvd_safe = TRUE)
pac_palettes <- function(collection = NULL,
                         type = NULL,
                         family = NULL,
                         group = NULL,
                         cvd_safe = FALSE,
                         include_external = TRUE) {
  df <- pac_palette_info(
    collection = collection,
    type = type,
    family = family,
    group = group,
    cvd_safe = cvd_safe,
    include_external = include_external
  )
  df$id
}

#' Inspect Palette Metadata Table
#'
#' Returns a data frame containing metadata, taxonomic fields, DFO species codes,
#' `paletteer` identifiers, and perceptual CVD audit metrics for palettes.
#'
#' @inheritParams pac_palettes
#' @return A `data.frame` with one row per matching palette.
#' @export
#'
#' @examples
#' head(pac_palette_info(collection = "bc_groundfish"))
pac_palette_info <- function(collection = NULL,
                             type = NULL,
                             family = NULL,
                             group = NULL,
                             cvd_safe = FALSE,
                             include_external = TRUE) {
  df <- .pac_palettes_meta
  if (!isTRUE(include_external)) {
    df <- df[df$package == "pacfishpalettes", , drop = FALSE]
  }
  if (!is.null(collection)) {
    df <- df[tolower(df$collection) %in% tolower(collection), , drop = FALSE]
  }
  if (!is.null(type)) {
    df <- df[tolower(df$type) %in% tolower(type), , drop = FALSE]
  }
  if (!is.null(family)) {
    df <- df[tolower(df$family) %in% tolower(family), , drop = FALSE]
  }
  if (!is.null(group)) {
    df <- df[tolower(df$group) %in% tolower(group), , drop = FALSE]
  }
  if (isTRUE(cvd_safe)) {
    df <- df[isTRUE_vec(df$cvd_safe), , drop = FALSE]
  }
  rownames(df) <- NULL
  df
}

#' Print a `pac_palette` Object
#'
#' @param x A `pac_palette` object returned by [pac_pal()].
#' @param ... Ignored.
#' @export
print.pac_palette <- function(x, ...) {
  nm <- attr(x, "palette_name")
  id <- attr(x, "palette_id")
  sci <- attr(x, "scientific_name")
  dfo <- attr(x, "dfo_code")
  header <- paste0("<pac_palette: ", nm, " [", id, "]>")
  if (!is.null(sci) && !is.na(sci) && nzchar(sci)) {
    header <- paste0(header, " (", sci, ")")
  }
  if (!is.null(dfo) && !is.na(dfo) && nzchar(dfo) && !grepl("_", dfo)) {
    header <- paste0(header, " | DFO #", dfo)
  }
  cat(header, "\n", sep = "")
  vals <- as.character(x)
  if (!is.null(names(x))) {
    cat(paste0("  ", format(names(x)), " : ", vals), sep = "\n")
  } else {
    cat("  ", paste(vals, collapse = "  "), "\n", sep = "")
  }
  invisible(x)
}

#' Plot a `pac_palette` Swatch Card
#'
#' @param x A `pac_palette` object returned by [pac_pal()].
#' @param labels Logical; display hex codes and any category labels.
#' @param ... Additional graphical parameters passed to [graphics::title()].
#' @export
plot.pac_palette <- function(x, labels = TRUE, ...) {
  n <- length(x)
  old <- graphics::par(mar = c(2.2, 0.8, 2.8, 0.8))
  on.exit(graphics::par(old), add = TRUE)

  graphics::image(
    x = seq_len(n),
    y = 1,
    z = matrix(seq_len(n), ncol = 1),
    col = as.character(x),
    axes = FALSE,
    xlab = "",
    ylab = ""
  )
  graphics::rect(0.5, 0.6, n + 0.5, 1.4, border = "#22222233", lwd = 1)

  nm <- attr(x, "palette_name")
  sci <- attr(x, "scientific_name")
  ttl <- if (!is.null(sci) && !is.na(sci) && nzchar(sci)) {
    paste0(nm, " (", sci, ")")
  } else {
    nm
  }
  graphics::title(main = ttl, ...)

  if (isTRUE(labels)) {
    lbls <- if (!is.null(names(x))) {
      paste0(names(x), "\n", as.character(x))
    } else {
      as.character(x)
    }
    graphics::axis(1, at = seq_len(n), labels = lbls, tick = FALSE, cex.axis = 0.78, line = -0.3)
  }
  invisible(x)
}

# ---- Internal helpers --------------------------------------------------------

isTRUE_vec <- function(x) !is.na(x) & as.logical(x)

.norm_key <- function(x) {
  gsub("[^a-z0-9]+", "", tolower(trimws(as.character(x))))
}

.resolve_palette_index <- function(query) {
  if (length(query) != 1L || is.na(query)) {
    stop("`name` must be a single non-NA palette identifier.", call. = FALSE)
  }
  meta <- .pac_palettes_meta
  q_raw <- trimws(as.character(query))

  # 1) Exact match on id or DFO code (handling zero-padded 3-digit codes like 44 -> "044")
  if (grepl("^[0-9]+$", q_raw)) {
    q_pad <- sprintf("%03d", as.integer(q_raw))
    hit <- which(meta$dfo_code == q_raw | meta$dfo_code == q_pad)
    if (length(hit) >= 1L) return(hit[1L])
  }

  hit <- which(tolower(meta$id) == tolower(q_raw))
  if (length(hit) >= 1L) return(hit[1L])

  # 2) Normalized match on id, name, common_name, scientific_name, or paletteer_id
  q_norm <- .norm_key(q_raw)
  for (col in c("id", "name", "common_name", "scientific_name", "paletteer_id")) {
    vals <- meta[[col]]
    vals[is.na(vals)] <- ""
    hit <- which(.norm_key(vals) == q_norm)
    if (length(hit) >= 1L) return(hit[1L])
  }

  # 3) Prefix / partial match on id, common_name, or name (preferring bespoke BC palettes)
  for (col in c("id", "common_name", "name", "scientific_name")) {
    vals <- meta[[col]]
    vals[is.na(vals)] <- ""
    hit <- which(startsWith(.norm_key(vals), q_norm))
    if (length(hit) >= 1L) return(hit[1L])
  }

  # 4) Substring fallback
  for (col in c("id", "common_name", "name")) {
    vals <- meta[[col]]
    vals[is.na(vals)] <- ""
    hit <- which(grepl(q_norm, .norm_key(vals), fixed = TRUE))
    if (length(hit) >= 1L) return(hit[1L])
  }

  stop(
    sprintf(
      "Palette '%s' not found. Run `pac_palettes()` to see all %d available palettes.",
      q_raw, nrow(meta)
    ),
    call. = FALSE
  )
}
