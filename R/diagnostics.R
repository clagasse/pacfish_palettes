#' Simulate Colour Vision Deficiency (CVD) in Pure Base R
#'
#' Applies Machado et al. (2009) severity-1.0 linear-sRGB simulation matrices
#' (or luminance grayscale for achromatopsia) to a vector of R colours.
#'
#' @param colors Character vector of hex colours or R colour names (or a `pac_palette`).
#' @param type One of `"deutan"`, `"protan"`, `"tritan"`, or `"achromatopsia"`.
#'
#' @return A character vector of simulated hex colours.
#' @export
#'
#' @examples
#' pac_simulate_cvd(pac_pal("bc_salmon_set"), "deutan")
pac_simulate_cvd <- function(colors,
                             type = c("deutan", "protan", "tritan", "achromatopsia")) {
  type <- match.arg(type)
  rgb_mat <- grDevices::col2rgb(colors) / 255
  lin <- .srgb_to_linear(rgb_mat)

  if (type == "achromatopsia") {
    y <- 0.2126 * lin[1, ] + 0.7152 * lin[2, ] + 0.0722 * lin[3, ]
    sim <- rbind(y, y, y)
  } else {
    mats <- list(
      deutan = matrix(c(
        0.367322,  0.280085, -0.011820,
        0.860646,  0.672501,  0.042940,
       -0.227968,  0.047413,  0.968881
      ), nrow = 3, ncol = 3),
      protan = matrix(c(
        0.152286,  0.114503, -0.003882,
        1.052583,  0.786281, -0.048116,
       -0.204868,  0.099216,  1.051998
      ), nrow = 3, ncol = 3),
      tritan = matrix(c(
        1.255528, -0.078411,  0.004733,
       -0.076749,  0.930809,  0.691367,
       -0.178779,  0.147602,  0.303900
      ), nrow = 3, ncol = 3)
    )
    sim <- mats[[type]] %*% lin
  }

  sim <- pmin(pmax(sim, 0), 1)
  srgb <- .linear_to_srgb(sim)
  out <- grDevices::rgb(srgb[1, ], srgb[2, ], srgb[3, ])
  names(out) <- names(colors)
  out
}

#' Audit a Palette for Perceptual Separability & CVD Safety
#'
#' Computes minimum pairwise OKLab perceptual distance (scaled 0–100) under
#' Normal, Deuteranopia, Protanopia, and Tritanopia vision, along with lightness
#' span and monotonicity checks. Matches the exact diagnostics shown in the
#' GitHub Pages Palette Studio.
#'
#' @param colors Character vector of hex colours (or a `pac_palette` / palette name).
#' @param type Palette type: `"discrete"`, `"sequential"`, or `"diverging"`. If
#'   `NULL` and `colors` is a `pac_palette`, uses its stored type.
#'
#' @return A list with `cvd_safe`, `cvd_rating`, `min_delta_e`, `deutan_min_de`,
#'   `protan_min_de`, `tritan_min_de`, `lightness`, `lightness_span`, and `monotonic`.
#' @export
#'
#' @examples
#' pac_check_cvd(pac_pal("bc_groundfish_guilds"))
#' pac_check_cvd("bc_bathymetry")
pac_check_cvd <- function(colors, type = NULL) {
  if (length(colors) == 1L && is.character(colors) && !grepl("^#", colors)) {
    colors <- pac_pal(colors)
  }
  if (is.null(type)) {
    type <- attr(colors, "palette_type")
    if (is.null(type) || is.na(type)) type <- "discrete"
  }
  type <- match.arg(type, c("discrete", "sequential", "diverging"))

  normal_lab <- .colors_to_oklab(colors)
  lightness <- round(normal_lab[1, ] * 100, 1)
  de_normal <- .min_oklab_dist(normal_lab)

  de_deutan <- .min_oklab_dist(.colors_to_oklab(pac_simulate_cvd(colors, "deutan")))
  de_protan <- .min_oklab_dist(.colors_to_oklab(pac_simulate_cvd(colors, "protan")))
  de_tritan <- .min_oklab_dist(.colors_to_oklab(pac_simulate_cvd(colors, "tritan")))
  rg_worst <- min(de_deutan, de_protan)

  diffs <- diff(lightness)
  monotonic <- all(diffs >= -3) || all(diffs <= 3)
  lightness_span <- round(max(lightness) - min(lightness), 1)

  rating <- if (type == "sequential") {
    if (monotonic && lightness_span >= 45 && rg_worst >= 7) "safe"
    else if (lightness_span >= 35 && rg_worst >= 5) "moderate"
    else "caution"
  } else if (type == "diverging") {
    sim_d <- .colors_to_oklab(pac_simulate_cvd(colors, "deutan"))
    wing_sep <- 100 * sqrt(sum((sim_d[, 1] - sim_d[, ncol(sim_d)])^2))
    if (wing_sep >= 18 && rg_worst >= 6.5) "safe"
    else if (wing_sep >= 12 && rg_worst >= 4.5) "moderate"
    else "caution"
  } else {
    if (rg_worst >= 7.0 && de_normal >= 10.0) "safe"
    else if (rg_worst >= 4.5 && de_normal >= 8.0) "moderate"
    else "caution"
  }

  list(
    type = type,
    cvd_safe = identical(rating, "safe"),
    cvd_rating = rating,
    min_delta_e = round(de_normal, 2),
    deutan_min_de = round(de_deutan, 2),
    protan_min_de = round(de_protan, 2),
    tritan_min_de = round(de_tritan, 2),
    lightness = lightness,
    lightness_span = lightness_span,
    monotonic = monotonic
  )
}

# ---- Internal colour-space math ----------------------------------------------

.srgb_to_linear <- function(x) {
  ifelse(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055)^2.4)
}

.linear_to_srgb <- function(x) {
  x <- pmin(pmax(x, 0), 1)
  ifelse(x <= 0.0031308, 12.92 * x, 1.055 * (x^(1 / 2.4)) - 0.055)
}

.colors_to_oklab <- function(colors) {
  lin <- .srgb_to_linear(grDevices::col2rgb(colors) / 255)
  l <- 0.4122214708 * lin[1, ] + 0.5363325363 * lin[2, ] + 0.0514459929 * lin[3, ]
  m <- 0.2119034982 * lin[1, ] + 0.6806995451 * lin[2, ] + 0.1073969566 * lin[3, ]
  s <- 0.0883024619 * lin[1, ] + 0.2817188376 * lin[2, ] + 0.6299787005 * lin[3, ]

  l_ <- sign(l) * (abs(l)^(1 / 3))
  m_ <- sign(m) * (abs(m)^(1 / 3))
  s_ <- sign(s) * (abs(s)^(1 / 3))

  rbind(
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  )
}

.min_oklab_dist <- function(lab_mat) {
  n <- ncol(lab_mat)
  if (n <= 1L) return(100)
  best <- Inf
  for (i in seq_len(n - 1L)) {
    for (j in seq.int(i + 1L, n)) {
      d <- 100 * sqrt(sum((lab_mat[, i] - lab_mat[, j])^2))
      if (d < best) best <- d
    }
  }
  best
}
