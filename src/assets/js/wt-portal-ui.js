// ───────────────────────────────────────────────────────────────────
//  wt-portal-ui.js — small shared pieces for the partner portal tabs:
//  formatting, the segmented control, sortable table headers, status chips,
//  the pager. Every value that came from a third party (booking names, content
//  titles) goes through esc() before it is put in HTML.
// ───────────────────────────────────────────────────────────────────

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09-28" -> "Sep 28, 2026". Parsed by hand: a Date would shift the day by zone. */
export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return MONTHS[m - 1] + ' ' + d + ', ' + y;
}
export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return MONTHS[m - 1] + ' ' + y;
}
/** Integer cents -> "$1,234.56". */
export function money(cents) {
  const n = Math.round(Number(cents) || 0);
  const abs = Math.abs(n);
  const s = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + String(abs % 100).padStart(2, '0');
  return (n < 0 ? '-$' : '$') + s;
}
export const int = (n) => Number(n || 0).toLocaleString('en-US');

/** "3 travelers", "1 traveler". The number is part of the phrase. */
export const plural = (n, one, many) => int(n) + ' ' + (Number(n) === 1 ? one : many);

/** Basis points -> "25%" (2250 -> "22.5%"). */
export const bpsPct = (bps) => (Math.round(Number(bps) || 0) / 100) + '%';

/** Whole days from one YYYY-MM-DD date to another (the zone cannot shift it). */
export function daysBetween(fromIso, toIso) {
  const day = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
  return Math.round(day(toIso) - day(fromIso));
}

/**
 * A segmented control. `items` is [[value, label], ...]. When the control is
 * redrawn while one of its buttons has focus (a keyboard user just pressed it),
 * focus goes back to the same button, not to the top of the page.
 */
export function renderSeg(el, items, current, onPick) {
  const had = el.contains(document.activeElement) ? document.activeElement.dataset.v : null;
  el.innerHTML = items.map(([v, l]) =>
    `<button type="button" data-v="${esc(v)}" aria-pressed="${String(v === current)}">${esc(l)}</button>`).join('');
  el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => onPick(b.dataset.v)));
  if (had != null) {
    const back = Array.from(el.querySelectorAll('button')).find((b) => b.dataset.v === had);
    if (back) back.focus({ preventScroll: true });
  }
}

/**
 * Sortable header cells. cols: [{k, label, right, text}]. A date or number
 * column sorts descending on its first click, a text column ascending. A sort
 * button that had focus gets it back after the table is drawn again.
 */
export function renderHead(tr, cols, state, onSort, extra = '') {
  const had = tr.contains(document.activeElement) ? document.activeElement.dataset.k : null;
  tr.innerHTML = cols.map((c) => {
    const active = state.sort === c.k;
    const aria = active ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none';
    const arrow = active ? (state.dir === 'asc' ? '↑' : '↓') : '↕';
    return `<th scope="col" class="${c.right ? 'r' : ''}" aria-sort="${aria}"><button type="button" class="pp-thbtn" data-k="${esc(c.k)}">${esc(c.label)}<span aria-hidden="true">${arrow}</span></button></th>`;
  }).join('') + extra;
  tr.querySelectorAll('.pp-thbtn').forEach((b) => b.addEventListener('click', () => {
    const c = cols.find((x) => x.k === b.dataset.k);
    const active = state.sort === c.k;
    state.dir = active ? (state.dir === 'asc' ? 'desc' : 'asc') : (c.text ? 'asc' : 'desc');
    state.sort = c.k;
    onSort();
  }));
  if (had) {
    const back = Array.from(tr.querySelectorAll('.pp-thbtn')).find((b) => b.dataset.k === had);
    if (back) back.focus({ preventScroll: true });
  }
}

export function options(list, allLabel) {
  return [['', allLabel]].concat(list.map((o) => (Array.isArray(o) ? o : [o, o])))
    .map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
}

/**
 * Previous / Next under a table. `c` is the response's counts block
 * ({shown, page, page_size}); `go(page)` loads that page. Hidden when there is
 * only one page. Focus stays on the button just pressed (or moves to the other
 * one when that button has just become disabled on the first or last page).
 */
export function drawPager(el, c, go) {
  const pages = Math.max(1, Math.ceil(c.shown / c.page_size));
  const had = el.contains(document.activeElement) ? document.activeElement.dataset.dir : null;
  el.hidden = pages <= 1;
  if (pages <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = `<button type="button" class="pp-outbtn" data-dir="prev" ${c.page <= 1 ? 'disabled' : ''}>Previous</button>
      <span>Page ${c.page} of ${pages}</span>
      <button type="button" class="pp-outbtn" data-dir="next" ${c.page >= pages ? 'disabled' : ''}>Next</button>`;
  el.querySelector('[data-dir="prev"]').addEventListener('click', () => go(c.page - 1));
  el.querySelector('[data-dir="next"]').addEventListener('click', () => go(c.page + 1));
  if (had) {
    const same = el.querySelector(`[data-dir="${had}"]`);
    const back = same && !same.disabled ? same : el.querySelector('button:not([disabled])');
    if (back) back.focus({ preventScroll: true });
  }
}

// Status tags. The colors live in partner-portal.css (one set of tokens); the
// text always says the state, so color is never the only signal.
//   neutral  gray-blue   projected
//   warn     pale amber  pending payment, paused, changes requested
//   ok       green       paid, ongoing, approved
//   info     pale blue   in guarantee, submitted, in review
//   quiet    pale gray   canceled, not eligible, draft, withdrawn
//   bad      pale red    declined
export const tag = (tone, label) => `<span class="pp-chip pp-chip--${esc(tone)}">${esc(label)}</span>`;

// Booking status -> tag tone.
const BOOKING_TONE = { projected: 'neutral', approved: 'warn', paid: 'ok', canceled: 'quiet', not_eligible: 'quiet' };
export const chip = (status, label) => tag(BOOKING_TONE[status] || 'quiet', label);

/** Booking ID(s): the airline PNR / hotel code, plus the booking reference when they differ. */
export const refCell = (r) => esc(r.booking_ref) + (r.booking_ref_alt ? `<span class="pp-ref-alt">${esc(r.booking_ref_alt)}</span>` : '');

// Fallback preview tile, tinted by channel, until a submission stores a thumbnail.
// The two-letter code is here; the tints are in partner-portal.css (.pp-tile--ig ...).
const TILE = { Instagram: 'ig', YouTube: 'yt', TikTok: 'tt', Newsletter: 'nl', Blog: 'bl', Podcast: 'pc', Facebook: 'fb' };
export function previewTile(channel, imageUrl) {
  if (imageUrl) return `<img class="pp-tile" src="${esc(imageUrl)}" alt="${esc(channel)} preview" width="68" height="46" loading="lazy">`;
  const key = TILE[channel];
  const code = key ? key.toUpperCase() : String(channel || '?').slice(0, 2).toUpperCase();
  return `<div class="pp-tile pp-tile--${key || 'other'}" role="img" aria-label="${esc(channel)} preview">${esc(code)}</div>`;
}
