// ───────────────────────────────────────────────────────────────────
//  wt-portal-ui.js — small shared pieces for the partner portal tabs:
//  formatting, the segmented control, sortable table headers, status chips.
//  Every value that came from a third party (booking names, content titles)
//  goes through esc() before it is put in HTML.
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

/** A segmented control. `items` is [[value, label], ...]. */
export function renderSeg(el, items, current, onPick) {
  el.innerHTML = items.map(([v, l]) =>
    `<button type="button" data-v="${esc(v)}" aria-pressed="${String(v === current)}">${esc(l)}</button>`).join('');
  el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => onPick(b.dataset.v)));
}

/**
 * Sortable header cells. cols: [{k, label, right, text}]. A date or number
 * column sorts descending on its first click, a text column ascending.
 */
export function renderHead(tr, cols, state, onSort, extra = '') {
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
}

export function options(list, allLabel) {
  return [['', allLabel]].concat(list.map((o) => (Array.isArray(o) ? o : [o, o])))
    .map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
}

// Booking status chips. Colors are never the only signal: the text always says it.
export const CHIP = {
  projected: ['#E8EDF3', '#2B3644'],
  approved:  ['#FFF1D6', '#6B4200'],
  paid:      ['#BFE6D0', '#0F4D32'],
  canceled:  ['#EEF1F5', '#464B53'],
};
export const chip = (status, label) =>
  `<span class="pp-chip" style="background:${CHIP[status][0]};color:${CHIP[status][1]}">${esc(label)}</span>`;

/** Booking ID(s): the airline PNR / hotel code, plus the booking reference when they differ. */
export const refCell = (r) => esc(r.booking_ref) + (r.booking_ref_alt ? `<span class="pp-ref-alt">${esc(r.booking_ref_alt)}</span>` : '');

// Fallback preview tile, tinted by channel, until a submission stores a thumbnail.
const TILE = {
  Instagram: ['IG', '#FBE4EC', '#7A1A3E'], YouTube: ['YT', '#FDE6D8', '#7A2E0C'], TikTok: ['TT', '#E2ECF4', '#1B3550'],
  Newsletter: ['NL', '#E6F4FC', '#0F5F8F'], Blog: ['BL', '#EDE7F6', '#40306B'], Podcast: ['PC', '#FFF1D6', '#6B4200'],
  Facebook: ['FB', '#E3EAF8', '#1C3A78'],
};
export function previewTile(channel, imageUrl) {
  if (imageUrl) return `<img class="pp-tile" src="${esc(imageUrl)}" alt="${esc(channel)} preview" width="68" height="46" loading="lazy">`;
  const t = TILE[channel] || [String(channel || '?').slice(0, 2).toUpperCase(), '#EEF1F5', '#464B53'];
  return `<div class="pp-tile" role="img" aria-label="${esc(channel)} preview" style="background:${t[1]};color:${t[2]}">${esc(t[0])}</div>`;
}
