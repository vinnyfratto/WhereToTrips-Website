// ───────────────────────────────────────────────────────────────────
//  wt-admin-review.js — Partner Admin → Review Queue.
//
//  Four tabs on one set of submissions:
//    Pending Review      what is waiting for a decision (the old "Content" tab,
//                        with its columns and behavior unchanged)
//    Approved Requests   every piece ever approved, with how it performed
//    Rejected Requests   every piece rejected
//    Changes Requested   every piece sent back, and whether the partner has returned it
//
//  Lists come from partner-admin (review_list). A decision is made through
//  partner-crm's review_submission exactly as before: three brand checks to
//  approve, a note the partner sees to request changes or reject, the tracking
//  link issued and emailed on approval. Review covers brand accuracy only (it
//  is not a compliance review).
// ───────────────────────────────────────────────────────────────────
import {
  boot, callCrm, callPA, dataTable, debounce, esc, fmtDate, money, notify, num, partnerLink, pill, $, $$,
} from './wt-padmin-core.js';

const dash = '<span class="pa-dash">—</span>';
const TABS = ['pending', 'approved', 'rejected', 'changes'];
let tab = 'pending';
let table = null;
let seq = 0;
let pendingRows = [];

const daysAgo = (s) => {
  if (!s) return '—';
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? '1 day' : `${d} days`;
};
const size = (n) => !n ? '' : n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

const SLA_RANK = { over_contract: 0, over_target: 1, ok: 2, none: 3 };
function slaPill(state) {
  if (state === 'over_contract') return pill('over contract', 'red');
  if (state === 'over_target') return pill('over target', 'amber');
  if (state === 'ok') return pill('on time');
  return dash;
}

// The asset: the private file (a five-minute link, opened in a new tab) or, for a
// live event, where and when it is.
function assetCell(r, withSize = false) {
  if (r.attachment_id) {
    return `<button type="button" class="pa-link-btn" data-open-file="${esc(r.attachment_id)}">Open file</button>${withSize && r.file_size ? ` <span class="pa-muted pa-small">${esc(size(r.file_size))}</span>` : ''}`;
  }
  if (r.event_at) return `Live event · ${esc(fmtDate(r.event_at))}${r.event_venue ? ' · ' + esc(r.event_venue) : ''}`;
  return dash;
}

function channelCell(r) {
  return `${r.channel ? esc(r.channel) : dash}${r.title ? `<br><span class="pa-muted pa-small">${esc(r.title)}</span>` : ''}${r.note ? `<br><span class="pa-muted pa-small pa-clamp" title="${esc(r.note)}">${esc(r.note)}</span>` : ''}`;
}

const nameCol = { key: 'partner_name', label: 'Partner Name', render: (r) => r.partner_id ? partnerLink(r) : `<a class="pa-link" href="/admin-crm-prospect/?id=${encodeURIComponent(r.prospect_id)}">${esc(r.partner_name)}</a>` };
const codeCol = { key: 'code', label: 'Code', mono: true, render: (r) => r.code ? esc(r.code) : dash };
const channelCol = { key: 'channel', label: 'Media Channel', render: channelCell };
const assetCol = { key: 'asset', label: 'Link to Asset', sortable: false, render: (r) => assetCell(r) };
const decidedCol = (label) => ({ key: 'decided_at', label, kind: 'date', nowrap: true, render: (r) => fmtDate(r.decided_at) });

