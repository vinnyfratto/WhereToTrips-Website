// ───────────────────────────────────────────────────────────────────
//  wt-admin-overview.js — Partner Admin → Overview.
//  (Step 1 keeps the existing tiles; the period toggle and the new tile set
//  replace them in the summary step.)
// ───────────────────────────────────────────────────────────────────
import { boot, callAdmin, esc, money, num, partnerLink, dataTable, $ } from './wt-padmin-core.js';

function tile(label, value) {
  return `<div class="pa-tile"><p class="k">${esc(label)}</p><p class="v">${value}</p></div>`;
}

boot(async () => {
  const host = $('#pa-overview');
  host.innerHTML = '<p class="acct-sub">Loading…</p>';
  const d = await callAdmin('overview');
  if (!d.ok) { host.innerHTML = `<p class="acct-sub">Could not load the overview (${esc(d.error || 'error')}).</p>`; return; }
  const t = d.totals || {};

  host.innerHTML = `
    <div class="pa-tiles cols-4">
      ${tile('Partners', num(t.affiliates))}
      ${tile('Referred signups', num(t.referrals))}
      ${tile('Bookings', num(t.bookings))}
      ${tile('Revenue owed', money(t.commission_liability))}
    </div>
    <div class="pa-tiles cols-4">
      ${tile('Clicks', num(t.clicks))}
      ${tile('Pending', money(t.commission_pending))}
      ${tile('Approved', money(t.commission_approved))}
      ${tile('Paid', money(t.commission_paid))}
    </div>
    <h2 class="adm-section-h" style="margin-top:0;">Top performers</h2>
    <div id="pa-top"></div>`;

  const rows = (d.top_performers || []).map((p) => ({
    code: p.code, name: p.name || '', clicks: p.clicks, signups: p.referrals, bookings: p.bookings,
    revenue: (p.pending || 0) + (p.approved || 0) + (p.paid || 0),
  }));
  const table = dataTable($('#pa-top'), {
    columns: [
      { key: 'code', label: 'Code', mono: true },
      { key: 'name', label: 'Name', render: (r) => partnerLink({ partner_name: r.name }) },
      { key: 'clicks', label: 'Clicks', kind: 'num', num: true, render: (r) => num(r.clicks) },
      { key: 'signups', label: 'Signups', kind: 'num', num: true, render: (r) => num(r.signups) },
      { key: 'bookings', label: 'Bookings', kind: 'num', num: true, render: (r) => num(r.bookings) },
      { key: 'revenue', label: 'Revenue', kind: 'num', num: true, render: (r) => money(r.revenue) },
    ],
    sort: { key: 'revenue', dir: 'desc' },
    empty: 'No partners yet.',
  });
  table.set(rows);
});
