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

// ── Thumbnails ──────────────────────────────────────────────────────
// A video has no picture of its own. The browser takes one frame, as a small JPEG,
// and uploads it beside the asset. Best effort: anything that fails leaves the
// asset with its text label, and the save goes ahead without a thumbnail.
const THUMB_SIDE = 640;

/** A JPEG of one frame of a <video> that is already loaded. */
async function frameOf(v) {
  v.currentTime = Math.min(1, (v.duration || 2) / 2);
  await new Promise((ok, no) => { v.onseeked = ok; v.onerror = no; setTimeout(no, 10000); });
  const sw = v.videoWidth, sh = v.videoHeight;
  if (!sw || !sh) return null;
  const k = Math.min(1, THUMB_SIDE / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * k); c.height = Math.round(sh * k);
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  return await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));   // throws on a tainted canvas
}

async function loadVideo(src, cors) {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  if (cors) v.crossOrigin = 'anonymous';
  v.src = src;
  await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = no; setTimeout(no, 15000); });
  return v;
}

/** A JPEG of an image the admin chose to be the thumbnail (any image the browser can read). */
async function thumbFromImage(file) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, THUMB_SIDE / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);   // a PNG's clear parts would turn black in a JPEG
    g.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
  } catch (_e) { return null; }
}

async function thumbFromFile(file) {
  if (!String(typeOf(file)).startsWith('video/')) return null;
  const url = URL.createObjectURL(file);
  try { return await frameOf(await loadVideo(url, false)); }
  catch (_e) { return null; }
  finally { URL.revokeObjectURL(url); }
}

async function thumbFromStored(id) {
  const f = await callPA('asset_file_url', { id });
  if (!f.ok) return null;
  try { return await frameOf(await loadVideo(f.url, true)); }
  catch (_e) { return null; }
}

/** Upload a thumbnail; returns { path } for asset_save, or null when it did not work. */
async function uploadThumb(blob) {
  if (!blob || !blob.size) return null;
  const t = await callPA('asset_upload_url', { kind: 'preview', type: 'image/jpeg', size: blob.size });
  if (!t.ok) return null;
  const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(t.path, t.token, blob, { contentType: 'image/jpeg' });
  return error ? null : { path: t.path };
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
      ${editing && asset.kind === 'image' ? '' : `<label class="field"><span>Thumbnail image <span class="hint">(optional; for a video or PDF. A video's thumbnail is made from its first seconds when you add it; choose an image to use your own${editing && asset.has_preview ? '. It replaces the current thumbnail' : ''})</span></span>
        <input id="al-thumb" type="file" accept="image/*" /></label>`}
      ${editing && asset.kind === 'video' && !asset.has_preview ? `<p class="pa-muted pa-small" style="margin:-4px 0 12px;">This video has no thumbnail yet, so partners see the word Video.
        <button type="button" class="pa-link-btn" id="al-mkthumb">Make a thumbnail from the stored video</button></p>` : ''}
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
  const mk = $('#al-mkthumb');
  if (mk) mk.addEventListener('click', () => save(asset, { storedThumb: true }));
  $('#al-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#al-title').focus();
}

async function save(asset, { storedThumb = false } = {}) {
  const title = $('#al-title').value.trim();
  const file = $('#al-file').files[0] || null;
  if (!title) { notify('error', 'Give the asset a title.'); return; }
  if (!asset && !file) { notify('error', 'Choose the file for this asset.'); return; }

  const btn = $('#al-save');
  btn.disabled = true;
  const label = btn.textContent;
  try {
    let upload = null;
    let preview = null;
    if (storedThumb) {
      btn.textContent = 'Making thumbnail…';
      preview = await uploadThumb(await thumbFromStored(asset.id));
      if (!preview) {
        notify('error', 'Could not read the video from here. Choose the video file under Replace the file and save; the thumbnail is made from it.');
        return;
      }
    }
    const chosen = $('#al-thumb') ? $('#al-thumb').files[0] || null : null;
    if (chosen) {
      btn.textContent = 'Making thumbnail…';
      preview = await uploadThumb(await thumbFromImage(chosen));
      if (!preview) { notify('error', 'Could not use that image as a thumbnail. Choose a JPG or PNG.'); return; }
    }
    if (file) {
      btn.textContent = 'Uploading…';
      const type = typeOf(file);
      const t = await callPA('asset_upload_url', { type, size: file.size });
      if (!t.ok) { notify('error', t.message || t.error || 'Could not start the upload'); return; }
      const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(t.path, t.token, file, { contentType: type });
      if (error) { notify('error', 'The upload did not finish. Try again.'); return; }
      upload = { path: t.path, name: file.name };
      if (!preview) {
        btn.textContent = 'Making thumbnail…';
        preview = await uploadThumb(await thumbFromFile(file));   // null for anything but a video
      }
    }
    btn.textContent = 'Saving…';
    const r = await callPA('asset_save', {
      id: asset ? asset.id : undefined,
      title,
      category: $('#al-cat').value,
      description: $('#al-desc').value,
      status: $('#al-st').value,
      file: upload || undefined,
      preview: preview || undefined,
    });
    if (!r.ok) { notify('error', r.message || r.error || 'Could not save the asset'); return; }
    notify('success', storedThumb ? 'Thumbnail added.' : asset ? 'Saved.' : 'Added.');
    if (file && String(typeOf(file)).startsWith('video/') && !preview) {
      notify('success', 'Added. This browser could not make a thumbnail from the video; Edit it and choose a thumbnail image.');
    }
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
