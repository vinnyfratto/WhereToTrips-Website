// ───────────────────────────────────────────────────────────────────
//  wt-admin.js — internal affiliate admin panel (Step 5).
//  Every data call goes through the `admin` edge fn, which verifies the
//  caller is in the `admins` table server-side. A non-admin gets a 403 and
//  sees the "access denied" state — no admin capability is reachable from
//  the browser without that server-side check. No money movement here:
//  payouts are DRAFT snapshots only.
// ───────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.WT_SUPABASE || {};
const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
const ADMIN_FN = cfg.url + '/functions/v1/admin';
const SITE = window.location.origin;

let TOKEN = null;
const loaded = {};      // which tabs have loaded
let affiliateCache = [];

const $ = (s, r = document) => r.querySelector(s);
const panel = (name) => $(`[data-panel="${name}"]`);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function money(n, c) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(n || 0); }
  catch { return '$' + Number(n || 0).toFixed(2); }
}
function pct(r) { const v = (r == null ? 0 : Number(r)) * 100; return v.toFixed(v % 1 === 0 ? 0 : 1) + '%'; }
function date(s) { return s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }
function msg(type, text) { const m = $('#adm-msg'); m.className = 'alert show alert-' + type; m.textContent = text; setTimeout(() => { if (m.textContent === text) m.className = 'alert'; }, 5000); }

async function callAdmin(action, params = {}) {
  const res = await fetch(ADMIN_FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': cfg.anonKey, 'Authorization': 'Bearer ' + TOKEN },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json().catch(() => ({ ok: false, error: 'network' }));
}

// ── boot ────────────────────────────────────────────────────────────
async function init() {
  if (!$('#wt-admin-page')) return;
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) { window.location.href = '/account/login/'; return; }
  TOKEN = sess.session.access_token;

  const data = await callAdmin('overview');
  if (!data.ok) {
    $('#adm-gate').style.display = 'none';
    if (data.error === 'forbidden') { $('#adm-denied').style.display = 'block'; }
    else { $('#adm-denied').style.display = 'block'; $('#adm-denied .acct-sub').textContent = 'Could not load admin (' + (data.error || 'error') + ').'; }
    return;
  }

  $('#adm-gate').style.display = 'none';
  $('#adm-root').style.display = 'block';

  $('#adm-logout').addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = '/account/login/'; });

  // Tabs
  document.querySelectorAll('.adm-tab').forEach((t) => {
    t.addEventListener('click', () => switchTab(t.dataset.tab));
  });

  renderOverview(data);
  loaded.overview = true;
}

