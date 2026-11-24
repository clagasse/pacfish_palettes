/**
 * Live fisheries & gfsynopsis-style SVG plot previews rendered directly
 * using the active palette and CVD simulation mode.
 */

import { simulateCvd } from './color-math.js';

function getThemeColors(lightCanvas) {
  return lightCanvas
    ? {
        bg: '#ffffff',
        panel: '#f7fafc',
        grid: '#dde6ee',
        axis: '#6b7f93',
        text: '#162738',
        sub: '#546b80',
      }
    : {
        bg: '#0c1623',
        panel: '#101d2e',
        grid: 'rgba(180,210,235,0.12)',
        axis: '#6d87a1',
        text: '#e6eff7',
        sub: '#8ea8c0',
      };
}

export function renderFisheriesChart(chartType, rawColors, labels, { cvdMode = 'normal', lightCanvas = true, title = '' } = {}) {
  const cols = rawColors.map((c) => simulateCvd(c, cvdMode));
  const t = getThemeColors(lightCanvas);

  if (chartType === 'catch') return renderStackedCatch(cols, labels, t, title);
  if (chartType === 'spatial') return renderSpatialCpue(cols, t, title);
  if (chartType === 'length') return renderLengthComp(cols, labels, t, title);
  return renderSurveyIndex(cols, labels, t, title);
}

