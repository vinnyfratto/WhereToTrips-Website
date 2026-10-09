// ───────────────────────────────────────────────────────────────────
//  wt-admin-revenue-received.js — Partner Admin → Revenue Received.
//
//  The list of payments Nuitee has made (and a form to log a new one), and, for
//  one payment, the allocation: import Nuitee's statement, see which partner each
//  booking belongs to, give the leftovers to a partner or hold them, and confirm.
//
//  Everything that matters is decided on the server (partner-admin): the
//  matching, the share on each booking, the refusal to confirm unless the lines
//  add up to the payment, and the single transaction that applies it. This page
//  shows it and asks for the next step.
// ───────────────────────────────────────────────────────────────────
import {
  boot, callPA, dataTable, esc, fmtDate, fmtDateTime, money, notify, num, partnerLink, pill, $, $$,
} from './wt-padmin-core.js';

const dash = '<span class="pa-dash">—</span>';
const STATUS = {
  unallocated: { label: 'Unallocated', tone: 'unallocated' },
  partially_allocated: { label: 'Partially allocated', tone: 'partial' },
  allocated: { label: 'Allocated', tone: 'allocated' },
};
const statusPill = (s) => pill((STATUS[s] || { label: s }).label, (STATUS[s] || {}).tone || '');
const ref = new URLSearchParams(location.search).get('payment');

const ERRORS = {
  duplicate_reference: 'A payment with that Nuitee reference is already logged.',
  bad_date: 'Enter the date the money was received.',
  bad_amount: 'Enter an amount greater than zero.',
  bad_reference: 'Enter Nuitee\'s reference for the payment (80 characters or fewer).',
  bad_period: 'The booking period is too long.',
  already_allocated: 'This payment is already allocated, so it is read-only.',
  unreadable_statement: 'The statement could not be read.',
  empty_file: 'The file is empty.',
  file_too_large: 'That file is too large. Split it and import the parts one at a time.',
  duplicate_in_flight: 'Some of those bookings were added by another import a moment ago. Reload and try again.',
  booking_has_partner: 'That booking already belongs to a partner.',
  no_booking_for_line: 'There is no booking in our records for that line to assign.',
  partner_has_no_revenue_share_rate: 'That partner has no revenue share rate. Set one on their dashboard first.',
  clawback_not_assignable: 'A clawback cannot be assigned. Handle it by hand.',
  no_statement: 'Import the statement before confirming.',
};
const errText = (r) => r.message || ERRORS[r.error] || `Something went wrong (${r.error || 'error'}).`;

const pctText = (rate) => rate === null || rate === undefined ? 'Mixed' : `${+(rate * 100).toFixed(2)}%`;

