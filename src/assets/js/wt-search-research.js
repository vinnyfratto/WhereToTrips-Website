// wt-search-research.js — renders the /admin/search_research/ review page.
// The page code carries no research content. Content and keyword rows come from one JSON file
// (see loadData). Signed-in admin check is the same one every admin page uses.
import { boot, supabase } from './wt-padmin-core.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const money = (n) => (n == null ? 'n/a' : '$' + n.toFixed(2));
const vol = (n) => (n >= 1e6 ? n / 1e6 + 'M' : n >= 1e3 ? n / 1e3 + 'K' : String(n));
const volRange = (l, h) => `${vol(l)} to ${vol(h)}`;
const int = (n) => Math.round(n).toLocaleString('en-US');

// ---------------------------------------------------------------- data
// The content is NOT in the site files (the repo is public). It sits in a private Supabase Storage
// bucket, and the database only returns it to a signed-in admin (policy uses public.is_admin()).
// For local review (?review=1 on localhost) the same JSON is read from a gitignored local file.
const BUCKET = 'admin-research';
const OBJECT = 'search-research.json';
async function loadData(local) {
  let d;
  if (local) {
    const res = await fetch('/assets/private/search-research.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('local_data_not_found');
    d = await res.json();
  } else {
    const { data, error } = await supabase.storage.from(BUCKET).download(OBJECT);
    if (error || !data) throw new Error('storage_' + (error?.statusCode || error?.message || 'empty'));
    d = JSON.parse(await data.text());
  }
  d.kw = d.keywords.map((a) => Object.fromEntries(d.kwCols.map((c, i) => [c, a[i]])));
  return d;
}

// ---------------------------------------------------------------- blocks
const tableHtml = (b) => {
  const head = b.cols.map((c) => `<th class="${c.a === 'r' ? 'r' : ''}">${esc(c.h)}</th>`).join('');
  const rows = b.rows.map((r) => '<tr>' + r.map((c, i) => `<td class="${b.cols[i]?.a === 'r' ? 'r' : ''}">${fmt(c)}</td>`).join('') + '</tr>').join('');
  return `<div class="sr-tablewrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`
    + (b.note ? `<p class="note">${fmt(b.note)}</p>` : '') + (b.src ? `<p class="src">Source: ${esc(b.src)}</p>` : '');
};

const barsHtml = (b) => {
  const max = b.max || Math.max(...b.items.map((i) => i.v));
  return '<div class="sr-bars">' + b.items.map((i) => `<div class="sr-bar"><div class="l">${esc(i.l)}</div><div class="t"><div class="f ${i.tone || ''}" style="width:${Math.max(2, (i.v / max) * 100).toFixed(1)}%"></div></div><div class="d">${esc(i.d || '')}</div></div>`).join('') + '</div>';
};

const sparkHtml = (b) => {
  const W = 800, H = 150, pad = 6;
  const n = b.series[0].data.length;
  const max = Math.max(...b.series.flatMap((s) => s.data));
  const pts = (d) => d.map((v, i) => `${(pad + (i / (n - 1)) * (W - pad * 2)).toFixed(1)},${(H - pad - (v / max) * (H - pad * 2)).toFixed(1)}`).join(' ');
  const grid = [0.25, 0.5, 0.75, 1].map((f) => `<line x1="0" x2="${W}" y1="${(H - pad - f * (H - pad * 2)).toFixed(1)}" y2="${(H - pad - f * (H - pad * 2)).toFixed(1)}" stroke="#E2E7EB" stroke-width="1"/>`).join('');
  const lines = b.series.map((s) => `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" points="${pts(s.data)}"/>`).join('');
  return `<div class="sr-spark"><h4>${esc(b.title)}</h4><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(b.title)}">${grid}${lines}</svg>`
    + `<div class="ax"><span>${esc(b.labels[0])}</span><span>peak ${max}/day</span><span>${esc(b.labels[1])}</span></div>`
    + `<div class="leg">${b.series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div></div>`
    + (b.note ? `<p class="note">${fmt(b.note)}</p>` : '');
};

const state = { fam: '', q: '', fit: 'diamond', comp: '', vmin: 0, bmax: 99, rise: false, sort: 'vol', shown: 40 };
let D = null;

function blockHtml(b) {
  switch (b.t) {
    case 'p': return `<p>${fmt(b.x)}</p>`;
    case 'h3': return `<h3>${esc(b.x)}</h3>`;
    case 'list': return (b.ordered ? '<ol>' : '<ul>') + b.items.map((i) => `<li>${fmt(i)}</li>`).join('') + (b.ordered ? '</ol>' : '</ul>');
    case 'tiles': return `<div class="sr-tiles c${b.cols || 3}">` + b.items.map((i) => `<div class="sr-tile ${i.tone || ''}"><p class="k">${esc(i.k)}</p><p class="v">${esc(i.v)}</p>${i.s ? `<p class="s">${esc(i.s)}</p>` : ''}</div>`).join('') + '</div>';
    case 'callout': return `<div class="sr-callout ${b.tone || 'info'}"><h4>${esc(b.title)}</h4><p>${fmt(b.x)}</p></div>`;
    case 'table': return tableHtml(b);
    case 'bars': return barsHtml(b);
    case 'spark': return sparkHtml(b);
    case 'cols2': return `<div class="sr-cols">${['left', 'right'].map((k) => `<div class="sr-col"><h4>${esc(b[k].title)}</h4>${b[k].blocks.map(blockHtml).join('')}</div>`).join('')}</div>`;
    case 'checklist': return '<div class="sr-check">' + b.items.map((i) => `<div class="${i.flag ? 'flag' : ''}"><span class="n">${i.n}</span><div><h4>${esc(i.title)}</h4><p>${fmt(i.x)}</p><p class="who">${esc(i.who)}</p></div></div>`).join('') + '</div>';
    case 'timeline': return '<div class="sr-time">' + b.items.map((i) => `<div><span class="d">${esc(i.d)}</span><p>${fmt(i.x)}</p></div>`).join('') + '</div>';
    case 'ads': return '<div class="sr-ads">' + b.items.map((a) => `<div class="sr-ad"><p class="g">${esc(a.g)}</p><p class="hl"><span class="ad">Ad</span>${esc(a.h.join(' | '))}</p>${a.d.map((d) => `<p class="ds">${esc(d)}</p>`).join('')}</div>`).join('') + '</div>';
    case 'diamonds': return '<div id="sr-diamonds"></div>';
    case 'kw': return '<div id="sr-kw"></div>';
    case 'calc': return '<div id="sr-calc"></div>';
    default: return '';
  }
}

// ---------------------------------------------------------------- diamonds + explorer
function diamondsHtml() {
  const rows = D.kw.filter((r) => r.fit === 'diamond');
  const by = {};
  for (const r of rows) (by[r.fam] = by[r.fam] || []).push(r);
  const fams = Object.entries(by).sort((a, b) => Math.max(...b[1].map((r) => r.vl)) - Math.max(...a[1].map((r) => r.vl)) || b[1].length - a[1].length);
  const body = fams.map(([f, rs]) => {
    const top = [...rs].sort((a, b) => b.vl - a.vl || a.bl - b.bl).slice(0, 3).map((r) => r.k).join('; ');
    const lows = rs.map((r) => r.bl), highs = rs.map((r) => r.bh);
    const maxV = rs.reduce((m, r) => (r.vl > m.vl ? r : m), rs[0]);
    const rising = rs.some((r) => r.rise) ? '<span class="sr-up" title="Crossed into a bigger search-volume range in the last 3 months or year">&#9650;</span>' : '';
    return `<tr class="sr-fam" data-fam="${esc(f)}" title="Click to filter the explorer"><td><strong>${esc(f)}</strong> ${rising}<br><span class="note" style="margin:0">${esc(top)}</span></td><td class="r">${rs.length}</td><td>${volRange(maxV.vl, maxV.vh)} (largest)</td><td class="r">${money(Math.min(...lows))} to ${money(Math.max(...lows))}</td><td class="r">${money(Math.min(...highs))} to ${money(Math.max(...highs))}</td></tr>`;
  }).join('');
  return `<h3>The diamonds, by family</h3><p class="sr-rule"><strong>What counts as a diamond:</strong> at least 1,000 US searches a month, Low or Medium competition, a low-range top-of-page bid of $0.30 or less, and a phrasing that matches what WhereTo does (open destination, budget, an occasion, a group, or a vibe). It is a rule applied to Google\'s numbers, not a prediction of results. Click a family to open it in the explorer below.</p>`
    + `<div class="sr-tablewrap sr-diam"><table><thead><tr><th>Family</th><th class="r">Keywords</th><th>Searches a month</th><th class="r">Price to appear, low end</th><th class="r">Price to appear, high end</th></tr></thead><tbody>${body}</tbody></table></div>`
    + `<p class="note">${rows.length} diamond keywords across ${fams.length} families. Prices are Google\'s estimated top-of-page bid range per click, US, Oct 2025 to Sep 2026.</p>`;
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  let rows = D.kw.filter((r) =>
    (!state.fam || r.fam === state.fam)
    && (state.fit === 'all' || (state.fit === 'diamond' ? r.fit === 'diamond' : state.fit === 'fit' ? (r.fit === 'diamond' || r.fit === 'fit') : state.fit === 'priced' ? r.fit === 'priced' : r.fit === 'offfit'))
    && (!state.comp || r.c === state.comp)
    && r.vl >= state.vmin
    && (state.bmax >= 99 || (r.bl != null && r.bl <= state.bmax))
    && (!state.rise || r.rise)
    && (!q || r.k.includes(q)));
  const key = { vol: (a, b) => b.vl - a.vl || (a.bl ?? 99) - (b.bl ?? 99), low: (a, b) => (a.bl ?? 99) - (b.bl ?? 99) || b.vl - a.vl, high: (a, b) => (a.bh ?? 99) - (b.bh ?? 99), az: (a, b) => a.k.localeCompare(b.k) }[state.sort];
  return rows.sort(key);
}

function kwHtml() {
  const fams = [...new Set(D.kw.map((r) => r.fam))].sort();
  const opt = (v, t, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(t)}</option>`;
  return `<h3>Keyword explorer</h3><div class="sr-ctl">
    <label>Search<input type="search" id="kw-q" placeholder="e.g. weekend, babymoon" value="${esc(state.q)}"></label>
    <label>Show<select id="kw-fit">${opt('diamond', 'Diamonds only', state.fit)}${opt('fit', 'All that fit the product', state.fit)}${opt('all', 'Everything (all 714)', state.fit)}${opt('priced', 'Priced out (apps, comparison, packages)', state.fit)}${opt('offfit', 'Off-fit (brands, local, services)', state.fit)}</select></label>
    <label>Family<select id="kw-fam">${opt('', 'All families', state.fam)}${fams.map((f) => opt(f, f, state.fam)).join('')}</select></label>
    <label>Competition<select id="kw-comp">${opt('', 'Any', state.comp)}${opt('Low', 'Low', state.comp)}${opt('Medium', 'Medium', state.comp)}${opt('High', 'High', state.comp)}</select></label>
    <label>Searches a month<select id="kw-vmin">${opt(0, 'Any', state.vmin)}${opt(100, '100 or more', state.vmin)}${opt(1000, '1K or more', state.vmin)}${opt(10000, '10K or more', state.vmin)}${opt(100000, '100K or more', state.vmin)}</select></label>
    <label>Low-end price<select id="kw-bmax">${opt(99, 'Any', state.bmax)}${opt(0.1, '$0.10 or less', state.bmax)}${opt(0.3, '$0.30 or less', state.bmax)}${opt(0.6, '$0.60 or less', state.bmax)}${opt(1, '$1.00 or less', state.bmax)}</select></label>
    <label>Sort<select id="kw-sort">${opt('vol', 'Most searches', state.sort)}${opt('low', 'Cheapest low end', state.sort)}${opt('high', 'Cheapest high end', state.sort)}${opt('az', 'A to Z', state.sort)}</select></label>
    <label class="chk"><input type="checkbox" id="kw-rise" ${state.rise ? 'checked' : ''}> Rising only</label>
    <button type="button" class="sr-btn" id="kw-csv">Download CSV</button>
  </div><p class="sr-count" id="kw-count"></p><div id="kw-table"></div>`;
}

function kwTable() {
  const rows = filtered();
  const part = rows.slice(0, state.shown);
  $('#kw-count').textContent = `${int(rows.length)} of ${int(D.kw.length)} keywords match.` + (rows.length > part.length ? ` Showing the first ${part.length}.` : '');
  const trend = (r) => (r.rise ? '<span class="sr-up" title="Crossed into a bigger search-volume range. Not a measured percentage.">&#9650; rising</span>' : (r.t3 || '').startsWith('-') || (r.ty || '').startsWith('-') ? '<span title="Dropped to a smaller range. Often seasonal.">&#9660;</span>' : '');
  const fit = { diamond: '<span class="sr-badge diamond">Diamond</span>', priced: '<span class="sr-badge priced">Priced out</span>', offfit: '<span class="sr-badge offfit">Off-fit</span>' };
  $('#kw-table').innerHTML = `<div class="sr-tablewrap"><table><thead><tr><th>Keyword</th><th>US searches a month</th><th>Competition</th><th class="r">Price to appear on top</th><th>Trend</th><th>Family</th><th>Found in</th></tr></thead><tbody>`
    + part.map((r) => `<tr><td><strong>${esc(r.k)}</strong> ${fit[r.fit] || ''}</td><td>${volRange(r.vl, r.vh)}</td><td>${esc(r.c)}</td><td class="r">${r.bl == null ? 'no data' : money(r.bl) + ' to ' + money(r.bh)}</td><td>${trend(r)}</td><td>${esc(r.fam)}</td><td>${esc(r.src)}</td></tr>`).join('')
    + '</tbody></table></div>'
    + (rows.length > part.length ? `<p><button type="button" class="sr-btn" id="kw-more">Show 40 more</button></p>` : '');
  const more = $('#kw-more'); if (more) more.addEventListener('click', () => { state.shown += 40; kwTable(); });
}

function wireKw() {
  const bind = (id, key, num) => $(id).addEventListener(id === '#kw-q' ? 'input' : 'change', (e) => {
    state[key] = id === '#kw-rise' ? e.target.checked : num ? parseFloat(e.target.value) : e.target.value; state.shown = 40; kwTable();
  });
  bind('#kw-q', 'q'); bind('#kw-fit', 'fit'); bind('#kw-fam', 'fam'); bind('#kw-comp', 'comp'); bind('#kw-vmin', 'vmin', true); bind('#kw-bmax', 'bmax', true); bind('#kw-sort', 'sort'); bind('#kw-rise', 'rise');
  $('#kw-csv').addEventListener('click', () => {
    const rows = filtered();
    const csv = ['keyword,us_searches_low,us_searches_high,competition,top_of_page_bid_low,top_of_page_bid_high,family,fit,rising']
      .concat(rows.map((r) => [r.k, r.vl, r.vh, r.c, r.bl ?? '', r.bh ?? '', r.fam, r.fit, r.rise ? 'yes' : ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'search-research-keywords.csv'; a.click();
  });
  document.querySelectorAll('.sr-fam').forEach((tr) => tr.addEventListener('click', () => {
    state.fam = tr.dataset.fam; state.fit = 'diamond'; state.shown = 40; renderKw(); $('#sr-kw').scrollIntoView({ behavior: 'smooth' });
  }));
}
function renderKw() { $('#sr-kw').innerHTML = kwHtml(); kwTable(); wireKw(); }

// ---------------------------------------------------------------- calculator
function calcHtml() {
  const f = (id, label, v, step) => `<label>${label}<input type="number" id="${id}" value="${v}" step="${step}" min="0"></label>`;
  return `<div class="sr-calc"><div class="in">${f('c-budget', 'Daily budget ($)', 38, 1)}${f('c-days', 'Days', 42, 1)}${f('c-cpc', 'Cost per click ($)', 0.4, 0.05)}${f('c-tap', 'Landing page to store tap (%)', 15, 1)}${f('c-inst', 'Store page to install (%)', 28, 1)}</div>
    <div class="out" id="c-out"></div><h4 style="margin:0 0 6px">Installs at <span id="c-total"></span> total, by cost per click and tap rate</h4><div id="c-grid"></div></div>`;
}
function calcRun() {
  const g = (id) => parseFloat($(id).value) || 0;
  const total = g('#c-budget') * g('#c-days'), cpc = g('#c-cpc'), tap = g('#c-tap') / 100, inst = g('#c-inst') / 100;
  const clicks = cpc ? total / cpc : 0, taps = clicks * tap, installs = taps * inst;
  $('#c-total').textContent = '$' + int(total);
  $('#c-out').innerHTML = [['Total spend', '$' + int(total)], ['Clicks', int(clicks)], ['Store taps', int(taps)], ['Installs', int(installs)], ['Cost per install', installs ? '$' + (total / installs).toFixed(2) : 'n/a']].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
  const cpcs = [0.25, 0.4, 0.6, 0.8], taps2 = [0.08, 0.15, 0.25];
  $('#c-grid').innerHTML = `<div class="sr-tablewrap"><table><thead><tr><th>Cost per click</th>${taps2.map((t) => `<th class="r">${t * 100}% tap</th>`).join('')}</tr></thead><tbody>${cpcs.map((c) => `<tr><td>$${c.toFixed(2)}</td>${taps2.map((t) => { const i = (total / c) * t * inst; return `<td class="r">${int(i)} installs, $${i ? (total / i).toFixed(2) : 'n/a'} each</td>`; }).join('')}</tr>`).join('')}</tbody></table></div><p class="note">Uses the store-page install rate in the box above. Arithmetic only, not a forecast.</p>`;
}
function wireCalc() { document.querySelectorAll('#sr-calc input').forEach((i) => i.addEventListener('input', calcRun)); calcRun(); }

// ---------------------------------------------------------------- page
function render() {
  $('#sr-scope').textContent = `As of ${D.meta.asOf}. ${D.meta.scope}`;
  const toc = `<nav class="sr-toc" aria-label="Sections"><p>On this page</p>${D.sections.map((s) => `<a href="#${s.id}" data-id="${s.id}">${esc(s.title)}</a>`).join('')}</nav>`;
  const body = D.sections.map((s) => `<section class="sr-sec" id="${s.id}"><p class="kick">${esc(s.kicker)}</p><h2>${esc(s.title)}</h2><p class="lede">${fmt(s.lede)}</p>${s.blocks.map(blockHtml).join('')}</section>`).join('');
  $('#sr-app').innerHTML = toc + `<div class="sr-body">${body}</div>`;
  const dm = $('#sr-diamonds'); if (dm) dm.innerHTML = diamondsHtml();
  if ($('#sr-kw')) renderKw();
  const cb = $('#sr-calc'); if (cb) { cb.innerHTML = calcHtml(); wireCalc(); }
  document.querySelectorAll('.sr-fam').forEach((tr) => tr.addEventListener('click', () => {
    state.fam = tr.dataset.fam; state.fit = 'diamond'; state.shown = 40; renderKw(); $('#sr-kw').scrollIntoView({ behavior: 'smooth' });
  }));
  // Highlight the section in view.
  const links = [...document.querySelectorAll('.sr-toc a')];
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.dataset.id === e.target.id)); }), { rootMargin: '-20% 0px -70% 0px' });
  document.querySelectorAll('.sr-sec').forEach((s) => io.observe(s));
}

async function start(local) {
  const msg = $('#sr-msg');
  try { D = await loadData(local); } catch (e) {
    msg.style.display = 'block';
    msg.textContent = local
      ? 'Local data file not found. Run node build.mjs in the app repo (research_notes, Google Search campaign data, page).'
      : 'The research data could not be loaded (' + (e.message || 'error') + '). If this is new, the private bucket or its read policy may not exist yet.';
    $('#sr-scope').textContent = 'Data not loaded.';
    return;
  }
  render();
}

// Local review without signing in: only on localhost, only with ?review=1. Production hosts never match.
const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get('review') === '1';
if (local) {
  const g = $('#adm-gate'); if (g) g.style.display = 'none';
  const r = $('#adm-root'); if (r) r.style.display = 'block';
  start(true);
} else {
  boot(async () => { await start(false); });
}
