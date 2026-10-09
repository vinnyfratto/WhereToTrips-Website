// ───────────────────────────────────────────────────────────────────
//  wt-admin-ach.js — Financial Tracking → Partner Payment Processing (ACH).
//  The page is a placeholder for the full process. It carries the one control
//  Payment History needs to have anything to show: marking a payout paid once
//  its ACH has gone out (an optional ACH reference becomes the payment's ID).
//  The server flips the payout and its bookings together and logs who did it.
// ───────────────────────────────────────────────────────────────────
import { boot, callPA, dataTable, esc, fmtDate, money, notify, num, partnerLink, pill, $, $$ } from './wt-padmin-core.js';

const columns = [
  { key: 'processing_date', label: 'Processing Date', kind: 'date', nowrap: true, render: (r) => fmtDate(r.processing_date) },
  { key: 'partner_name', label: 'Partner', render: (r) => partnerLink(r) },
  { key: 'booking_count', label: 'Bookings', kind: 'num', num: true, render: (r) => num(r.booking_count) },
  { key: 'amount', label: 'Amount', kind: 'num', num: true, render: (r) => money(r.amount) },
  { key: 'status', label: 'Status', render: (r) => pill(r.status, 'pending') },
  { key: 'reference', label: 'ACH Reference', sortable: false, render: (r) => r.markable ? `<input type="text" data-ref="${esc(r.payout_id)}" placeholder="optional" maxlength="60" aria-label="ACH reference for ${esc(r.partner_name)}" style="max-width:150px;" />` : '' },
  // A payout built by hand before payouts were tied to bookings has nothing to pay: marking it paid
  // would show a payment while its bookings stayed approved, and the daily job would pay them again.
  { key: 'action', label: '', sortable: false, render: (r) => r.markable
      ? `<button type="button" class="btn btn-primary btn-xs" data-paid="${esc(r.payout_id)}">Mark paid</button>`
      : '<span class="pa-muted pa-small">No bookings are tied to this payout, so there is nothing to mark paid. The daily job builds the real payout.</span>' },
];

boot(async () => {
  let rows = [];
  const table = dataTable($('#ach-table'), {
    columns, sort: { key: 'processing_date', dir: 'asc' }, empty: 'No payouts are waiting.',
    onRendered: (host) => $$('[data-paid]', host).forEach((b) => b.addEventListener('click', () => markPaid(b.dataset.paid))),
  });

  async function load() {
    const r = await callPA('payouts_pending');
    if (!r.ok) { $('#ach-table').innerHTML = `<p class="acct-sub">Could not load payouts (${esc(r.error || 'error')}).</p>`; return; }
    rows = r.rows;
    table.set(rows);
  }

  async function markPaid(id) {
    const p = rows.find((x) => x.payout_id === id);
    if (!p) return;
    if (!confirm(`Mark ${money(p.amount)} for ${p.partner_name} as paid?\n\nDo this only after the ACH has actually gone out. It cannot be undone here.`)) return;
    const ref = $(`[data-ref="${CSS.escape(id)}"]`);
    const r = await callPA('payout_mark_paid', { payout_id: id, reference: ref ? ref.value : '' });
    if (!r.ok) { notify('error', r.error === 'not_settleable' ? 'That payout was already marked paid.' : r.error === 'no_bookings_in_payout' ? 'No bookings are tied to that payout, so there is nothing to mark paid.' : 'Could not mark it paid (' + (r.error || 'error') + ').'); await load(); return; }
    notify('success', `Marked ${money(p.amount)} paid for ${p.partner_name}. It is in Payment History now.`);
    await load();
  }

  await load();
});
