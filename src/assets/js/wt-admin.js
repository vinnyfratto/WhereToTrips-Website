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
const COMMISSION_CATS = [
  ['flight', 'Flight Commission'], ['hotel', 'Hotel Commission'],
  ['car', 'Car Rental Commission'], ['insurance', 'Trip Insurance Commission'],
];
function rateLabel(cat) {
  if (!cat) return '—';
  if (cat.type === 'flat') return money(cat.rate);
  const v = Number(cat.rate) * 100;
  return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + '%';
}
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

  // The content alert email deep-links to #content, so a review is one
  // click from the inbox rather than a tab hunt.
  const wanted = location.hash.slice(1);
  if (wanted && document.querySelector(`.adm-tab[data-tab="${wanted}"]`)) switchTab(wanted);
}

function switchTab(name) {
  document.querySelectorAll('.adm-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
  document.querySelectorAll('.adm-panel').forEach((p) => { p.hidden = p.dataset.panel !== name; });
  if (!loaded[name]) {
    loaded[name] = true;
    ({ applications: loadApplications, invites: loadInvites, affiliates: loadAffiliates, content: loadContent, commissions: loadCommissions, payouts: loadPayouts }[name] || (() => {}))();
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
    <div class="adm-grid-2" style="margin-bottom:22px;">
      ${card('App sign-ins', t.app_signins)}
      ${card('Searches', t.searches)}
    </div>
    <div class="adm-card">
      <h3>Top performers</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Code</th><th>Name</th><th class="num">Clicks</th><th class="num">Signups</th><th class="num">Bookings</th><th class="num">Commission</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6">No affiliates yet.</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

// ── Applications ────────────────────────────────────────────────────
// Step 1 of the funnel, sitting in front of Invites so the tabs read in
// the order the work happens. These also appear on /admin-submissions
// with every other contact form, but that page can't act on one — and
// the action an application needs is two tabs away, not two pages away.
const APP_STATE_LABEL = { new: 'Needs review', invited: 'Invited', joined: 'Joined', expired: 'Invite expired' };
// Amber is reserved for "this one needs you". An already-invited
// applicant is waiting on THEM, so it goes grey - both states were
// amber at first and the two were indistinguishable in the row.
const APP_STATE_PILL  = { new: 'pending', invited: 'used', joined: 'approved', expired: 'expired' };

async function loadApplications() {
  panel('applications').innerHTML = `
    <div class="adm-card">
      <h3>Partner applications</h3>
      <p class="acct-sub">Creators who applied through the site. "Invite" carries their name and email into the invite form — check the rates, then create it.</p>
      <div id="app-list" class="adm-wrap-scroll">Loading…</div>
    </div>`;
  renderApplications();
}

async function renderApplications() {
  const list = $('#app-list');
  list.textContent = 'Loading…';
  const r = await callAdmin('list_applications');
  if (!r.ok) { list.innerHTML = '<p class="acct-sub">Could not load applications (' + esc(r.error || 'error') + ').</p>'; return; }

  const rows = (r.rows || []).map((a) => `
    <tr>
      <td>${esc(a.name || '—')}</td>
      <td>${esc(a.email || '—')}</td>
      <td>${a.affiliate_code ? esc(a.affiliate_code) : esc(a.company || '—')}</td>
      <td><span class="adm-pill ${APP_STATE_PILL[a.state] || 'pending'}">${esc(APP_STATE_LABEL[a.state] || a.state)}</span></td>
      <td>${date(a.created_at)}</td>
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
      const row = $('#app-note-' + btn.dataset.appNote);
      if (row) { row.hidden = !row.hidden; btn.textContent = row.hidden ? 'Read' : 'Hide'; }
    });
  });

  list.querySelectorAll('[data-app-invite]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const app = (r.rows || []).find((x) => x.id === btn.dataset.appInvite);
      if (app) inviteFromApplication(app);
    });
  });
}

// Hand the applicant over to the invite form rather than minting an
// invite straight from here: the rates are a per-creator negotiation and
// must not default themselves away behind a single click.
async function inviteFromApplication(app) {
  // Build the panel BEFORE switching: switchTab fires its loader without
  // awaiting it, so switching first would leave us reaching for a form
  // that isn't in the DOM yet. Marking it loaded keeps switchTab from
  // rendering it a second time on top of the values we just filled in.
  if (!loaded.invites) { loaded.invites = true; await loadInvites(); }
  switchTab('invites');

  const form = $('#inv-form');
  if (!form) return;
  if (form.elements.email) form.elements.email.value = app.email || '';
  if (form.elements.intended_name) form.elements.intended_name.value = app.name || '';
  // `source` is a fixed select of named programs, so it's left alone —
  // assigning a value it has no option for sets it to nothing at all.
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  (form.elements.revenue_share_percent || form.elements.email)?.focus();
  msg('success', 'Carried ' + (app.name || app.email) + ' over — check the revenue share, then create the invite.');
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
          <div class="field"><label>Affiliate Source</label>
            <select name="source">
              <option value="Direct">Direct</option>
              <option value="ABC Affiliate Program">ABC Affiliate Program</option>
              <option value="XYZ Affiliate Program">XYZ Affiliate Program</option>
            </select>
          </div>
        </div>
        <p class="adm-subhead">Revenue share</p>
        <div class="adm-form-row">
          <div class="field">
            <label>Revenue Share %</label>
            <input name="revenue_share_percent" type="number" step="1" min="0" max="100" value="30" />
            <span class="hint" style="display:block; margin-top:6px; max-width:46ch;">Their share of the commission WhereTo earns on a booking, not of what the traveller pays. Whole number, so 30 means 30%.</span>
          </div>
        </div>
        <div class="adm-form-row" style="margin-top:10px;">
          <div class="field"><label>Commission Duration (months)</label><input name="commission_duration_months" type="number" value="36" min="1" /></div>
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
      email: fd.get('email'), intended_name: fd.get('intended_name'), source: fd.get('source'),
      commission_duration_months: fd.get('commission_duration_months'), expires_days: fd.get('expires_days'),
      revenue_share_percent: fd.get('revenue_share_percent'),
    });
    if (!r.ok) { msg('error', 'Create failed: ' + r.error); return; }
    const link = SITE + '/AffiliateSignUp/?invite=' + r.token;
    // The link is still shown once whether or not it was emailed: an
    // invite minted without an address has to be handed over some other
    // way, and even an emailed one is worth having on screen if the
    // recipient says it never arrived.
    $('#inv-result').innerHTML = `
      <div class="adm-token-box">
        <strong>${r.emailed ? 'Invite emailed. Link (shown once):' : 'Invite link (copy now — shown once, no email address given):'}</strong><br>
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
    <thead><tr><th>Email</th><th>Name</th><th>Rev share</th><th>Expires</th><th>State</th><th></th></tr></thead>
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
const DEFAULT_COMMISSIONS = {
  flight: { rate: 0.02, type: 'percent' }, hotel: { rate: 0.08, type: 'percent' },
  car: { rate: 0.05, type: 'percent' }, insurance: { rate: 0.08, type: 'percent' },
};
const affExpanded = new Set();

async function loadAffiliates() {
  panel('affiliates').innerHTML = `<div class="adm-card"><h3>Affiliates</h3><div id="aff-list" class="adm-wrap-scroll">Loading…</div></div>`;
  const r = await callAdmin('list_affiliates');
  affiliateCache = r.affiliates || [];
  renderAffiliatesTable();
}

function renderAffiliatesTable() {
  const rows = affiliateCache.map((a) => {
    const main = `<tr>
      <td><strong>${esc(a.code)}</strong></td>
      <td>${esc(a.display_name || '—')}</td>
      <td><span class="adm-pill ${a.status}">${a.status}</span></td>
      <td class="num">${a.clicks}</td>
      <td class="num">${a.referrals}</td>
      <td class="num">${a.app_signins}</td>
      <td class="num">${a.searches}</td>
      <td class="num">${a.bookings}</td>
      <td class="num">${money(a.pending + a.approved + a.paid)}</td>
      <td><button class="btn btn-ghost btn-xs" data-edit="${a.id}">${affExpanded.has(a.id) ? 'Close' : 'Edit'}</button></td>
    </tr>`;
    const editor = affExpanded.has(a.id)
      ? `<tr class="adm-detail"><td colspan="10">${affEditorHtml(a)}</td></tr>` : '';
    return main + editor;
  }).join('');
  $('#aff-list').innerHTML = `<table class="adm-table">
    <thead><tr><th>Code</th><th>Name</th><th>Status</th><th class="num">Clicks</th><th class="num">Signups</th><th class="num">App Sign-Ins</th><th class="num">Searches</th><th class="num">Bookings</th><th class="num">Commission</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="10">No affiliates yet.</td></tr>'}</tbody></table>`;

  $('#aff-list').querySelectorAll('[data-edit]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.edit;
      affExpanded.has(id) ? affExpanded.delete(id) : affExpanded.add(id);
      renderAffiliatesTable();
    });
  });
  $('#aff-list').querySelectorAll('[data-save-aff]').forEach((b) => {
    b.addEventListener('click', () => saveAffiliate(b.dataset.saveAff));
  });
}

function affEditorHtml(a) {
  const c = a.commissions || DEFAULT_COMMISSIONS;
  const months = a.commission_duration_months || 36;
  const opt = (v, sel) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${v}</option>`;
  const srcCurrent = a.source || 'Direct';
  const sources = ['Direct', 'ABC Affiliate Program', 'XYZ Affiliate Program'];
  const srcList = sources.includes(srcCurrent) ? sources : [srcCurrent, ...sources];
  const commRow = (k, label) => {
    const cat = c[k] || {};
    return `<div class="adm-form-row adm-comm-row">
      <div class="field comm-label"><label>${label}</label></div>
      <div class="field"><label class="hint">Rate</label><input data-f="${k}_rate" type="number" step="0.01" min="0" value="${cat.rate ?? ''}" /></div>
      <div class="field"><label class="hint">Type</label><select data-f="${k}_type">${opt('percent', cat.type)}${opt('flat', cat.type)}</select></div>
    </div>`;
  };
  return `<div class="aff-editor" data-aff="${a.id}">
    <div class="adm-form-row">
      <div class="field"><label>Custom link (vanity)</label><input data-f="vanity_slug" value="${esc(a.vanity_slug || '')}" placeholder="(none)" /></div>
      <div class="field"><label>Status</label><select data-f="status">${['active', 'pending', 'suspended', 'terminated'].map((s) => opt(s, a.status)).join('')}</select></div>
      <div class="field"><label>Affiliate Source</label><select data-f="source">${srcList.map((s) => opt(s, srcCurrent)).join('')}</select></div>
    </div>
    <p class="adm-subhead">Commissions</p>
    ${commRow('flight', 'Flight Commission')}
    ${commRow('hotel', 'Hotel Commission')}
    ${commRow('car', 'Car Rental Commission')}
    ${commRow('insurance', 'Trip Insurance Commission')}
    <div class="adm-form-row" style="margin-top:10px;">
      <div class="field"><label>Commission Duration (months)</label><input data-f="commission_duration_months" type="number" min="1" value="${months}" /></div>
      <button class="btn btn-primary btn-xs" data-save-aff="${a.id}">Save changes</button>
    </div>
  </div>`;
}

async function saveAffiliate(id) {
  const root = $(`.aff-editor[data-aff="${id}"]`);
  if (!root) return;
  const get = (f) => { const el = root.querySelector(`[data-f="${f}"]`); return el ? el.value.trim() : ''; };
  const cat = (k) => ({ rate: parseFloat(get(`${k}_rate`)), type: get(`${k}_type`) || 'percent' });
  const r = await callAdmin('update_affiliate', {
    id,
    vanity_slug: get('vanity_slug') || null,
    status: get('status'),
    source: get('source'),
    commission_duration_months: get('commission_duration_months'),
    commissions: { flight: cat('flight'), hotel: cat('hotel'), car: cat('car'), insurance: cat('insurance') },
  });
  if (!r.ok) { msg('error', 'Save failed: ' + r.error); return; }
  msg('success', 'Affiliate updated.');
  const idx = affiliateCache.findIndex((x) => x.id === id);
  if (idx >= 0 && r.affiliate) {
    affiliateCache[idx] = {
      ...affiliateCache[idx],
      vanity_slug: r.affiliate.vanity_slug, status: r.affiliate.status, source: r.affiliate.source,
      commission_duration_months: r.affiliate.commission_duration_months, commissions: r.affiliate.commissions,
    };
  }
  renderAffiliatesTable();
}

// ── Content ─────────────────────────────────────────────────────────
// The review half of the partner content funnel. Approving mints the
// per-post /c/<code> link and emails it to the partner; the code is
// generated server-side in the `admin` edge function, never here.
const CONTENT_PLATFORM = {
  instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook',
  twitter: 'X / Twitter', blog: 'Blog / Website', other: 'Other',
};
let contentFilter = 'pending';

async function loadContent() {
  panel('content').innerHTML = `
    <div class="adm-card">
      <h3>Partner content</h3>
      <p class="acct-sub">Approving a piece mints its own tracking link and emails it to the partner. Rejecting sends them your note instead.</p>
      <div class="adm-form-row" style="margin-bottom:14px;">
        <div class="field">
          <label>Show</label>
          <select id="con-filter">
            <option value="pending">Awaiting review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Not approved</option>
            <option value="">All</option>
          </select>
        </div>
      </div>
      <div id="con-list" class="adm-wrap-scroll">Loading…</div>
    </div>`;

  $('#con-filter').addEventListener('change', (e) => {
    contentFilter = e.target.value;
    renderContent();
  });
  renderContent();
}

async function renderContent() {
  const list = $('#con-list');
  list.textContent = 'Loading…';
  const r = await callAdmin('list_content', { status: contentFilter });
  if (!r.ok) { list.innerHTML = '<p class="acct-sub">Could not load content (' + esc(r.error || 'error') + ').</p>'; return; }

  const rows = (r.rows || []).map((c) => `
    <tr>
      <td>${esc(c.partner_name || c.partner_code || '—')}</td>
      <td>${esc(CONTENT_PLATFORM[c.platform] || c.platform)}</td>
      <td>${esc(c.title || '—')}</td>
      <td><a href="${esc(c.content_url)}" target="_blank" rel="noopener noreferrer">View</a></td>
      <td><span class="adm-pill ${esc(c.status)}">${esc(c.status)}</span></td>
      <td>${c.tracking_url ? `<a data-copy-link="${esc(c.tracking_url)}" href="#">${esc(c.tracking_url)}</a>` : '—'}</td>
      <td class="num">${c.clicks}</td>
      <td>${date(c.created_at)}</td>
      <td>${c.status === 'pending'
        ? `<button class="btn btn-primary btn-xs" data-approve="${c.id}">Approve</button>
           <button class="btn btn-ghost btn-xs" data-reject="${c.id}">Reject</button>`
        : c.status === 'rejected'
          ? `<button class="btn btn-ghost btn-xs" data-approve="${c.id}">Approve</button>`
          : ''}</td>
    </tr>`).join('');

  list.innerHTML = `<table class="adm-table">
    <thead><tr><th>Partner</th><th>Platform</th><th>Title</th><th>Post</th><th>Status</th><th>Tracking link</th><th class="num">Clicks</th><th>Submitted</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="9">Nothing to review.</td></tr>'}</tbody></table>`;

  list.querySelectorAll('[data-copy-link]').forEach((el) => {
    el.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const url = el.getAttribute('data-copy-link');
      try { await navigator.clipboard.writeText(url); el.textContent = 'Copied!'; setTimeout(() => { el.textContent = url; }, 1200); } catch (_e) {}
    });
  });

  list.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', () => review(btn.dataset.approve, 'approved', btn));
  });
  list.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', () => review(btn.dataset.reject, 'rejected', btn));
  });
}

