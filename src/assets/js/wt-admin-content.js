// ───────────────────────────────────────────────────────────────────
//  wt-admin-content.js — Admin → Content → Our Content (/admin-content/).
//
//  What WhereTo posts itself. Each record is one post: a title, the platform
//  it goes on, and the page its link opens. Saving one mints a tracking link
//  right away (no review: we are the reviewer), on WhereTo's own house
//  account, so a click, an install, a sign-up and a booking that come through
//  it are counted exactly the way a partner's are, and never paid to anyone.
//
//  The list shows every post with its numbers; a title opens that post's own
//  summary page (/admin-content-item/?id=). Data: partner-admin
//  house_list / house_create (house.ts).
// ───────────────────────────────────────────────────────────────────
import { boot, callPA, dataTable, debounce, esc, fmtDate, money, notify, num, pill, $ } from './wt-padmin-core.js';
import { landingLabel, landingPickerHtml, loadPages, readLandingPicker, wireLandingPicker } from './wt-landing-picker.js';
import { PLATFORMS, platformLabel, copyButton, wireCopy, previewHtml } from './wt-admin-content-shared.js';

let table = null;
let rows = [];
let pageList = [];
let seq = 0;

const itemHref = (r) => `/admin-content-item/?id=${encodeURIComponent(r.id)}`;

const COLUMNS = [
  { key: 'preview', label: 'Preview', sortable: false, render: (r) => previewHtml(r) },
  { key: 'created_at', label: 'Created', kind: 'date', nowrap: true, render: (r) => esc(fmtDate(r.created_at)) },
  { key: 'title', label: 'Content', render: (r) => `<a class="pa-link oc-title" href="${itemHref(r)}">${esc(r.title)}</a>${r.status !== 'active' ? ' ' + pill('Turned off') : ''}` },
  { key: 'created_by', label: 'Created By', nowrap: true, value: (r) => r.created_by || '', render: (r) => r.created_by ? esc(r.created_by) : '<span class="pa-muted">—</span>' },
  { key: 'platform', label: 'Platform', value: (r) => platformLabel(r.platform), render: (r) => esc(platformLabel(r.platform)) },
  { key: 'tracking_url', label: 'Tracking link', sortable: false, render: (r) => `<span class="oc-url">${esc(r.tracking_url.replace(/^https?:\/\//, '')).split('/').join('/<wbr>')}</span> ${copyButton(r.tracking_url)}` },
  { key: 'landing_path', label: 'Opens', value: (r) => landingLabel(r.landing_path, pageList), render: (r) => esc(landingLabel(r.landing_path, pageList)) },
  { key: 'clicks', label: 'Clicks', kind: 'num', num: true, render: (r) => num(r.clicks) },
  { key: 'downloads', label: 'Downloads', kind: 'num', num: true, render: (r) => num(r.downloads) },
  { key: 'installs', label: 'Installs', kind: 'num', num: true, render: (r) => num(r.installs) },
  { key: 'sign_ups', label: 'Sign-ups', kind: 'num', num: true, render: (r) => num(r.sign_ups) },
  { key: 'bookings', label: 'Bookings', kind: 'num', num: true, render: (r) => num(r.bookings) },
  { key: 'revenue', label: 'Our revenue', kind: 'num', num: true, title: 'What WhereTo earns on those bookings (the supplier commission)', render: (r) => money(r.revenue) },
];

function filtered() {
  const q = $('#oc-q').value.trim().toLowerCase();
  const st = $('#oc-status').value;
  return rows.filter((r) => (!st || r.status === st)
    && (!q || [r.title, platformLabel(r.platform), r.tracking_code, r.notes, r.created_by].some((v) => String(v || '').toLowerCase().includes(q))));
}

function draw() {
  const list = filtered();
  const t = list.reduce((a, r) => {
    for (const k of ['clicks', 'downloads', 'installs', 'sign_ups', 'bookings', 'revenue']) a[k] += Number(r[k]) || 0;
    return a;
  }, { clicks: 0, downloads: 0, installs: 0, sign_ups: 0, bookings: 0, revenue: 0 });
  table.set(list, list.length ? `<tr><td colspan="7"><strong>Total</strong></td><td class="num">${num(t.clicks)}</td><td class="num">${num(t.downloads)}</td><td class="num">${num(t.installs)}</td><td class="num">${num(t.sign_ups)}</td><td class="num">${num(t.bookings)}</td><td class="num">${money(t.revenue)}</td></tr>` : '');
  $('#oc-count').textContent = `${list.length} ${list.length === 1 ? 'post' : 'posts'}`;
}

