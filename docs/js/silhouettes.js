/**
 * Loads and caches PhyloPic v2 SVG silhouettes from docs/assets/silhouettes/
 * so palette cards and the workbench can tint them dynamically with currentColor.
 */

const svgCache = new Map();

export async function preloadSilhouettes(manifest) {
  const keys = Object.keys(manifest || {});
  await Promise.all(
    keys.map(async (key) => {
      const file = manifest[key]?.file || `${key}.svg`;
      try {
        const resp = await fetch(`assets/silhouettes/${file}`);
        if (resp.ok) {
          svgCache.set(key, await resp.text());
        }
      } catch {
        // Offline / file:// fallback handled gracefully
      }
    })
  );
}

export function getSilhouetteSvg(key) {
  if (!key) return '';
  return svgCache.get(key) || '';
}

export function formatAttribution(meta) {
  if (!meta) return '';
  const who = meta.attribution || 'PhyloPic contributor';
  const lic = meta.license || 'CC0 1.0';
  return `${meta.taxon} silhouette — ${who} (${lic} via PhyloPic)`;
}
