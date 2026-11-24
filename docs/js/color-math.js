/**
 * Perceptual colour math: OKLab interpolation, Delta E distance,
 * luminance profiles, and Machado (2009) CVD simulation.
 * Matches data-raw/build_palettes.py and R/diagnostics.R identically.
 */

const CVD_MATRICES = {
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export function rgbToHex([r, g, b]) {
  const toHex = (v) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(c) {
  const x = Math.max(0, Math.min(1, c));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

export function linearToOklab([r, g, b]) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

export function oklabToLinear([L, a, b]) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function hexToOklab(hex) {
  return linearToOklab(hexToRgb(hex).map(srgbToLinear));
}

export function oklabToHex(lab) {
  return rgbToHex(oklabToLinear(lab).map(linearToSrgb));
}

export function simulateCvd(hex, mode = 'normal') {
  if (!mode || mode === 'normal') return hex;
  const lin = hexToRgb(hex).map(srgbToLinear);
  if (mode === 'achromatopsia') {
    const y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    return rgbToHex([y, y, y].map(linearToSrgb));
  }
  const m = CVD_MATRICES[mode];
  if (!m) return hex;
  const sim = [
    m[0][0] * lin[0] + m[0][1] * lin[1] + m[0][2] * lin[2],
    m[1][0] * lin[0] + m[1][1] * lin[1] + m[1][2] * lin[2],
    m[2][0] * lin[0] + m[2][1] * lin[1] + m[2][2] * lin[2],
  ];
  return rgbToHex(sim.map(linearToSrgb));
}

export function interpolatePalette(colors, n, { begin = 0, end = 1, reverse = false, mode = 'discrete' } = {}) {
  const base = reverse ? [...colors].reverse() : [...colors];
  const k = base.length;
  if (mode === 'discrete' && begin === 0 && end === 1 && n <= k) {
    return base.slice(0, n);
  }
  const labs = base.map(hexToOklab);
  const sampleAt = (t) => {
    const pos = Math.max(0, Math.min(1, t)) * (k - 1);
    const i0 = Math.floor(pos);
    const i1 = Math.min(k - 1, i0 + 1);
    const f = pos - i0;
    const lab = [
      labs[i0][0] + f * (labs[i1][0] - labs[i0][0]),
      labs[i0][1] + f * (labs[i1][1] - labs[i0][1]),
      labs[i0][2] + f * (labs[i1][2] - labs[i0][2]),
    ];
    return oklabToHex(lab);
  };
  if (n === 1) return [sampleAt((begin + end) / 2)];
  const out = [];
  for (let i = 0; i < n; i++) {
    const frac = i / (n - 1);
    out.push(sampleAt(begin + frac * (end - begin)));
  }
  return out;
}

export function oklabDist(c1, c2) {
  return 100 * Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
}

function minPairwise(labs) {
  if (labs.length <= 1) return 100;
  let best = Infinity;
  for (let i = 0; i < labs.length - 1; i++) {
    for (let j = i + 1; j < labs.length; j++) {
      const d = oklabDist(labs[i], labs[j]);
      if (d < best) best = d;
    }
  }
  return Math.round(best * 10) / 10;
}

export function auditColors(colors, type = 'discrete') {
  const normalLabs = colors.map(hexToOklab);
  const lightness = normalLabs.map((l) => Math.round(l[0] * 1000) / 10);
  const minNormal = minPairwise(normalLabs);
  const deutan = minPairwise(colors.map((c) => hexToOklab(simulateCvd(c, 'deutan'))));
  const protan = minPairwise(colors.map((c) => hexToOklab(simulateCvd(c, 'protan'))));
  const tritan = minPairwise(colors.map((c) => hexToOklab(simulateCvd(c, 'tritan'))));
  const rgWorst = Math.min(deutan, protan);

  const diffs = lightness.slice(1).map((v, i) => v - lightness[i]);
  const monotonic = diffs.every((d) => d >= -3) || diffs.every((d) => d <= 3);
  const lightnessSpan = Math.round((Math.max(...lightness) - Math.min(...lightness)) * 10) / 10;

  let rating = 'caution';
  if (type === 'sequential') {
    if (monotonic && lightnessSpan >= 45 && rgWorst >= 7) rating = 'safe';
    else if (lightnessSpan >= 35 && rgWorst >= 5) rating = 'moderate';
  } else if (type === 'diverging') {
    const left = hexToOklab(simulateCvd(colors[0], 'deutan'));
    const right = hexToOklab(simulateCvd(colors[colors.length - 1], 'deutan'));
    const wing = oklabDist(left, right);
    if (wing >= 18 && rgWorst >= 6.5) rating = 'safe';
    else if (wing >= 12 && rgWorst >= 4.5) rating = 'moderate';
  } else {
    if (rgWorst >= 7.0 && minNormal >= 10.0) rating = 'safe';
    else if (rgWorst >= 4.5 && minNormal >= 8.0) rating = 'moderate';
  }

  return {
    rating,
    cvd_safe: rating === 'safe',
    minNormal,
    deutan,
    protan,
    tritan,
    lightness,
    lightnessSpan,
    monotonic,
  };
}
