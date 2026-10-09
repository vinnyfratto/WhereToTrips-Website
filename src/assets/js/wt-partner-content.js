// ───────────────────────────────────────────────────────────────────
//  wt-partner-content.js — /partner-dashboard/content/ (Submit content).
//
//  A submission is ONE file or a live event. There is no link option on
//  purpose: a link can be removed by whoever hosts it, and then WhereTo has
//  nothing to show a reviewer. The file goes straight to private storage on a
//  short-lived upload token from the partner-portal edge fn, which checks the
//  type and size first. Review is brand-only: nothing here asks the partner
//  to tick or attest anything beyond the reminder line.
// ───────────────────────────────────────────────────────────────────
import { portal, portalGate, supabase } from './wt-partner-shared.js';
import { renderSeg } from './wt-portal-ui.js';

const $ = (id) => document.getElementById(id);
const MODES = [['file', 'A file'], ['event', 'A live event']];
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'application/pdf',
  'video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/x-wav'];
const MAX_BYTES = 100 * 1024 * 1024;
const BUCKET = 'partner-submissions';

let mode = 'file';
let busy = false;
let upload = null;     // { path, name } once a file is safely in storage
let uploading = false;

function drawMode() {
  renderSeg($('mode'), MODES, mode, (m) => { mode = m; drawMode(); });
  $('g-event').hidden = mode !== 'event';
  $('g-file').hidden = mode === 'event';
}

const FIELDS = { title: 'e-title', file: 'e-file', event_date: 'e-date', venue: 'e-venue' };
const FOCUS = { title: 'f-title', file: 'drop', event_date: 'f-date', venue: 'f-venue' };
function showErrors(fields = {}, general = '') {
  for (const [k, id] of Object.entries(FIELDS)) $(id).textContent = fields[k] || '';
  $('e-form').textContent = general;
  const first = Object.keys(fields).find((k) => FOCUS[k]);
  if (first) $(FOCUS[first]).focus();
}

const size = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

function drawFile(file, state) {
  $('file-info').hidden = !file;
  $('drop').hidden = !!file;
  if (!file) return;
  $('file-name').textContent = file.name;
  $('file-size').textContent = size(file.size);
  $('file-state').textContent = state;
}

function clearFile() {
  upload = null; uploading = false;
  $('f-file').value = '';
  drawFile(null);
  $('e-file').textContent = '';
}

// A small JPEG of the piece (a frame for video), drawn in the browser, so the
// Preview column shows the real thing. Best effort: anything that fails just
// leaves the placeholder tile, and the submission goes ahead without one.
async function makeThumb(file) {
  const W = 136, H = 92;
  try {
    let src, sw, sh, done = () => {};
    if (file.type.startsWith('image/') && file.type !== 'image/heic') {
      src = await createImageBitmap(file); sw = src.width; sh = src.height; done = () => src.close();
    } else if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = no; setTimeout(no, 8000); });
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
      await new Promise((ok, no) => { v.onseeked = ok; v.onerror = no; setTimeout(no, 8000); });
      src = v; sw = v.videoWidth; sh = v.videoHeight; done = () => URL.revokeObjectURL(url);
    } else return null;
    if (!sw || !sh) { done(); return null; }
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const k = Math.max(W / sw, H / sh);                       // cover-fit, centered
    c.getContext('2d').drawImage(src, (W - sw * k) / 2, (H - sh * k) / 2, sw * k, sh * k);
    done();
    return await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.8));
  } catch (_e) { return null; }
}

async function uploadPreview(file) {
  const blob = await makeThumb(file);
  if (!blob || !blob.size) return null;
  const t = await portal('upload_url', { kind: 'preview', type: 'image/jpeg', size: blob.size });
  if (!t || !t.ok) return null;
  const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(t.path, t.token, blob, { contentType: 'image/jpeg' });
  return error ? null : t.path;
}

