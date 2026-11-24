/**
 * One-click R workflow & multi-format code generator for pacfishpalettes.
 */

export function generateCode(palette, activeColors, opts, format) {
  const { n, begin, end, reverse } = opts;
  const dirArg = reverse ? ', direction = -1' : '';
  const rangeArg = begin > 0 || end < 1 ? `, begin = ${begin.toFixed(2)}, end = ${end.toFixed(2)}` : '';
  const typeScale = palette.type === 'discrete' ? 'd' : 'c';
  const hexList = activeColors.map((c) => `"${c}"`).join(', ');

  if (format === 'pacfish') {
    const lines = [
      `library(pacfishpalettes)`,
      `library(ggplot2)`,
      ``,
      `# Retrieve vector (${n} colours)`,
      `cols <- pac_pal("${palette.id}", n = ${n}, type = "${palette.type === 'discrete' ? 'discrete' : 'continuous'}"${dirArg}${rangeArg})`,
    ];
    if (palette.dfo_code && !String(palette.dfo_code).includes('_')) {
      lines.push(`# Or lookup by DFO code / scientific name: pac_pal(${palette.dfo_code}) | pac_pal("${palette.scientific_name}")`);
    }
    lines.push(
      ``,
      `# Drop-in ggplot2 scale`,
      `ggplot(df, aes(x, y, colour = group)) +`,
      `  geom_line(linewidth = 1) +`,
      `  scale_colour_pac_${typeScale}("${palette.id}"${dirArg}${rangeArg})`
    );
    if (palette.silhouette) {
      lines.push(`  # + add_pac_shape("${palette.silhouette}", xmin = ..., xmax = ..., ymin = ..., ymax = ...)`);
    }
    return lines.join('\n');
  }

  if (format === 'ggplot') {
    if (palette.type === 'discrete') {
      return [
        `# Standalone ggplot2 (zero extra packages required)`,
        `my_cols <- c(${hexList})`,
        ``,
        `ggplot(df, aes(x, y, colour = group, fill = group)) +`,
        `  geom_col() +`,
        `  scale_colour_manual(values = my_cols) +`,
        `  scale_fill_manual(values = my_cols)`,
      ].join('\n');
    }
    return [
      `# Standalone ggplot2 continuous ramp (zero extra packages required)`,
      `my_ramp <- c(${hexList})`,
      ``,
      `ggplot(df, aes(x, y, fill = value)) +`,
      `  geom_tile() +`,
      `  scale_fill_gradientn(colours = my_ramp)`,
    ].join('\n');
  }

  if (format === 'upstream') {
    if (palette.paletteer_id) {
      const fn = palette.type === 'discrete' ? 'paletteer_d' : 'paletteer_c';
      const scale = palette.type === 'discrete' ? 'scale_colour_paletteer_d' : 'scale_colour_paletteer_c';
      return [
        `# Via paletteer (unified R palette interface)`,
        `library(paletteer)`,
        `cols <- ${fn}("${palette.paletteer_id}"${palette.type === 'discrete' ? '' : `, n = ${n}`})`,
        ``,
        `# Direct ggplot2 layer`,
        `p + ${scale}("${palette.paletteer_id}"${reverse ? ', direction = -1' : ''})`,
        ``,
        `# Or directly via pacfishpalettes without installing '${palette.package}':`,
        `pacfishpalettes::pac_pal("${palette.id}", n = ${n}${dirArg}${rangeArg})`,
      ].join('\n');
    }
    return [
      `# Bespoke BC / Pacific Region palette hosted in pacfishpalettes`,
      `# Install once: remotes::install_github("pacfishpalettes/pacfishpalettes")`,
      `pacfishpalettes::pac_pal("${palette.id}", n = ${n}${dirArg}${rangeArg})`,
      ``,
      `# Check CVD safety directly in R:`,
      `pacfishpalettes::pac_check_cvd("${palette.id}")`,
    ].join('\n');
  }

  if (format === 'named') {
    const lbls =
      palette.labels && palette.labels.length === activeColors.length
        ? reverse
          ? [...palette.labels].reverse()
          : palette.labels
        : activeColors.map((_, i) => `group_${i + 1}`);
    const pairs = activeColors.map((c, i) => `  "${lbls[i]}" = "${c}"`).join(',\n');
    return [`# Named R colour vector (ideal for gfsynopsis / scale_color_manual)`, `pal_named <- c(`, pairs, `)`].join('\n');
  }

  // HEX / CSS / JSON
  const cssVars = activeColors.map((c, i) => `  --pal-${i + 1}: ${c};`).join('\n');
  return [
    `# Raw HEX`,
    activeColors.join(', '),
    ``,
    `/* CSS Custom Properties */`,
    `:root {`,
    cssVars,
    `}`,
  ].join('\n');
}
