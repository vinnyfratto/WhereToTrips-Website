// ───────────────────────────────────────────────────────────────────
//  wt-padmin-period.js — the period buttons, custom date range and the "Include
//  test data" switch shared by the admin home strip and the Partner Overview.
//
//  Buttons: Today, Weekly, Monthly, YTD, ALL. Monthly is the default. Exactly one
//  is active at a time. To their right, From and To dates:
//    - choosing a button clears any custom dates
//    - entering a From or To switches to a custom range: no button is active and
//      a Clear button appears; Clear goes back to Monthly
//    - an empty end of a custom range, and a From after a To, are settled by the
//      server (January 1 and today; the two swapped)
//
//  Include test data: off by default, so every figure is real activity (on or
//  after the launch day, live orders, no test accounts). On brings back demo and
//  sandbox data too, and the note beside the dates says so in amber.
//
//  The choice is shared between the two pages for the session (sessionStorage)
//  and shows in the address (?period=ytd&test=1 or ?from=2026-10-01&to=2026-10-07),
//  so a page can be sent as it is. It is never stored on the server. The boundaries
//  themselves are worked out by the server, in Central time.
// ───────────────────────────────────────────────────────────────────
import { esc, fmtDate } from './wt-padmin-ui.js';

export const PRESETS = [['today', 'Today'], ['week', 'Weekly'], ['month', 'Monthly'], ['ytd', 'YTD'], ['all', 'ALL']];
const STORE = 'wt_padmin_period';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TEST_TIP = 'Off: real activity only, from each store launch day, with test accounts, sandbox and demo data left out. '
  + 'On: everything, including the demo and sandbox data. Nothing is deleted either way.';

function fromAddress() {
  const q = new URLSearchParams(location.search);
  const from = DAY.test(q.get('from') || '') ? q.get('from') : '';
  const to = DAY.test(q.get('to') || '') ? q.get('to') : '';
  const period = PRESETS.some(([k]) => k === q.get('period')) ? q.get('period') : '';
  const test = q.get('test') === '1';
  if (!from && !to && !period && !q.has('test')) return null;
  return (from || to) ? { period: '', from, to, test } : { period: period || 'month', from: '', to: '', test };
}

function fromSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORE) || 'null');
    if (!s) return null;
    return {
      period: PRESETS.some(([k]) => k === s.period) ? s.period : '',
      from: DAY.test(s.from || '') ? s.from : '',
      to: DAY.test(s.to || '') ? s.to : '',
      test: s.test === true,
    };
  } catch (_e) { return null; }
}

/** What to ask the server for, from a state. */
export function periodParams(st) {
  const p = (st.from || st.to) ? { from: st.from || undefined, to: st.to || undefined } : { period: st.period || 'month' };
  if (st.test) p.include_test = true;
  return p;
}

/**
 * Draw the control into `host`. onChange(state) runs after every change (and is
 * NOT called for the first draw: the page loads once itself with state()).
 * Returns { state(), setRange(period, scope) } where setRange shows the days the
 * server settled on, e.g. "Oct 1 to Oct 8, 2026", and which data they cover.
 */
export function renderPeriodControl(host, { onChange }) {
  let st = fromAddress() || fromSession() || { period: 'month', from: '', to: '', test: false };
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
      <span class="pa-spacer"></span>
      <span class="pa-switch-wrap">
        <label class="pa-switch" for="pp-test">
          <input id="pp-test" type="checkbox" role="switch" />
          <span class="pa-switch-track" aria-hidden="true"></span>
          <span>Include test data</span>
        </label>
        <span class="pa-info" title="${esc(TEST_TIP)}" aria-label="${esc(TEST_TIP)}">i</span>
      </span>
    </div>
    <p class="pa-scope" id="pp-scope" aria-live="polite" hidden></p>`;

  const $from = host.querySelector('#pp-from');
  const $to = host.querySelector('#pp-to');
  const $clear = host.querySelector('#pp-clear');
  const $test = host.querySelector('#pp-test');

  function paint() {
    const custom = !!(st.from || st.to);
    host.querySelectorAll('[data-period]').forEach((b) => {
      const on = !custom && b.dataset.period === st.period;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $from.value = st.from; $to.value = st.to;
    $clear.hidden = !custom;
    $test.checked = !!st.test;
    try {
      sessionStorage.setItem(STORE, JSON.stringify(st));
      const q = new URLSearchParams();
      if (custom) { if (st.from) q.set('from', st.from); if (st.to) q.set('to', st.to); } else q.set('period', st.period);
      if (st.test) q.set('test', '1');
      history.replaceState(null, '', location.pathname + '?' + q.toString() + location.hash);
    } catch (_e) { /* storage or history blocked: the control still works */ }
  }

  function change(next) {
    st = next;
    paint();
    if (onChange) onChange({ ...st });
  }

  host.querySelectorAll('[data-period]').forEach((b) => b.addEventListener('click', () => change({ period: b.dataset.period, from: '', to: '', test: st.test })));
  // Both boxes emptied by hand is the same as Clear.
  const dates = () => change(($from.value || $to.value)
    ? { period: '', from: $from.value, to: $to.value, test: st.test }
    : { period: 'month', from: '', to: '', test: st.test });
  $from.addEventListener('change', dates);
  $to.addEventListener('change', dates);
  $clear.addEventListener('click', () => change({ period: 'month', from: '', to: '', test: st.test }));
  $test.addEventListener('change', () => change({ ...st, test: $test.checked }));
  paint();

  return {
    state: () => ({ ...st }),
    setRange(p, scope) {
      const note = host.querySelector('#pp-note');
      if (!p) { note.textContent = ''; } else {
        const testData = !!(scope && scope.live === false);
        if (p.key === 'all') note.textContent = testData ? 'All time' : 'Since launch';
        else if (p.from && p.to) note.textContent = p.from === p.to ? fmtDate(p.from) : `${fmtDate(p.from)} to ${fmtDate(p.to)}`;
        else note.textContent = '';
        if (p.key === 'custom') note.textContent = 'Custom range: ' + note.textContent;
      }
      const sc = host.querySelector('#pp-scope');
      if (!scope || typeof scope.live !== 'boolean') { sc.hidden = true; sc.textContent = ''; return; }
      sc.hidden = false;
      sc.classList.toggle('is-test', !scope.live);
      if (!scope.live) sc.textContent = 'Including test data: demo travelers, sandbox bookings, test accounts and activity from before launch are counted.';
      else if (scope.live_since) sc.textContent = `Live data only, from ${fmtDate(scope.live_since)} (the first store launch day). Test accounts, sandbox and demo data are left out.`;
      else sc.textContent = 'Live data only. No launch day is set yet, so nothing counts. Set one under Data settings on the admin home.';
    },
  };
}
