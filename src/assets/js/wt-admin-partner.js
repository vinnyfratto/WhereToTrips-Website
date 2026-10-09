// ───────────────────────────────────────────────────────────────────
//  wt-admin-partner.js — Partner Admin → Partner Dashboard (one partner).
//
//  A permanent record of one partner: tiles, then five tabs (content
//  submissions, content performance, payment history, 1099 history, T&C
//  acceptance), then their terms. Every figure comes from the partner-admin
//  function; the tables sort on every column except links.
//
//  The address is /admin-partner/?id=P-1003 (the public Partner ID).
// ───────────────────────────────────────────────────────────────────
import {
  boot, callPA, dataTable, esc, fmtDate, fmtDateTime, money, notify, num, pill, $, $$,
} from './wt-padmin-core.js';
import { renderTerms } from './wt-admin-partner-terms.js';

const id = new URLSearchParams(location.search).get('id');
let partner = null;
const loaded = {};

const STATUS_TONE = { active: 'green', pending: 'amber', suspended: 'red', terminated: '' };
const BUCKET_TONE = { pending: 'pending', approved: 'approved', rejected: 'rejected', changes: 'changes', other: '' };
const dash = '<span class="pa-dash">—</span>';

// ── Header, tiles, tab bar ──────────────────────────────────────────
function renderHeader() {
  $('#pd-name').textContent = partner.partner_name;
  document.title = `${partner.partner_name} — Partner Dashboard — WhereTo`;
  $('#pd-meta').innerHTML = `
    <span>Partner ID <strong>${esc(partner.partner_id)}</strong></span>
    <span>Code <strong>${esc(partner.code)}</strong></span>
    <span>Registered <strong>${esc(fmtDate(partner.date_reg))}</strong></span>
    <span>${pill(partner.status, STATUS_TONE[partner.status] ?? '')}</span>`;
}

function tile(label, value) { return `<div class="pa-tile"><p class="k">${esc(label)}</p><p class="v">${value}</p></div>`; }

function renderTiles() {
  $('#pd-tiles').innerHTML = [
    tile('Rev Earned', money(partner.rev_earned)),
    tile('Rev Pending', money(partner.rev_pending)),
    tile('Downloads', num(partner.downloads)),
    tile('Registered Users', num(partner.reg_users)),
    tile('Completed Bookings', num(partner.completed)),
  ].join('');
}

const TABS = [
  { key: 'content', label: 'Content Submissions', load: loadContent },
  { key: 'performance', label: 'Content Performance', load: loadPerformance },
  { key: 'payments', label: 'Payment History', load: loadPayments },
  { key: 'tax', label: '1099 History', load: loadTax },
  { key: 'terms', label: 'T&C Acceptance', load: loadTerms },
];

function showTab(key, { fromHash = false } = {}) {
  const tab = TABS.find((t) => t.key === key) || TABS[0];
  $$('.adm-tab', $('#pd-tabs')).forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab.key));
  $$('.adm-panel', $('#pd-panels')).forEach((p) => { p.hidden = p.dataset.panel !== tab.key; });
  if (!fromHash) history.replaceState(null, '', location.pathname + location.search + '#' + tab.key);
  if (!loaded[tab.key]) {
    loaded[tab.key] = true;
    tab.load($(`[data-panel="${tab.key}"]`, $('#pd-panels')));
  }
}

function failed(host, what, r) {
  host.innerHTML = `<p class="acct-sub">Could not load ${esc(what)} (${esc(r.error || 'error')}).</p>`;
}

