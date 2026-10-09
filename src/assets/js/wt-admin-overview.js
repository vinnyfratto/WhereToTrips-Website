// ───────────────────────────────────────────────────────────────────
//  wt-admin-overview.js — Partner Admin → Overview.
//
//  Partner-only figures for a period: how many partners were active, their
//  downloads, registrations and bookings, and where the money stands. Every money
//  tile is by BOOKING date, so for any period
//      Est. Partner Share = Pending + Approved + Paid
//  exactly: one set of bookings, split by where each stands. "Paid" is the share
//  on those bookings that has been paid to date.
//
//  The period buttons and custom range are shared with the admin home. Tiles and
//  the Top performers table come from partner-admin; this page shows them.
//  Add ?legacy=1 to the address to see the earlier tiles (clicks, app sign-ins,
//  searches, revenue owed) underneath. The queries behind them were kept.
// ───────────────────────────────────────────────────────────────────
import { boot, callAdmin, callPA, dataTable, esc, money, num, partnerLink, $ } from './wt-padmin-core.js';
import { periodParams, renderPeriodControl } from './wt-padmin-period.js';

const tile = (label, value, tip) => `<div class="pa-tile"><p class="k">${esc(label)}${tip ? ` <span class="pa-info" title="${esc(tip)}" aria-label="${esc(tip)}">i</span>` : ''}</p><p class="v">${value}</p></div>`;

function renderTiles(s) {
  $('#ov-volume').innerHTML = [
    tile('Partners', num(s.partners), 'Partners active in the period: a download, a registration, a booking or a payment. For ALL, every partner.'),
    tile('Downloads', num(s.downloads), 'App downloads attributed to a partner.'),
    tile('Registered', num(s.registered), 'People who registered after arriving through a partner.'),
    tile('Bookings', num(s.bookings), 'Bookings made through a partner in the period, not counting canceled ones.'),
  ].join('');
  $('#ov-money').innerHTML = [
    tile('Est. Total Rev', money(s.est_total_rev), "What WhereTo earns in commission on those bookings (an estimate: Nuitee pays after the fact)."),
    tile('Est. Partner Share', money(s.est_partner_share), "The partners' cut of that commission. Equals Pending + Approved + Paid."),
    tile('Pending Partner Rev', money(s.pending_partner_rev), 'Share on these bookings that is not yet approved for payment.'),
    tile('Approved for Payment', money(s.approved_for_payment), 'Allocated from a Nuitee payment, past the 14-day hold, and not yet paid out.'),
    tile('Paid Partner Payments', money(s.paid_partner_payments), 'Share on these bookings that has been paid to date (including payments sent after the period).'),
  ].join('');
}

boot(async () => {
  const root = $('#pa-overview');
  root.innerHTML = `
    <div id="ov-period"></div>
    <div class="pa-tiles cols-4" id="ov-volume"></div>
    <div class="pa-tiles cols-5" id="ov-money"></div>
    <h2 class="adm-section-h" style="margin-top:6px;">Top performers</h2>
    <div id="pa-top"></div>
    <div id="ov-legacy"></div>`;

  const table = dataTable($('#pa-top'), {
    columns: [
      { key: 'code', label: 'Code', mono: true },
      { key: 'partner_name', label: 'Name', render: (r) => partnerLink(r) },
      { key: 'clicks', label: 'Clicks', kind: 'num', num: true, render: (r) => num(r.clicks) },
      { key: 'signups', label: 'Signups', kind: 'num', num: true, render: (r) => num(r.signups) },
      { key: 'bookings', label: 'Bookings', kind: 'num', num: true, render: (r) => num(r.bookings) },
      { key: 'revenue', label: 'Revenue', kind: 'num', num: true, render: (r) => money(r.revenue) },
    ],
    // The server's order is the ranking (most signups, then most bookings); a header click re-sorts.
    sort: null,
    empty: 'No partners yet.',
  });

  let seq = 0;
  const period = renderPeriodControl($('#ov-period'), { onChange: () => load() });

  async function load() {
    const mine = ++seq;
    const params = periodParams(period.state());
    const [s, top] = await Promise.all([callPA('overview_summary', params), callPA('top_performers', { ...params, limit: 5 })]);
    if (mine !== seq) return;
    if (!s.ok) { $('#ov-volume').innerHTML = `<p class="acct-sub">Could not load the overview (${esc(s.error || 'error')}).</p>`; $('#ov-money').innerHTML = ''; return; }
    period.setRange(s.period);
    renderTiles(s);
    if (top.ok) table.set(top.rows);
  }

  await load();

  if (new URLSearchParams(location.search).get('legacy') === '1') {
    const d = await callAdmin('overview');
    if (d.ok) {
      const t = d.totals || {};
      $('#ov-legacy').innerHTML = `
        <h2 class="adm-section-h">Earlier figures (all time)</h2>
        <div class="pa-tiles cols-4">
          ${tile('Referred signups', num(t.referrals))}${tile('Clicks', num(t.clicks))}
          ${tile('App sign-ins', num(t.app_signins))}${tile('Searches', num(t.searches))}
          ${tile('Revenue owed', money(t.commission_liability))}
        </div>`;
    }
  }
});
