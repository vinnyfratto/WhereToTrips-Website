// ───────────────────────────────────────────────────────────────────
//  wt-admin-partner-assets.js — Partner Admin → Asset Library.
//
//  An admin adds the files partners may download, describes them, publishes or
//  hides them, and sees how often each one is used. Everything goes through the
//  partner-admin function (assets_list, asset_save, ...). A file is uploaded
//  straight to private storage on a signed link the server issues after it has
//  checked the type and size; the page never sees a storage path it could pick.
//
//  Partners see only published assets, at /partner-dashboard/assets/.
//  Downloads by test partners are left out unless Include test data is on.
// ───────────────────────────────────────────────────────────────────
import {
  boot, callPA, dataTable, debounce, esc, fmtDate, fmtDateTime, notify, num, partnerLink, pill, supabase, $, $$,
} from './wt-padmin-core.js';

const BUCKET = 'partner-library';
const dash = '<span class="pa-dash">—</span>';
const STATUS_TONE = { published: 'green', draft: 'amber', archived: '' };
const STATUS_LABEL = { published: 'Published', draft: 'Draft', archived: 'Archived' };

// A phone or a desktop sometimes reports no type for these; the server decides for real.
const EXT_TYPES = {
  svg: 'image/svg+xml', eps: 'application/postscript', csv: 'text/csv', txt: 'text/plain', zip: 'application/zip',
  webm: 'video/webm', mov: 'video/quicktime', mp4: 'video/mp4', pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
const typeOf = (file) => file.type || EXT_TYPES[(file.name.split('.').pop() || '').toLowerCase()] || '';

const size = (n) => !n ? '' : n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

let rows = [];
let categories = [];
let table = null;
let seq = 0;
let includeTest = new URLSearchParams(location.search).get('test') === '1';

// ── Tiles ───────────────────────────────────────────────────────────
const tile = (label, value, sub) => `<div class="pa-tile"><p class="k">${esc(label)}</p><p class="v">${value}</p>${sub ? `<p class="s">${sub}</p>` : ''}</div>`;

function drawTiles(s) {
  $('#al-tiles').innerHTML =
    tile('Assets', num(s.total), `${num(s.published)} published · ${num(s.draft)} draft · ${num(s.archived)} archived`) +
    tile('Downloads', num(s.downloads), 'All time') +
    tile('Downloads, last 30 days', num(s.downloads_30d)) +
    tile('Most downloaded', s.top_title ? `<span style="font-size:1.1rem;">${esc(s.top_title)}</span>` : dash, s.top_title ? `${num(s.top_downloads)} downloads` : 'No downloads yet');
}

// ── The table ───────────────────────────────────────────────────────
function assetCell(r) {
  const thumb = r.thumb_url
    ? `<img class="pa-thumb" src="${esc(r.thumb_url)}" alt="" loading="lazy" width="44" height="44" />`
    : `<span class="pa-thumb pa-thumb-kind">${esc(r.kind_label)}</span>`;
  return `<div class="pa-asset">${thumb}<div><strong>${esc(r.title)}</strong><br><span class="pa-muted pa-small">${esc(r.file_name)} · ${esc(size(r.size))}</span></div></div>`;
}

const COLUMNS = [
  { key: 'title', label: 'Asset', render: assetCell },
  { key: 'category_label', label: 'Category', nowrap: true },
  { key: 'status', label: 'Status', render: (r) => pill(STATUS_LABEL[r.status] || r.status, STATUS_TONE[r.status] || '') },
  { key: 'downloads', label: 'Downloads', kind: 'num', num: true,
    render: (r) => r.downloads ? `<button type="button" class="pa-link-btn" data-who="${esc(r.id)}" title="Who downloaded this">${num(r.downloads)}</button>` : '0' },
  { key: 'downloads_30d', label: 'Last 30 days', kind: 'num', num: true, render: (r) => num(r.downloads_30d) },
  { key: 'unique_partners', label: 'Partners', kind: 'num', num: true, render: (r) => num(r.unique_partners) },
  { key: 'last_download_at', label: 'Last downloaded', kind: 'date', nowrap: true, render: (r) => r.last_download_at ? esc(fmtDateTime(r.last_download_at)) : dash },
  { key: 'created_at', label: 'Added', kind: 'date', nowrap: true, render: (r) => esc(fmtDate(r.created_at)) },
  { key: 'actions', label: '', sortable: false, render: actionsCell },
];

function actionsCell(r) {
  const next = r.status === 'published'
    ? `<button type="button" class="btn btn-ghost btn-xs" data-status="archived" data-id="${esc(r.id)}">Archive</button>`
    : `<button type="button" class="btn btn-primary btn-xs" data-status="published" data-id="${esc(r.id)}">${r.status === 'archived' ? 'Publish again' : 'Publish'}</button>`;
  return `<div class="pa-actions">
      ${next}
      <button type="button" class="btn btn-ghost btn-xs" data-edit="${esc(r.id)}">Edit</button>
      <button type="button" class="btn btn-ghost btn-xs" data-open="${esc(r.id)}">Open file</button>
      ${r.downloads === 0 ? `<button type="button" class="btn btn-ghost btn-xs" data-delete="${esc(r.id)}">Delete</button>` : ''}
    </div>`;
}

function wireRows(host) {
  $$('[data-edit]', host).forEach((b) => b.addEventListener('click', () => openEditor(rows.find((r) => r.id === b.dataset.edit))));
  $$('[data-status]', host).forEach((b) => b.addEventListener('click', () => setStatus(b.dataset.id, b.dataset.status)));
  $$('[data-who]', host).forEach((b) => b.addEventListener('click', () => showWho(b.dataset.who)));
  $$('[data-delete]', host).forEach((b) => b.addEventListener('click', () => remove(b.dataset.delete)));
  $$('[data-open]', host).forEach((b) => b.addEventListener('click', async () => {
    // Open the tab first (a popup blocker only allows it on the click itself), then point it at the link.
    const w = window.open('', '_blank');
    const f = await callPA('asset_file_url', { id: b.dataset.open });
    if (f.ok && w) { w.opener = null; w.location.href = f.url; }
    else { if (w) w.close(); notify('error', 'Could not open the file (' + (f.error || 'error') + ').'); }
  }));
}

// ── Filtering (on the page: the library is small) ───────────────────
function visible() {
  const q = $('#al-q').value.trim().toLowerCase();
  const st = $('#al-status').value;
  const cat = $('#al-category').value;
  return rows.filter((r) => (!st || r.status === st) && (!cat || r.category === cat) &&
    (!q || [r.title, r.description, r.category_label, r.file_name].some((v) => String(v || '').toLowerCase().includes(q))));
}

function draw() {
  const list = visible();
  table.set(list);
  $('#al-count').textContent = `${list.length} ${list.length === 1 ? 'asset' : 'assets'}`;
}

async function load() {
  const mine = ++seq;
  const r = await callPA('assets_list', includeTest ? { include_test: true } : {});
  if (mine !== seq) return;
  if (!r.ok) { $('#al-table').innerHTML = `<p class="acct-sub">Could not load the library (${esc(r.error || 'error')}).</p>`; return; }
  rows = r.rows;
  categories = r.categories;
  const sel = $('#al-category');
  const keep = sel.value;
  sel.innerHTML = '<option value="">All</option>' + categories.map((c) => `<option value="${esc(c.key)}">${esc(c.label)}</option>`).join('');
  sel.value = categories.some((c) => c.key === keep) ? keep : '';
  drawTiles(r.summary);
  draw();
}

// ── Who downloaded one asset ────────────────────────────────────────
async function showWho(id) {
  const host = $('#al-detail');
  host.innerHTML = '<div class="adm-card"><p class="acct-sub">Loading…</p></div>';
  const r = await callPA('asset_get', includeTest ? { id, include_test: true } : { id });
  if (!r.ok) { host.innerHTML = ''; notify('error', 'Could not load the downloads (' + (r.error || 'error') + ').'); return; }
  host.innerHTML = `<div class="adm-card">
      <div class="pa-card-h"><h3>Downloads of ${esc(r.asset.title)}</h3><button type="button" class="btn btn-ghost btn-xs" id="al-who-close">Close</button></div>
      <div id="al-who-table"></div>
    </div>`;
  $('#al-who-close').addEventListener('click', () => { host.innerHTML = ''; });
  const t = dataTable($('#al-who-table'), {
    columns: [
      { key: 'partner_name', label: 'Partner', render: (p) => partnerLink(p) },
      { key: 'downloads', label: 'Downloads', kind: 'num', num: true, render: (p) => num(p.downloads) },
      { key: 'first_download_at', label: 'First', kind: 'date', nowrap: true, render: (p) => esc(fmtDateTime(p.first_download_at)) },
      { key: 'last_download_at', label: 'Latest', kind: 'date', nowrap: true, render: (p) => esc(fmtDateTime(p.last_download_at)) },
    ],
    sort: { key: 'last_download_at', dir: 'desc' },
    empty: 'No partner has downloaded this asset yet.',
  });
  t.set(r.partners);
  host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Status and delete ───────────────────────────────────────────────
async function setStatus(id, status) {
  const r = await callPA('asset_set_status', { id, status });
  if (!r.ok) { notify('error', r.message || r.error || 'Could not change the status'); return; }
  notify('success', status === 'published' ? 'Published. Partners can see it now.' : status === 'archived' ? 'Archived. Partners no longer see it; its download history is kept.' : 'Moved to draft.');
  await load();
}

async function remove(id) {
  const r0 = rows.find((r) => r.id === id);
  if (!r0) return;
  if (r0.downloads > 0) {
    notify('error', 'Partners have downloaded this asset, so it can\'t be deleted. Archive it to hide it from partners.');
    return;
  }
  if (!window.confirm(`Delete "${r0.title}" and its file? This cannot be undone.`)) return;
  const r = await callPA('asset_delete', { id });
  if (!r.ok) { notify('error', r.message || r.error || 'Could not delete the asset'); return; }
  notify('success', 'Deleted.');
  await load();
}

// ── Add / edit ──────────────────────────────────────────────────────
function openEditor(asset) {
  const host = $('#al-editor');
  const editing = !!asset;
  host.innerHTML = `
    <div class="adm-card" id="al-card">
      <div class="pa-card-h"><h3>${editing ? 'Edit asset' : 'Add an asset'}</h3><button type="button" class="btn btn-ghost btn-xs" id="al-cancel">Cancel</button></div>
      <label class="field"><span>Title</span><input id="al-title" type="text" maxlength="200" value="${esc(editing ? asset.title : '')}" /></label>
      <label class="field"><span>Category</span>
        <select id="al-cat">${categories.map((c) => `<option value="${esc(c.key)}"${editing && asset.category === c.key ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}</select></label>
      <label class="field"><span>Description <span class="hint">(optional; partners see this, so say how to use it)</span></span>
        <textarea id="al-desc" rows="3" maxlength="2000">${esc(editing ? asset.description || '' : '')}</textarea></label>
      <label class="field"><span>${editing ? 'Replace the file' : 'File'} <span class="hint">${editing ? `(currently ${esc(asset.file_name)}; leave empty to keep it)` : '(image, PDF, video, audio, ZIP, Office document; up to 100 MB)'}</span></span>
        <input id="al-file" type="file" /></label>
      <label class="field"><span>Status</span>
        <select id="al-st">
          <option value="draft"${!editing || asset.status === 'draft' ? ' selected' : ''}>Draft (only admins see it)</option>
          <option value="published"${editing && asset.status === 'published' ? ' selected' : ''}>Published (partners can download it)</option>
          <option value="archived"${editing && asset.status === 'archived' ? ' selected' : ''}>Archived (hidden, history kept)</option>
        </select></label>
      <div><button type="button" class="btn btn-primary" id="al-save">${editing ? 'Save changes' : 'Add asset'}</button></div>
    </div>`;
  $('#al-cancel').addEventListener('click', () => { host.innerHTML = ''; });
  $('#al-save').addEventListener('click', () => save(asset));
  $('#al-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#al-title').focus();
}

async function save(asset) {
  const title = $('#al-title').value.trim();
  const file = $('#al-file').files[0] || null;
  if (!title) { notify('error', 'Give the asset a title.'); return; }
  if (!asset && !file) { notify('error', 'Choose the file for this asset.'); return; }

  const btn = $('#al-save');
  btn.disabled = true;
  const label = btn.textContent;
  try {
    let upload = null;
    if (file) {
      btn.textContent = 'Uploading…';
      const type = typeOf(file);
      const t = await callPA('asset_upload_url', { type, size: file.size });
      if (!t.ok) { notify('error', t.message || t.error || 'Could not start the upload'); return; }
      const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(t.path, t.token, file, { contentType: type });
      if (error) { notify('error', 'The upload did not finish. Try again.'); return; }
      upload = { path: t.path, name: file.name };
    }
    btn.textContent = 'Saving…';
    const r = await callPA('asset_save', {
      id: asset ? asset.id : undefined,
      title,
      category: $('#al-cat').value,
      description: $('#al-desc').value,
      status: $('#al-st').value,
      file: upload || undefined,
    });
    if (!r.ok) { notify('error', r.message || r.error || 'Could not save the asset'); return; }
    notify('success', asset ? 'Saved.' : 'Added.');
    $('#al-editor').innerHTML = '';
    await load();
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

boot(async () => {
  table = dataTable($('#al-table'), {
    columns: COLUMNS,
    sort: { key: 'created_at', dir: 'desc' },
    empty: 'No assets yet. Use Add asset to upload the first one.',
    onRendered: wireRows,
  });
  $('#al-test').checked = includeTest;
  $('#al-add').addEventListener('click', () => openEditor(null));
  $('#al-q').addEventListener('input', debounce(draw, 150));
  $('#al-status').addEventListener('change', draw);
  $('#al-category').addEventListener('change', draw);
  $('#al-test').addEventListener('change', () => {
    includeTest = $('#al-test').checked;
    try {
      const q = new URLSearchParams(location.search);
      if (includeTest) q.set('test', '1'); else q.delete('test');
      history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash);
    } catch (_e) { /* history blocked: the switch still works */ }
    $('#al-detail').innerHTML = '';
    load();
  });
  await load();
});