// ── The list ────────────────────────────────────────────────────────
async function showList() {
  $('#rr-body').innerHTML = '<p class="acct-sub">Loading…</p>';
  const r = await callPA('nuitee_payments_list');
  if (!r.ok) { $('#rr-body').innerHTML = `<p class="acct-sub">Could not load payments (${esc(r.error || 'error')}).</p>`; return; }

  $('#rr-body').innerHTML = `
    <details class="adm-card" style="padding:14px 20px;">
      <summary style="cursor:pointer; font-weight:600; color:var(--navy);">Suggested workflow</summary>
      <ol style="margin:12px 0 4px 18px; padding:0; line-height:1.7; color:var(--ink-soft);">
        <li><strong>Log the Nuitee payment</strong> when it lands: date, amount, reference, and the booking period it covers.</li>
        <li><strong>Import Nuitee's booking statement</strong> for that period (a CSV with a booking reference and a commission amount on each line).</li>
        <li><strong>Matching is automatic.</strong> Each line is matched to a partner through the booking it names. Matched lines total up per partner.</li>
        <li><strong>Fix exceptions.</strong> A booking with no partner, or one we cannot find, is assigned by hand or held.</li>
        <li><strong>Confirm.</strong> Each partner's share is recalculated on what Nuitee actually paid. A booking past its 14-day hold becomes Approved for Payment and is queued for the next ACH run.</li>
      </ol>
    </details>
    <div class="pa-tiles cols-3" id="rr-tiles"></div>
    <div class="pa-actions" style="justify-content:flex-end; margin:0 0 12px;">
      <button type="button" class="btn btn-primary btn-xs" id="rr-log-open">Log Nuitee payment</button>
    </div>
    <form id="rr-log" class="adm-card" hidden>
      <div class="pa-form-grid">
        <div class="field"><label for="rl-date">Date received</label><input id="rl-date" type="date" required /></div>
        <div class="field"><label for="rl-amount">Amount (USD)</label><input id="rl-amount" type="number" min="0.01" step="0.01" required placeholder="0.00" /></div>
        <div class="field"><label for="rl-ref">Nuitee reference</label><input id="rl-ref" type="text" maxlength="80" required placeholder="NUI-ACH-" /></div>
        <div class="field"><label for="rl-period">Booking period</label><input id="rl-period" type="text" maxlength="60" placeholder="Sep 2026 stays" /></div>
        <div class="pa-actions"><button type="submit" class="btn btn-primary btn-xs">Save payment</button><button type="button" class="btn btn-ghost btn-xs" id="rr-log-cancel">Cancel</button></div>
      </div>
    </form>
    <div id="rr-table"></div>`;

  $('#rr-tiles').innerHTML = [
    ['Received in ' + r.tiles.year, money(r.tiles.received_this_year)],
    ['Payments to allocate', num(r.tiles.to_allocate)],
    ['Unmatched bookings', num(r.tiles.unmatched_bookings)],
  ].map(([k, v]) => `<div class="pa-tile"><p class="k">${esc(k)}</p><p class="v">${v}</p></div>`).join('');

  const table = dataTable($('#rr-table'), {
    columns: [
      { key: 'received_on', label: 'Received', kind: 'date', nowrap: true, render: (p) => fmtDate(p.received_on) },
      { key: 'reference', label: 'Nuitee Reference', mono: true },
      { key: 'booking_period', label: 'Booking Period', render: (p) => p.booking_period ? esc(p.booking_period) : dash },
      { key: 'amount', label: 'Amount', kind: 'num', num: true, render: (p) => money(p.amount) },
      { key: 'status', label: 'Status', render: (p) => statusPill(p.status) },
      { key: 'open', label: '', sortable: false, render: (p) => `<a class="btn ${p.status === 'allocated' ? 'btn-ghost' : 'btn-primary'} btn-xs" href="?payment=${encodeURIComponent(p.payment_id)}">${p.status === 'allocated' ? 'View' : 'Allocate'}</a>` },
    ],
    sort: { key: 'received_on', dir: 'desc' },
    empty: 'No payments logged yet. Log one when Nuitee pays.',
  });
  table.set(r.rows);

  const form = $('#rr-log');
  $('#rr-log-open').addEventListener('click', () => {
    form.hidden = false;
    if (!$('#rl-date').value) $('#rl-date').value = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    $('#rl-amount').focus();
  });
  $('#rr-log-cancel').addEventListener('click', () => { form.hidden = true; });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    const res = await callPA('nuitee_payment_create', {
      received_on: $('#rl-date').value, amount: $('#rl-amount').value, reference: $('#rl-ref').value, booking_period: $('#rl-period').value,
    });
    btn.disabled = false;
    if (!res.ok) { notify('error', errText(res)); return; }
    notify('success', `Payment ${res.payment.payment_id} logged. Import its statement next.`);
    location.href = '?payment=' + encodeURIComponent(res.payment.payment_id);
  });
}

// ── One payment ─────────────────────────────────────────────────────
let partners = [];
let view = null;          // the last detail the server sent
let importSummary = null; // what the last import did, shown until the next action

async function loadPartners() {
  if (partners.length) return;
  const r = await callPA('partners_list', {});
  if (r.ok) partners = r.partners.slice().sort((a, b) => a.partner_name.localeCompare(b.partner_name));
}

