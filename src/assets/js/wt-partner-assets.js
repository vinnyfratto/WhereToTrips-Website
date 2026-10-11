// ───────────────────────────────────────────────────────────────────
//  wt-partner-assets.js — /partner-dashboard/assets/ (the Partner Asset Library).
//
//  Lists the assets WhereTo has published for partners and lets a partner
//  download them. Talks to the partner-library edge function, which resolves the
//  partner from the session. A download asks the server for a short-lived link;
//  asking is what records the download, so there is no direct file URL here.
// ───────────────────────────────────────────────────────────────────
import { portalFn, portalGate } from './wt-partner-shared.js';
import { esc, fmtDate, renderSeg } from './wt-portal-ui.js';

const $ = (id) => document.getElementById(id);
const call = (action, body) => portalFn('partner-library', action, body);

let rows = [];
let categories = [];
let cat = '';

const size = (n) => !n ? '' : n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

function matches(r, q) {
  if (!q) return true;
  return [r.title, r.description, r.category_label, r.file_name].some((v) => String(v || '').toLowerCase().includes(q));
}

function card(r) {
  const preview = r.thumb_url
    ? `<img src="${esc(r.thumb_url)}" alt="${esc(r.title)}" loading="lazy" />`
    : `<span class="pp-al-kind">${esc(r.kind_label)}</span>`;
  return `<article class="pp-card pp-al-card">
      <div class="pp-al-prev">${preview}</div>
      <div class="pp-al-main">
        <h3>${esc(r.title)}</h3>
        ${r.description ? `<p class="pp-al-desc">${esc(r.description)}</p>` : ''}
        <p class="pp-al-meta">${esc(r.kind_label)} · ${esc(size(r.size))} · Added ${esc(fmtDate(r.published_at || r.updated_at))}</p>
      </div>
      <button type="button" class="pp-outbtn pp-al-dl" data-id="${esc(r.id)}">Download</button>
    </article>`;
}

function draw() {
  const q = $('al-q').value.trim().toLowerCase();
  const list = rows.filter((r) => (!cat || r.category === cat) && matches(r, q));
  const host = $('al-list');
  if (!rows.length) { host.innerHTML = '<p class="pp-empty">The library is being stocked. Check back soon.</p>'; return; }
  if (!list.length) { host.innerHTML = '<p class="pp-empty">Nothing matches. Try a different word or category.</p>'; return; }

  // All categories: one heading per category, in the library's own order. One category: just its cards.
  const groups = cat ? [{ key: cat, label: '', items: list }]
    : categories.map((c) => ({ key: c.key, label: c.label, items: list.filter((r) => r.category === c.key) })).filter((g) => g.items.length);
  host.innerHTML = groups.map((g) =>
    `<section class="pp-al-group">${g.label ? `<h2>${esc(g.label)}</h2>` : ''}<div class="pp-al-grid">${g.items.map(card).join('')}</div></section>`).join('');

  host.querySelectorAll('.pp-al-dl').forEach((b) => b.addEventListener('click', () => download(b)));
}

function drawCats() {
  const items = [['', 'All']].concat(categories.map((c) => [c.key, c.label]));
  renderSeg($('al-cats'), items, cat, (v) => { cat = v; drawCats(); draw(); });
  // One category, or none: a filter has nothing to filter.
  $('al-cats').hidden = categories.length < 2;
}

async function download(btn) {
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Preparing…';
  $('al-err').textContent = '';
  const j = await call('download', { id: btn.dataset.id });
  btn.disabled = false; btn.textContent = label;
  if (j && j.ok && j.url) { window.location.href = j.url; return; }
  $('al-err').textContent = j && j.error === 'not_found'
    ? 'That asset is no longer available. Refresh the page to see the current library.'
    : 'We could not start that download. Please try again.';
}

async function init() {
  const j = await call('list');
  if (!portalGate(j)) return;
  if (j.inactive) { $('al-inactive').hidden = false; return; }
  rows = j.rows;
  categories = j.categories;
  $('al-body').hidden = false;
  $('al-q').addEventListener('input', draw);
  drawCats();
  draw();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