async function review(id, decision, btn) {
  // The note is optional on an approval and goes in the email; on a
  // rejection it is the only thing the partner will be told, so ask for it.
  const prompted = decision === 'rejected'
    ? prompt('Why can\'t this be approved? (the partner sees this)')
    : prompt('Anything to say to the partner? (optional)');
  if (decision === 'rejected' && prompted === null) return;

  btn.disabled = true;
  const r = await callAdmin('review_content', { id, decision, review_note: prompted || '' });
  btn.disabled = false;
  if (!r.ok) { msg('error', 'Review failed: ' + r.error); return; }
  msg('success', decision === 'approved'
    ? 'Approved. Tracking link ' + r.tracking_url + (r.emailed ? ' emailed to the partner.' : ' — no email on file.')
    : 'Marked not approved' + (r.emailed ? ' and the partner was told.' : '.'));
  renderContent();
}

// ── Commissions ─────────────────────────────────────────────────────
const COMMISSION_STATUSES = ['none', 'pending', 'approved', 'paid', 'reversed', 'rejected'];
const COM_COLS = [
  { key: 'booking',    label: 'Booking',        val: (c) => (c.reference || c.id || '').toLowerCase() },
  { key: 'kind',       label: 'Type',           val: (c) => c.booking_kind || '' },
  { key: 'affiliate',  label: 'Affiliate',      val: (c) => (affName(c) || '~~~').toLowerCase() },
  { key: 'amount',     label: 'Booking amount', num: true, val: (c) => Number(c.booking_total || 0) },
  { key: 'commission', label: 'Commission',     num: true, val: (c) => Number(c.commission_amount || 0) },
  { key: 'status',     label: 'Status',         val: (c) => c.commission_status || '' },
  { key: 'date',       label: 'Date',           val: (c) => c.created_at || '' },
];
let comData = [];
let comSort = { key: 'date', dir: 'desc' };
const comExpanded = new Set();

