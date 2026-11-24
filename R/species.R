#' BC & Pacific Region Species Metadata Table (`gfsynopsis`-aligned)
#'
#' Returns the taxonomic table of BC groundfish, Pacific salmon, pelagics, and
#' commercial shellfish/invertebrates included in \pkg{pacfishpalettes}, with
#' scientific names, DFO species codes, taxonomic families, habitat guilds,
#' silhouette keys, and signature hex colours.
#'
#' @param collection Optional collection filter (e.g. `"bc_groundfish"`,
#'   `"bc_salmon"`, `"bc_pelagics"`, `"bc_invertebrates"`).
#' @param family Optional taxonomic family filter (e.g. `"Sebastidae"`, `"Salmonidae"`).
#' @param group Optional species group filter (e.g. `"Rockfish"`, `"Flatfish"`, `"Salmon"`).
#'
#' @return A `data.frame` of species metadata.
#' @export
#'
#' @examples
#' head(pac_species_table())
#' pac_species_table(group = "Salmon")
pac_species_table <- function(collection = NULL, family = NULL, group = NULL) {
  species_cols <- c("bc_groundfish", "bc_salmon", "bc_pelagics", "bc_invertebrates", "bc_bizarre")
  df <- .pac_palettes_meta[.pac_palettes_meta$collection %in% species_cols, , drop = FALSE]
  if (!is.null(collection)) {
    df <- df[tolower(df$collection) %in% tolower(collection), , drop = FALSE]
  }
  if (!is.null(family)) {
    df <- df[tolower(df$family) %in% tolower(family), , drop = FALSE]
  }
  if (!is.null(group)) {
    df <- df[tolower(df$group) %in% tolower(group), , drop = FALSE]
  }
  df$signature_color <- vapply(
    df$id,
    function(pid) {
      cols <- .pac_palettes_list[[pid]]
      cols[min(2L, length(cols))]
    },
    character(1)
  )
  keep <- c(
    "id", "common_name", "scientific_name", "dfo_code",
    "collection", "group", "family", "silhouette",
    "habitat", "signature_color"
  )
  out <- df[, keep, drop = FALSE]
  rownames(out) <- NULL
  out
}

#' Map Species Names or DFO Codes to Consistent Colours
#'
#' Given a vector of BC marine species (common names, scientific names, or DFO
#' species codes from `gfsynopsis` / `gfdata` data frames), returns a named hex
#' colour vector suitable for `ggplot2::scale_color_manual(values = ...)` or
#' base R plotting.
#'
#' @param species Character or numeric vector of species names or DFO codes.
#' @param by Mapping mode:
#'   - `"species"` (default): assigns a distinct CVD-safe colour per unique species
#'     (using the curated `bc_salmon_set` / `bc_rockfish_set` / `bc_flatfish_set`
#'     when all species belong to that guild, or `bc_pacific_fisheries` otherwise).
#'   - `"signature"`: uses each species' own signature colour from its species palette.
#'   - `"guild"`: colours each species by its taxonomic/fisheries guild
#'     (`Rockfish`, `Flatfish`, `Roundfish`, `Hexagrammid`, `Elasmobranch`, `Salmon`,
#'     `Pelagic`, `Shellfish`).
#' @param palette Optional explicit palette name to override automatic selection
#'   when `by = "species"`.
#'
#' @return A named character vector of hex colours named by `unique(species)`.
#' @export
#'
#' @examples
#' pac_species_colors(c("Chinook Salmon", "Sockeye Salmon", "Coho Salmon"))
#' pac_species_colors(c("Yelloweye Rockfish", "Pacific Halibut", "Sablefish"), by = "guild")
#' pac_species_colors(c(442, 614, 455, 467))
pac_species_colors <- function(species,
                               by = c("species", "signature", "guild"),
                               palette = NULL) {
  by <- match.arg(by)
  uniq <- unique(as.character(species))
  uniq <- uniq[!is.na(uniq)]
  if (length(uniq) == 0L) return(stats::setNames(character(0), character(0)))

  tbl <- pac_species_table()
  matched_idx <- vapply(uniq, function(sp) {
    sp_trim <- trimws(sp)
    if (grepl("^[0-9]+$", sp_trim)) {
      sp_pad <- sprintf("%03d", as.integer(sp_trim))
      h <- which(tbl$dfo_code == sp_trim | tbl$dfo_code == sp_pad)
      if (length(h) >= 1L) return(h[1L])
    }
    qn <- .norm_key(sp_trim)
    for (col in c("id", "common_name", "scientific_name")) {
      vals <- tbl[[col]]
      vals[is.na(vals)] <- ""
      h <- which(.norm_key(vals) == qn)
      if (length(h) >= 1L) return(h[1L])
    }
    for (col in c("common_name", "id", "scientific_name")) {
      vals <- tbl[[col]]
      vals[is.na(vals)] <- ""
      h <- which(startsWith(.norm_key(vals), qn))
      if (length(h) >= 1L) return(h[1L])
    }
    NA_integer_
  }, integer(1))

  if (by == "signature") {
    fallback <- as.character(pac_pal("bc_pacific_fisheries", n = length(uniq)))
    cols <- ifelse(is.na(matched_idx), fallback, tbl$signature_color[matched_idx])
    return(stats::setNames(cols, uniq))
  }

  if (by == "guild") {
    guild_map <- c(
      Rockfish = "#C83E2B",
      Flatfish = "#E8B931",
      Roundfish = "#56A8D8",
      Hexagrammid = "#0E8577",
      Elasmobranch = "#C478A8",
      Salmon = "#CE3A3A",
      Pelagic = "#10385C",
      Shellfish = "#B84A27",
      Cephalopod = "#6A1E4D",
      Intertidal = "#8A4F8D"
    )
    groups <- ifelse(is.na(matched_idx), "Other", tbl$group[matched_idx])
    cols <- unname(guild_map[groups])
    cols[is.na(cols)] <- "#6C757D"
    return(stats::setNames(cols, uniq))
  }

  # by == "species": smart guild-aware CVD-safe set selection
  if (is.null(palette)) {
    valid_idx <- matched_idx[!is.na(matched_idx)]
    found_groups <- unique(tbl$group[valid_idx])
    if (length(found_groups) == 1L) {
      palette <- switch(
        found_groups,
        Salmon = "bc_salmon_set",
        Rockfish = "bc_rockfish_set",
        Flatfish = "bc_flatfish_set",
        Pelagic = "bc_pelagic_set",
        Shellfish = "bc_invertebrate_set",
        "bc_groundfish_guilds"
      )
    } else if (length(valid_idx) > 0L && all(tbl$collection[valid_idx] == "bc_groundfish")) {
      palette <- "bc_groundfish_guilds"
    } else {
      palette <- "bc_pacific_fisheries"
    }
  }

  cols <- as.character(pac_pal(palette, n = length(uniq)))
  stats::setNames(cols, uniq)
}

