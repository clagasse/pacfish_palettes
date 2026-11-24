\name{pac_pal}
\alias{pac_pal}
\alias{pac_palettes}
\alias{pac_palette_info}
\alias{print.pac_palette}
\alias{plot.pac_palette}
\title{BC and Pacific Region Marine Colour Palettes}
\usage{
pac_pal(
  name,
  n = NULL,
  type = c("discrete", "continuous"),
  direction = 1,
  begin = 0,
  end = 1,
  alpha = 1
)

pac_palettes(
  collection = NULL,
  type = NULL,
  family = NULL,
  group = NULL,
  cvd_safe = FALSE,
  include_external = TRUE
)

pac_palette_info(
  collection = NULL,
  type = NULL,
  family = NULL,
  group = NULL,
  cvd_safe = FALSE,
  include_external = TRUE
)

\method{print}{pac_palette}(x, ...)

\method{plot}{pac_palette}(x, labels = TRUE, ...)
}
\arguments{
\item{name}{Palette ID, display name, common name, scientific name, or DFO species code.}
\item{n}{Optional integer number of colours.}
\item{type}{Either \code{"discrete"} or \code{"continuous"} (or palette type filter).}
\item{direction}{\code{1} for normal order, \code{-1} to reverse.}
\item{begin, end}{Numeric endpoints in \code{[0, 1]} along the colour ramp.}
\item{alpha}{Opacity in \code{[0, 1]}.}
\item{collection}{Optional collection filter.}
\item{family}{Optional taxonomic family or R package filter.}
\item{group}{Optional species or set group filter.}
\item{cvd_safe}{Logical; return only CVD-safe palettes.}
\item{include_external}{Logical; include flagship R ecosystem palettes.}
\item{x}{A \code{pac_palette} object.}
\item{labels}{Logical; show hex codes and labels on swatch plot.}
\item{...}{Additional arguments.}
}
\value{
\code{pac_pal()} returns a \code{pac_palette} character vector of hex colours.
\code{pac_palettes()} returns a character vector of palette IDs.
\code{pac_palette_info()} returns a metadata \code{data.frame}.
}
\description{
Retrieve, inspect, and plot bespoke BC groundfish, Pacific salmon, pelagic,
shellfish, fisheries set, and flagship R ecosystem colour palettes.
}
\examples{
pac_pal("yelloweye_rockfish")
pac_pal("Sebastes_ruberrimus", n = 4)
pac_pal(442)
pac_pal("bc_bathymetry", n = 9, type = "continuous")
}
