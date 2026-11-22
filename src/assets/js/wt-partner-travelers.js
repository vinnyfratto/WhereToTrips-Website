// ───────────────────────────────────────────────────────────────────
//  wt-partner-travelers.js — /partner-dashboard/travelers/
//  Every traveler the partner brought in, with the date their guarantee ends.
//  Sorting, filtering and paging happen on the server (25 a page); the four
//  cards and `counts.total` always cover every traveler, not the visible page.
//  No names, emails or phone numbers are ever sent: only a masked ID.
// ───────────────────────────────────────────────────────────────────
import { portal, portalGate } from './wt-partner-shared.js';
import { esc, int, money, fmtDate, plural, renderHead, drawPager } from './wt-portal-ui.js';
import { loadStatus } from './wt-partner-status.js';

const $ = (id) => document.getElementById(id);
const COLS = [
  { k: 'reg', label: 'Registered' },
  { k: 'id', label: 'Traveler', text: true },
  { k: 'end', label: 'Guarantee ends' },
  { k: 'trips', label: 'Trips completed', right: true },
  { k: 'earn', label: 'Est. earnings', right: true },
];
const state = { sort: 'reg', dir: 'desc', page: 1 };
let seq = 0, founding = false, last = null;

async function load() {
  const mine = ++seq;
  const j = await portal('travelers', { ...state });
  if (mine !== seq) return;
  if (!portalGate(j)) return;
  last = j;
  draw(j);
}
function reset() { state.page = 1; load(); }

// "Ends today", "1 day left", "12 days left", "6 months left" (past 120 days).
function endNote(r) {
  const d = r.days_to_guarantee_end;
  if (d == null) return 'Guarantee ended';
  if (d > 120) return `${Math.round(d / 30.4)} months left`;
  return d === 0 ? 'Ends today' : `${plural(d, 'day', 'days')} left`;
}

// Plain words first: who these people are and what they earn you. The
// guarantee is the reassurance, not the headline.
function drawIntro(gm) {
  $('intro').textContent = 'Everyone who created a WhereTo account from one of your links. You earn revenue share on their trips. '
    + `For the first ${gm} months after each one signs up, that is guaranteed`
    + (founding ? ' as part of being a Founding Partner' : '')
    + ', so there is nothing to keep an eye on until then.';
}

function draw(j) {
  const gm = j.guarantee_months;
  drawIntro(gm);

  const c = j.cards;
  const inDays = c.next_guarantee_in_days;
  const cards = [
    ['Registered travelers', int(c.total), 'Verified accounts from your links'],
    ['Inside guarantee', int(c.in_guarantee), `${gm}-month guarantee each`],
    ['Past guarantee', int(c.past_guarantee), c.past_guarantee ? 'Earning while you stay active' : 'None yet'],
    ['Next guarantee ends', c.next_guarantee_ends_on ? fmtDate(c.next_guarantee_ends_on) : '—',
      c.next_guarantee_ends_on ? (inDays === 0 ? 'Today' : 'In ' + plural(inDays, 'day', 'days')) : 'No travelers inside a guarantee'],
  ];
  $('cards').innerHTML = cards.map(([l, v, s]) =>
    `<div class="pp-card pp-kpi"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div><div class="s">${esc(s)}</div></div>`).join('');

  // A partner with no travelers yet gets a plain note instead of an empty table.
  const noneAtAll = j.counts.total === 0;
  $('none').hidden = !noneAtAll;
  $('list').hidden = noneAtAll;
  $('count').textContent = noneAtAll ? '' : `Showing ${j.counts.shown} of ${j.counts.total} travelers`;
  if (noneAtAll) { $('pager').hidden = true; return; }

  renderHead($('head'), COLS, state, reset);

  $('rows').innerHTML = j.rows.length
    ? j.rows.map((r) => `<tr>
        <td class="pp-num nw">${esc(fmtDate(r.registered_on))}</td>
        <td class="nw pp-strong">${esc(r.traveler_ref_masked)}</td>
        <td class="nw"><div class="pp-num pp-strong">${esc(fmtDate(r.guarantee_ends_on))}</div><div class="pp-sub">${esc(endNote(r))}</div></td>
        <td class="r pp-num">${int(r.trips_completed)}</td>
        <td class="r pp-num pp-strong nw">${money(r.est_earnings_cents)}</td></tr>`).join('')
    : '<tr><td colspan="5" class="pp-empty-row">No travelers on this page.</td></tr>';

  drawPager($('pager'), j.counts, (p) => { state.page = p; load(); });
}

// The Founding Partner note in the intro comes from the same status the strip uses (one call, shared).
// It must not hold up the table, so it is added when it arrives.
loadStatus().then((status) => {
  founding = !!(status && status.tier && status.tier.is_founding);
  if (last) drawIntro(last.guarantee_months);
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
else load();
