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
    ? `<img src="${esc(r.thumb_url)}" alt="" loading="lazy" />`
    : `<span class="pp-al-kind">${esc(r.kind_label)}</span>`;
  return `<article class="pp-card pp-al-card">
      <button type="button" class="pp-al-prev pp-al-prevbtn" data-preview="${esc(r.id)}" aria-haspopup="dialog" aria-label="Preview ${esc(r.title)}" title="Preview">${preview}</button>
      <div class="pp-al-main">
        <h3>${esc(r.title)}</h3>
        ${r.description ? `<p class="pp-al-desc">${esc(r.description)}</p>` : ''}
        <p class="pp-al-meta">${esc(r.kind_label)} · ${esc(size(r.size))} · Added ${esc(fmtDate(r.published_at || r.updated_at))}</p>
      </div>
      <div class="pp-al-btns">
        <button type="button" class="pp-outbtn pp-al-dl" data-id="${esc(r.id)}">Download</button>
        <button type="button" class="pp-linkbtn" data-preview="${esc(r.id)}" aria-haspopup="dialog">Preview</button>
      </div>
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
  host.querySelectorAll('[data-preview]').forEach((b) => b.addEventListener('click', () => openPreview(b.dataset.preview, b)));
}

function drawCats() {
  const items = [['', 'All']].concat(categories.map((c) => [c.key, c.label]));
  renderSeg($('al-cats'), items, cat, (v) => { cat = v; drawCats(); draw(); });
  // One category, or none: a filter has nothing to filter.
  $('al-cats').hidden = categories.length < 2;
}

// ── The preview pop-up ──────────────────────────────────────────────
// A native <dialog>: focus stays inside while it is open, Escape closes it, and
// focus returns to what opened it. Looking is not downloading: the preview link
// is a different action on the server and records nothing. Download in the
// pop-up is the same download as on the card.
let dlg = null;
let openId = null;

function ensureDialog() {
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.className = 'pp-dlg';
  dlg.setAttribute('aria-labelledby', 'pp-dlg-title');
  dlg.innerHTML = `<div class="pp-dlg-head"><h2 id="pp-dlg-title"></h2><button type="button" class="pp-dlg-x" aria-label="Close">×</button></div>
    <div class="pp-dlg-body" id="pp-dlg-body"></div>
    <p class="pp-dlg-desc" id="pp-dlg-desc" hidden></p>
    <div class="pp-dlg-foot"><span class="pp-dlg-meta" id="pp-dlg-meta"></span>
      <button type="button" class="pp-primary" id="pp-dlg-dl">Download</button>
      <button type="button" class="pp-ghost" id="pp-dlg-close">Close</button></div>`;
  document.body.appendChild(dlg);
  const close = () => dlg.close();
  dlg.querySelector('.pp-dlg-x').addEventListener('click', close);
  dlg.querySelector('#pp-dlg-close').addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });      // the dim backdrop
  dlg.addEventListener('close', () => { dlg.querySelector('#pp-dlg-body').innerHTML = ''; openId = null; });   // stops playback, drops the link
  dlg.querySelector('#pp-dlg-dl').addEventListener('click', (e) => { if (openId) download(e.currentTarget, openId); });
  return dlg;
}

function viewerHtml(r, f) {
  const t = String(f.type || '').toLowerCase();
  const u = esc(f.url), n = esc(r.title);
  const nope = `<p class="pp-dlg-none">This file cannot be shown in the browser. Use Download to open it on your device.</p>`;
  if (t.startsWith('image/')) return `<img src="${u}" alt="${n}" class="pp-dlg-media pp-dlg-img">`;
  if (t.startsWith('video/')) return `<video src="${u}" class="pp-dlg-media" controls playsinline preload="metadata">${nope}</video>`;
  if (t.startsWith('audio/')) return `<audio src="${u}" class="pp-dlg-audio" controls preload="metadata"></audio>`;
  if (t === 'application/pdf') return `<iframe src="${u}" class="pp-dlg-frame" title="${n}"></iframe>`;
  // A ZIP, an Office file: show its picture when it has one, and say how to get it.
  return (r.thumb_url ? `<img src="${esc(r.thumb_url)}" alt="${n}" class="pp-dlg-media pp-dlg-img">` : '') + nope;
}

async function openPreview(id, opener) {
  const r = rows.find((x) => x.id === id);
  if (!r) return;
  const d = ensureDialog();
  openId = id;
  d.querySelector('#pp-dlg-title').textContent = r.title;
  d.querySelector('#pp-dlg-meta').textContent = `${r.kind_label} · ${size(r.size)}`;
  const desc = d.querySelector('#pp-dlg-desc');
  desc.textContent = r.description || ''; desc.hidden = !r.description;
  d.querySelector('#pp-dlg-body').innerHTML = '<p class="pp-dlg-none" role="status">Loading…</p>';
  d.showModal();
  d.addEventListener('close', () => { if (opener && opener.focus) opener.focus(); }, { once: true });

  // A fresh, short-lived link each time: the file is private.
  const f = await call('preview', { id });
  if (!d.open || openId !== id) return;                      // closed or switched while it loaded
  d.querySelector('#pp-dlg-body').innerHTML = f && f.ok
    ? viewerHtml(r, f)
    : `<p class="pp-dlg-none">We could not open that file just now. Please try again.</p>`;
}

async function download(btn, id) {
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Preparing…';
  $('al-err').textContent = '';
  const j = await call('download', { id: id || btn.dataset.id });
  btn.disabled = false; btn.textContent = label;
  if (j && j.ok && j.url) { window.location.href = j.url; return; }
  if (dlg && dlg.open) dlg.close();                          // the message lives on the page
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
