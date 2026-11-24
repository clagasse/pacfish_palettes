\name{pac_species_colors}
\alias{pac_species_table}
\alias{pac_species_colors}
\alias{pac_family_colors}
\alias{pac_survey_colors}
\alias{pac_fleet_colors}
\alias{pac_branch_colors}
\title{gfsynopsis and Pacific Region Species, Fleet, Survey, and DFO Branch Colour Helpers}
\usage{
pac_species_table(collection = NULL, family = NULL, group = NULL)
pac_species_colors(species, by = c("species", "signature", "guild"), palette = NULL)
pac_family_colors(families = NULL)
pac_survey_colors(surveys = NULL)
pac_fleet_colors(fleets = NULL)
pac_branch_colors(branches = NULL)
}
\arguments{
\item{collection}{Optional collection filter.}
\item{family}{Optional taxonomic family filter.}
\item{group}{Optional species group filter.}
\item{species}{Character or numeric vector of species names or DFO codes.}
\item{by}{Mapping mode: \code{"species"}, \code{"signature"}, or \code{"guild"}.}
\item{palette}{Optional explicit palette override.}
\item{families}{Optional subset of groundfish guild names.}
\item{surveys}{Optional subset of DFO survey names.}
\item{fleets}{Optional subset of BC commercial fleet / gear names.}
\item{branches}{Optional subset of DFO Pacific branch names.}
}
\value{
A metadata \code{data.frame} (\code{pac_species_table()}) or a named character
vector of hex colours.
}
\description{
Consistent species, guild, commercial fleet, DFO synoptic/HBLL survey, and DFO
branch colour mappings aligned with \code{gfsynopsis} and Pacific Region workflows.
}
\examples{
pac_species_colors(c("Chinook Salmon", "Sockeye Salmon", "Coho Salmon"))
pac_survey_colors()
pac_fleet_colors()
pac_branch_colors()
}
