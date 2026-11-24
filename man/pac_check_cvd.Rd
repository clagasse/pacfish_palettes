\name{pac_check_cvd}
\alias{pac_simulate_cvd}
\alias{pac_check_cvd}
\alias{pac_r_palettes}
\alias{pac_browse}
\title{Perceptual CVD Diagnostics and R Ecosystem Palette Helpers}
\usage{
pac_simulate_cvd(colors, type = c("deutan", "protan", "tritan", "achromatopsia"))
pac_check_cvd(colors, type = NULL)
pac_r_palettes(package = NULL, type = NULL, cvd_safe = FALSE)
pac_browse(url = "https://pacfishpalettes.github.io/pacfishpalettes/", local = FALSE)
}
\arguments{
\item{colors}{Character vector of colours, a \code{pac_palette}, or palette name.}
\item{type}{CVD simulation type or palette type.}
\item{package}{Optional R package name filter.}
\item{cvd_safe}{Logical; filter for CVD-safe palettes only.}
\item{url}{URL to the GitHub Pages Palette Studio.}
\item{local}{Logical; open local \code{docs/index.html} when available.}
}
\value{
\code{pac_simulate_cvd()} returns simulated hex colours; \code{pac_check_cvd()}
returns a diagnostic list; \code{pac_r_palettes()} returns a \code{data.frame};
\code{pac_browse()} invisibly returns the opened target.
}
\description{
Pure-R Machado (2009) CVD simulation, OKLab perceptual distance auditing,
curated cross-package R palette browsing, and quick launch of the interactive
GitHub Pages Palette Studio.
}
\examples{
pac_check_cvd("bc_groundfish_guilds")
head(pac_r_palettes())
}