function switchTab(name) {
  document.querySelectorAll('.adm-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
  document.querySelectorAll('.adm-panel').forEach((p) => { p.hidden = p.dataset.panel !== name; });
  if (!loaded[name]) {
    loaded[name] = true;
    ({ invites: loadInvites, affiliates: loadAffiliates, commissions: loadCommissions, payouts: loadPayouts }[name] || (() => {}))();
  }
}

// ── Overview ────────────────────────────────────────────────────────
function renderOverview(d) {
  const t = d.totals;
  const card = (label, val) => `<div class="stat-card"><p class="label">${label}</p><p class="value">${val}</p></div>`;
  const rows = (d.top_performers || []).map((p) => `
    <tr><td>${esc(p.code)}</td><td>${esc(p.name || '—')}</td>
    <td class="num">${p.clicks}</td><td class="num">${p.referrals}</td><td class="num">${p.bookings}</td>
    <td class="num">${money(p.pending + p.approved + p.paid)}</td></tr>`).join('');

  panel('overview').innerHTML = `
    <div class="adm-overview-grid">
      ${card('Affiliates', t.affiliates)}
      ${card('Referred signups', t.referrals)}
      ${card('Bookings', t.bookings)}
      ${card('Commission owed', money(t.commission_liability))}
    </div>
    <div class="adm-overview-grid">
      ${card('Clicks', t.clicks)}
      ${card('Pending', money(t.commission_pending))}
      ${card('Approved', money(t.commission_approved))}
      ${card('Paid', money(t.commission_paid))}
    </div>
    <div class="adm-card">
      <h3>Top performers</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Code</th><th>Name</th><th class="num">Clicks</th><th class="num">Signups</th><th class="num">Bookings</th><th class="num">Commission</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6">No affiliates yet.</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

// ── Invites ─────────────────────────────────────────────────────────
async function loadInvites() {
  panel('invites').innerHTML = `
    <div class="adm-card">
      <h3>Create invite</h3>
      <form id="inv-form">
        <div class="adm-form-row">
          <div class="field"><label>Email</label><input name="email" type="email" placeholder="creator@example.com" /></div>
          <div class="field"><label>Name</label><input name="intended_name" type="text" placeholder="Jane Traveler" /></div>
          <div class="field"><label>Commission rate</label><input name="commission_rate" type="number" step="0.01" min="0" max="1" placeholder="0.05" /></div>
          <div class="field"><label>Type</label><select name="commission_type"><option value="percent">percent</option><option value="flat">flat</option></select></div>
          <div class="field"><label>Expires (days)</label><input name="expires_days" type="number" value="30" min="1" /></div>
          <button type="submit" class="btn btn-primary btn-xs">Create invite</button>
        </div>
      </form>
      <div id="inv-result"></div>
    </div>
    <div class="adm-card">
      <h3>Invites</h3>
      <div id="inv-list" class="adm-wrap-scroll">Loading…</div>
    </div>`;

  $('#inv-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const r = await callAdmin('create_invite', {
      email: fd.get('email'), intended_name: fd.get('intended_name'),
      commission_rate: fd.get('commission_rate'), commission_type: fd.get('commission_type'),
      expires_days: fd.get('expires_days'),
    });
    if (!r.ok) { msg('error', 'Create failed: ' + r.error); return; }
    const link = SITE + '/AffiliateSignUp/?invite=' + r.token;
    $('#inv-result').innerHTML = `
      <div class="adm-token-box">
        <strong>Invite link (copy now — shown once):</strong><br>
        <a data-copy>${esc(link)}</a>
      </div>`;
    const a = $('#inv-result a[data-copy]');
    a.addEventListener('click', async () => { try { await navigator.clipboard.writeText(link); a.textContent = 'Copied!'; setTimeout(() => a.textContent = link, 1200); } catch (_e) {} });
    e.target.reset();
    renderInviteList();
  });

  renderInviteList();
}

async function renderInviteList() {
  const r = await callAdmin('list_invites');
  const rows = (r.invites || []).map((i) => `
    <tr>
      <td>${esc(i.email || '—')}</td><td>${esc(i.intended_name || '—')}</td>
      <td>${i.commission_rate == null ? 'default' : pct(i.commission_rate)}</td>
      <td>${date(i.expires_at)}</td>
      <td><span class="adm-pill ${i.state}">${i.state}</span></td>
      <td>${i.state === 'pending' ? `<button class="btn btn-ghost btn-xs" data-revoke="${i.id}">Revoke</button>` : ''}</td>
    </tr>`).join('');
  $('#inv-list').innerHTML = `<table class="adm-table">
    <thead><tr><th>Email</th><th>Name</th><th>Rate</th><th>Expires</th><th>State</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">No invites yet.</td></tr>'}</tbody></table>`;
  $('#inv-list').querySelectorAll('[data-revoke]').forEach((b) => {
    b.addEventListener('click', async () => {
      if (!confirm('Revoke this invite?')) return;
      const r2 = await callAdmin('revoke_invite', { id: b.dataset.revoke });
      if (!r2.ok) { msg('error', 'Revoke failed: ' + r2.error); return; }
      msg('success', 'Invite revoked.'); renderInviteList();
    });
  });
}

// ── Affiliates ──────────────────────────────────────────────────────
async function loadAffiliates() {
  panel('affiliates').innerHTML = `<div class="adm-card"><h3>Affiliates</h3><div id="aff-list" class="adm-wrap-scroll">Loading…</div></div>`;
  const r = await callAdmin('list_affiliates');
  affiliateCache = r.affiliates || [];
  const opt = (v, sel) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${v}</option>`;
  const rows = affiliateCache.map((a) => `
    <tr data-id="${a.id}">
      <td><strong>${esc(a.code)}</strong></td>
      <td><input data-f="vanity_slug" value="${esc(a.vanity_slug || '')}" placeholder="(none)" /></td>
      <td><input class="num" data-f="commission_rate" type="number" step="0.01" min="0" max="1" value="${a.commission_rate}" /></td>
      <td><select data-f="commission_type">${opt('percent', a.commission_type)}${opt('flat', a.commission_type)}</select></td>
      <td><select data-f="status">${['active', 'pending', 'suspended', 'terminated'].map((s) => opt(s, a.status)).join('')}</select></td>
      <td class="num">${a.referrals}</td><td class="num">${a.bookings}</td>
      <td class="num">${money(a.pending + a.approved + a.paid)}</td>
      <td><button class="btn btn-primary btn-xs" data-save="${a.id}">Save</button></td>
    </tr>`).join('');
  $('#aff-list').innerHTML = `<table class="adm-table">
    <thead><tr><th>Code</th><th>Vanity</th><th>Rate</th><th>Type</th><th>Status</th><th class="num">Signups</th><th class="num">Bookings</th><th class="num">Commission</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="9">No affiliates yet.</td></tr>'}</tbody></table>`;

  $('#aff-list').querySelectorAll('[data-save]').forEach((b) => {
    b.addEventListener('click', async () => {
      const tr = b.closest('tr');
      const get = (f) => tr.querySelector(`[data-f="${f}"]`).value;
      const r2 = await callAdmin('update_affiliate', {
        id: b.dataset.save,
        vanity_slug: get('vanity_slug') || null,
        commission_rate: get('commission_rate'),
        commission_type: get('commission_type'),
        status: get('status'),
      });
      if (!r2.ok) { msg('error', 'Save failed: ' + r2.error); return; }
      msg('success', 'Affiliate updated.');
    });
  });
}

// ── Commissions ─────────────────────────────────────────────────────
async function loadCommissions() {
  panel('commissions').innerHTML = `
    <div class="adm-card">
      <h3>Commissions</h3>
      <div class="adm-form-row">
        <div class="field"><label>Filter status</label>
          <select id="com-filter">
            <option value="">All</option><option value="pending">Pending</option>
            <option value="approved">Approved</option><option value="paid">Paid</option>
            <option value="rejected">Rejected</option><option value="reversed">Reversed</option>
          </select>
        </div>
      </div>
      <div id="com-list" class="adm-wrap-scroll">Loading…</div>
    </div>`;
  $('#com-filter').addEventListener('change', (e) => renderCommissions(e.target.value));
  renderCommissions('');
}

async function renderCommissions(status) {
  const r = await callAdmin('list_commissions', { status });
  const rows = (r.commissions || []).map((c) => {
    const code = c.affiliates ? c.affiliates.affiliate_code : '—';
    const act = c.commission_status === 'pending'
      ? `<button class="btn btn-primary btn-xs" data-approve="${c.id}">Approve</button>
         <button class="btn btn-ghost btn-xs" data-reject="${c.id}">Reject</button>` : '';
    return `<tr>
      <td>${esc(c.booking_reference || c.id.slice(0, 8))}</td>
      <td>${esc(code)}</td>
      <td class="num">${money(c.commission_amount, c.commission_currency)}</td>
      <td><span class="adm-pill ${c.commission_status}">${c.commission_status}</span></td>
      <td>${date(c.created_at)}</td>
      <td>${act}</td></tr>`;
  }).join('');
  $('#com-list').innerHTML = `<table class="adm-table">
    <thead><tr><th>Booking</th><th>Affiliate</th><th class="num">Commission</th><th>Status</th><th>Date</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">No commissions.</td></tr>'}</tbody></table>`;
  const wire = (attr, action) => $('#com-list').querySelectorAll(`[${attr}]`).forEach((b) => {
    b.addEventListener('click', async () => {
      const r2 = await callAdmin(action, { order_id: b.getAttribute(attr) });
      if (!r2.ok) { msg('error', 'Failed: ' + r2.error); return; }
      msg('success', 'Updated.'); renderCommissions($('#com-filter').value);
    });
  });
  wire('data-approve', 'approve_commission');
  wire('data-reject', 'reject_commission');
}

// ── Payouts ─────────────────────────────────────────────────────────
async function loadPayouts() {
  if (!affiliateCache.length) { const r = await callAdmin('list_affiliates'); affiliateCache = r.affiliates || []; }
  const opts = affiliateCache.map((a) => `<option value="${a.id}">${esc(a.code)} (${money(a.approved)} approved)</option>`).join('');
  panel('payouts').innerHTML = `
    <div class="adm-card">
      <h3>Build draft payout</h3>
      <p class="acct-sub">Snapshots an affiliate's <strong>approved</strong> commissions into a draft batch. No money moves — execution is deferred.</p>
      <div class="adm-form-row">
        <div class="field"><label>Affiliate</label><select id="pay-aff" style="max-width:260px;">${opts || '<option>(none)</option>'}</select></div>
        <button id="pay-build" class="btn btn-primary btn-xs">Build draft</button>
      </div>
    </div>
    <div class="adm-card"><h3>Payout batches</h3><div id="pay-list" class="adm-wrap-scroll">Loading…</div></div>`;
  $('#pay-build').addEventListener('click', async () => {
    const id = $('#pay-aff').value;
    const r = await callAdmin('build_payout', { affiliate_id: id });
    if (!r.ok) { msg('error', 'Build failed: ' + r.error); return; }
    msg('success', `Draft payout built: ${money(r.payout.total_amount, r.payout.currency)} across ${r.commission_count} commissions.`);
    renderPayouts();
  });
  renderPayouts();
}

async function renderPayouts() {
  const r = await callAdmin('list_payouts');
  const rows = (r.payouts || []).map((p) => `
    <tr>
      <td>${esc(p.affiliates ? p.affiliates.affiliate_code : '—')}</td>
      <td>${date(p.period_start)} – ${date(p.period_end)}</td>
      <td class="num">${money(p.total_amount, p.currency)}</td>
      <td><span class="adm-pill ${p.status}">${p.status}</span></td>
      <td>${date(p.created_at)}</td></tr>`).join('');
  $('#pay-list').innerHTML = `<table class="adm-table">
    <thead><tr><th>Affiliate</th><th>Period</th><th class="num">Total</th><th>Status</th><th>Created</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">No payout batches yet.</td></tr>'}</tbody></table>`;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
