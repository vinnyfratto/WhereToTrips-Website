// ───────────────────────────────────────────────────────────────────
//  wt-admin-invites.js — create partner invites and list the ones sent.
//
//  Moved out of wt-admin.js unchanged in what it does, so the CRM → Invites page
//  and the older multi-tab Partner Admin page run the same code.
//
//  renderInvites(host, { call, notify, site })
//    call(action, params)  -> Promise<{ ok, ... }>   the `admin` function caller
//    notify(type, text)    -> shows a message ('success' | 'error')
//    site                  -> the site origin, for the invite link
//
//  An applicant carried over from the Applications list is handed across in
//  sessionStorage under HANDOFF_KEY, so "Invite" works from a different page.
// ───────────────────────────────────────────────────────────────────
import { esc, fmtDate } from './wt-padmin-ui.js';

export const HANDOFF_KEY = 'wt_invite_from_application';

function pct(r) { const v = (r == null ? 0 : Number(r)) * 100; return v.toFixed(v % 1 === 0 ? 0 : 1) + '%'; }

/**
 * Hand the applicant over to the invite form rather than minting an invite
 * straight from the list: the rates are a per-creator negotiation and must not
 * default themselves away behind a single click.
 */
export function carryApplicationIntoForm(host, app, notify) {
  const form = host.querySelector('#inv-form');
  if (!form) return;
  if (form.elements.email) form.elements.email.value = app.email || '';
  if (form.elements.intended_name) form.elements.intended_name.value = app.name || '';
  // `source` is a fixed select of named programs, so it's left alone —
  // assigning a value it has no option for sets it to nothing at all.
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  (form.elements.revenue_share_percent || form.elements.email)?.focus();
  if (notify) notify('success', 'Carried ' + (app.name || app.email) + ' over — check the revenue share, then create the invite.');
}

export async function renderInvites(host, { call, notify, site }) {
  host.innerHTML = `
    <div class="adm-card">
      <h3>Create invite</h3>
      <form id="inv-form">
        <div class="adm-form-row">
          <div class="field"><label>Email</label><input name="email" type="email" placeholder="creator@example.com" /></div>
          <div class="field"><label>Name</label><input name="intended_name" type="text" placeholder="Jane Traveler" /></div>
          <div class="field"><label>Partner Source</label>
            <select name="source">
              <option value="Direct">Direct</option>
              <option value="ABC Affiliate Program">ABC Affiliate Program</option>
              <option value="XYZ Affiliate Program">XYZ Affiliate Program</option>
            </select>
          </div>
        </div>
        <p class="adm-subhead">Terms</p>
        <div class="adm-form-row">
          <div class="field"><label>Revenue Share %</label><input name="revenue_share_percent" type="number" step="1" min="0" max="100" value="30" /></div>
          <div class="field"><label>Revenue Duration (months)</label><input name="commission_duration_months" type="number" value="36" min="1" /></div>
          <div class="field"><label>Expires (days)</label><input name="expires_days" type="number" value="30" min="1" /></div>
        </div>
        <p class="hint" style="margin:0 0 14px;">Revenue share is their cut of the revenue WhereTo earns on a booking, not of what the traveler pays. Whole number, so 30 means 30%.</p>
        <div class="adm-form-row" style="justify-content:flex-end;">
          <button type="submit" class="btn btn-primary btn-xs">Create invite</button>
        </div>
      </form>
      <div id="inv-result"></div>
    </div>
    <div class="adm-card">
      <h3>Invites</h3>
      <div id="inv-list" class="adm-wrap-scroll">Loading…</div>
    </div>`;

  const result = host.querySelector('#inv-result');

  host.querySelector('#inv-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const r = await call('create_invite', {
      email: fd.get('email'), intended_name: fd.get('intended_name'), source: fd.get('source'),
      commission_duration_months: fd.get('commission_duration_months'), expires_days: fd.get('expires_days'),
      revenue_share_percent: fd.get('revenue_share_percent'),
    });
    if (!r.ok) { notify('error', 'Create failed: ' + r.error); return; }
    const link = site + '/AffiliateSignUp/?invite=' + r.token;
    // The link is still shown once whether or not it was emailed: an invite
    // minted without an address has to be handed over some other way, and even
    // an emailed one is worth having on screen if the recipient says it never
    // arrived.
    result.innerHTML = `
      <div class="adm-token-box">
        <strong>${r.emailed ? 'Invite emailed. Link (shown once):' : 'Invite link (copy now — shown once, no email address given):'}</strong><br>
        <a data-copy>${esc(link)}</a>
      </div>`;
    const a = result.querySelector('a[data-copy]');
    a.addEventListener('click', async () => { try { await navigator.clipboard.writeText(link); a.textContent = 'Copied!'; setTimeout(() => { a.textContent = link; }, 1200); } catch (_e) { /* clipboard blocked */ } });
    e.target.reset();
    renderList();
  });

  async function renderList() {
    const list = host.querySelector('#inv-list');
    const r = await call('list_invites');
    const rows = (r.invites || []).map((i) => `
      <tr>
        <td>${esc(i.email || '—')}</td><td>${esc(i.intended_name || '—')}</td>
        <td>${i.commission_rate == null ? 'default' : pct(i.commission_rate)}</td>
        <td>${fmtDate(i.expires_at)}</td>
        <td><span class="adm-pill ${esc(i.state)}">${esc(i.state)}</span></td>
        <td>${i.state === 'pending' ? `<button class="btn btn-ghost btn-xs" data-revoke="${esc(i.id)}">Revoke</button>` : ''}</td>
      </tr>`).join('');
    list.innerHTML = `<table class="adm-table">
      <thead><tr><th>Email</th><th>Name</th><th>Rev share</th><th>Expires</th><th>State</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No invites yet.</td></tr>'}</tbody></table>`;
    list.querySelectorAll('[data-revoke]').forEach((b) => {
      b.addEventListener('click', async () => {
        if (!confirm('Revoke this invite?')) return;
        const r2 = await call('revoke_invite', { id: b.dataset.revoke });
        if (!r2.ok) { notify('error', 'Revoke failed: ' + r2.error); return; }
        notify('success', 'Invite revoked.'); renderList();
      });
    });
  }

  await renderList();

  // An applicant handed over from the Applications page.
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (raw) {
      sessionStorage.removeItem(HANDOFF_KEY);
      carryApplicationIntoForm(host, JSON.parse(raw), notify);
    }
  } catch (_e) { /* storage blocked or bad value: the form is simply blank */ }
}