async function showDetail(paymentRef) {
  $('#rr-body').innerHTML = '<p class="acct-sub">Loading…</p>';
  await loadPartners();
  const r = await callPA('nuitee_payment_get', { id: paymentRef });
  if (!r.ok) {
    $('#rr-title').textContent = r.error === 'payment_not_found' ? 'Payment not found' : 'Could not load this payment';
    $('#rr-body').innerHTML = `<p class="acct-sub">${r.error === 'payment_not_found' ? 'There is no payment with that ID.' : esc(r.error || 'error')} <a class="pa-link" href="/admin-revenue-received/">Back to Revenue Received</a>.</p>`;
    return;
  }
  view = r;
  renderDetail();
}

function renderDetail() {
  const p = view.payment;
  const t = view.totals;
  document.title = `${p.payment_id} — Revenue Received — WhereTo`;
  $('#rr-back').innerHTML = '<a class="pa-back" href="/admin-revenue-received/">← Revenue Received</a>';
  $('#rr-eyebrow').textContent = `Nuitee payment ${p.payment_id}`;
  $('#rr-title').textContent = `${money(p.amount)} from Nuitee`;
  $('#rr-lede').hidden = true;
  $('#rr-meta').innerHTML = `
    <span>Received <strong>${esc(fmtDate(p.received_on))}</strong></span>
    <span>Reference <strong class="mono">${esc(p.reference)}</strong></span>
    <span>Covers <strong>${p.booking_period ? esc(p.booking_period) : '—'}</strong></span>
    <span>${statusPill(p.status)}</span>`;

  const done = p.status === 'allocated';
  const open = view.open_lines;
  const canConfirm = !done && view.has_statement && t.reconciles && view.allocation.length + open.filter((l) => l.status === 'assigned').length > 0;

  const importCard = (!done && !view.has_statement) ? `
    <div class="adm-card">
      <h3>Import Nuitee's statement</h3>
      <p class="acct-sub">Upload the statement for this payment as a CSV. Each line needs a booking reference and a commission amount; other columns are kept on file but not used. After the import, every line is matched automatically.</p>
      <div class="pa-actions" style="align-items:center;">
        <input type="file" id="rr-file" accept=".csv,text/csv,text/plain" />
        <button type="button" class="btn btn-primary btn-xs" id="rr-import">Import statement</button>
      </div>
    </div>` : '';

  const moreLink = (!done && view.has_statement)
    ? `<p class="pa-muted pa-small" style="margin:0 0 14px;">Statement imported ${p.statement_imported_at ? esc(fmtDateTime(p.statement_imported_at)) : ''}${p.statement_filename ? ' from ' + esc(p.statement_filename) : ''}. <button type="button" class="pa-link-btn" id="rr-more">Import another file</button> for the same payment (lines already on file are skipped).</p>
       <div id="rr-more-card" hidden>${`<div class="adm-card"><div class="pa-actions" style="align-items:center;"><input type="file" id="rr-file" accept=".csv,text/csv,text/plain" /><button type="button" class="btn btn-primary btn-xs" id="rr-import">Import statement</button></div></div>`}</div>` : '';

  const summary = importSummary ? importBanner(importSummary) : '';

  const recon = view.has_statement ? `
    <p style="margin:0 0 14px;">
      ${t.reconciles
        ? pill('Statement matches the payment', 'green') + ` <span class="pa-muted pa-small">The ${num(view.line_count)} statement lines total ${money(t.lines)}.</span>`
        : pill('Does not match the payment', 'red') + ` <span class="pa-small">The statement lines total <strong>${money(t.lines)}</strong> and the payment is <strong>${money(t.payment)}</strong>. ${t.difference > 0 ? `The payment is ${money(t.difference)} more than the lines` : `The lines are ${money(-t.difference)} more than the payment`}. Fix the amount or the lines before confirming.</span>`}
    </p>` : '';

  $('#rr-body').innerHTML = `
    ${importCard}${moreLink}${summary}
    <div class="pa-tiles cols-3">
      <div class="pa-tile"><p class="k">Payment received</p><p class="v">${money(t.payment)}</p></div>
      <div class="pa-tile"><p class="k">Matched to partners</p><p class="v">${money(t.matched)}</p></div>
      <div class="pa-tile"><p class="k">Needs a decision</p><p class="v">${money(t.open)}</p></div>
    </div>
    ${recon}
    ${view.has_statement ? `<h2 class="adm-section-h" style="margin-top:6px;">Allocation by partner</h2><div id="rr-alloc"></div>` : ''}
    ${open.length ? `<h2 class="adm-section-h">Bookings needing a decision (${open.length})</h2>
      <p class="pa-lede" style="margin:0 0 12px;">These lines have no partner we can pay yet. Give a booking that nobody was credited with to a partner, or hold it. Held and unmatched lines stay open and the payment shows Partially allocated.</p>
      <div id="rr-open"></div>` : ''}
    <div class="pa-actions" style="justify-content:flex-end; margin-top:18px;">
      ${done
        ? `<span class="pa-muted">Confirmed ${esc(fmtDate(p.allocated_at))}${p.confirmed_by ? ' by ' + esc(p.confirmed_by) : ''}. This payment is read-only.</span>`
        : `<button type="button" class="btn btn-primary" id="rr-confirm"${canConfirm ? '' : ' disabled'}>Confirm allocation</button>`}
    </div>`;

  if (view.has_statement) {
    const allocTable = dataTable($('#rr-alloc'), {
      columns: [
        { key: 'partner_name', label: 'Partner', render: (r) => partnerLink(r) },
        { key: 'code', label: 'Code', mono: true },
        { key: 'bookings', label: 'Bookings', kind: 'num', num: true, render: (r) => num(r.bookings) },
        { key: 'commission', label: 'Nuitee Commission', kind: 'num', num: true, render: (r) => money(r.commission) },
        { key: 'rate', label: 'Partner Rate', kind: 'num', num: true, render: (r) => esc(pctText(r.rate)) },
        { key: 'earns', label: 'Partner Earns', kind: 'num', num: true, render: (r) => money(r.earns) },
      ],
      sort: { key: 'commission', dir: 'desc' },
      empty: 'No lines are matched to a partner yet.',
    });
    const tot = view.allocation_total;
    allocTable.set(view.allocation, view.allocation.length ? `<tr><td>Total</td><td></td><td class="num">${num(tot.bookings)}</td><td class="num">${money(tot.commission)}</td><td></td><td class="num">${money(tot.earns)}</td></tr>` : '');
  }

  if (open.length) {
    const openTable = dataTable($('#rr-open'), {
      columns: [
        { key: 'ref', label: 'Nuitee Booking', mono: true },
        { key: 'commission', label: 'Commission', kind: 'num', num: true, render: (l) => money(l.commission) },
        { key: 'note', label: 'Why', render: (l) => l.status === 'assigned' ? '<span class="pa-muted">Assigned. Applied when you confirm.</span>' : esc(l.note || (l.status === 'held' ? 'On hold' : '—')) },
        { key: 'assign', label: 'Assign To', sortable: false, render: (l) => l.assignable && !done
            ? `<select data-assign="${esc(l.line_id)}" aria-label="Assign ${esc(l.ref)}"><option value="">Hold for now</option>${partners.map((a) => `<option value="${esc(a.affiliate_id)}"${a.affiliate_id === l.assigned_to ? ' selected' : ''}>${esc(a.partner_name)} (${esc(a.code)})</option>`).join('')}</select>`
            : (l.line_type === 'clawback' ? '<span class="pa-muted">Handle by hand</span>' : '<span class="pa-muted">Cannot be assigned</span>') },
      ],
      sort: { key: 'ref', dir: 'asc' },
      onRendered: (host) => $$('[data-assign]', host).forEach((s) => s.addEventListener('change', () => assign(s.dataset.assign, s.value))),
    });
    openTable.set(open);
  }

  wire();
}