/* 1. gfsynopsis-style Multi-Survey Biomass Index with Uncertainty Ribbons */
function renderSurveyIndex(cols, labels, t, title) {
  const W = 760, H = 270;
  const pad = { l: 56, r: 155, t: 38, b: 36 };
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
  const years = [2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024];
  const defaultSeries = ['SYN QCS', 'SYN HS', 'SYN WCVI', 'SYN WCHG', 'HBLL OUT', 'HBLL INS'];
  const k = Math.min(cols.length, 6);

  const seriesData = [];
  for (let s = 0; s < k; s++) {
    const pts = years.map((yr, i) => {
      const base = 18 + s * 13;
      const wave = 12 * Math.sin(i * 0.65 + s * 1.15) + 5 * Math.cos(i * 1.1 - s * 0.7);
      const y = Math.max(6, Math.min(94, base + wave));
      const se = 5 + (s % 3) * 2.2;
      return { yr, y, lo: Math.max(2, y - se), hi: Math.min(98, y + se) };
    });
    seriesData.push(pts);
  }

  const sx = (i) => pad.l + (i / (years.length - 1)) * pw;
  const sy = (v) => pad.t + ph - (v / 100) * ph;

  let grid = '';
  for (const v of [0, 25, 50, 75, 100]) {
    const y = sy(v);
    grid += `<line x1="${pad.l}" y1="${y}" x2="${pad.l + pw}" y2="${y}" stroke="${t.grid}" stroke-width="1"/>`;
    grid += `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" fill="${t.sub}" font-size="10">${v}</text>`;
  }
  years.forEach((yr, i) => {
    if (i % 2 === 0) {
      const x = sx(i);
      grid += `<text x="${x}" y="${H - 12}" text-anchor="middle" fill="${t.sub}" font-size="10">${yr}</text>`;
    }
  });

  let layers = '';
  let legend = '';
  seriesData.forEach((pts, s) => {
    const c = cols[s];
    const lbl = (labels && labels[s]) || defaultSeries[s] || `Series ${s + 1}`;
    const upper = pts.map((p, i) => `${sx(i).toFixed(1)},${sy(p.hi).toFixed(1)}`).join(' ');
    const lower = [...pts].reverse().map((p, i) => `${sx(pts.length - 1 - i).toFixed(1)},${sy(p.lo).toFixed(1)}`).join(' ');
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
    layers += `<polygon points="${upper} ${lower}" fill="${c}" fill-opacity="0.16"/>`;
    layers += `<path d="${line}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>`;
    pts.forEach((p, i) => {
      layers += `<circle cx="${sx(i).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="3.1" fill="${c}" stroke="${t.bg}" stroke-width="1"/>`;
    });
    const ly = pad.t + 14 + s * 22;
    legend += `<line x1="${W - 140}" y1="${ly}" x2="${W - 122}" y2="${ly}" stroke="${c}" stroke-width="3"/>`;
    legend += `<circle cx="${W - 131}" cy="${ly}" r="3" fill="${c}"/>`;
    legend += `<text x="${W - 115}" y="${ly + 3.5}" fill="${t.text}" font-size="10.5">${escapeXml(lbl)}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect x="${pad.l}" y="${pad.t}" width="${pw}" height="${ph}" fill="${t.panel}" rx="4"/>
    ${grid}
    ${layers}
    ${legend}
    <text x="${pad.l}" y="22" fill="${t.text}" font-size="12.5" font-weight="700">Relative Survey Biomass Index (gfsynopsis archetype) — ${escapeXml(title)}</text>
    <text x="15" y="${pad.t + ph / 2}" fill="${t.sub}" font-size="10.5" transform="rotate(-90 15 ${pad.t + ph / 2})" text-anchor="middle">Index (t / km²)</text>
  </svg>`;
}

/* 2. Multi-Species Stacked Catch / Bycatch Time Series */
function renderStackedCatch(cols, labels, t, title) {
  const W = 760, H = 270;
  const pad = { l: 56, r: 155, t: 38, b: 36 };
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
  const years = Array.from({ length: 15 }, (_, i) => 2010 + i);
  const defaults = ['Rockfish', 'Flatfish', 'Sablefish', 'Lingcod', 'Chinook', 'Coho', 'Dogfish', 'Skate'];
  const k = Math.min(cols.length, 8);

  const raw = years.map((_, i) =>
    Array.from({ length: k }, (_, s) => 12 + 8 * Math.sin(i * 0.45 + s * 1.3) + (s % 3) * 4)
  );
  const totals = raw.map((row) => row.reduce((a, b) => a + b, 0));
  const maxTot = Math.max(...totals) * 1.08;

  const sx = (i) => pad.l + (i / (years.length - 1)) * pw;
  const sy = (v) => pad.t + ph - (v / maxTot) * ph;

  let grid = '';
  for (let g = 0; g <= 4; g++) {
    const v = (maxTot * g) / 4;
    const y = sy(v);
    grid += `<line x1="${pad.l}" y1="${y}" x2="${pad.l + pw}" y2="${y}" stroke="${t.grid}"/>`;
    grid += `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" fill="${t.sub}" font-size="10">${Math.round(v * 10)}</text>`;
  }
  years.forEach((yr, i) => {
    if (i % 3 === 0) grid += `<text x="${sx(i)}" y="${H - 12}" text-anchor="middle" fill="${t.sub}" font-size="10">${yr}</text>`;
  });

  const cum = years.map(() => 0);
  let areas = '';
  let legend = '';
  for (let s = 0; s < k; s++) {
    const prev = [...cum];
    for (let i = 0; i < years.length; i++) cum[i] += raw[i][s];
    const topPts = years.map((_, i) => `${sx(i).toFixed(1)},${sy(cum[i]).toFixed(1)}`).join(' ');
    const botPts = [...years].reverse().map((_, ri) => {
      const i = years.length - 1 - ri;
      return `${sx(i).toFixed(1)},${sy(prev[i]).toFixed(1)}`;
    }).join(' ');
    areas += `<polygon points="${topPts} ${botPts}" fill="${cols[s]}" fill-opacity="0.92" stroke="${t.bg}" stroke-width="0.7"/>`;
    const lbl = (labels && labels[s]) || defaults[s] || `Group ${s + 1}`;
    const ly = pad.t + 12 + s * 20;
    legend += `<rect x="${W - 140}" y="${ly - 8}" width="12" height="12" rx="2" fill="${cols[s]}"/>`;
    legend += `<text x="${W - 122}" y="${ly + 2}" fill="${t.text}" font-size="10.5">${escapeXml(lbl)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect x="${pad.l}" y="${pad.t}" width="${pw}" height="${ph}" fill="${t.panel}" rx="4"/>
    ${grid}
    ${areas}
    ${legend}
    <text x="${pad.l}" y="22" fill="${t.text}" font-size="12.5" font-weight="700">Multi-Species Commercial Catch Composition — ${escapeXml(title)}</text>
    <text x="15" y="${pad.t + ph / 2}" fill="${t.sub}" font-size="10.5" transform="rotate(-90 15 ${pad.t + ph / 2})" text-anchor="middle">Catch (tonnes)</text>
  </svg>`;
}

/* 3. Spatial Bathymetry / CPUE Grid Heatmap (BC Shelf-to-Slope archetype) */
function renderSpatialCpue(cols, t, title) {
  const W = 760, H = 270;
  const pad = { l: 56, r: 120, t: 38, b: 36 };
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
  const nx = 24, ny = 10;
  const cw = pw / nx, ch = ph / ny;
  let cells = '';

  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      // Simulate BC shelf bathymetry / CPUE plume from NW to SE
      const u = ix / (nx - 1);
      const v = iy / (ny - 1);
      // Mask out top-right "coastline" for a Queen Charlotte Sound / WCVI feel
      if (u > 0.68 && v < 0.34 && u - v > 0.56) {
        cells += `<rect x="${(pad.l + ix * cw).toFixed(1)}" y="${(pad.t + iy * ch).toFixed(1)}" width="${(cw + 0.5).toFixed(1)}" height="${(ch + 0.5).toFixed(1)}" fill="${t.panel}" stroke="${t.grid}" stroke-width="0.5"/>`;
        continue;
      }
      const field =
        0.5 +
        0.34 * Math.sin(u * 4.2 - v * 2.1) +
        0.22 * Math.cos(u * 2.4 + v * 3.8) -
        0.18 * (u - 0.5);
      const clamped = Math.max(0, Math.min(0.999, field));
      const cIdx = Math.floor(clamped * cols.length);
      cells += `<rect x="${(pad.l + ix * cw).toFixed(1)}" y="${(pad.t + iy * ch).toFixed(1)}" width="${(cw + 0.6).toFixed(1)}" height="${(ch + 0.6).toFixed(1)}" fill="${cols[cIdx]}"/>`;
    }
  }

  // Colorbar
  const barX = W - 92, barW = 16, barH = ph - 14;
  let barSegs = '';
  const segH = barH / cols.length;
  cols.forEach((c, i) => {
    const y = pad.t + 7 + (cols.length - 1 - i) * segH;
    barSegs += `<rect x="${barX}" y="${y.toFixed(1)}" width="${barW}" height="${(segH + 0.6).toFixed(1)}" fill="${c}"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    ${cells}
    <rect x="${pad.l}" y="${pad.t}" width="${pw}" height="${ph}" fill="none" stroke="${t.axis}" stroke-width="1"/>
    ${barSegs}
    <rect x="${barX}" y="${pad.t + 7}" width="${barW}" height="${barH}" fill="none" stroke="${t.axis}" stroke-width="0.8"/>
    <text x="${barX + 24}" y="${pad.t + 16}" fill="${t.sub}" font-size="10">High</text>
    <text x="${barX + 24}" y="${pad.t + 7 + barH / 2 + 3}" fill="${t.sub}" font-size="10">Mid</text>
    <text x="${barX + 24}" y="${pad.t + 7 + barH}" fill="${t.sub}" font-size="10">Low</text>
    <text x="${pad.l}" y="22" fill="${t.text}" font-size="12.5" font-weight="700">Spatial CPUE / Bathymetry Surface (BC Shelf Grid) — ${escapeXml(title)}</text>
    <text x="${pad.l + pw / 2}" y="${H - 10}" text-anchor="middle" fill="${t.sub}" font-size="10.5">Longitude (°W, offshore → coast)</text>
    <text x="16" y="${pad.t + ph / 2}" fill="${t.sub}" font-size="10.5" transform="rotate(-90 16 ${pad.t + ph / 2})" text-anchor="middle">Latitude (°N)</text>
  </svg>`;
}

/* 4. Length / Age Composition Grouped Bars */
function renderLengthComp(cols, labels, t, title) {
  const W = 760, H = 270;
  const pad = { l: 56, r: 155, t: 38, b: 38 };
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
  const bins = ['20–29', '30–39', '40–49', '50–59', '60–69', '70–79', '80+'];
  const k = Math.min(cols.length, 6);
  const groupW = pw / bins.length;
  const barW = Math.max(4, (groupW - 14) / k);

  let grid = '';
  for (const v of [0, 10, 20, 30, 40]) {
    const y = pad.t + ph - (v / 42) * ph;
    grid += `<line x1="${pad.l}" y1="${y}" x2="${pad.l + pw}" y2="${y}" stroke="${t.grid}"/>`;
    grid += `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" fill="${t.sub}" font-size="10">${v}%</text>`;
  }

  let bars = '';
  bins.forEach((b, bi) => {
    const gx = pad.l + bi * groupW + 7;
    bars += `<text x="${gx + (groupW - 14) / 2}" y="${H - 12}" text-anchor="middle" fill="${t.sub}" font-size="10">${b} cm</text>`;
    for (let s = 0; s < k; s++) {
      const peak = 2.1 + (s % 4) * 0.7;
      const val = Math.max(2, 34 * Math.exp(-Math.pow(bi - peak, 2) / 3.2) + (s % 2) * 3);
      const bh = (val / 42) * ph;
      const bx = gx + s * barW;
      const by = pad.t + ph - bh;
      bars += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(barW - 1.5).toFixed(1)}" height="${bh.toFixed(1)}" fill="${cols[s]}" rx="2"/>`;
    }
  });

  let legend = '';
  for (let s = 0; s < k; s++) {
    const lbl = (labels && labels[s]) || `Cohort ${s + 1}`;
    const ly = pad.t + 14 + s * 22;
    legend += `<rect x="${W - 140}" y="${ly - 8}" width="12" height="12" rx="2" fill="${cols[s]}"/>`;
    legend += `<text x="${W - 122}" y="${ly + 2}" fill="${t.text}" font-size="10.5">${escapeXml(lbl)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect x="${pad.l}" y="${pad.t}" width="${pw}" height="${ph}" fill="${t.panel}" rx="4"/>
    ${grid}
    ${bars}
    ${legend}
    <text x="${pad.l}" y="22" fill="${t.text}" font-size="12.5" font-weight="700">Length-Frequency Distribution by Group — ${escapeXml(title)}</text>
    <text x="15" y="${pad.t + ph / 2}" fill="${t.sub}" font-size="10.5" transform="rotate(-90 15 ${pad.t + ph / 2})" text-anchor="middle">Proportion (%)</text>
  </svg>`;
}

export function renderLightnessSvg(lightness, colors) {
  const W = 380, H = 76;
  const pad = { l: 26, r: 14, t: 12, b: 18 };
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
  const n = lightness.length;
  const sx = (i) => pad.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
  const sy = (v) => pad.t + ph - (v / 100) * ph;
  const path = lightness.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  const dots = lightness
    .map((v, i) => `<circle cx="${sx(i).toFixed(1)}" cy="${sy(v).toFixed(1)}" r="4.2" fill="${colors[i]}" stroke="#ffffff" stroke-width="1.2"/>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
    <line x1="${pad.l}" y1="${sy(0)}" x2="${pad.l + pw}" y2="${sy(0)}" stroke="currentColor" stroke-opacity="0.2"/>
    <line x1="${pad.l}" y1="${sy(50)}" x2="${pad.l + pw}" y2="${sy(50)}" stroke="currentColor" stroke-opacity="0.14" stroke-dasharray="3 3"/>
    <line x1="${pad.l}" y1="${sy(100)}" x2="${pad.l + pw}" y2="${sy(100)}" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="2" y="${sy(100) + 4}" fill="currentColor" opacity="0.6" font-size="9">100</text>
    <text x="7" y="${sy(50) + 3}" fill="currentColor" opacity="0.6" font-size="9">50</text>
    <text x="12" y="${sy(0) + 3}" fill="currentColor" opacity="0.6" font-size="9">0</text>
    <path d="${path}" fill="none" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.8"/>
    ${dots}
    <text x="${pad.l + pw / 2}" y="${H - 2}" text-anchor="middle" fill="currentColor" opacity="0.65" font-size="9.5">OKLab Lightness Profile (L* 0–100)</text>
  </svg>`;
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
