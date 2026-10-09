// ───────────────────────────────────────────────────────────────────
//  wt-padmin-period.js — the period buttons and custom date range shared by the
//  admin home strip and the Partner Overview.
//
//  Buttons: Today, Weekly, Monthly, YTD, ALL. Monthly is the default. Exactly one
//  is active at a time. To their right, From and To dates:
//    - choosing a button clears any custom dates
//    - entering a From or To switches to a custom range: no button is active and
//      a Clear button appears; Clear goes back to Monthly
//    - an empty end of a custom range, and a From after a To, are settled by the
//      server (January 1 and today; the two swapped)
//  The choice is shared between the two pages for the session (sessionStorage)
//  and shows in the address (?period=ytd or ?from=2026-10-01&to=2026-10-07), so a
//  page can be sent as it is. It is never stored on the server. The boundaries
//  themselves are worked out by the server, in Central time.
// ───────────────────────────────────────────────────────────────────
import { esc, fmtDate } from './wt-padmin-ui.js';

export const PRESETS = [['today', 'Today'], ['week', 'Weekly'], ['month', 'Monthly'], ['ytd', 'YTD'], ['all', 'ALL']];
const STORE = 'wt_padmin_period';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function fromAddress() {
  const q = new URLSearchParams(location.search);
  const from = DAY.test(q.get('from') || '') ? q.get('from') : '';
  const to = DAY.test(q.get('to') || '') ? q.get('to') : '';
  const period = PRESETS.some(([k]) => k === q.get('period')) ? q.get('period') : '';
  return (from || to) ? { period: '', from, to } : (period ? { period, from: '', to: '' } : null);
}

function fromSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORE) || 'null');
    if (!s) return null;
    return { period: PRESETS.some(([k]) => k === s.period) ? s.period : '', from: DAY.test(s.from || '') ? s.from : '', to: DAY.test(s.to || '') ? s.to : '' };
  } catch (_e) { return null; }
}

/** What to ask the server for, from a state. */
export function periodParams(st) {
  return (st.from || st.to) ? { from: st.from || undefined, to: st.to || undefined } : { period: st.period || 'month' };
}

/**
 * Draw the control into `host`. onChange(state) runs after every change (and is
 * NOT called for the first draw: the page loads once itself with state()).
 * Returns { state(), setRange(period) } where setRange shows the days the server
 * settled on, e.g. "Oct 1 to Oct 8, 2026".
 */
export function renderPeriodControl(host, { onChange }) {
  let st = fromAddress() || fromSession() || { period: 'month', from: '', to: '' };
  if (!st.period && !st.from && !st.to) st.period = 'month';

  host.innerHTML = `
    <div class="pa-controls">
      <div class="pa-seg" role="group" aria-label="Period">
        ${PRESETS.map(([k, label]) => `<button type="button" data-period="${k}">${esc(label)}</button>`).join('')}
      </div>
      <div class="field"><label for="pp-from">From</label><input id="pp-from" type="date" /></div>
      <div class="field"><label for="pp-to">To</label><input id="pp-to" type="date" /></div>
      <button type="button" class="btn btn-ghost btn-xs" id="pp-clear" hidden>Clear</button>
      <span class="pa-range-note" id="pp-note" aria-live="polite"></span>
    </div>`;

  const $from = host.querySelector('#pp-from');
  const $to = host.querySelector('#pp-to');
  const $clear = host.querySelector('#pp-clear');

  function paint() {
    const custom = !!(st.from || st.to);
    host.querySelectorAll('[data-period]').forEach((b) => {
      const on = !custom && b.dataset.period === st.period;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $from.value = st.from; $to.value = st.to;
    $clear.hidden = !custom;
    try {
      sessionStorage.setItem(STORE, JSON.stringify(st));
      const q = new URLSearchParams();
      if (custom) { if (st.from) q.set('from', st.from); if (st.to) q.set('to', st.to); } else q.set('period', st.period);
      history.replaceState(null, '', location.pathname + '?' + q.toString() + location.hash);
    } catch (_e) { /* storage or history blocked: the control still works */ }
  }

  function change(next) {
    st = next;
    paint();
    if (onChange) onChange({ ...st });
  }

  host.querySelectorAll('[data-period]').forEach((b) => b.addEventListener('click', () => change({ period: b.dataset.period, from: '', to: '' })));
  // Both boxes emptied by hand is the same as Clear.
  const dates = () => change(($from.value || $to.value)
    ? { period: '', from: $from.value, to: $to.value }
    : { period: 'month', from: '', to: '' });
  $from.addEventListener('change', dates);
  $to.addEventListener('change', dates);
  $clear.addEventListener('click', () => change({ period: 'month', from: '', to: '' }));
  paint();

  return {
    state: () => ({ ...st }),
    setRange(p) {
      const note = host.querySelector('#pp-note');
      if (!p) { note.textContent = ''; return; }
      if (p.key === 'all') note.textContent = 'Since launch';
      else if (p.from && p.to) note.textContent = p.from === p.to ? fmtDate(p.from) : `${fmtDate(p.from)} to ${fmtDate(p.to)}`;
      else note.textContent = '';
      if (p.key === 'custom') note.textContent = 'Custom range: ' + note.textContent;
    },
  };
}