function affName(c) { return c.affiliates ? (c.affiliates.display_name || c.affiliates.affiliate_code) : null; }

async function loadCommissions() {
  if (!affiliateCache.length) { const ra = await callAdmin('list_affiliates'); affiliateCache = ra.affiliates || []; }
  panel('commissions').innerHTML = `
    <div class="adm-card">
      <h3>Commissions</h3>
      <div class="adm-form-row">
        <div class="field"><label>Commission status</label>
          <select id="com-filter">
            <option value="">All</option><option value="none">None</option>
            <option value="pending">Pending</option><option value="approved">Approved</option>
            <option value="paid">Paid</option><option value="rejected">Rejected</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>
        <div class="field"><label>Affiliate</label>
          <select id="com-assigned">
            <option value="">All</option>
            <option value="assigned">Affiliate assigned</option>
            <option value="none">No affiliate</option>
          </select>
        </div>
      </div>
      <div id="com-list" class="adm-wrap-scroll">Loading…</div>
    </div>`;
  $('#com-filter').addEventListener('change', fetchCommissions);
  $('#com-assigned').addEventListener('change', fetchCommissions);
  fetchCommissions();
}

async function fetchCommissions() {
  const r = await callAdmin('list_commissions', { status: $('#com-filter').value, assigned: $('#com-assigned').value });
  comData = r.commissions || [];
  renderCommissionsTable();
}