// ── 1. Content Submissions ──────────────────────────────────────────
async function loadContent(host) {
  host.innerHTML = '<p class="acct-sub">Loading…</p>';
  const r = await callPA('partner_content', { id });
  if (!r.ok) return failed(host, 'content submissions', r);
  const table = dataTable(host, {
    columns: [
      { key: 'submitted_at', label: 'Submitted', kind: 'date', nowrap: true, render: (x) => fmtDate(x.submitted_at) },
      { key: 'code', label: 'Code', mono: true, render: (x) => x.code ? esc(x.code) : dash },
      { key: 'channel', label: 'Channel', render: (x) => `${x.channel ? esc(x.channel) : dash}${x.title ? `<br><span class="pa-muted pa-small">${esc(x.title)}</span>` : ''}` },
      { key: 'status_label', label: 'Status', render: (x) => pill(x.status_label, BUCKET_TONE[x.bucket] ?? '') },
      { key: 'decided_at', label: 'Decision Date', kind: 'date', nowrap: true, render: (x) => x.decided_at ? fmtDate(x.decided_at) : dash },
      { key: 'asset', label: 'Asset', sortable: false, render: (x) => x.attachment_id
          ? `<button type="button" class="pa-link-btn" data-open-file="${esc(x.attachment_id)}">Open file</button>`
          : (x.event_at ? `Live event · ${esc(fmtDate(x.event_at))}${x.event_venue ? ' · ' + esc(x.event_venue) : ''}` : dash) },
    ],
    sort: { key: 'submitted_at', dir: 'desc' },
    empty: 'No content has been submitted yet.',
    onRendered: (h) => $$('[data-open-file]', h).forEach((b) => b.addEventListener('click', async () => {
      // Open the tab first (a popup blocker only allows it on the click itself), then point it at the link.
      const tab = window.open('', '_blank');
      const f = await callPA('asset_url', { attachment_id: b.dataset.openFile });
      if (f.ok && tab) { tab.opener = null; tab.location.href = f.url; }
      else { if (tab) tab.close(); notify('error', 'Could not open the file (' + (f.error || 'error') + ').'); }
    })),
  });
  table.set(r.rows);
}

// ── 2. Content Performance ──────────────────────────────────────────
async function loadPerformance(host) {
  host.innerHTML = '<p class="acct-sub">Loading…</p>';
  const r = await callPA('partner_performance', { id });
  if (!r.ok) return failed(host, 'content performance', r);
  const max = Math.max(0, ...r.rows.map((x) => x.est_revenue));
  const table = dataTable(host, {
    columns: [
      { key: 'approved_at', label: 'Approved', kind: 'date', nowrap: true, render: (x) => fmtDate(x.approved_at) },
      { key: 'code', label: 'Code', mono: true },
      { key: 'channel', label: 'Channel', render: (x) => `${x.channel ? esc(x.channel) : dash}${x.title ? `<br><span class="pa-muted pa-small">${esc(x.title)}</span>` : ''}` },
      { key: 'downloads', label: 'Downloads', kind: 'num', num: true, render: (x) => num(x.downloads) },
      { key: 'reg_users', label: 'Registered Users', kind: 'num', num: true, render: (x) => num(x.reg_users) },
      { key: 'bookings', label: 'Bookings', kind: 'num', num: true, render: (x) => num(x.bookings) },
      { key: 'est_revenue', label: 'Est. Revenue', kind: 'num', num: true, render: (x) => `<div class="pa-bar" style="justify-content:flex-end;"><span>${money(x.est_revenue)}</span><span class="t" aria-hidden="true"><i style="width:${max > 0 ? Math.round((x.est_revenue / max) * 100) : 0}%"></i></span></div>` },
    ],
    sort: { key: 'approved_at', dir: 'desc' },
    empty: 'No approved content yet.',
  });
  table.set(r.rows);
}

// ── 3. Payment History ──────────────────────────────────────────────
async function loadPayments(host) {
  host.innerHTML = '<p class="acct-sub">Loading…</p>';
  const r = await callPA('partner_payments', { id });
  if (!r.ok) return failed(host, 'payments', r);
  const table = dataTable(host, {
    columns: [
      { key: 'payment_date', label: 'Payment Date', kind: 'date', nowrap: true, render: (x) => fmtDate(x.payment_date) },
      { key: 'reference', label: 'Payment ID', mono: true },
      { key: 'amount', label: 'Payment Amount', kind: 'num', num: true, render: (x) => money(x.amount) },
    ],
    sort: { key: 'payment_date', dir: 'desc' },
    empty: 'No payments have been made to this partner yet.',
  });
  table.set(r.rows, r.rows.length ? `<tr><td>Total</td><td></td><td class="num">${money(r.total)}</td></tr>` : '');
}

