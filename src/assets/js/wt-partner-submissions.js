// ───────────────────────────────────────────────────────────────────
//  wt-partner-submissions.js — /partner-dashboard/my-submissions/
//  Every piece the partner has sent, with a timeline and, once approved, the
//  tracking link. Search, filtering, sorting and paging all happen in the
//  partner-portal function; this only draws what comes back. Opening a row
//  shows its detail without another request.
// ───────────────────────────────────────────────────────────────────
import { portal, portalGate } from './wt-partner-shared.js';
import { esc, fmtDate, options } from './wt-portal-ui.js';

const $ = (id) => document.getElementById(id);

const COLS = [
  { k: 'submitted', label: 'Submitted' }, { k: 'title', label: 'Title', text: true },
  { k: 'platform', label: 'Platform', text: true }, { k: 'type', label: 'Type', text: true },
  { k: 'status', label: 'Status', text: true },
];
const state = { sort: 'submitted', dir: 'desc', q: '', status: '', platform: '', kind: '', from: '', to: '', page: 1 };
const open = new Set();             // rows left open survive a re-draw
let optionsFor = '';                // the filter lists are rebuilt only when their contents change
let seq = 0, timer = null;

// Status chip colors. The words always carry the meaning; color only helps.
const CHIP = {
  draft: ['#EEF1F5', '#464B53'], submitted: ['#E6F4FC', '#0F5F8F'], in_review: ['#E6F4FC', '#0F5F8F'],
  pending_assets: ['#E6F4FC', '#0F5F8F'], revisions_requested: ['#FFF1D6', '#6B4200'],
  approved: ['#BFE6D0', '#0F4D32'], published: ['#BFE6D0', '#0F4D32'], declined: ['#F6DEDA', '#8A2B1F'],
  withdrawn: ['#EEF1F5', '#464B53'], removal_requested: ['#FFF1D6', '#6B4200'],
};
const chip = (status, label) => {
  const c = CHIP[status] || CHIP.draft;
  return `<span class="pp-chip" style="background:${c[0]};color:${c[1]}">${esc(label)}</span>`;
};
const bytes = (n) => !n ? '' : n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

async function load() {
  const mine = ++seq;
  const j = await portal('my_submissions', { ...state });
  if (mine !== seq) return;
  if (!portalGate(j)) return;
  draw(j);
}
const reset = () => { state.page = 1; load(); };

function drawHead() {
  const tr = $('head');
  tr.innerHTML = '<th scope="col" class="plain"><span class="pp-sr">Details</span></th>' + COLS.map((c) => {
    const active = state.sort === c.k;
    const aria = active ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none';
    const arrow = active ? (state.dir === 'asc' ? '↑' : '↓') : '↕';
    return `<th scope="col" aria-sort="${aria}"><button type="button" class="pp-thbtn" data-k="${c.k}">${esc(c.label)}<span aria-hidden="true">${arrow}</span></button></th>`;
  }).join('');
  tr.querySelectorAll('.pp-thbtn').forEach((b) => b.addEventListener('click', () => {
    const c = COLS.find((x) => x.k === b.dataset.k);
    const active = state.sort === c.k;
    state.dir = active ? (state.dir === 'asc' ? 'desc' : 'asc') : (c.text ? 'asc' : 'desc');
    state.sort = c.k;
    reset();
  }));
}

function timelineHtml(steps) {
  return `<ol class="pp-tl">${steps.map((t) => `<li class="${esc(t.state)}">
      <span class="t">${esc(t.label)}</span><span class="d">${t.at ? esc(fmtDate(t.at)) : (t.state === 'current' ? 'In progress' : '')}</span>
    </li>`).join('')}</ol>`;
}

// Submit Content, with this piece's title, type and platform (and venue, for an event) already filled in.
// Keeping the title is what lets us connect the new version to this one.
function resubmitHref(r) {
  const q = new URLSearchParams({ resubmit: '1', title: r.title || '', kind: r.content_type || '', platform: r.platform || '' });
  if (r.kind === 'event') { q.set('mode', 'event'); if (r.venue) q.set('venue', r.venue); }
  return '/partner-dashboard/content/?' + q.toString();
}

