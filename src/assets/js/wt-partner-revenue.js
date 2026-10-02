// ───────────────────────────────────────────────────────────────────
//  wt-partner-revenue.js — /partner-dashboard/revenue/
//  Three cards (Paid, Approved for Payment, Est. Future Revenue) that also
//  toggle the list below. The API always returns all three card figures so
//  they stay right whichever list is open.
// ───────────────────────────────────────────────────────────────────
import { portal, portalGate } from './wt-partner-shared.js';
import { esc, fmtDate, money, renderHead, refCell } from './wt-portal-ui.js';

const $ = (id) => document.getElementById(id);
const COLS = [
  { k: 'booked', label: 'Booking date' }, { k: 'type', label: 'Type', text: true }, { k: 'ref', label: 'Booking ID', text: true },
  { k: 'name', label: 'Booking', text: true }, { k: 'start', label: 'Travel dates' }, { k: 'amt', label: 'Est. revenue', right: true },
];
const LIST = {
  paid:     { title: 'Paid revenue', note: 'Payments we have sent you. Total earned to date is at the bottom.', total: 'Total earned to date' },
  approved: { title: 'Approved for Payment', note: 'Approved and scheduled. We process payments on the 1st and 15th of each month, once your balance reaches $50.', total: 'Total' },
  future:   { title: 'Est. Future Revenue', note: 'Booked but not yet approved. Amounts can change if a trip is changed or canceled.', total: 'Total' },
};
const state = { bucket: 'approved', sort: 'booked', dir: 'desc' };
let seq = 0;

async function load() {
  const mine = ++seq;
  const j = await portal('revenue', { ...state });
  if (mine !== seq) return;
  if (!portalGate(j)) return;
  draw(j);
}

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

function draw(j) {
  const c = j.cards;
  const cards = [
    ['paid', 'Paid', c.paid.amount_cents, 'Total earned to date', plural(c.paid.booking_count, 'booking', 'bookings') + ' paid out'],
    ['approved', 'Approved for Payment', c.approved.amount_cents, 'Next payout ' + fmtDate(c.approved.next_payout_date), plural(c.approved.booking_count, 'approved booking', 'approved bookings')],
    ['future', 'Est. Future Revenue', c.future.amount_cents, 'Not yet approved', plural(c.future.booking_count, 'booking', 'bookings') + ' on the way'],
  ];
  $('cards').innerHTML = cards.map(([k, l, a, p, s]) =>
    `<button type="button" class="pp-revcard" data-b="${k}" aria-pressed="${String(state.bucket === k)}">
       <span class="l">${esc(l)}</span><span class="a">${money(a)}</span><span class="p">${esc(p)}</span><span class="s">${esc(s)}</span></button>`).join('');
  $('cards').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { state.bucket = b.dataset.b; load(); }));

  const L = LIST[state.bucket];
  $('list-title').textContent = L.title;
  $('list-note').textContent = L.note;
  $('list-cap').textContent = L.title;
  renderHead($('head'), COLS, state, load);

  $('rows').innerHTML = j.rows.length
    ? j.rows.map((r) => `<tr>
        <td class="pp-num nw">${esc(fmtDate(r.date_booked))}</td>
        <td>${esc(r.type)}</td>
        <td class="nw" style="font-size:13px">${refCell(r)}</td>
        <td class="nm">${esc(r.name)}</td>
        <td class="pp-num nw">${esc(fmtDate(r.travel_start))} – ${esc(fmtDate(r.travel_end))}</td>
        <td class="r pp-num" style="font-weight:600">${money(r.partner_share_cents)}</td></tr>`).join('')
    : '<tr><td colspan="6" class="pp-empty-row">Nothing here yet.</td></tr>';
  $('foot').innerHTML = `<td colspan="5">${L.total}</td><td class="r pp-num">${money(j.total_cents)}</td>`;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
else load();
