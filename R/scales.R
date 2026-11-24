#' ggplot2 Colour and Fill Scales for `pacfishpalettes`
#'
#' Drop-in discrete (`_d`), continuous (`_c`), and binned (`_b`) scales for
#' \pkg{ggplot2} using any palette in \pkg{pacfishpalettes}.
#'
#' @param palette Palette identifier passed to [pac_pal()] (palette ID, common
#'   name, scientific name, or DFO species code). Defaults to `"bc_groundfish_guilds"`
#'   for discrete scales and `"bc_bathymetry"` for continuous/binned scales.
#' @param direction `1` for normal order, `-1` to reverse.
#' @param begin,end Numeric `[0, 1]` endpoints along the palette ramp.
#' @param alpha Transparency in `[0, 1]`.
#' @param aesthetics Character vector of aesthetics (normally `"colour"` or `"fill"`).
#' @param ... Additional arguments passed to [ggplot2::discrete_scale()],
#'   [ggplot2::scale_color_gradientn()], or [ggplot2::binned_scale()].
#'
#' @name scale_pac
#' @return A \pkg{ggplot2} scale object.
#'
#' @examples
#' if (requireNamespace("ggplot2", quietly = TRUE)) {
#'   library(ggplot2)
#'   ggplot(iris, aes(Sepal.Length, Sepal.Width, colour = Species)) +
#'     geom_point(size = 2.5) +
#'     scale_color_pac_d("bc_salmon_set")
#' }
NULL

.require_ggplot2 <- function() {
  if (!requireNamespace("ggplot2", quietly = TRUE)) {
    stop("Package 'ggplot2' is required for `scale_*_pac_*()` functions.", call. = FALSE)
  }
}

.pac_discrete_pal_fn <- function(palette, direction = 1, begin = 0, end = 1, alpha = 1) {
  function(n) {
    as.character(pac_pal(
      name = palette,
      n = n,
      type = "discrete",
      direction = direction,
      begin = begin,
      end = end,
      alpha = alpha
    ))
  }
}

#' @rdname scale_pac
#' @export
scale_color_pac_d <- function(palette = "bc_groundfish_guilds",
                              direction = 1,
                              begin = 0,
                              end = 1,
                              alpha = 1,
                              aesthetics = "colour",
                              ...) {
  .require_ggplot2()
  ggplot2::discrete_scale(
    aesthetics = aesthetics,
    palette = .pac_discrete_pal_fn(palette, direction, begin, end, alpha),
    ...
  )
}

#' @rdname scale_pac
#' @export
scale_colour_pac_d <- scale_color_pac_d

#' @rdname scale_pac
#' @export
scale_fill_pac_d <- function(palette = "bc_groundfish_guilds",
                             direction = 1,
                             begin = 0,
                             end = 1,
                             alpha = 1,
                             aesthetics = "fill",
                             ...) {
  .require_ggplot2()
  ggplot2::discrete_scale(
    aesthetics = aesthetics,
    palette = .pac_discrete_pal_fn(palette, direction, begin, end, alpha),
    ...
  )
}

#' @rdname scale_pac
#' @export
scale_color_pac_c <- function(palette = "bc_bathymetry",
                              direction = 1,
                              begin = 0,
                              end = 1,
                              alpha = 1,
                              ...) {
  .require_ggplot2()
  cols <- as.character(pac_pal(
    name = palette,
    n = 256L,
    type = "continuous",
    direction = direction,
    begin = begin,
    end = end,
    alpha = alpha
  ))
  ggplot2::scale_color_gradientn(colours = cols, ...)
}

#' @rdname scale_pac
#' @export
scale_colour_pac_c <- scale_color_pac_c

#' @rdname scale_pac
#' @export
scale_fill_pac_c <- function(palette = "bc_bathymetry",
                             direction = 1,
                             begin = 0,
                             end = 1,
                             alpha = 1,
                             ...) {
  .require_ggplot2()
  cols <- as.character(pac_pal(
    name = palette,
    n = 256L,
    type = "continuous",
    direction = direction,
    begin = begin,
    end = end,
    alpha = alpha
  ))
  ggplot2::scale_fill_gradientn(colours = cols, ...)
}

#' @rdname scale_pac
#' @export
scale_color_pac_b <- function(palette = "bc_bathymetry",
                              direction = 1,
                              begin = 0,
                              end = 1,
                              alpha = 1,
                              ...) {
  .require_ggplot2()
  cols <- as.character(pac_pal(
    name = palette,
    n = 256L,
    type = "continuous",
    direction = direction,
    begin = begin,
    end = end,
    alpha = alpha
  ))
  ggplot2::scale_color_stepsn(colours = cols, ...)
}

#' @rdname scale_pac
#' @export
scale_colour_pac_b <- scale_color_pac_b

#' @rdname scale_pac
#' @export
scale_fill_pac_b <- function(palette = "bc_bathymetry",
                             direction = 1,
                             begin = 0,
                             end = 1,
                             alpha = 1,
                             ...) {
  .require_ggplot2()
  cols <- as.character(pac_pal(
    name = palette,
    n = 256L,
    type = "continuous",
    direction = direction,
    begin = begin,
    end = end,
    alpha = alpha
  ))
  ggplot2::scale_fill_stepsn(colours = cols, ...)
}