function detailHtml(r) {
  const facts = [
    ['Submitted', fmtDate(r.submitted)],
    r.decided ? ['Decision', fmtDate(r.decided)] : (r.review_due ? ['Review due', fmtDate(r.review_due)] : null),
    ['Content type', r.content_type],
    r.file_name ? ['File', `<button type="button" class="pp-filelink" data-view="${esc(r.id)}" aria-haspopup="dialog">${esc(r.file_name)}</button>${r.file_bytes ? ' <span class="pp-filesize">(' + bytes(r.file_bytes) + ')</span>' : ''}`, true] : null,
    r.event_date ? ['Event', fmtDate(r.event_date) + (r.venue ? ' · ' + r.venue : '')] : null,
  ].filter(Boolean);

  const link = r.tracking_url
    ? `<h3 style="margin-top:18px;">Your tracking link</h3>
       <div><a href="${esc(r.tracking_url)}" rel="noopener">${esc(String(r.tracking_url).replace(/^https?:\/\//, ''))}</a>
       <button type="button" class="pp-linkbtn pp-copy" data-copy="${esc(r.tracking_url)}">Copy link</button></div>
       <p class="pp-hint" style="margin-top:6px;">Code <span class="pp-code">${esc(r.tracking_code)}</span>${r.issued ? ' · issued ' + esc(fmtDate(r.issued)) : ''}.
       Its clicks and new accounts show on <a href="/partner-dashboard/content-performance/">Content Performance</a>.</p>`
    : '';

  const note = r.note_to_partner
    ? `<div class="pp-note"><b>A note from us</b>${esc(r.note_to_partner)}</div>` : '';

  const next = r.status === 'revisions_requested'
    ? `<p class="pp-hint" style="margin-top:12px;">Make the change, then <a href="${esc(resubmitHref(r))}">submit it again</a>. We fill in the details for you; keep the title the same.</p>`
    : r.status === 'declined'
      ? '<p class="pp-hint" style="margin-top:12px;">You\'re welcome to <a href="/partner-dashboard/content/">submit something new</a>.</p>' : '';

  return `<div class="pp-detail-grid">
      <div>
        <h3>Timeline</h3>
        ${timelineHtml(r.timeline)}
        ${note}${next}
      </div>
      <div>
        <h3>Details</h3>
        <div style="display:flex;gap:14px;align-items:flex-start;">
          ${r.preview_url ? `<button type="button" class="pp-prevbtn" data-view="${esc(r.id)}" aria-haspopup="dialog" aria-label="View ${esc(r.file_name || r.title)}" title="View file"><img class="pp-prev" src="${esc(r.preview_url)}" alt="" width="96" height="65" loading="lazy"></button>` : ''}
          <dl class="pp-dl">${facts.map(([k, v, html]) => `<dt>${esc(k)}</dt><dd>${html ? v : esc(v)}</dd>`).join('')}</dl>
        </div>
        ${link}
      </div>
    </div>`;
}

// ── The file viewer ─────────────────────────────────────────────────
// A native <dialog>: focus stays inside while it is open, Escape closes it, and
// focus returns to whatever opened it. The file is picked by its type; anything a
// browser cannot show gets a plain message and the Download button, which is
// always there.
let rowsById = new Map();
let dlg = null;

function ensureDialog() {
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.className = 'pp-dlg';
  dlg.setAttribute('aria-labelledby', 'pp-dlg-title');
  dlg.innerHTML = `<div class="pp-dlg-head"><h2 id="pp-dlg-title"></h2><button type="button" class="pp-dlg-x" aria-label="Close">×</button></div>
    <div class="pp-dlg-body" id="pp-dlg-body"></div>
    <div class="pp-dlg-foot"><span class="pp-dlg-meta" id="pp-dlg-meta"></span>
      <a class="pp-primary" id="pp-dlg-dl" href="#" style="display:inline-flex;align-items:center;text-decoration:none;">Download</a>
      <button type="button" class="pp-ghost" id="pp-dlg-close">Close</button></div>`;
  document.body.appendChild(dlg);
  const close = () => dlg.close();
  dlg.querySelector('.pp-dlg-x').addEventListener('click', close);
  dlg.querySelector('#pp-dlg-close').addEventListener('click', close);
  // a click on the dim backdrop (the dialog element itself, outside its content) closes it
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  // stop playback and drop the file link when it closes
  dlg.addEventListener('close', () => { dlg.querySelector('#pp-dlg-body').innerHTML = ''; });
  return dlg;
}

