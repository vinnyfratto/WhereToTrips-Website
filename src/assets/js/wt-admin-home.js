// ───────────────────────────────────────────────────────────────────
//  wt-admin-home.js — /admin-dashboard/, the jump-off hub that links to every
//  internal admin tool, with a site-wide summary strip above the cards.
//
//  The strip is for a period (the same Today / Weekly / Monthly / YTD / ALL
//  buttons and custom range as the Partner Overview, shared for the session):
//  total downloads, registered users, bookings, estimated revenue, and the
//  partners' share of it. It is site-wide, not partner-only. Everything is worked
//  out by the partner-admin function; the page signs in, asks, and shows it.
// ───────────────────────────────────────────────────────────────────
import { boot, callPA, esc, money, num, $ } from './wt-padmin-core.js';
import { periodParams, renderPeriodControl } from './wt-padmin-period.js';

const TILES = [
  ['downloads', 'Total Downloads', (s) => s.downloads === null || s.downloads === undefined ? '<span class="pa-dash" title="Analytics could not be reached">—</span>' : num(s.downloads),
    'App installs in the period, partner-referred or not (the count Site Analytics shows).'],
  ['registered', 'Total Registered Users', (s) => num(s.registered), 'Everyone who created an account in the period.'],
  ['bookings', 'Total Bookings', (s) => num(s.bookings), 'Hotel and flight bookings made in the period, any status except failed attempts.'],
  ['est_total_rev', 'Est. Total Rev', (s) => money(s.est_total_rev), 'What WhereTo earns in commission on those bookings. Nuitee pays after the fact, so this is an estimate.'],
  ['est_partner_share', 'Est. Partner Share', (s) => money(s.est_partner_share), "The partners' cut of the commission on partner-referred bookings: Pending + Approved + Paid on the Partner Overview."],
];

function paint(s) {
  $('#hs-tiles').innerHTML = TILES.map(([key, label, fmt, tip]) => `
    <div class="pa-tile"><p class="k">${esc(label)} <span class="pa-info" title="${esc(tip)}" aria-label="${esc(tip)}">i</span></p><p class="v${s ? '' : ' is-loading'}">${s ? fmt(s) : '…'}</p></div>`).join('');
}

boot(async () => {
  paint(null);
  let seq = 0;
  const period = renderPeriodControl($('#hs-period'), { onChange: () => load() });

  async function load() {
    const mine = ++seq;
    paint(null);
    const s = await callPA('home_summary', periodParams(period.state()));
    if (mine !== seq) return;                      // a newer choice is on its way
    if (!s.ok) { $('#hs-tiles').innerHTML = `<p class="acct-sub">Could not load the summary (${esc(s.error || 'error')}).</p>`; return; }
    period.setRange(s.period);
    paint(s);
  }
  await load();
});
