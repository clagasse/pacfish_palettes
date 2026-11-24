\name{add_pac_shape}
\alias{pac_shapes}
\alias{add_pac_shape}
\title{BC and Pacific Marine Taxon Silhouettes (PhyloPic)}
\usage{
pac_shapes()
add_pac_shape(
  taxon = "sebastes",
  xmin = -Inf,
  xmax = Inf,
  ymin = -Inf,
  ymax = Inf,
  fill = "#1A2B42",
  alpha = 0.85,
  use_rphylopic = FALSE,
  ...
)
}
\arguments{
\item{taxon}{Silhouette ID or species/palette identifier.}
\item{xmin, xmax, ymin, ymax}{Bounding coordinates in plot data units.}
\item{fill}{Fill colour.}
\item{alpha}{Opacity in \code{[0, 1]}.}
\item{use_rphylopic}{Logical; delegate to \pkg{rphylopic} using the stored PhyloPic UUID.}
\item{...}{Additional arguments forwarded to \code{rphylopic::add_phylopic()}.}
}
\value{
\code{pac_shapes()} returns a \code{data.frame} of available silhouettes and
PhyloPic attribution. \code{add_pac_shape()} returns a \pkg{ggplot2} layer.
}
\description{
Inspect bundled PhyloPic-sourced silhouettes and annotate \pkg{ggplot2} figures
with BC marine species shapes.
}