function importBanner(s) {
  const bits = [`Imported ${num(s.inserted)} line${s.inserted === 1 ? '' : 's'}: ${num(s.matched)} matched to a partner, ${num(s.unmatched)} need a decision.`];
  if (s.skipped_existing) bits.push(`${num(s.skipped_existing)} already on file, left as they were.`);
  const lists = [];
  if (s.changed && s.changed.length) lists.push(`<p style="margin:8px 0 0;"><strong>Amounts that differ from what is on file (not changed):</strong> ${s.changed.map((c) => `${esc(c.ref)} (${money(c.was)} on file, ${money(c.now)} in this file)`).join('; ')}</p>`);
  if (s.duplicates && s.duplicates.length) lists.push(`<p style="margin:8px 0 0;"><strong>Skipped, already on another payment:</strong> ${s.duplicates.map((d) => `${esc(d.ref)} (${esc(d.payment_id)})`).join('; ')}</p>`);
  if (s.errors && s.errors.length) lists.push(`<p style="margin:8px 0 0;"><strong>Lines that could not be read:</strong> ${s.errors.slice(0, 20).map((e) => `row ${e.row}: ${esc(e.reason)}`).join('; ')}${s.errors.length > 20 ? ` and ${s.errors.length - 20} more` : ''}</p>`);
  const warn = (s.duplicates && s.duplicates.length) || (s.errors && s.errors.length) || (s.changed && s.changed.length);
  return `<div class="pa-banner${warn ? ' is-warn' : ''}" style="display:block;"><span>${bits.join(' ')}</span>${lists.join('')}</div>`;
}