async function load() {
  const mine = ++seq;
  const r = await callPA('house_list');
  if (mine !== seq) return;
  if (!r.ok) { $('#oc-table').innerHTML = `<p class="acct-sub">Could not load the list (${esc(r.error || 'error')}).</p>`; return; }
  rows = r.rows;
  draw();
}

// ── New content ─────────────────────────────────────────────────────
function openForm() {
  const host = $('#oc-form');
  host.innerHTML = `
    <div class="adm-card oc-card" id="oc-card">
      <div class="pa-card-h"><h3>New content</h3><button type="button" class="btn btn-ghost btn-xs" id="oc-cancel">Cancel</button></div>
      <p class="acct-sub" style="margin-top:0;">Saving makes the tracking link straight away. Put that link in the post (or its bio or caption) and every visit through it is counted here.</p>
      <div class="oc-grid">
        <label class="field"><span>Title <span class="hint">(what the post is, so you can find it later)</span></span>
          <input type="text" id="oc-title" maxlength="160" placeholder="Fall foliage Reel, Oct 2026" /></label>
        <label class="field"><span>Platform</span>
          <select id="oc-platform"><option value="">Choose one…</option>${PLATFORMS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label>
      </div>
      ${landingPickerHtml('oc-landing', { label: 'Link opens', hint: 'the page a visitor lands on from this link' })}
      <label class="field"><span>Where it is posted <span class="hint">(optional; the post's own address, once it is up)</span></span>
        <input type="url" id="oc-post" maxlength="500" placeholder="https://www.instagram.com/p/…" /></label>
      <label class="field"><span>Notes <span class="hint">(optional)</span></span>
        <textarea id="oc-notes" rows="2" maxlength="2000"></textarea></label>
      <p class="alert" id="oc-form-msg" role="alert"></p>
      <button type="button" class="btn btn-primary" id="oc-save">Create tracking link</button>
    </div>`;
  $('#oc-cancel').addEventListener('click', () => { host.innerHTML = ''; });
  wireLandingPicker(host, null);
  $('#oc-save').addEventListener('click', save);
  $('#oc-title').focus();
}

function formError(text) {
  const m = $('#oc-form-msg');
  if (m) { m.className = 'alert show alert-error'; m.textContent = text; }
}

async function save() {
  const title = $('#oc-title').value.trim();
  const platform = $('#oc-platform').value;
  if (!title) { formError('Give it a title.'); return; }
  if (!platform) { formError('Choose the platform it is posted on.'); return; }
  const picked = await readLandingPicker($('#oc-form'));
  if (!picked.ok) { formError(picked.error); return; }
  const btn = $('#oc-save');
  btn.disabled = true;
  const r = await callPA('house_create', {
    title, platform, landing_path: picked.path,
    post_url: $('#oc-post').value.trim(), notes: $('#oc-notes').value.trim(),
  });
  btn.disabled = false;
  if (!r.ok) { formError(r.error === 'bad_post_url' ? 'The post address must start with https://.' : (r.error || 'Could not create it.')); return; }

  // The link is the point: show it, ready to copy, before anything else.
  $('#oc-form').innerHTML = `
    <div class="adm-card oc-card oc-made">
      <div class="pa-card-h"><h3>Tracking link ready: ${esc(r.item.title)}</h3><button type="button" class="btn btn-ghost btn-xs" id="oc-done">Done</button></div>
      <p class="oc-made-link"><code>${esc(r.item.tracking_url)}</code> ${copyButton(r.item.tracking_url, 'Copy link')}</p>
      <p class="acct-sub" style="margin:0;">Opens ${esc(landingLabel(r.item.landing_path, pageList))}${r.item.landing_path ? ` (${esc(r.item.landing_path)})` : ''}. <a class="pa-link" href="${itemHref(r.item)}">Open its summary</a></p>
    </div>`;
  wireCopy($('#oc-form'));
  $('#oc-done').addEventListener('click', () => { $('#oc-form').innerHTML = ''; });
  notify('success', 'Tracking link created.');
  await load();
}

boot(async () => {
  pageList = await loadPages();
  table = dataTable($('#oc-table'), {
    columns: COLUMNS,
    sort: { key: 'created_at', dir: 'desc' },
    empty: 'Nothing here yet. Choose New content to make the first tracking link.',
    onRendered: wireCopy,
  });
  $('#oc-new').addEventListener('click', openForm);
  $('#oc-q').addEventListener('input', debounce(draw, 150));
  $('#oc-status').addEventListener('change', draw);
  await load();
});