#' Named Colour Vector for BC Groundfish Guilds / Families
#'
#' @param families Optional subset of guild names to return.
#' @return A named character vector of CVD-safe hex colours.
#' @export
#'
#' @examples
#' pac_family_colors()
pac_family_colors <- function(families = NULL) {
  cols <- pac_pal("bc_groundfish_guilds")
  out <- stats::setNames(as.character(cols), names(cols))
  if (is.null(families)) return(out)
  hit <- match(tolower(families), tolower(names(out)))
  res <- out[hit]
  names(res) <- families
  res
}

#' Named Colour Vector for DFO Groundfish Synoptic & HBLL Surveys (`gfsynopsis`)
#'
#' Returns the standardized CVD-safe palette for PBS synoptic trawl and
#' hard-bottom longline surveys (`SYN QCS`, `SYN HS`, `SYN WCVI`, `SYN WCHG`,
#' `HBLL OUT`, `HBLL INS`).
#'
#' @param surveys Optional character vector of survey abbreviations to subset/order.
#' @return A named character vector of hex colours.
#' @export
#'
#' @examples
#' pac_survey_colors()
#' pac_survey_colors(c("SYN QCS", "SYN WCVI", "HBLL OUT"))
pac_survey_colors <- function(surveys = NULL) {
  cols <- pac_pal("bc_synoptic_surveys")
  out <- stats::setNames(as.character(cols), names(cols))
  if (is.null(surveys)) return(out)
  hit <- match(toupper(trimws(surveys)), toupper(names(out)))
  res <- out[hit]
  names(res) <- surveys
  res
}

#' Named Colour Vector for BC Commercial Fleets & Gear Types
#'
#' Returns the CVD-safe palette for BC commercial fishing fleets (`Bottom Trawl`,
#' `Midwater Trawl`, `Hook & Line`, `Trap`, `Troll`, `Purse Seine`, `Gillnet`).
#'
#' @param fleets Optional character vector of fleet/gear names to subset/order.
#' @return A named character vector of hex colours.
#' @export
#'
#' @examples
#' pac_fleet_colors()
#' pac_fleet_colors(c("Bottom Trawl", "Troll", "Purse Seine"))
pac_fleet_colors <- function(fleets = NULL) {
  cols <- pac_pal("bc_fleets")
  out <- stats::setNames(as.character(cols), names(cols))
  if (is.null(fleets)) return(out)
  hit <- match(tolower(trimws(fleets)), tolower(names(out)))
  res <- out[hit]
  names(res) <- fleets
  res
}

#' Named Colour Vector for DFO Pacific Branches
#'
#' Returns the CVD-safe palette for Fisheries and Oceans Canada (DFO) regional
#' branches (`Science`, `Fisheries Management`, `Ecosystem Management`,
#' `Conservation & Protection`, `Indigenous & Treaty`, `Policy & Economics`).
#'
#' @param branches Optional character vector of branch names to subset/order.
#' @return A named character vector of hex colours.
#' @export
#'
#' @examples
#' pac_branch_colors()
#' pac_branch_colors(c("Science", "Ecosystem Management", "Fisheries Management"))
pac_branch_colors <- function(branches = NULL) {
  cols <- pac_pal("dfo_branches")
  out <- stats::setNames(as.character(cols), names(cols))
  if (is.null(branches)) return(out)
  hit <- match(tolower(trimws(branches)), tolower(names(out)))
  res <- out[hit]
  names(res) <- branches
  res
}