// ── Actions ─────────────────────────────────────────────────────────
function wire() {
  const more = $('#rr-more');
  if (more) more.addEventListener('click', () => { $('#rr-more-card').hidden = false; more.hidden = true; });

  const imp = $('#rr-import');
  if (imp) imp.addEventListener('click', async () => {
    const file = $('#rr-file').files && $('#rr-file').files[0];
    if (!file) { notify('error', 'Choose the statement file first.'); return; }
    if (file.size > 3000000) { notify('error', ERRORS.file_too_large); return; }
    imp.disabled = true;
    const csv = await file.text();
    const r = await callPA('nuitee_import', { payment_id: view.payment.payment_id, csv, filename: file.name });
    imp.disabled = false;
    if (!r.ok) { notify('error', errText(r)); return; }
    importSummary = r;
    view = r;
    renderDetail();
    notify('success', 'Statement imported.');
  });

  const conf = $('#rr-confirm');
  if (conf) conf.addEventListener('click', async () => {
    const t = view.totals;
    if (!confirm(`Confirm this allocation?\n\nEach partner's share is recalculated on what Nuitee actually paid, and bookings past their 14-day hold become Approved for Payment. ${view.open_lines.filter((l) => l.status !== 'assigned').length ? 'Lines still open stay open, and the payment shows Partially allocated.' : ''}\n\nThis cannot be undone here.`)) return;
    conf.disabled = true;
    const r = await callPA('nuitee_confirm', { payment_id: view.payment.payment_id });
    if (!r.ok) { conf.disabled = false; notify('error', errText(r)); return; }
    importSummary = null;
    view = r;
    renderDetail();
    const res = r.result || {};
    notify('success', `Allocation confirmed: ${num(res.applied)} booking${res.applied === 1 ? '' : 's'} applied${res.skipped ? `, ${num(res.skipped)} could not be applied and need a decision` : ''}${res.open ? `, ${num(res.open)} line${res.open === 1 ? '' : 's'} still open` : ''}.`);
  });
}

async function assign(lineId, affiliateId) {
  const r = await callPA('nuitee_assign', { payment_id: view.payment.payment_id, line_id: lineId, affiliate_id: affiliateId || null });
  if (!r.ok) { notify('error', errText(r)); await showDetail(view.payment.payment_id); return; }
  importSummary = null;
  view = r;
  renderDetail();
}

boot(async () => {
  if (ref) await showDetail(ref);
  else await showList();
});