async function takeFile(file) {
  if (!file || uploading) return;
  $('e-file').textContent = '';
  // Phones sometimes report HEIC with an empty type; the server decides for real.
  if (!TYPES.includes(file.type)) { $('e-file').textContent = "That file type isn't accepted. Use an image, PDF, MP4 or MOV video, or MP3 or WAV audio."; return; }
  if (file.size > MAX_BYTES) { $('e-file').textContent = 'That file is over 100 MB. Compress it or send a shorter cut.'; return; }
  if (!file.size) { $('e-file').textContent = 'That file looks empty.'; return; }

  uploading = true; upload = null;
  drawFile(file, 'Uploading…');
  $('send').disabled = true;
  try {
    const ticket = await portal('upload_url', { type: file.type, size: file.size, filename: file.name });
    if (!ticket || !ticket.ok) {
      const msg = (ticket && ticket.fields && ticket.fields.file) || (ticket && ticket.message) || 'We could not start the upload. Please try again.';
      clearFile(); $('e-file').textContent = msg; return;
    }
    const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
    if (error) { clearFile(); $('e-file').textContent = 'The upload did not finish. Please try again.'; return; }
    upload = { path: ticket.path, name: file.name, preview_path: await uploadPreview(file) };
    drawFile(file, 'Ready');
  } catch (_e) {
    clearFile(); $('e-file').textContent = 'The upload did not finish. Please try again.';
  } finally {
    uploading = false; $('send').disabled = busy;
  }
}

async function send(draft) {
  if (busy) return;
  if (uploading) { $('e-form').textContent = 'Wait for the file to finish uploading.'; return; }
  busy = true; $('send').disabled = true; $('draft').disabled = true;
  showErrors(); $('saved').textContent = '';
  const j = await portal('submit', {
    mode, draft, attachment: mode === 'file' ? upload : null,
    title: $('f-title').value, content_type: $('f-kind').value, platform: $('f-platform').value,
    event_date: $('f-date').value, venue: $('f-venue').value, notes: $('f-notes').value,
  });
  busy = false; $('send').disabled = false; $('draft').disabled = false;

  if (j && j.ok) {
    if (draft) { $('saved').textContent = 'Draft saved.'; return; }
    $('form').hidden = true;
    $('done').hidden = false;
    $('done-h').focus();
    return;
  }
  if (j && j.error === 'invalid') return showErrors(j.fields);
  showErrors({}, (j && j.message) || 'We could not send that. Please try again.');
}

function wireDrop() {
  const drop = $('drop'), input = $('f-file');
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', () => takeFile(input.files && input.files[0]));
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length > 1) { $('e-file').textContent = 'Send one file at a time.'; return; }
    takeFile(files && files[0]);
  });
  $('file-remove').addEventListener('click', clearFile);
}

// "Submit it again" on My Submissions lands here with the earlier piece's details in the address.
// Fill the form so the new version carries the same title (that is how we connect the two).
function prefillResubmit() {
  const q = new URLSearchParams(location.search);
  if (q.get('resubmit') !== '1') return;
  const title = (q.get('title') || '').slice(0, 200);
  if (q.get('mode') === 'event') { mode = 'event'; drawMode(); }
  if (title) $('f-title').value = title;
  const pick = (id, label) => {
    const opt = label && Array.from($(id).options).find((o) => o.text === label);
    if (opt) $(id).value = opt.value;
  };
  pick('f-kind', q.get('kind'));
  pick('f-platform', q.get('platform'));
  if (mode === 'event' && q.get('venue')) $('f-venue').value = q.get('venue').slice(0, 300);
  const hint = $('resubmit-hint');
  if (hint) {
    hint.textContent = title
      ? 'You are sending a new version of "' + title + '". Keep the title the same so we can connect it to your earlier submission.'
      : 'You are sending a new version of an earlier submission.';
    hint.hidden = false;
  }
}

async function init() {
  const j = await portal('me');
  if (!portalGate(j)) return;
  drawMode();
  wireDrop();
  prefillResubmit();
  $('form').addEventListener('submit', (e) => { e.preventDefault(); send(false); });
  $('draft').addEventListener('click', () => send(true));
  $('again').addEventListener('click', () => {
    $('form').reset(); mode = 'file'; clearFile(); drawMode(); showErrors(); $('saved').textContent = '';
    $('done').hidden = true; $('form').hidden = false; $('f-title').focus();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