// ── 4. 1099 History ─────────────────────────────────────────────────
async function loadTax(host) {
  host.innerHTML = '<p class="acct-sub">Loading…</p>';
  const r = await callPA('partner_tax', { id });
  if (!r.ok) return failed(host, '1099 history', r);
  host.innerHTML = `
    <p style="margin:0 0 14px;"><strong>W-9 on file:</strong> ${r.w9.on_file ? pill('Yes', 'yes') : pill('Missing', 'no')}
      ${r.w9.status && !r.w9.on_file ? `<span class="pa-muted pa-small"> (${esc(r.w9.status.replace(/_/g, ' '))})</span>` : ''}</p>
    <div id="pd-tax"></div>
    <p class="pa-muted pa-small" style="margin:12px 0 0;">The reporting threshold is a setting, not a fixed number. The 1099 process itself is not built yet, so filing status will appear here once it is.</p>`;
  const table = dataTable($('#pd-tax', host), {
    columns: [
      { key: 'tax_year', label: 'Tax Year', kind: 'num', render: (x) => esc(x.tax_year) },
      { key: 'paid', label: 'Paid in Year', kind: 'num', num: true, render: (x) => money(x.paid) },
      { key: 'required', label: '1099 Required', kind: 'num', value: (x) => x.required ? 1 : 0, render: (x) => x.required ? pill('Yes', 'yes') : `${pill('No', 'no')} <span class="pa-muted pa-small">under ${money(x.threshold)}</span>` },
      { key: 'status', label: 'Status', render: (x) => x.status ? esc(x.status) : '<span class="pa-muted">Not tracked yet</span>' },
    ],
    sort: { key: 'tax_year', dir: 'desc' },
    empty: 'No 1099 records.',
  });
  table.set(r.rows);
}

// ── 5. T&C Acceptance ───────────────────────────────────────────────
async function loadTerms(host) {
  host.innerHTML = '<p class="acct-sub">Loading…</p>';
  const r = await callPA('partner_terms', { id });
  if (!r.ok) return failed(host, 'terms acceptances', r);
  host.innerHTML = '<div id="pd-tc"></div>' + (r.current_version ? '' :
    '<p class="pa-muted pa-small" style="margin:12px 0 0;">The current terms version is not configured (PCRM_TC_VERSION), so a missing acceptance of it cannot be shown here yet.</p>');
  const table = dataTable($('#pd-tc', host), {
    columns: [
      { key: 'version', label: 'Version', render: (x) => (x.version ? esc(x.version) : '<span class="pa-muted">Not recorded</span>') + (x.current ? ' <span class="pa-muted pa-small">(current)</span>' : '') },
      { key: 'effective', label: 'Effective', kind: 'date', nowrap: true, render: (x) => x.effective ? fmtDate(x.effective) : dash },
      { key: 'accepted_at', label: 'Accepted', kind: 'date', nowrap: true, render: (x) => x.accepted_at ? fmtDateTime(x.accepted_at) : pill('Not yet accepted', 'pending') },
      { key: 'method', label: 'Method' },
      { key: 'document', label: 'Document', sortable: false, render: () => dash },
    ],
    sort: { key: 'accepted_at', dir: 'desc' },
    empty: 'No terms acceptances on file.',
  });
  table.set(r.rows);
}

// ── Page ────────────────────────────────────────────────────────────
function renderBody() {
  $('#pd-body').innerHTML = `
    <div class="pa-tiles cols-5" id="pd-tiles"></div>
    <div class="adm-tabs" role="tablist" id="pd-tabs">
      ${TABS.map((t) => `<button type="button" class="adm-tab" role="tab" data-tab="${t.key}">${esc(t.label)}</button>`).join('')}
    </div>
    <div id="pd-panels">
      ${TABS.map((t) => `<section class="adm-panel" data-panel="${t.key}" hidden></section>`).join('')}
    </div>
    <div id="pd-terms" class="pa-section-gap"></div>`;
  $$('.adm-tab', $('#pd-tabs')).forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
}

async function loadPartner() {
  const r = await callPA('partner_get', { id });
  if (!r.ok) return r;
  partner = r.partner;
  renderHeader();
  renderTiles();
  renderTerms($('#pd-terms'), partner, { call: callPA, notify, onSaved: loadPartner });
  return r;
}

boot(async () => {
  if (!id) {
    $('#pd-name').textContent = 'No partner selected';
    $('#pd-body').innerHTML = '<p class="acct-sub">Open a partner from <a class="pa-link" href="/admin-partners/">Partner Details</a>.</p>';
    return;
  }
  renderBody();
  const r = await loadPartner();
  if (!r.ok) {
    $('#pd-name').textContent = r.error === 'partner_not_found' ? 'Partner not found' : 'Could not load this partner';
    $('#pd-body').innerHTML = `<p class="acct-sub">${r.error === 'partner_not_found' ? 'There is no partner with that ID.' : esc(r.error || 'error')} <a class="pa-link" href="/admin-partners/">Back to Partner Details</a>.</p>`;
    return;
  }
  showTab(location.hash.slice(1), { fromHash: true });
});
