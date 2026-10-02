// ───────────────────────────────────────────────────────────────────
//  wt-partner-summary.js — /partner-dashboard/ (Summary tab).
//  Numbers come from the partner-portal edge fn, which resolves the partner
//  from the session. Period boundaries are computed server-side in Central.
// ───────────────────────────────────────────────────────────────────
import { portal, portalGate } from './wt-partner-shared.js';
import { esc, int, money, fmtDate, renderSeg } from './wt-portal-ui.js';

const $ = (id) => document.getElementById(id);
const PERIODS = [['ytd', 'Year to date'], ['mtd', 'Month to date'], ['7d', 'Last 7 days'], ['24h', 'Last 24 hours']];
let period = 'ytd';
let seq = 0;

async function load() {
  const mine = ++seq;
  const j = await portal('summary', { period });
  if (mine !== seq) return;                       // a newer period was picked meanwhile
  if (!portalGate(j)) return;
  draw(j);
}

function draw(j) {
  renderSeg($('period'), PERIODS, period, (p) => { period = p; load(); });

  const m = j.metrics;
  const kpis = [
    ['Clicks', int(m.clicks), 'Link visits'],
    ['App Downloads', int(m.downloads), 'Installs from your links'],
    ['New Accounts', int(m.new_accounts), 'Accounts created'],
    ['Bookings', int(m.bookings), 'Airfare and hotel'],
    ['Total Est. Revenue', money(m.total_est_revenue_cents), 'Before payout'],
  ];
  $('kpis').innerHTML = kpis.map(([l, v, s]) =>
    `<div class="pp-card pp-kpi"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div><div class="s">${esc(s)}</div></div>`).join('');

  $('top-list').innerHTML = j.top_content.length
    ? j.top_content.map((t, i) => `<li><span class="rank">${i + 1}</span>
        <div class="main"><b>${esc(t.name)}</b><span>${esc(t.channel)}</span></div>
        <div class="cnt"><b>${int(t.new_accounts)}</b><span>new accounts</span></div></li>`).join('')
    : '<li class="pp-empty" style="border:0;display:block">Your top content shows here once your first piece brings in new accounts.</li>';

  const n = j.next_payout;
  $('pay-amt').textContent = money(n.below_threshold ? n.balance_cents : n.amount_cents);
  const pill = $('pay-pill'), note = $('pay-n');
  if (n.below_threshold) {
    pill.textContent = 'Rolls to the next payout';
    note.textContent = n.booking_count + (n.booking_count === 1 ? ' approved booking is' : ' approved bookings are') + ' waiting for your balance to reach $50.';
  } else if (n.booking_count === 0) {
    pill.textContent = 'Nothing scheduled yet';
    note.textContent = 'No approved bookings are waiting.';
  } else {
    pill.textContent = 'Arrives ' + fmtDate(n.date);
    note.textContent = n.booking_count + (n.booking_count === 1 ? ' approved booking is' : ' approved bookings are') + ' in this payout.';
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
else load();
