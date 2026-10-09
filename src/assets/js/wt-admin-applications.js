// ───────────────────────────────────────────────────────────────────
//  wt-admin-applications.js — the partner applications list.
//
//  Moved out of wt-admin.js unchanged in what it does, so the CRM → Applications
//  page and the older multi-tab Partner Admin page run the same code.
//
//  renderApplications(host, { call, onInvite })
//    call(action, params) -> Promise<{ ok, ... }>   the `admin` function caller
//    onInvite(app)        runs when an admin presses Invite on a row
// ───────────────────────────────────────────────────────────────────
import { esc, fmtDate } from './wt-padmin-ui.js';

// Step 1 of the funnel, sitting in front of Invites so the work reads in the
// order it happens. These also appear on Site Submissions with every other
// contact form, but that page can't act on one.
const APP_STATE_LABEL = { new: 'Needs review', invited: 'Invited', joined: 'Joined', expired: 'Invite expired' };
// Amber is reserved for "this one needs you". An already-invited applicant is
// waiting on THEM, so it goes gray - both states were amber at first and the
// two were indistinguishable in the row.
const APP_STATE_PILL = { new: 'pending', invited: 'used', joined: 'approved', expired: 'expired' };

export async function renderApplications(host, { call, onInvite }) {
  host.innerHTML = `
    <div class="adm-card">
      <h3>Partner applications</h3>
      <p class="acct-sub">Creators who applied through the site. "Invite" carries their name and email into the invite form — check the rates, then create it.</p>
      <div id="app-list" class="adm-wrap-scroll">Loading…</div>
    </div>`;

  const list = host.querySelector('#app-list');
  const r = await call('list_applications');
  if (!r.ok) { list.innerHTML = '<p class="acct-sub">Could not load applications (' + esc(r.error || 'error') + ').</p>'; return; }

  const rows = (r.rows || []).map((a) => `
    <tr>
      <td>${esc(a.name || '—')}</td>
      <td>${esc(a.email || '—')}</td>
      <td>${a.affiliate_code ? esc(a.affiliate_code) : esc(a.company || '—')}</td>
      <td><span class="adm-pill ${APP_STATE_PILL[a.state] || 'pending'}">${esc(APP_STATE_LABEL[a.state] || a.state)}</span></td>
      <td>${fmtDate(a.created_at)}</td>
      <td>${a.message ? `<button class="btn btn-ghost btn-xs" data-app-note="${esc(a.id)}">Read</button>` : ''}</td>
      <td>${a.email && a.state !== 'joined'
        ? `<button class="btn btn-primary btn-xs" data-app-invite="${esc(a.id)}">${a.state === 'new' ? 'Invite' : 'Invite again'}</button>`
        : ''}</td>
    </tr>
    ${a.message ? `<tr class="app-note" id="app-note-${esc(a.id)}" hidden><td colspan="7"><p class="acct-sub" style="white-space:pre-wrap; margin:0;">${esc(a.message)}</p></td></tr>` : ''}`).join('');

  list.innerHTML = `<table class="adm-table">
    <thead><tr><th>Name</th><th>Email</th><th>Company / Code</th><th>State</th><th>Applied</th><th></th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7">No applications yet.</td></tr>'}</tbody></table>`;

  list.querySelectorAll('[data-app-note]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = host.querySelector('#app-note-' + CSS.escape(btn.dataset.appNote));
      if (row) { row.hidden = !row.hidden; btn.textContent = row.hidden ? 'Read' : 'Hide'; }
    });
  });

  list.querySelectorAll('[data-app-invite]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const app = (r.rows || []).find((x) => x.id === btn.dataset.appInvite);
      if (app && onInvite) onInvite(app);
    });
  });
}
