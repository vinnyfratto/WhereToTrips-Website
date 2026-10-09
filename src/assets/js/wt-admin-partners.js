// ───────────────────────────────────────────────────────────────────
//  wt-admin-partners.js — Partner Admin → Partner Details.
//  One line per partner, searchable, every column sortable. The numbers come
//  from the partner-admin function (partners_list); this only shows and orders
//  them.
// ───────────────────────────────────────────────────────────────────
import { boot, callPA, dataTable, debounce, esc, fmtDate, money, num, partnerLink, pct, $ } from './wt-padmin-core.js';

const columns = [
  { key: 'partner_name', label: 'Partner Name', render: (r) => partnerLink({ partner_name: r.partner_name, partner_id: r.partner_id }) },
  { key: 'partner_id', label: 'Partner ID', mono: true, nowrap: true, kind: 'num', value: (r) => r.partner_number, render: (r) => esc(r.partner_id) },
  { key: 'date_reg', label: 'Date Reg', kind: 'date', nowrap: true, render: (r) => fmtDate(r.date_reg) },
  { key: 'downloads', label: 'Downloads', kind: 'num', num: true, render: (r) => num(r.downloads) },
  { key: 'reg_users', label: 'Reg. Users', kind: 'num', num: true, render: (r) => num(r.reg_users) },
  { key: 'pct_registered', label: '% Registered', kind: 'num', num: true, render: (r) => r.pct_registered === null ? '<span class="pa-dash">—</span>' : pct(r.pct_registered) },
  { key: 'bookings', label: 'Bookings', kind: 'num', num: true, render: (r) => num(r.bookings) },
  { key: 'completed', label: 'Completed Bookings', kind: 'num', num: true, render: (r) => num(r.completed) },
  { key: 'pending', label: 'Pending Bookings', kind: 'num', num: true, render: (r) => num(r.pending) },
  { key: 'rev_earned', label: 'Rev Earned', kind: 'num', num: true, render: (r) => money(r.rev_earned) },
  { key: 'rev_pending', label: 'Rev Pending', kind: 'num', num: true, render: (r) => money(r.rev_pending) },
];

boot(async () => {
  const table = dataTable($('#pa-table'), { columns, sort: { key: 'partner_name', dir: 'asc' } });
  const count = $('#pa-count');
  let seq = 0;

  async function load() {
    const mine = ++seq;
    const r = await callPA('partners_list', { q: $('#pa-q').value });
    if (mine !== seq) return;                       // an older answer arrived late
    if (!r.ok) { count.textContent = ''; $('#pa-table').innerHTML = `<p class="acct-sub">Could not load partners (${esc(r.error || 'error')}).</p>`; return; }
    table.set(r.partners);
    count.textContent = `${r.count} partner${r.count === 1 ? '' : 's'}`;
  }

  $('#pa-q').addEventListener('input', debounce(load, 200));
  await load();
});
