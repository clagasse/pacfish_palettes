\name{scale_pac}
\alias{scale_pac}
\alias{scale_color_pac_d}
\alias{scale_colour_pac_d}
\alias{scale_fill_pac_d}
\alias{scale_color_pac_c}
\alias{scale_colour_pac_c}
\alias{scale_fill_pac_c}
\alias{scale_color_pac_b}
\alias{scale_colour_pac_b}
\alias{scale_fill_pac_b}
\title{ggplot2 Colour and Fill Scales for pacfishpalettes}
\usage{
scale_color_pac_d(palette = "bc_groundfish_guilds", direction = 1, begin = 0, end = 1, alpha = 1, aesthetics = "colour", ...)
scale_colour_pac_d(palette = "bc_groundfish_guilds", direction = 1, begin = 0, end = 1, alpha = 1, aesthetics = "colour", ...)
scale_fill_pac_d(palette = "bc_groundfish_guilds", direction = 1, begin = 0, end = 1, alpha = 1, aesthetics = "fill", ...)
scale_color_pac_c(palette = "bc_bathymetry", direction = 1, begin = 0, end = 1, alpha = 1, ...)
scale_colour_pac_c(palette = "bc_bathymetry", direction = 1, begin = 0, end = 1, alpha = 1, ...)
scale_fill_pac_c(palette = "bc_bathymetry", direction = 1, begin = 0, end = 1, alpha = 1, ...)
scale_color_pac_b(palette = "bc_bathymetry", direction = 1, begin = 0, end = 1, alpha = 1, ...)
scale_colour_pac_b(palette = "bc_bathymetry", direction = 1, begin = 0, end = 1, alpha = 1, ...)
scale_fill_pac_b(palette = "bc_bathymetry", direction = 1, begin = 0, end = 1, alpha = 1, ...)
}
\arguments{
\item{palette}{Palette identifier accepted by \code{\link{pac_pal}}.}
\item{direction}{\code{1} for normal order, \code{-1} to reverse.}
\item{begin, end}{Numeric endpoints in \code{[0, 1]}.}
\item{alpha}{Opacity in \code{[0, 1]}.}
\item{aesthetics}{Aesthetic name.}
\item{...}{Additional arguments forwarded to \pkg{ggplot2} scale constructors.}
}
\value{
A \pkg{ggplot2} scale object.
}
\description{
Discrete (\code{_d}), continuous (\code{_c}), and binned (\code{_b}) \pkg{ggplot2}
colour and fill scales backed by \pkg{pacfishpalettes}.
}
