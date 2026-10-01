// ───────────────────────────────────────────────────────────────────
//  wt-commission-timeline.js — one commissionable booking, start to payout.
//
//  Shared by the partner dashboard (wt-partner-performance.js) and the
//  admin Commissions tab (wt-admin.js), so both tell the same story:
//
//    Booked → Trip starts → Trip ends → Ready to pay out → Paid
//
//  "Ready to pay out" is commission_hold_until: CLAWBACK_DAYS (14) after the
//  trip ends (app repo supabase/functions/_shared/commissions.ts), because
//  a canceled trip takes its commission with it. A canceled booking or a
//  reversed / rejected commission ends the timeline there instead.
//
//  Row shape (both callers normalize to it):
//    { booking_kind, title, where_, starts_on, ends_on, booking_status,
//      created_at, commission_amount, commission_currency,
//      commission_status, commission_hold_until, reference? }
//
//  Bookings are identified by confirmation number only: no traveler names or
//  other personal details, on either page.
// ───────────────────────────────────────────────────────────────────

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function money(n, currency) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(n) || 0);
  } catch { return '$' + (Number(n) || 0).toFixed(2); }
}

// A bare YYYY-MM-DD is a calendar day, not UTC midnight: parsed as UTC it
// shows the day before in US time zones.
function toDate(s) {
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T12:00:00') : new Date(s);
}
export function fmtDate(s) {
  const d = toDate(s);
  return d && !isNaN(d) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

const STATUS_LABEL = {
  pending:  'Pending',
  approved: 'Ready to pay out',
  paid:     'Paid',
  reversed: 'Reversed',
  rejected: 'Rejected',
  none:     'No commission',
};
export function statusLabel(s) { return STATUS_LABEL[s] || s || '—'; }

/** Where the booking is on its way to a payout, as timeline steps. */
export function commissionTimeline(row, now = new Date()) {
  const passed = (s) => { const d = toDate(s); return !!d && d <= now; };
  const status = row.commission_status || 'pending';
  const canceled = /cancel/i.test(row.booking_status || '') || status === 'reversed' || status === 'rejected';
  const isFlight = row.booking_kind === 'flight';

  const steps = [
    { key: 'booked', label: 'Booked', date: row.created_at, done: true },
    { key: 'start',  label: isFlight ? 'Flight departs' : 'Check-in', date: row.starts_on, done: passed(row.starts_on) },
  ];
  if (row.ends_on) {
    steps.push({ key: 'end', label: isFlight ? 'Return flight' : 'Check-out', date: row.ends_on, done: passed(row.ends_on) });
  }

  if (canceled) {
    steps.push({
      key: 'cancelled', label: status === 'rejected' ? 'Commission rejected' : 'Trip canceled',
      note: 'No commission is paid on this booking.', done: true, bad: true,
    });
    return steps;
  }

  const readyDone = status === 'approved' || status === 'paid';
  steps.push({
    // Stored as midnight UTC on the day it frees up: that day, not the
    // evening before in US time.
    key: 'ready', label: 'Ready to pay out', date: row.commission_hold_until ? String(row.commission_hold_until).slice(0, 10) : null,
    note: readyDone ? 'Approved for the next payout.'
      : passed(row.commission_hold_until) ? 'Cancellation window closed. Awaiting approval.'
      : 'Held for 14 days after the trip ends, in case it is canceled.',
    done: readyDone,
  });
  steps.push({
    key: 'paid', label: 'Paid', note: status === 'paid' ? `${money(row.commission_amount, row.commission_currency)} paid.` : 'Included in a payout once approved.',
    done: status === 'paid',
  });
  // The first step not yet done is where the booking is now.
  const current = steps.find((s) => !s.done);
  if (current) current.current = true;
  return steps;
}

/** The timeline as HTML (styles injected once). */
export function timelineHtml(row) {
  injectStyles();
  const steps = commissionTimeline(row);
  const items = steps.map((s) => `
    <li class="ctl-step${s.done ? ' done' : ''}${s.current ? ' current' : ''}${s.bad ? ' bad' : ''}">
      <span class="ctl-dot" aria-hidden="true"></span>
      <div class="ctl-body">
        <div class="ctl-label">${esc(s.label)}${s.date ? `<span class="ctl-date">${esc(fmtDate(s.date))}</span>` : ''}</div>
        ${s.note ? `<div class="ctl-note">${esc(s.note)}</div>` : ''}
      </div>
    </li>`).join('');
  const head = `
    <div class="ctl-head">
      <div>
        <div class="ctl-title">${esc(row.title || (row.booking_kind === 'flight' ? 'Flight' : 'Hotel'))}</div>
        <div class="ctl-sub">${esc([row.booking_kind === 'flight' ? 'Flight' : 'Hotel', row.where_].filter(Boolean).join(' · '))}</div>
        ${row.reference ? `<div class="ctl-sub">Confirmation ${esc(row.reference)}</div>` : ''}
      </div>
      <div class="ctl-amount">
        <div>${esc(money(row.commission_amount, row.commission_currency))}</div>
        <div class="ctl-status s-${esc(row.commission_status || 'pending')}">${esc(statusLabel(row.commission_status))}</div>
      </div>
    </div>`;
  return `<div class="ctl">${head}<ol class="ctl-steps">${items}</ol></div>`;
}

/** A small modal with the timeline (partner dashboard). */
export function openTimelineModal(row) {
  injectStyles();
  const wrap = document.createElement('div');
  wrap.className = 'ctl-modal';
  wrap.innerHTML = `<div class="ctl-sheet" role="dialog" aria-modal="true" aria-label="Commission timeline">
      <button class="ctl-close" type="button" aria-label="Close">×</button>
      ${timelineHtml(row)}
    </div>`;
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  wrap.querySelector('.ctl-close').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(wrap);
}

let injected = false;
function injectStyles() {
  if (injected) return;
  injected = true;
  const css = `
  .ctl { text-align: left; }
  .ctl-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
  .ctl-title { font-family: var(--serif); color: var(--navy); font-size: 1.15rem; }
  .ctl-sub { color: var(--wg600); font-size: .9rem; margin-top: 2px; }
  .ctl-amount { text-align: right; font-weight: 700; color: var(--navy); white-space: nowrap; }
  .ctl-status { font-size: .8rem; font-weight: 600; margin-top: 4px; color: var(--wg600); }
  .ctl-status.s-approved, .ctl-status.s-paid { color: #1e7a45; }
  .ctl-status.s-reversed, .ctl-status.s-rejected { color: #8f2c1b; }
  .ctl-steps { list-style: none; margin: 0; padding: 0; }
  .ctl-step { position: relative; display: flex; gap: 12px; padding: 0 0 18px; }
  .ctl-step:not(:last-child)::before { content: ''; position: absolute; left: 7px; top: 18px; bottom: 0; width: 2px; background: var(--wg200, #dde2e7); }
  .ctl-step.done:not(:last-child)::before { background: var(--azure, #209ce0); }
  .ctl-dot { flex: 0 0 16px; height: 16px; border-radius: 50%; border: 2px solid var(--wg300, #c5ccd3); background: #fff; margin-top: 2px; box-sizing: border-box; }
  .ctl-step.done .ctl-dot { background: var(--azure, #209ce0); border-color: var(--azure, #209ce0); }
  .ctl-step.current .ctl-dot { border-color: var(--azure, #209ce0); box-shadow: 0 0 0 4px rgba(32,156,224,.18); }
  .ctl-step.bad .ctl-dot { background: #8f2c1b; border-color: #8f2c1b; }
  .ctl-label { color: var(--navy); font-weight: 600; font-size: .95rem; display: flex; gap: 10px; flex-wrap: wrap; align-items: baseline; }
  .ctl-step:not(.done):not(.current) .ctl-label { color: var(--wg600); font-weight: 500; }
  .ctl-date { font-weight: 400; color: var(--wg600); font-size: .88rem; }
  .ctl-note { color: var(--wg600); font-size: .85rem; margin-top: 2px; }
  .ctl-modal { position: fixed; inset: 0; background: rgba(20,30,40,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
  .ctl-sheet { position: relative; background: var(--card, #fff); border-radius: var(--radius-md, 14px); padding: 26px 24px 8px; width: 100%; max-width: 460px; max-height: 90vh; overflow: auto; box-shadow: 0 20px 50px rgba(20,30,40,.25); }
  .ctl-close { position: absolute; top: 8px; right: 12px; border: 0; background: none; font-size: 1.6rem; line-height: 1; color: var(--wg600); cursor: pointer; }
  .ctl-sheet .ctl-head { padding-right: 18px; }
  `;
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
}