function viewerHtml(f) {
  const t = String(f.type || '').toLowerCase();
  const u = esc(f.view_url), n = esc(f.name);
  const nope = `<p class="pp-dlg-none">This file can't be shown in the browser. Use Download to open it on your device.</p>`;
  if (t.startsWith('image/') && t !== 'image/heic') {
    return `<img src="${u}" alt="${n}" class="pp-dlg-media" onerror="this.outerHTML=this.dataset.fallback" data-fallback="${esc(nope)}">`;
  }
  if (t.startsWith('video/')) return `<video src="${u}" class="pp-dlg-media" controls playsinline preload="metadata">${nope}</video>`;
  if (t.startsWith('audio/')) return `<audio src="${u}" class="pp-dlg-audio" controls preload="metadata"></audio>`;
  if (t === 'application/pdf') return `<iframe src="${u}" class="pp-dlg-frame" title="${n}"></iframe>`;
  return nope;
}

async function openViewer(id, opener) {
  const r = rowsById.get(id);
  const d = ensureDialog();
  d.querySelector('#pp-dlg-title').textContent = r ? r.file_name || r.title : 'Your file';
  d.querySelector('#pp-dlg-meta').textContent = r && r.file_bytes ? bytes(r.file_bytes) : '';
  d.querySelector('#pp-dlg-body').innerHTML = '<p class="pp-dlg-none" role="status">Loading…</p>';
  const dl = d.querySelector('#pp-dlg-dl');
  dl.removeAttribute('href'); dl.setAttribute('aria-disabled', 'true');
  d.showModal();

  // Fresh, short-lived links each time: the file is private.
  const f = await portal('submission_file', { submission_id: id });
  if (!d.open) return;                       // closed while it loaded
  if (!f || !f.ok) {
    d.querySelector('#pp-dlg-body').innerHTML = `<p class="pp-dlg-none">We couldn't open that file just now. Please try again.</p>`;
    return;
  }
  d.querySelector('#pp-dlg-title').textContent = f.name;
  d.querySelector('#pp-dlg-body').innerHTML = viewerHtml(f);
  dl.href = f.download_url; dl.setAttribute('download', f.name); dl.removeAttribute('aria-disabled');
  d.addEventListener('close', () => { if (opener && opener.focus) opener.focus(); }, { once: true });
}

