import { auditColors, interpolatePalette, simulateCvd } from './color-math.js';
import { formatAttribution, getSilhouetteSvg, preloadSilhouettes } from './silhouettes.js';
import { renderFisheriesChart, renderLightnessSvg } from './charts.js';
import { generateCode } from './codegen.js';

const COLLECTIONS = [
  { id: 'all', label: 'All Palettes' },
  { id: 'bc_groundfish', label: 'BC Groundfish' },
  { id: 'bc_salmon', label: 'Pacific Salmon' },
  { id: 'bc_pelagics', label: 'Pelagics & Forage' },
  { id: 'bc_invertebrates', label: 'Shellfish & Marine' },
  { id: 'bc_bizarre', label: 'Weird & Bizarre' },
  { id: 'bc_guilds', label: 'Species Guilds' },
  { id: 'bc_management', label: 'Fisheries & Management' },
  { id: 'r_ecosystem', label: 'Top R Packages' },
];

const state = {
  data: null,
  collection: 'all',
  type: 'all',
  family: 'all',
  search: '',
  cvdOnly: false,
  cvdMode: 'normal',
  activePalette: null,
  wb: {
    n: 6,
    begin: 0,
    end: 1,
    reverse: false,
    chart: 'survey',
    codeFmt: 'pacfish',
    lightCanvas: true,
  },
  mixer: [], // [{ hex, label }]
};

const $ = (sel) => document.querySelector(sel);

async function init() {
  try {
    const resp = await fetch('data/palettes.json');
    state.data = await resp.json();
  } catch (err) {
    $('#palette-grid').innerHTML = `<div class="empty-state"><h3>Could not load palette catalog</h3><p>Serve <code>docs/</code> over HTTP (e.g. GitHub Pages or <code>python -m http.server -d docs</code>).</p></div>`;
    return;
  }

  await preloadSilhouettes(state.data.silhouettes);
  const logoSvg = getSilhouetteSvg('sebastes');
  if (logoSvg) $('#hero-logo').innerHTML = logoSvg;

  renderHeroStats();
  renderCollectionTabs();
  populateFamilySelect();
  bindEvents();
  renderGrid();
}

function renderHeroStats() {
  const pals = state.data.palettes;
  const bcSpecies = pals.filter(
    (p) => p.package === 'pacfishpalettes' && !['bc_guilds', 'bc_management'].includes(p.collection)
  ).length;
  const bcGuilds = pals.filter((p) => p.collection === 'bc_guilds').length;
  const bcMgmt = pals.filter((p) => p.collection === 'bc_management').length;
  const rPkgs = new Set(pals.filter((p) => p.collection === 'r_ecosystem').map((p) => p.package)).size;
  const silCount = Object.keys(state.data.silhouettes || {}).length;
  const cvdSafeCount = pals.filter((p) => p.audit?.cvd_safe).length;

  $('#hero-stats').innerHTML = [
    `<span class="stat-chip"><strong>${pals.length}</strong> Total Palettes</span>`,
    `<span class="stat-chip"><strong>${bcSpecies}</strong> BC &amp; Pacific Species</span>`,
    `<span class="stat-chip"><strong>${bcGuilds}</strong> Species Guild Sets</span>`,
    `<span class="stat-chip"><strong>${bcMgmt}</strong> Fisheries, Fleets &amp; DFO Sets</span>`,
    `<span class="stat-chip"><strong>${rPkgs}</strong> Integrated R Packages</span>`,
    `<span class="stat-chip"><strong>${silCount}</strong> PhyloPic Silhouettes</span>`,
    `<span class="stat-chip"><strong>${cvdSafeCount}</strong> Passing CVD Audit</span>`,
  ].join('');
}

function renderCollectionTabs() {
  const pals = state.data.palettes;
  $('#collection-tabs').innerHTML = COLLECTIONS.map((c) => {
    const cnt = c.id === 'all' ? pals.length : pals.filter((p) => p.collection === c.id).length;
    return `<button type="button" class="col-tab ${state.collection === c.id ? 'active' : ''}" data-col="${c.id}">
      ${c.label} <span class="tab-cnt">${cnt}</span>
    </button>`;
  }).join('');
}

