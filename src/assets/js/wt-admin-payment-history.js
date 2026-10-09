// ───────────────────────────────────────────────────────────────────
//  wt-admin-payment-history.js — Partner Admin → Payment History.
//  Read-only: every payment actually sent to a partner (a payout marked paid),
//  searchable by partner and filterable by date, every column sortable. The
//  total at the bottom is worked out by the server for the rows being shown.
// ───────────────────────────────────────────────────────────────────
import { boot, callPA, dataTable, debounce, esc, fmtDate, money, partnerLink, $ } from './wt-padmin-core.js';

const columns = [
  { key: 'payment_date', label: 'Payment Date', kind: 'date', nowrap: true, render: (r) => fmtDate(r.payment_date) },
  { key: 'partner_name', label: 'Partner Name', render: (r) => partnerLink(r) },
  { key: 'partner_id', label: 'Partner ID', mono: true, nowrap: true, kind: 'num', value: (r) => (r.partner_id ? Number(r.partner_id.slice(2)) : null), render: (r) => r.partner_id ? esc(r.partner_id) : '<span class="pa-dash">—</span>' },
  { key: 'amount', label: 'Payment Amount', kind: 'num', num: true, render: (r) => money(r.amount) },
];

boot(async () => {
  const table = dataTable($('#ph-table'), { columns, sort: { key: 'payment_date', dir: 'desc' } });
  const count = $('#ph-count');
  let seq = 0;

  async function load() {
    const mine = ++seq;
    const r = await callPA('payments_list', { q: $('#ph-q').value, from: $('#ph-from').value, to: $('#ph-to').value });
    if (mine !== seq) return;
    if (!r.ok) { count.textContent = ''; $('#ph-table').innerHTML = `<p class="acct-sub">Could not load payments (${esc(r.error || 'error')}).</p>`; return; }
    table.set(r.rows, r.rows.length ? `<tr><td>Total</td><td></td><td></td><td class="num">${money(r.total)}</td></tr>` : '');
    count.textContent = `${r.count} payment${r.count === 1 ? '' : 's'}`;
  }

  $('#ph-q').addEventListener('input', debounce(load, 200));
  $('#ph-from').addEventListener('change', load);
  $('#ph-to').addEventListener('change', load);
  await load();
});
