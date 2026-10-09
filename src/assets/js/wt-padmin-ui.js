// ───────────────────────────────────────────────────────────────────
//  wt-padmin-ui.js — the pure pieces the Partner Admin pages share: formatters,
//  ordering and the sortable table. No server calls and no sign-in client in
//  here, so any page (including the older multi-tab one) can import it without
//  starting a second session. The server calls live in wt-padmin-core.js.
//
//  No money is moved or computed here. Every figure arrives already worked
//  out by the server; this file only formats and orders it.
// ───────────────────────────────────────────────────────────────────
export const TZ = 'America/Chicago';
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// ── Formatters ──────────────────────────────────────────────────────
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** "$1,234.56". Takes dollars as a number or a numeric string. Empty stays a dash. */
export function money(v, currency = 'USD') {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n); }
  catch { return '$' + n.toFixed(2); }
}

/** A count with thousands separators. */
export function num(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

/** A percent with one decimal ("12.5%"), or a dash when there is nothing to divide by. */
export function pct(v) {
  if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return '—';
  return Number(v).toFixed(1) + '%';
}

/** "Sep 28, 2026" in Central time. A bare date ("2026-09-28") is shown as written, never shifted. */
export function fmtDate(s) {
  if (!s) return '—';
  const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  const d = bare ? new Date(Date.UTC(+bare[1], +bare[2] - 1, +bare[3], 12)) : new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: bare ? 'UTC' : TZ });
}

/** "Sep 28, 2026, 3:05 PM" in Central time. */
export function fmtDateTime(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TZ });
}

export const titleize = (s) => String(s ?? '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function debounce(fn, ms = 200) {
  let t = null;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** A message at the top of the page (the #adm-msg alert every admin page has). */
export function notify(type, text) {
  const m = $('#adm-msg');
  if (!m) return;
  m.className = 'alert show alert-' + type;
  m.textContent = text;
  setTimeout(() => { if (m.textContent === text) m.className = 'alert'; }, 6000);
}

// ── Sorting ─────────────────────────────────────────────────────────
const isEmpty = (v) => v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v));

function sortValue(v, kind) {
  if (isEmpty(v)) return null;
  if (kind === 'num') { const n = Number(v); return Number.isFinite(n) ? n : null; }
  if (kind === 'date') {
    const t = /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? Date.parse(v + 'T12:00:00Z') : Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return String(v).toLowerCase();
}

/**
 * Order rows by one column. Dates sort by time, money and counts by value, text
 * without regard to case. Empty values go LAST in both directions.
 * `col`: { key, kind: 'text' | 'num' | 'date', value?: (row) => any }
 */
export function sortRows(rows, col, dir) {
  const m = dir === 'desc' ? -1 : 1;
  const get = col.value || ((r) => r[col.key]);
  return rows.map((r, i) => ({ r, i, v: sortValue(get(r), col.kind) })).sort((a, b) => {
    if (a.v === null && b.v === null) return a.i - b.i;
    if (a.v === null) return 1;
    if (b.v === null) return -1;
    let c;
    if (typeof a.v === 'string') c = a.v.localeCompare(b.v, 'en', { numeric: true, sensitivity: 'base' });
    else c = a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
    return c !== 0 ? c * m : a.i - b.i;
  }).map((x) => x.r);
}

/**
 * A sortable table.
 *   columns: [{ key, label, kind?, num?, mono?, nowrap?, sortable?, value?, render?(row), title? }]
 *     - kind: how the column sorts ('text' by default); sortable:false for links and buttons
 *     - render(row): the cell's HTML (escape what you put in it); defaults to the escaped value
 *   opts.sort: { key, dir } the starting order
 *   opts.empty: text for no rows
 *   opts.rowAttrs(row): extra attributes for a row's <tr>
 *   opts.onRendered(host): runs after every draw, to wire buttons inside cells
 *   returns { set(rows, footerHtml?), rows(), sort }
 */
export function dataTable(host, { columns, sort = null, empty = 'No results. Try a different name or date range.', rowAttrs = null, onRendered = null }) {
  let current = [];
  let footer = '';
  const state = { key: sort ? sort.key : null, dir: sort ? sort.dir : 'asc' };

  function draw() {
    const col = columns.find((c) => c.key === state.key);
    const rows = col && col.sortable !== false ? sortRows(current, col, state.dir) : current;
    const head = columns.map((c) => {
      const sortable = c.sortable !== false;
      const on = sortable && state.key === c.key;
      const arrow = on ? (state.dir === 'asc' ? '▲' : '▼') : (sortable ? '↕' : '');
      return `<th class="${c.num ? 'num ' : ''}${sortable ? 'is-sortable' : ''}${on ? ' is-sorted' : ''}"${sortable ? ` data-sort="${esc(c.key)}" tabindex="0" role="button" aria-sort="${on ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"` : ''}${c.title ? ` title="${esc(c.title)}"` : ''}>${esc(c.label)}${sortable ? `<span class="arr" aria-hidden="true">${arrow}</span>` : ''}</th>`;
    }).join('');
    const body = rows.length
      ? rows.map((r) => `<tr${rowAttrs ? ' ' + rowAttrs(r) : ''}>${columns.map((c) => {
          const cell = c.render ? c.render(r) : esc(isEmpty(r[c.key]) ? '—' : r[c.key]);
          return `<td class="${c.num ? 'num ' : ''}${c.mono ? 'mono ' : ''}${c.nowrap ? 'nowrap' : ''}">${cell}</td>`;
        }).join('')}</tr>`).join('')
      : `<tr><td class="is-empty" colspan="${columns.length}">${esc(empty)}</td></tr>`;
    host.innerHTML = `<div class="pa-table-wrap"><table class="pa-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${footer ? `<tfoot>${footer}</tfoot>` : ''}</table></div>`;

    host.querySelectorAll('th[data-sort]').forEach((th) => {
      const flip = () => {
        const k = th.dataset.sort;
        if (state.key === k) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
        else { state.key = k; state.dir = 'asc'; }
        draw();
      };
      th.addEventListener('click', flip);
      th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    });
    if (onRendered) onRendered(host);
  }

  return {
    set(rows, footerHtml = '') { current = rows || []; footer = footerHtml; draw(); },
    rows: () => current,
    sort: state,
  };
}

/** A pill: status label with a tone class ('pending' | 'approved' | 'rejected' | 'changes' | 'muted' …). */
export const pill = (label, tone = '') => `<span class="pa-pill${tone ? ' is-' + tone : ''}">${esc(label)}</span>`;

/** A link to a partner's dashboard, or plain text when there is no partner record behind the name. */
export function partnerLink(row, labelKey = 'partner_name', idKey = 'partner_id') {
  const label = row[labelKey] || '—';
  const id = row[idKey];
  return id ? `<a class="pa-link" href="/admin-partner/?id=${encodeURIComponent(id)}">${esc(label)}</a>` : esc(label);
}
