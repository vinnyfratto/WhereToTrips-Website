// ───────────────────────────────────────────────────────────────────
//  wt-partner-content.js — /partner-dashboard/content/ (Submit content).
//  Files the submission against the partner's CRM record through the
//  partner-portal edge fn. Review is brand-only: nothing here asks the
//  partner to tick or attest anything beyond the reminder line.
// ───────────────────────────────────────────────────────────────────
import { portal, portalGate } from './wt-partner-shared.js';
import { renderSeg } from './wt-portal-ui.js';

const $ = (id) => document.getElementById(id);
const MODES = [['link', 'A link'], ['file', 'A file'], ['event', 'A live event']];
let mode = 'link', busy = false;

function drawMode() {
  renderSeg($('mode'), MODES, mode, (m) => { mode = m; drawMode(); });
  $('g-event').hidden = mode !== 'event';
  $('g-url').hidden = mode === 'event';
  $('h-url').hidden = mode !== 'file';
  $('l-url').textContent = mode === 'file' ? 'Link to the file' : 'Link to the content';
}

const FIELDS = { title: 'e-title', url: 'e-url', event_date: 'e-date', venue: 'e-venue' };
function showErrors(fields = {}, general = '') {
  for (const [k, id] of Object.entries(FIELDS)) $(id).textContent = fields[k] || '';
  $('e-form').textContent = general;
  const first = Object.keys(fields)[0];
  if (first) {
    const input = { title: 'f-title', url: 'f-url', event_date: 'f-date', venue: 'f-venue' }[first];
    if (input) $(input).focus();
  }
}

async function send(draft) {
  if (busy) return;
  busy = true; $('send').disabled = true; $('draft').disabled = true;
  showErrors(); $('saved').textContent = '';
  const j = await portal('submit', {
    mode, draft,
    title: $('f-title').value, content_type: $('f-kind').value, platform: $('f-platform').value,
    url: $('f-url').value, event_date: $('f-date').value, venue: $('f-venue').value, notes: $('f-notes').value,
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

async function init() {
  const j = await portal('me');
  if (!portalGate(j)) return;
  drawMode();
  $('form').addEventListener('submit', (e) => { e.preventDefault(); send(false); });
  $('draft').addEventListener('click', () => send(true));
  $('again').addEventListener('click', () => {
    $('form').reset(); mode = 'link'; drawMode(); showErrors(); $('saved').textContent = '';
    $('done').hidden = true; $('form').hidden = false; $('f-title').focus();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