function draw(j) {
  rowsById = new Map(j.rows.map((r) => [r.id, r]));
  drawHead();

  // Status chips, with counts, act as quick filters.
  const totalAll = Object.values(j.totals).reduce((n, x) => n + x, 0);
  $('sumbar').innerHTML = [['', 'All', totalAll]].concat(j.filter_options.statuses.map((s) => [s.value, s.label, j.totals[s.value]]))
    .map(([v, l, n]) => `<button type="button" class="pp-sumchip" data-v="${esc(v)}" aria-pressed="${String(state.status === v)}"><b>${n}</b>${esc(l)}</button>`).join('');
  $('sumbar').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { state.status = b.dataset.v; reset(); }));

  // Filter lists: rebuild only when what they offer changes, so a menu is never reset under the user.
  const sig = JSON.stringify([j.filter_options]);
  if (sig !== optionsFor) {
    $('f-status').innerHTML = options(j.filter_options.statuses.map((s) => [s.value, s.label]), 'All statuses');
    $('f-platform').innerHTML = options(j.filter_options.platforms, 'All platforms');
    $('f-kind').innerHTML = options(j.filter_options.kinds.map((k) => [k.value, k.label]), 'All types');
    optionsFor = sig;
  }
  $('f-status').value = state.status; $('f-platform').value = state.platform; $('f-kind').value = state.kind;
  $('f-from').value = state.from; $('f-to').value = state.to;
  if (document.activeElement !== $('f-q')) $('f-q').value = state.q;

  const c = j.counts;
  $('count').textContent = c.total === 0 ? '' : `Showing ${c.shown} of ${c.total} submission${c.total === 1 ? '' : 's'}`;

  const filtering = state.q || state.status || state.platform || state.kind || state.from || state.to;
  $('rows').innerHTML = j.rows.length
    ? j.rows.map((r) => {
        const isOpen = open.has(r.id);
        return `<tr data-id="${esc(r.id)}">
          <td class="exp"><button type="button" class="pp-expbtn" aria-expanded="${String(isOpen)}" aria-controls="d-${esc(r.id)}" aria-label="${isOpen ? 'Hide' : 'Show'} details for ${esc(r.title)}">${isOpen ? '▾' : '▸'}</button></td>
          <td class="pp-num nw">${esc(fmtDate(r.submitted))}</td>
          <td class="nm">${esc(r.title)}</td>
          <td>${esc(r.platform)}</td>
          <td>${esc(r.kind_label)}</td>
          <td>${chip(r.status, r.status_label)}${r.review_due ? `<span class="pp-ref-alt">Review due ${esc(fmtDate(r.review_due))}</span>` : ''}</td>
        </tr>
        <tr class="pp-detail" id="d-${esc(r.id)}" ${isOpen ? '' : 'hidden'}><td colspan="6">${detailHtml(r)}</td></tr>`;
      }).join('')
    : `<tr><td colspan="6" class="pp-empty-row">${c.total === 0
        ? 'You haven\'t submitted anything yet. <a href="/partner-dashboard/content/">Submit content</a> and track it here.'
        : (filtering ? 'No submissions match these filters.' : 'Nothing to show.')}</td></tr>`;

  $('rows').querySelectorAll('.pp-expbtn').forEach((b) => b.addEventListener('click', () => {
    const tr = b.closest('tr'); const id = tr.dataset.id;
    const panel = $('d-' + id);
    const nowOpen = panel.hidden;
    panel.hidden = !nowOpen;
    b.setAttribute('aria-expanded', String(nowOpen));
    b.textContent = nowOpen ? '▾' : '▸';
    if (nowOpen) open.add(id); else open.delete(id);
  }));
  $('rows').querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => openViewer(b.dataset.view, b)));
  $('rows').querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy link'; }, 1500); } catch (_e) { /* the link is selectable text */ }
  }));

  const pages = Math.max(1, Math.ceil(c.shown / c.page_size));
  const pager = $('pager');
  pager.hidden = pages <= 1;
  if (pages > 1) {
    pager.innerHTML = `<button type="button" class="pp-outbtn" id="prev" ${c.page <= 1 ? 'disabled' : ''}>Previous</button>
      <span>Page ${c.page} of ${pages}</span>
      <button type="button" class="pp-outbtn" id="next" ${c.page >= pages ? 'disabled' : ''}>Next</button>`;
    $('prev').addEventListener('click', () => { state.page = c.page - 1; load(); });
    $('next').addEventListener('click', () => { state.page = c.page + 1; load(); });
  }
}

$('f-q').addEventListener('input', (e) => { state.q = e.target.value.trim(); clearTimeout(timer); timer = setTimeout(reset, 300); });
$('f-status').addEventListener('change', (e) => { state.status = e.target.value; reset(); });
$('f-platform').addEventListener('change', (e) => { state.platform = e.target.value; reset(); });
$('f-kind').addEventListener('change', (e) => { state.kind = e.target.value; reset(); });
$('f-from').addEventListener('change', (e) => { state.from = e.target.value; reset(); });
$('f-to').addEventListener('change', (e) => { state.to = e.target.value; reset(); });
$('clear').addEventListener('click', () => {
  Object.assign(state, { q: '', status: '', platform: '', kind: '', from: '', to: '', page: 1 });
  $('f-q').value = '';
  load();
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
else load();
