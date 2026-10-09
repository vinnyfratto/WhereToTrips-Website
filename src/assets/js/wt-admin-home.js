// ───────────────────────────────────────────────────────────────────
//  wt-admin-home.js — /admin-dashboard/, the jump-off hub that links to every
//  internal admin tool, with a site-wide summary strip above the cards.
//
//  The strip is for a period (the same Today / Weekly / Monthly / YTD / ALL
//  buttons and custom range as the Partner Overview, shared for the session):
//  total downloads, registered users, bookings, estimated revenue, and the
//  partners' share of it. It is site-wide, not partner-only. By default it counts
//  live activity only; the Include test data switch brings back the rest. Under it,
//  Data settings holds the launch days and the accounts to leave out. Everything
//  is worked out by the partner-admin function; the page signs in, asks, and
//  shows it.
// ───────────────────────────────────────────────────────────────────
import { boot, callPA, esc, money, num, $ } from './wt-padmin-core.js';
import { periodParams, renderPeriodControl } from './wt-padmin-period.js';
import { renderDataSettings } from './wt-admin-data-settings.js';

const dash = (why) => `<span class="pa-dash" title="${esc(why)}">—</span>`;

/** "Android 12 · iOS not launched": where the downloads came from. */
function platformLine(s) {
  const by = s.downloads_by_platform || {};
  const part = (label, count, day) => (s.live && !day ? `${label} not launched` : `${label} ${count === null || count === undefined ? '—' : num(count)}`);
  return `${part('Android', by.android, s.launch && s.launch.android)} · ${part('iOS', by.ios, s.launch && s.launch.ios)}`;
}

const TILES = [
  {
    key: 'downloads', label: 'Total Downloads',
    value: (s) => (s.downloads === null || s.downloads === undefined ? dash('Analytics could not be reached') : num(s.downloads)),
    sub: (s) => (s.downloads === null || s.downloads === undefined ? '' : platformLine(s)),
    tip: (s) => {
      const base = s.live
        ? 'First opens of the store app on each store, counted from that store\'s launch day. Development builds are left out; phones running the store version for testing are included.'
        : 'Every first open of the app that analytics has recorded, partner-referred or not, including before launch.';
      const rec = s.downloads_recorded;
      return rec && rec.total > 0 ? `${base} The app's own install record, which leaves out test accounts, has ${num(rec.total)}.` : base;
    },
  },
  {
    key: 'registered', label: 'Total Registered Users',
    value: (s) => num(s.registered),
    tip: (s) => (s.live ? 'Accounts created in the period by real people. Test accounts are left out.' : 'Everyone who created an account in the period, test accounts included.'),
  },
  {
    key: 'bookings', label: 'Total Bookings',
    value: (s) => num(s.bookings),
    tip: (s) => (s.live ? 'Live hotel and flight bookings made in the period, any status except failed attempts. Sandbox and demo bookings are left out.' : 'Hotel and flight bookings made in the period, any status except failed attempts, sandbox and demo included.'),
  },
  {
    key: 'est_total_rev', label: 'Est. Total Rev',
    value: (s) => money(s.est_total_rev),
    tip: () => 'What WhereTo earns in commission on those bookings. Nuitee pays after the fact, so this is an estimate.',
  },
  {
    key: 'est_partner_share', label: 'Est. Partner Share',
    value: (s) => money(s.est_partner_share),
    tip: () => "The partners' cut of the commission on partner-referred bookings: Pending + Approved + Paid on the Partner Overview.",
  },
];

function paint(s) {
  $('#hs-tiles').innerHTML = TILES.map((t) => {
    const tip = s ? t.tip(s) : '';
    const sub = s && t.sub ? t.sub(s) : '';
    return `
    <div class="pa-tile"><p class="k">${esc(t.label)} ${tip ? `<span class="pa-info" title="${esc(tip)}" aria-label="${esc(tip)}">i</span>` : ''}</p><p class="v${s ? '' : ' is-loading'}">${s ? t.value(s) : '…'}</p>${sub ? `<p class="s">${esc(sub)}</p>` : ''}</div>`;
  }).join('');
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
    period.setRange(s.period, s);
    paint(s);
  }
  await Promise.all([load(), renderDataSettings($('#hs-settings'), { onSaved: load })]);
});