const COLUMNS = {
  pending: [
    { key: 'partner_name', label: 'Partner', render: nameCol.render },
    { key: 'title', label: 'Title', render: (r) => esc(r.title || '—') + (r.resubmitted ? ' ' + pill('Resubmitted', 'blue') : '') },
    { key: 'platform', label: 'Platform' },
    { key: 'kind', label: 'Kind' },
    { key: 'file', label: 'File', sortable: false, render: (r) => assetCell(r, true) },
    { key: 'submitted_at', label: 'Waiting', kind: 'date', nowrap: true, render: (r) => esc(daysAgo(r.submitted_at)) },
    { key: 'sla_state', label: 'SLA', kind: 'num', value: (r) => SLA_RANK[r.sla_state] ?? 3, render: (r) => slaPill(r.sla_state) },
    { key: 'event_at', label: 'Event', kind: 'date', nowrap: true, render: (r) => r.event_at ? `${esc(fmtDate(r.event_at))}${r.event_venue ? ' · ' + esc(r.event_venue) : ''}${r.urgent ? ' ' + pill('urgent', 'amber') : ''}` : dash },
    { key: 'actions', label: '', sortable: false, render: (r) => `<div class="pa-actions">
        <button type="button" class="btn btn-primary btn-xs" data-decide="approved" data-id="${esc(r.id)}">Approve</button>
        <button type="button" class="btn btn-ghost btn-xs" data-decide="revisions_requested" data-id="${esc(r.id)}">Request changes</button>
        <button type="button" class="btn btn-ghost btn-xs" data-decide="declined" data-id="${esc(r.id)}">Reject</button>
      </div>` },
  ],
  approved: [
    decidedCol('Date Approved'), nameCol, codeCol, channelCol,
    { key: 'downloads', label: 'Downloads', kind: 'num', num: true, render: (r) => num(r.downloads) },
    { key: 'reg_users', label: 'Registered Users', kind: 'num', num: true, render: (r) => num(r.reg_users) },
    { key: 'bookings', label: 'Bookings', kind: 'num', num: true, render: (r) => num(r.bookings) },
    { key: 'est_revenue', label: 'Est. Revenue', kind: 'num', num: true, render: (r) => money(r.est_revenue) },
    assetCol,
  ],
  rejected: [decidedCol('Date Rejected'), nameCol, codeCol, channelCol, assetCol],
  changes: [
    decidedCol('Date Changes Requested'), nameCol, codeCol, channelCol, assetCol,
    { key: 'resubmitted_at', label: 'Date Resubmitted', kind: 'date', nowrap: true, render: (r) => r.resubmitted_at ? fmtDate(r.resubmitted_at) : pill('Waiting on partner', 'amber') },
  ],
};

const EMPTY = {
  pending: 'Nothing is waiting.',
  approved: 'No results. Try a different name or date range.',
  rejected: 'No results. Try a different name or date range.',
  changes: 'No results. Try a different name or date range.',
};

function wireFiles(host) {
  $$('[data-open-file]', host).forEach((b) => b.addEventListener('click', async () => {
    // Open the tab first (a popup blocker only allows it on the click itself), then point it at the link.
    const w = window.open('', '_blank');
    const f = await callPA('asset_url', { attachment_id: b.dataset.openFile });
    if (f.ok && w) { w.opener = null; w.location.href = f.url; }
    else { if (w) w.close(); notify('error', 'Could not open the file (' + (f.error || 'error') + ').'); }
  }));
  $$('[data-decide]', host).forEach((b) => b.addEventListener('click', () => openDecision(b.dataset.id, b.dataset.decide)));
}

// ── The decision panel ──────────────────────────────────────────────
const VERB = { approved: 'Approve', revisions_requested: 'Request changes', declined: 'Reject' };

