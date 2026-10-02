// ───────────────────────────────────────────────────────────────────
//  wt-partner-bookings.js — /partner-dashboard/bookings/
//  Every booking attributed to the partner. The page-level date filter and the
//  column filters combine (AND); sorting, filtering and paging are server-side
//  so the totals always cover the whole filtered set, not the visible page.
// ───────────────────────────────────────────────────────────────────
import { portal, portalGate } from './wt-partner-shared.js';
import { esc, fmtDate, money, monthLabel, renderHead, renderSeg, options, chip, refCell } from './wt-portal-ui.js';

const $ = (id) => document.getElementById(id);
const COLS = [
  { k: 'booked', label: 'Date booked' }, { k: 'start', label: 'Travel start' }, { k: 'end', label: 'Travel end' },
  { k: 'type', label: 'Type', text: true }, { k: 'name', label: 'Booking', text: true }, { k: 'ref', label: 'Booking ID', text: true },
  { k: 'amt', label: 'Est. revenue', right: true }, { k: 'status', label: 'Status', text: true },
];
const state = { sort: 'booked', dir: 'desc', from: '', to: '', month: '', type: '', status: '', page: 1 };
let optionsLoaded = false, seq = 0;

// Today in the portal's zone (Central), as YYYY-MM-DD, for the date presets.
const centralDay = (offsetDays = 0) => {
  const d = new Date(Date.now() - offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};
const PRESETS = [['all', 'All time', '', ''], ['7', 'Last 7 days', () => centralDay(7), () => centralDay(0)], ['30', 'Last 30 days', () => centralDay(30), () => centralDay(0)]];
const presetRange = (p) => [typeof p[2] === 'function' ? p[2]() : p[2], typeof p[3] === 'function' ? p[3]() : p[3]];

async function load() {
  const mine = ++seq;
  const j = await portal('bookings', { ...state });
  if (mine !== seq) return;
  if (!portalGate(j)) return;
  draw(j);
}

function reset() { state.page = 1; load(); }

function draw(j) {
  renderHead($('head'), COLS, state, reset);

  // Presets: pressed only while the From/To inputs still match one exactly.
  const current = PRESETS.find((p) => { const [f, t] = presetRange(p); return state.from === f && state.to === t; });
  renderSeg($('range'), PRESETS.map((p) => [p[0], p[1]]), current ? current[0] : null, (v) => {
    const [f, t] = presetRange(PRESETS.find((p) => p[0] === v));
    state.from = f; state.to = t; reset();
  });
  $('b-from').value = state.from;
  $('b-to').value = state.to;

  if (!optionsLoaded) {
    $('f-month').innerHTML = options(j.filter_options.months.map((m) => [m, monthLabel(m)]), 'All dates');
    $('f-type').innerHTML = options(j.filter_options.types, 'All types');
    $('f-status').innerHTML = options(j.filter_options.statuses.map((s) => [s.value, s.label]), 'All statuses');
    optionsLoaded = true;
  }
  $('f-month').value = state.month; $('f-type').value = state.type; $('f-status').value = state.status;

  const c = j.counts;
  $('count').textContent = `Showing ${c.shown} of ${c.total} bookings`;

  $('rows').innerHTML = j.rows.length
    ? j.rows.map((r) => `<tr class="${r.status === 'paid' ? 'paid' : ''}">
        <td class="pp-num nw">${esc(fmtDate(r.date_booked))}</td>
        <td class="pp-num nw">${esc(fmtDate(r.travel_start))}</td>
        <td class="pp-num nw">${esc(fmtDate(r.travel_end))}</td>
        <td>${esc(r.type)}</td>
        <td class="nm">${esc(r.name)}</td>
        <td class="nw" style="font-size:13px">${refCell(r)}</td>
        <td class="r pp-num nw">${r.partner_share_cents == null ? '—' : money(r.partner_share_cents)}</td>
        <td>${chip(r.status, r.status_label)}</td></tr>`).join('')
    : '<tr><td colspan="8" class="pp-empty-row">No bookings match these filters.</td></tr>';

  $('foot').innerHTML = `<td colspan="6">${j.totals.active_count} active bookings</td><td class="r pp-num">${money(j.totals.partner_share_cents)}</td><td></td>`;

  const pages = Math.max(1, Math.ceil(c.shown / c.page_size));
  const pager = $('pager');
  pager.hidden = pages <= 1;
  if (pages > 1) {
    pager.innerHTML = `<button type="button" class="pp-outbtn" id="prev" ${c.page <= 1 ? 'disabled' : ''}>Previous</button>
      <span>Page ${c.page} of ${pages}</span>
      <button type="button" class="pp-outbtn" id="next" ${c.page >= pages ? 'disabled' : ''}>Next</button>`;
    $('prev').addEventListener('click', () => { state.page = c.page - 1; load(); });
    $('next').addEventListener('click', () => { state.page = c.page + 1; load(); });
  }
}

// Typing a custom range un-presses the presets (they only match exact ranges).
$('b-from').addEventListener('change', (e) => { state.from = e.target.value; reset(); });
$('b-to').addEventListener('change', (e) => { state.to = e.target.value; reset(); });
$('f-month').addEventListener('change', (e) => { state.month = e.target.value; reset(); });
$('f-type').addEventListener('change', (e) => { state.type = e.target.value; reset(); });
$('f-status').addEventListener('change', (e) => { state.status = e.target.value; reset(); });
$('clear').addEventListener('click', () => {
  Object.assign(state, { from: '', to: '', month: '', type: '', status: '', page: 1 });
  load();
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
else load();
