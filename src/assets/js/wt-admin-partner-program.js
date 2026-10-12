// ───────────────────────────────────────────────────────────────────
//  wt-admin-partner-program.js — the "Partner program" card on the Partner
//  Dashboard: where a partner stands (tier, 60-day window, travelers), and the
//  one decision an admin makes here, whether they are a Founding Partner.
//
//  Read-only except for that flag. The numbers come from partner-admin's
//  partner_program_get, which is the same code the partner's own portal runs,
//  so this is the partner's view, not a second opinion.
//
//  renderProgram(host, partner, { call, notify })
// ───────────────────────────────────────────────────────────────────
import { esc, fmtDate, pill } from './wt-padmin-ui.js';

const REASONS = {
  new_partner_floor: 'New partner',
  monthly_upgrade: 'Moved up',
  annual_drop: 'Dropped on January 1',
  founding: 'Founding Partner',
  founding_removed: 'Founding flag removed',
};
const pct = (bps) => `${+(Number(bps) / 100).toFixed(2)}%`;
const days = (n) => `${n} ${n === 1 ? 'day' : 'days'}`;

function activityText(a) {
  const last = a.last_qualified_registration_on ? ` Last qualified registration ${fmtDate(a.last_qualified_registration_on)}.` : ' No qualified registration yet.';
  if (!a.window_ends_on && a.state !== 'inactive') return 'The 60-day window starts with the first tracking link.' + last;
  if (a.state === 'active') return `Active. ${days(a.days_left)} left in the 60-day window (ends ${fmtDate(a.window_ends_on)}).` + last;
  if (a.state === 'warning') return `Closing soon. ${days(a.days_left)} left in the 60-day window (ends ${fmtDate(a.window_ends_on)}).` + last;
  if (a.state === 'grace') return `Window missed. ${days(a.grace_days_left)} left to recover (by ${fmtDate(a.grace_ends_on)}).` + last;
  const used = a.reinstatement_used ? ' The one reinstatement has been used.' : ` ${a.requalify_months_completed} of 3 requalifying months done.`;
  return `Inactive since ${fmtDate(a.inactive_since)}.${used} Travelers past their guarantee are lost after ${fmtDate(a.house_account_on)}.` + last;
}

export async function renderProgram(host, partner, { call, notify }) {
  host.innerHTML = '<div class="adm-card"><div class="pa-card-h"><h3>Partner program</h3></div><p class="acct-sub">Loading…</p></div>';
  const r = await call('partner_program_get', { id: partner.partner_id });
  if (!r.ok) {
    host.innerHTML = `<div class="adm-card"><div class="pa-card-h"><h3>Partner program</h3></div><p class="acct-sub">Could not load (${esc(r.error || 'error')}).</p></div>`;
    return;
  }

  const s = r.status;
  const t = s.tier;
  const a = s.activity;
  const founding = !!r.program.is_founding;
  const queued = (r.log || []).filter((x) => x.kind === 'notice' && x.detail && x.detail.status === 'queued').length;
  const history = (r.tier_history || []).slice(0, 6);

  host.innerHTML = `
    <div class="adm-card">
      <div class="pa-card-h">
        <h3>Partner program</h3>
        <button type="button" class="btn btn-ghost btn-xs" id="pp-founding">${founding ? 'Remove Founding flag' : 'Record as Founding Partner'}</button>
      </div>
      <dl class="pa-kv">
        <dt>Tier</dt>
        <dd>${esc(t.name)} · ${esc(pct(t.rate_bps))} revenue share${founding ? ' (locked)' : ''} ${founding ? pill('Founding Partner', 'green') : ''}</dd>
        ${t.pending_upgrade ? `<dt>Moving up</dt><dd>${esc(t.pending_upgrade.name)} (${esc(pct(t.pending_upgrade.rate_bps))}) on ${esc(fmtDate(t.pending_upgrade.effective_on))}</dd>` : ''}
        <dt>Completed trips</dt>
        <dd>${esc(t.trips_this_year)} in ${esc(t.year)} so far, ${esc(t.trips_last_year)} in ${esc(t.year - 1)}${t.holds_through ? `. Tier holds through ${esc(fmtDate(t.holds_through))}.` : ''}</dd>
        <dt>Guarantee</dt>
        <dd>${esc(s.guarantee_months)} months per traveler, for travelers who register from now on</dd>
        <dt>Activity window</dt>
        <dd>${esc(activityText(a))}</dd>
        <dt>Travelers</dt>
        <dd>${esc(r.travelers.total)} verified: ${esc(a.travelers_in_guarantee)} inside their guarantee, ${esc(a.travelers_past_guarantee)} past it</dd>
        <dt>Notices queued</dt>
        <dd>${queued ? esc(queued) : '<span class="pa-muted">None</span>'}${queued ? ' <span class="pa-muted pa-small">Not sent: the wording needs sign-off.</span>' : ''}</dd>
      </dl>
      ${history.length ? `
        <p class="pa-muted pa-small" style="margin:16px 0 6px;">Tier history</p>
        <dl class="pa-kv">
          ${history.map((h) => `<dt>${esc(fmtDate(h.effective_from))}</dt><dd>${esc(h.tier_key)} · ${esc(pct(h.rate_bps))} <span class="pa-muted pa-small">${esc(REASONS[h.reason] || h.reason)}</span></dd>`).join('')}
        </dl>` : ''}
    </div>`;

  host.querySelector('#pp-founding').addEventListener('click', async (e) => {
    const name = partner.partner_name || 'this partner';
    const ask = founding
      ? `Remove the Founding Partner flag from ${name}? They go back to the new-partner tier at the next nightly run. Travelers already registered keep the guarantee they were given.`
      : `Record ${name} as a Founding Partner? Their rate becomes ${pct(3000)} locked from today, and travelers who register from now on get a ${36}-month guarantee. Travelers already registered keep ${s.guarantee_months} months. Every change is logged.`;
    if (!window.confirm(ask)) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    const res = await call('partner_set_founding', { id: partner.partner_id, founding: !founding });
    btn.disabled = false;
    if (!res.ok) { notify('error', 'Could not save (' + (res.error || 'error') + ').'); return; }
    notify('success', founding ? 'Founding flag removed.' : 'Recorded as a Founding Partner.');
    await renderProgram(host, partner, { call, notify });
  });
}