function populateFamilySelect() {
  const pool =
    state.collection === 'all'
      ? state.data.palettes
      : state.data.palettes.filter((p) => p.collection === state.collection);
  const fams = [...new Set(pool.map((p) => p.family).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const sel = $('#family-select');
  sel.innerHTML = `<option value="all">All Families &amp; Packages (${fams.length})</option>` +
    fams.map((f) => `<option value="${escapeAttr(f)}">${escapeHtml(f)}</option>`).join('');
  if (!fams.includes(state.family)) state.family = 'all';
  sel.value = state.family;
}

function getFilteredPalettes() {
  const q = state.search.trim().toLowerCase();
  return state.data.palettes.filter((p) => {
    if (state.collection !== 'all' && p.collection !== state.collection) return false;
    if (state.type !== 'all' && p.type !== state.type) return false;
    if (state.family !== 'all' && p.family !== state.family) return false;
    if (state.cvdOnly && !p.audit?.cvd_safe) return false;
    if (q) {
      const hay = [
        p.id,
        p.name,
        p.common_name,
        p.scientific_name,
        p.dfo_code,
        p.dfo_code_display,
        p.family,
        p.group,
        p.package,
        p.paletteer_id,
        p.notes,
        ...(p.labels || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderGrid() {
  const list = getFilteredPalettes();
  $('#results-count').textContent = `Showing ${list.length} of ${state.data.palettes.length} palettes`;

  const grid = $('#palette-grid');
  const empty = $('#empty-state');
  if (list.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  grid.innerHTML = list.map((p) => renderCard(p)).join('');
}

function renderCard(p) {
  const swatches = p.colors
    .map((hex, i) => {
      const shown = simulateCvd(hex, state.cvdMode);
      const lbl = p.labels?.[i] || `${p.name} #${i + 1}`;
      return `<div class="swatch-seg" style="background:${shown}" data-copy-hex="${hex}" title="Click to copy ${hex} (${escapeAttr(lbl)})">
        <button type="button" class="swatch-add-btn" data-add-hex="${hex}" data-add-label="${escapeAttr(lbl)}" title="Add ${hex} to Mix Tray">+</button>
        <span class="swatch-hex-hover">${hex}</span>
      </div>`;
    })
    .join('');

  const silSvg = getSilhouetteSvg(p.silhouette);
  const accentHex = simulateCvd(p.colors[Math.min(1, p.colors.length - 1)], state.cvdMode);
  const silTitle = formatAttribution(p.silhouette_meta);
  const silBlock = silSvg
    ? `<div class="card-sil" style="color:${accentHex}" title="${escapeAttr(silTitle)}">${silSvg}</div>`
    : '';

  const rating = p.audit?.cvd_rating || 'moderate';
  const badgeLabel = rating === 'safe' ? 'CVD Safe' : rating === 'moderate' ? 'Moderate' : 'Caution';
  const dfoChip =
    p.dfo_code_display || (p.dfo_code && !String(p.dfo_code).includes('_') ? p.dfo_code : null);

  return `<article class="palette-card" data-open-palette="${p.id}">
    <div class="card-swatches">${swatches}</div>
    <div class="card-body">
      <div class="card-top">
        <div>
          <h3 class="card-title">${escapeHtml(p.name)}</h3>
          ${p.scientific_name ? `<div class="card-sci">${escapeHtml(p.scientific_name)}</div>` : `<div class="card-sci">${escapeHtml(p.group)}</div>`}
        </div>
        ${silBlock}
      </div>

      <div class="card-tags">
        <span class="tag">${escapeHtml(p.type)}</span>
        <span class="tag ${p.package !== 'pacfishpalettes' ? 'tag-pkg' : ''}">${escapeHtml(p.package === 'pacfishpalettes' ? p.family : p.package)}</span>
        ${dfoChip ? `<span class="tag tag-dfo">DFO #${escapeHtml(dfoChip)}</span>` : ''}
        <span class="cvd-pill cvd-${rating}" title="Min OKLab ΔE under Deutan/Protan: ${p.audit?.deutan_min_de} / ${p.audit?.protan_min_de}">${badgeLabel}</span>
      </div>

      <p class="card-notes">${escapeHtml(p.notes || '')}</p>

      <div class="card-footer">
        <span>${p.n_colors} base colours · ΔE ${p.audit?.min_delta_e ?? '—'}</span>
        <span class="card-action-link">Inspect &amp; R Code →</span>
      </div>
    </div>
  </article>`;
}

/* ---- Interactive Workbench ------------------------------------------------ */
function openWorkbench(paletteOrCustom) {
  state.activePalette = paletteOrCustom;
  state.wb.n = paletteOrCustom.colors.length;
  state.wb.begin = 0;
  state.wb.end = 1;
  state.wb.reverse = false;
  state.wb.chart = paletteOrCustom.type === 'discrete' ? 'survey' : 'spatial';
  state.wb.codeFmt = paletteOrCustom.package === 'pacfishpalettes' ? 'pacfish' : 'upstream';

  $('#wb-n').value = Math.min(14, Math.max(2, state.wb.n));
  $('#wb-begin').value = 0;
  $('#wb-end').value = 1;
  $('#wb-reverse').checked = false;

  // Sync active tab pills
  document.querySelectorAll('#wb-chart-tabs .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.chart === state.wb.chart));
  document.querySelectorAll('#wb-code-tabs .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.fmt === state.wb.codeFmt));

  $('#workbench-backdrop').hidden = false;
  document.body.style.overflow = 'hidden';
  renderWorkbench();
}

function closeWorkbench() {
  $('#workbench-backdrop').hidden = true;
  document.body.style.overflow = '';
}

function getWorkbenchColors() {
  const p = state.activePalette;
  return interpolatePalette(p.colors, state.wb.n, {
    begin: state.wb.begin,
    end: state.wb.end,
    reverse: state.wb.reverse,
    mode: p.type === 'discrete' ? 'discrete' : 'continuous',
  });
}

function renderWorkbench() {
  const p = state.activePalette;
  if (!p) return;

  const cols = getWorkbenchColors();
  const simCols = cols.map((c) => simulateCvd(c, state.cvdMode));
  const audit = auditColors(cols, p.type);

  $('#wb-n-val').textContent = state.wb.n;
  $('#wb-begin-val').textContent = state.wb.begin.toFixed(2);
  $('#wb-end-val').textContent = state.wb.end.toFixed(2);

  const eyebrowParts = [p.package, p.family, p.type];
  if (p.dfo_code && !String(p.dfo_code).includes('_')) eyebrowParts.push(`DFO #${p.dfo_code}`);
  $('#wb-eyebrow').textContent = eyebrowParts.filter(Boolean).join(' · ');
  $('#wb-title').textContent = p.name;
  $('#wb-subtitle').textContent = [p.scientific_name, p.habitat].filter(Boolean).join(' — ');
  $('#wb-notes').textContent = p.notes || '';

  const silSvg = getSilhouetteSvg(p.silhouette);
  const silBox = $('#wb-silhouette');
  if (silSvg) {
    silBox.hidden = false;
    silBox.style.color = simCols[Math.min(1, simCols.length - 1)];
    silBox.innerHTML = silSvg;
    silBox.title = formatAttribution(p.silhouette_meta);
  } else {
    silBox.hidden = true;
  }

  // Swatch tiles
  const activeLabels =
    p.labels && p.labels.length === cols.length
      ? state.wb.reverse
        ? [...p.labels].reverse()
        : p.labels
      : null;

  $('#wb-swatches').innerHTML = cols
    .map((hex, i) => {
      const lbl = activeLabels ? activeLabels[i] : `Colour ${i + 1}`;
      return `<div class="wb-swatch-tile" data-copy-hex="${hex}" title="Click to copy ${hex}">
        <div class="wb-swatch-color" style="background:${simCols[i]}"></div>
        <div class="wb-swatch-meta">
          <span class="wb-swatch-hex">${hex}</span>
          <span class="wb-swatch-lbl">${escapeHtml(lbl)}</span>
        </div>
      </div>`;
    })
    .join('');

  // Live Fisheries SVG Chart
  $('#wb-chart-stage').innerHTML = renderFisheriesChart(state.wb.chart, cols, activeLabels, {
    cvdMode: state.cvdMode,
    lightCanvas: state.wb.lightCanvas,
    title: p.name,
  });

  // Perceptual & CVD Audit
  const badge = $('#wb-cvd-badge');
  badge.className = `cvd-pill cvd-${audit.rating}`;
  badge.textContent =
    audit.rating === 'safe' ? 'CVD Safe' : audit.rating === 'moderate' ? 'Moderate Separation' : 'Caution (CVD Pairs Close)';

  $('#wb-audit-metrics').innerHTML = [
    `<div class="metric-box"><div class="metric-lbl">Normal ΔE</div><div class="metric-val">${audit.minNormal}</div></div>`,
    `<div class="metric-box"><div class="metric-lbl">Deutan ΔE</div><div class="metric-val">${audit.deutan}</div></div>`,
    `<div class="metric-box"><div class="metric-lbl">Protan ΔE</div><div class="metric-val">${audit.protan}</div></div>`,
    `<div class="metric-box"><div class="metric-lbl">L* Span</div><div class="metric-val">${audit.lightnessSpan}</div></div>`,
  ].join('');

  const modes = [
    ['Normal', 'normal'],
    ['Deuteranopia', 'deutan'],
    ['Protanopia', 'protan'],
    ['Tritanopia', 'tritan'],
    ['Grayscale', 'achromatopsia'],
  ];
  $('#wb-cvd-strips').innerHTML = modes
    .map(([label, m]) => {
      const segs = cols.map((c) => `<span style="background:${simulateCvd(c, m)}"></span>`).join('');
      return `<div class="cvd-strip-row"><span>${label}</span><div class="cvd-bar">${segs}</div></div>`;
    })
    .join('');

  $('#wb-lightness-chart').innerHTML = renderLightnessSvg(audit.lightness, simCols);

  // Code Export
  $('#wb-code-output').textContent = generateCode(p, cols, state.wb, state.wb.codeFmt);
}

/* ---- Custom Mix & Match Composer ------------------------------------------ */
function addToMixer(hex, label) {
  if (state.mixer.length >= 12) {
    showToast('Mix Tray max 12 colours');
    return;
  }
  state.mixer.push({ hex: hex.toUpperCase(), label });
  renderMixer();
  showToast(`Added ${hex} to Mix Tray`);
}

function renderMixer() {
  $('#mixer-count').textContent = state.mixer.length;
  const swEl = $('#mixer-swatches');
  if (state.mixer.length === 0) {
    swEl.innerHTML = `<span style="color:var(--text-muted);font-size:0.82rem">No colours added yet. Hover any swatch in the catalog and click <strong>+</strong>.</span>`;
    $('#mixer-audit').innerHTML = '';
    $('#mixer-code').textContent = 'my_bc_pal <- c()';
    return;
  }

  swEl.innerHTML = state.mixer
    .map((item, idx) => {
      const shown = simulateCvd(item.hex, state.cvdMode);
      return `<div class="mix-chip" title="${escapeAttr(item.label)}">
        <span class="mix-dot" style="background:${shown}"></span>
        <span>${item.hex}</span>
        ${idx > 0 ? `<button type="button" class="mix-btn" data-mix-left="${idx}" title="Move left">‹</button>` : ''}
        ${idx < state.mixer.length - 1 ? `<button type="button" class="mix-btn" data-mix-right="${idx}" title="Move right">›</button>` : ''}
        <button type="button" class="mix-btn" data-mix-del="${idx}" title="Remove">×</button>
      </div>`;
    })
    .join('');

  const hexes = state.mixer.map((m) => m.hex);
  const audit = auditColors(hexes, 'discrete');
  $('#mixer-audit').innerHTML = `
    <span class="cvd-pill cvd-${audit.rating}">${audit.rating === 'safe' ? 'CVD Safe' : audit.rating === 'moderate' ? 'Moderate' : 'Caution'}</span>
    <div style="margin-top:0.35rem">Normal ΔE <strong>${audit.minNormal}</strong> · Deutan <strong>${audit.deutan}</strong> · Protan <strong>${audit.protan}</strong></div>
  `;

  const pairs = state.mixer.map((m) => `"${m.label}" = "${m.hex}"`).join(', ');
  $('#mixer-code').textContent = `custom_bc_pal <- c(${pairs})`;
}

/* ---- Events --------------------------------------------------------------- */
function bindEvents() {
  // Collection tabs
  $('#collection-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.col-tab');
    if (!btn) return;
    state.collection = btn.dataset.col;
    renderCollectionTabs();
    populateFamilySelect();
    renderGrid();
  });

  // Search
  const searchIn = $('#search-input');
  const searchClr = $('#search-clear');
  searchIn.addEventListener('input', () => {
    state.search = searchIn.value;
    searchClr.hidden = !state.search;
    renderGrid();
  });
  searchClr.addEventListener('click', () => {
    searchIn.value = '';
    state.search = '';
    searchClr.hidden = true;
    renderGrid();
  });

  // Type segmented filter
  $('#type-filter').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.type = btn.dataset.type;
    document.querySelectorAll('#type-filter .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    renderGrid();
  });

  // Family dropdown
  $('#family-select').addEventListener('change', (e) => {
    state.family = e.target.value;
    renderGrid();
  });

  // CVD-safe only toggle
  $('#cvd-only-toggle').addEventListener('change', (e) => {
    state.cvdOnly = e.target.checked;
    renderGrid();
  });

  // Global CVD Vision Simulator
  $('#cvd-mode-group').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.cvdMode = btn.dataset.cvd;
    document.querySelectorAll('#cvd-mode-group .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    renderGrid();
    renderMixer();
    if (!$('#workbench-backdrop').hidden) renderWorkbench();
  });

  // Reset filters
  $('#btn-reset-filters').addEventListener('click', () => {
    state.collection = 'all';
    state.type = 'all';
    state.family = 'all';
    state.search = '';
    state.cvdOnly = false;
    searchIn.value = '';
    searchClr.hidden = true;
    $('#cvd-only-toggle').checked = false;
    document.querySelectorAll('#type-filter .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.type === 'all'));
    renderCollectionTabs();
    populateFamilySelect();
    renderGrid();
  });

  // Grid interactions (copy swatch, add to mix, open workbench)
  $('#palette-grid').addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add-hex]');
    if (addBtn) {
      e.stopPropagation();
      addToMixer(addBtn.dataset.addHex, addBtn.dataset.addLabel);
      return;
    }
    const sw = e.target.closest('[data-copy-hex]');
    if (sw) {
      e.stopPropagation();
      copyText(sw.dataset.copyHex, `Copied ${sw.dataset.copyHex}`);
      return;
    }
    const card = e.target.closest('[data-open-palette]');
    if (card) {
      const p = state.data.palettes.find((x) => x.id === card.dataset.openPalette);
      if (p) openWorkbench(p);
    }
  });

  // Workbench controls
  $('#wb-close').addEventListener('click', closeWorkbench);
  $('#workbench-backdrop').addEventListener('click', (e) => {
    if (e.target === $('#workbench-backdrop')) closeWorkbench();
  });
  $('#wb-n').addEventListener('input', (e) => {
    state.wb.n = parseInt(e.target.value, 10);
    renderWorkbench();
  });
  $('#wb-begin').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    state.wb.begin = Math.min(v, state.wb.end - 0.1);
    e.target.value = state.wb.begin;
    renderWorkbench();
  });
  $('#wb-end').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    state.wb.end = Math.max(v, state.wb.begin + 0.1);
    e.target.value = state.wb.end;
    renderWorkbench();
  });
  $('#wb-reverse').addEventListener('change', (e) => {
    state.wb.reverse = e.target.checked;
    renderWorkbench();
  });
  $('#wb-plot-light').addEventListener('change', (e) => {
    state.wb.lightCanvas = e.target.checked;
    renderWorkbench();
  });
  $('#wb-chart-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.wb.chart = btn.dataset.chart;
    document.querySelectorAll('#wb-chart-tabs .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    renderWorkbench();
  });
  $('#wb-code-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.wb.codeFmt = btn.dataset.fmt;
    document.querySelectorAll('#wb-code-tabs .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    renderWorkbench();
  });
  $('#wb-copy-code').addEventListener('click', () => {
    copyText($('#wb-code-output').textContent, 'Copied R code to clipboard');
  });
  $('#wb-swatches').addEventListener('click', (e) => {
    const tile = e.target.closest('[data-copy-hex]');
    if (tile) copyText(tile.dataset.copyHex, `Copied ${tile.dataset.copyHex}`);
  });
  $('#wb-add-all').addEventListener('click', () => {
    const cols = getWorkbenchColors();
    cols.forEach((c, i) => {
      if (state.mixer.length < 12) {
        state.mixer.push({ hex: c, label: state.activePalette.labels?.[i] || `${state.activePalette.name} ${i + 1}` });
      }
    });
    renderMixer();
    $('#mixer-drawer').hidden = false;
    showToast(`Added colours to Mix Tray`);
  });

  // Mixer drawer
  $('#btn-open-mixer').addEventListener('click', () => {
    const d = $('#mixer-drawer');
    d.hidden = !d.hidden;
    renderMixer();
  });
  $('#mixer-close-btn').addEventListener('click', () => ($('#mixer-drawer').hidden = true));
  $('#mixer-clear-btn').addEventListener('click', () => {
    state.mixer = [];
    renderMixer();
  });
  $('#mixer-copy-btn').addEventListener('click', () => {
    copyText($('#mixer-code').textContent, 'Copied custom R vector');
  });
  $('#mixer-preview-btn').addEventListener('click', () => {
    if (state.mixer.length < 2) {
      showToast('Add at least 2 colours to preview');
      return;
    }
    openWorkbench({
      id: 'custom_bc_mix',
      name: 'Custom BC Mix Palette',
      package: 'pacfishpalettes',
      family: 'Custom Composer',
      group: 'Custom',
      type: 'discrete',
      silhouette: 'sebastes',
      colors: state.mixer.map((m) => m.hex),
      labels: state.mixer.map((m) => m.label),
      notes: 'Custom mixed palette assembled in the pacfishpalettes Studio.',
    });
  });
  $('#mixer-swatches').addEventListener('click', (e) => {
    const del = e.target.closest('[data-mix-del]');
    const left = e.target.closest('[data-mix-left]');
    const right = e.target.closest('[data-mix-right]');
    if (del) {
      state.mixer.splice(parseInt(del.dataset.mixDel, 10), 1);
      renderMixer();
    } else if (left) {
      const i = parseInt(left.dataset.mixLeft, 10);
      [state.mixer[i - 1], state.mixer[i]] = [state.mixer[i], state.mixer[i - 1]];
      renderMixer();
    } else if (right) {
      const i = parseInt(right.dataset.mixRight, 10);
      [state.mixer[i + 1], state.mixer[i]] = [state.mixer[i], state.mixer[i + 1]];
      renderMixer();
    }
  });

  // Install modal
  $('#btn-open-install').addEventListener('click', () => ($('#install-backdrop').hidden = false));
  $('#install-close').addEventListener('click', () => ($('#install-backdrop').hidden = true));
  $('#install-backdrop').addEventListener('click', (e) => {
    if (e.target === $('#install-backdrop')) $('#install-backdrop').hidden = true;
  });
  $('#btn-copy-install').addEventListener('click', () => {
    copyText($('#install-snippet').textContent, 'Copied R quickstart snippet');
  });

  // Intro guide collapse toggle
  const introBtn = $('#btn-toggle-intro');
  if (introBtn) {
    introBtn.addEventListener('click', () => {
      const card = document.querySelector('.intro-card');
      const collapsed = card.classList.toggle('collapsed');
      introBtn.textContent = collapsed ? 'Show Guide' : 'Hide Guide';
      introBtn.setAttribute('aria-expanded', String(!collapsed));
    });
  }

  // Theme toggle
  $('#btn-theme-toggle').addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    $('#theme-icon').textContent = next === 'dark' ? '☀' : '☾';
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeWorkbench();
      $('#install-backdrop').hidden = true;
    }
  });
}

let toastTimer;
function showToast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 2100);
}

async function copyText(text, msg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(msg);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(msg);
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

init();