function openDecision(id, decision) {
  const r = pendingRows.find((x) => x.id === id);
  if (!r) return;
  const host = $('#rv-decide');
  host.innerHTML = `
    <div class="adm-card" id="rv-card">
      <div class="pa-card-h"><h3 id="rv-card-h"></h3><button type="button" class="btn btn-ghost btn-xs" id="rv-cancel">Cancel</button></div>
      <div role="radiogroup" aria-label="Decision" style="display:flex; gap:18px; flex-wrap:wrap; margin-bottom:12px;">
        ${Object.entries(VERB).map(([v, label]) => `<label><input type="radio" name="rv-decision" value="${v}"${v === decision ? ' checked' : ''} /> ${label}</label>`).join('')}
      </div>
      <fieldset id="rv-checks" style="border:0; padding:0; margin:0 0 12px;">
        <legend class="acct-sub" style="padding:0;">Approval needs all three (brand accuracy only):</legend>
        <label style="display:block;"><input type="checkbox" data-check="check_description_accurate" /> WhereTo and what it does are described accurately</label>
        <label style="display:block;"><input type="checkbox" data-check="check_live_vs_planned" /> Anything planned is not presented as available</label>
        <label style="display:block;"><input type="checkbox" data-check="check_marks_used_correctly" /> Logo, name and Marks follow the brand guidelines</label>
      </fieldset>
      <label class="field"><span>Note to the partner <span class="hint" id="rv-note-hint"></span></span>
        <textarea id="rv-note" rows="2"></textarea></label>
      <label class="field"><span>Internal note <span class="hint">(never shown to the partner)</span></span>
        <textarea id="rv-internal" rows="2"></textarea></label>
      <div><button type="button" class="btn btn-primary" id="rv-save">Save decision</button></div>
    </div>`;

  const current = () => host.querySelector('input[name=rv-decision]:checked').value;
  const sync = () => {
    const d = current();
    $('#rv-card-h').textContent = `${VERB[d]}: ${r.title || 'this piece'} from ${r.partner_name}`;
    $('#rv-checks').hidden = d !== 'approved';
    $('#rv-note-hint').textContent = d === 'approved' ? '(optional; they see this in the approval email)' : '(required; they see this)';
  };
  host.querySelectorAll('input[name=rv-decision]').forEach((x) => x.addEventListener('change', sync));
  sync();
  $('#rv-cancel').addEventListener('click', () => { host.innerHTML = ''; });
  $('#rv-save').addEventListener('click', () => saveDecision(r, current()));
  $('#rv-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveDecision(r, decision) {
  const note = $('#rv-note').value.trim();
  if (decision !== 'approved' && !note) { notify('error', 'Write the note the partner will see before you ' + (decision === 'declined' ? 'reject' : 'request changes on') + ' this piece.'); return; }
  const params = { submission_id: r.id, decision, revision_instructions: note, reviewer_notes: $('#rv-internal').value };
  $$('#rv-card [data-check]').forEach((c) => { params[c.dataset.check] = c.checked; });

  const btn = $('#rv-save');
  btn.disabled = true;
  const res = await callCrm('review_submission', params);
  btn.disabled = false;
  if (!res.ok) { notify('error', res.error || 'Could not save the decision'); return; }

  if (decision === 'approved' && res.asset) notify('success', `Approved. Tracking link issued: ${res.asset.tracking_url}${res.emailed ? ' (emailed to the partner)' : ''}`);
  else notify('success', (decision === 'declined' ? 'Rejected' : 'Changes requested') + (res.emailed ? ' and the partner was told.' : '.'));

  $('#rv-decide').innerHTML = '';
  await load();           // the piece leaves this list and lands in its tab
  await refreshBadge();
}

async function refreshBadge() {
  const b = await callPA('badges');
  if (b.ok && window.wtAdminNav) window.wtAdminNav.setBadge('review', b.review_pending);
}

// ── Loading a tab ───────────────────────────────────────────────────
async function load() {
  const mine = ++seq;
  const host = $('#rv-table');
  const params = { bucket: tab };
  if (tab !== 'pending') { params.q = $('#rv-q').value; params.from = $('#rv-from').value; params.to = $('#rv-to').value; }
  const r = await callPA('review_list', params);
  if (mine !== seq) return;                         // a newer request is on its way
  if (!r.ok) { host.innerHTML = `<p class="acct-sub">Could not load this list (${esc(r.error || 'error')}).</p>`; return; }

  if (tab === 'pending') pendingRows = r.rows;
  table = dataTable(host, {
    columns: COLUMNS[tab],
    // The queue's own order (live events by urgency, then the SLA clock) until a header is clicked;
    // the history tabs open on the newest decision.
    sort: tab === 'pending' ? null : { key: 'decided_at', dir: 'desc' },
    empty: EMPTY[tab],
    onRendered: wireFiles,
  });
  table.set(r.rows);
  $('#rv-count').textContent = `${r.count} ${r.count === 1 ? 'piece' : 'pieces'}`;
}

function showTab(next, { fromHash = false } = {}) {
  tab = TABS.includes(next) ? next : 'pending';
  $$('.adm-tab', $('#rv-tabs')).forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
  const pending = tab === 'pending';
  $('#rv-controls').hidden = pending;
  const intro = $('#rv-intro');
  intro.hidden = !pending;
  if (pending) intro.innerHTML = '<span><strong>Brand accuracy and correct use of the Marks only.</strong> This is not a compliance review. Do not decline on tone, angle, style, or favorability (Agreement §5.6(a), T&amp;C §12.6). Approving issues the partner a tracking link and code for that piece and emails it to them. Files are private: <em>Open file</em> gives you a link that expires in five minutes.</span>';
  $('#rv-decide').innerHTML = '';
  if (!fromHash) history.replaceState(null, '', location.pathname + '#' + tab);
  return load();
}

boot(async (info) => {
  // Pending Review's badge, from the same call that checked access.
  $$('.adm-tab', $('#rv-tabs')).forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  const refilter = debounce(() => load(), 250);
  $('#rv-q').addEventListener('input', refilter);
  $('#rv-from').addEventListener('change', load);
  $('#rv-to').addEventListener('change', load);
  if (info && info.review_pending != null && window.wtAdminNav) window.wtAdminNav.setBadge('review', info.review_pending);
  await showTab(location.hash.slice(1), { fromHash: true });
});