function renderCommissionsTable() {
  const affOpts = affiliateCache.map((a) => `<option value="${a.id}">${esc(a.display_name || a.code)} (${esc(a.code)})</option>`).join('');

  const col = COM_COLS.find((c) => c.key === comSort.key) || COM_COLS[COM_COLS.length - 1];
  const sorted = [...comData].sort((a, b) => {
    const av = col.val(a), bv = col.val(b);
    const r = col.num ? (av - bv) : (av < bv ? -1 : av > bv ? 1 : 0);
    return comSort.dir === 'asc' ? r : -r;
  });

  const head = COM_COLS.map((c) => {
    const arrow = comSort.key === c.key ? (comSort.dir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<th class="sortable${c.num ? ' num' : ''}" data-sort="${c.key}">${c.label}${arrow}</th>`;
  }).join('');

  const body = sorted.map((c) => {
    const affCell = affName(c)
      ? `<strong>${esc(affName(c))}</strong>`
      : `<select data-assign-sel="${c.id}"><option value="">— select —</option>${affOpts}</select>
         <button class="btn btn-ghost btn-xs" data-assign="${c.id}">Assign</button>`;
    const statusCell = `<select data-status="${c.id}">${COMMISSION_STATUSES.map((s) => `<option value="${s}" ${s === c.commission_status ? 'selected' : ''}>${s}</option>`).join('')}</select>`;
    const main = `<tr>
      <td><a href="#" data-book="${c.id}">${esc(c.reference || c.id.slice(0, 8))}</a></td>
      <td>${esc(c.booking_kind || '—')}</td>
      <td>${affCell}</td>
      <td class="num">${c.booking_total != null ? money(c.booking_total, c.booking_currency) : '—'}</td>
      <td class="num">${c.commission_amount != null ? money(c.commission_amount, c.commission_currency) : '—'}</td>
      <td>${statusCell}</td>
      <td>${date(c.created_at)}</td></tr>`;
    let detail = '';
    if (comExpanded.has(c.id)) {
      const aff = c.affiliates;
      const commLine = (aff && aff.commissions)
        ? `<br><span style="display:inline-block;margin-top:8px;">Affiliate commission — ${COMMISSION_CATS.map(([k, l]) => `${l}: <strong>${rateLabel(aff.commissions[k])}</strong>`).join(' &nbsp;·&nbsp; ')} &nbsp;·&nbsp; Duration: <strong>${aff.commission_duration_months || 36} months</strong>${aff.source ? ` &nbsp;·&nbsp; Source: <strong>${esc(aff.source)}</strong>` : ''}</span>`
        : '';
      detail = `<tr class="adm-detail"><td colspan="7">
        <strong>${esc(c.title || '?')}</strong>
        ${c.where_ ? `&nbsp;·&nbsp; ${esc(c.where_)}` : ''}
        &nbsp;·&nbsp; ${c.starts_on ? date(c.starts_on) : '—'}${c.ends_on ? ` to ${date(c.ends_on)}` : ''}
        &nbsp;·&nbsp; Booking status: ${esc(c.booking_status || '—')}
        &nbsp;·&nbsp; Ref: ${esc(c.reference || '—')}
        &nbsp;·&nbsp; Total: ${money(c.booking_total, c.booking_currency)}
        ${c.commission_hold_until ? `&nbsp;·&nbsp; Held until ${date(c.commission_hold_until)}` : ''}
        ${c.note ? `&nbsp;·&nbsp; ${esc(c.note)}` : ''}
        &nbsp;·&nbsp; Commission ID: ${esc(c.id)}
        &nbsp;·&nbsp; ${esc(c.booking_kind || '')} order: ${esc(c.booking_id || '—')}
        ${commLine}
      </td></tr>`;
    }
    return main + detail;
  }).join('');

  $('#com-list').innerHTML = `<table class="adm-table">
    <thead><tr>${head}</tr></thead>
    <tbody>${body || '<tr><td colspan="7">No bookings.</td></tr>'}</tbody></table>`;

  // Sort by column header.
  $('#com-list').querySelectorAll('th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const k = th.dataset.sort;
      if (comSort.key === k) comSort.dir = comSort.dir === 'asc' ? 'desc' : 'asc';
      else comSort = { key: k, dir: (['amount', 'commission', 'date'].includes(k) ? 'desc' : 'asc') };
      renderCommissionsTable();
    });
  });

  // Click booking id → toggle a detail row.
  $('#com-list').querySelectorAll('[data-book]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.dataset.book;
      comExpanded.has(id) ? comExpanded.delete(id) : comExpanded.add(id);
      renderCommissionsTable();
    });
  });

  // Assign an affiliate (computes commission from the affiliate's rate).
  $('#com-list').querySelectorAll('[data-assign]').forEach((b) => {
    b.addEventListener('click', async () => {
      const sel = $(`[data-assign-sel="${b.dataset.assign}"]`);
      if (!sel || !sel.value) { msg('error', 'Pick an affiliate first.'); return; }
      const r2 = await callAdmin('assign_affiliate', { commission_id: b.dataset.assign, affiliate_id: sel.value });
      if (!r2.ok) { msg('error', 'Assign failed: ' + r2.error); return; }
      msg('success', 'Affiliate assigned + commission calculated.');
      fetchCommissions();
    });
  });

  // Status dropdown — set directly (admin override / testing).
  $('#com-list').querySelectorAll('[data-status]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const r2 = await callAdmin('set_commission_status', { commission_id: sel.dataset.status, status: sel.value });
      if (!r2.ok) { msg('error', 'Failed: ' + r2.error); fetchCommissions(); return; }
      // keep the local row in sync so re-sorts/re-renders reflect it
      const row = comData.find((c) => c.id === sel.dataset.status);
      if (row) row.commission_status = sel.value;
      msg('success', 'Status set to ' + sel.value + '.');
    });
  });
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
