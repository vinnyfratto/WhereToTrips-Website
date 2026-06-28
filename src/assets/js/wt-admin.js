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
  const commissionRow = (k, label, def) => `
    <div class="adm-form-row adm-comm-row">
      <div class="field comm-label"><label>${label}</label></div>
      <div class="field"><label class="hint">Rate</label><input name="${k}_rate" type="number" step="0.01" min="0" value="${def}" /></div>
      <div class="field"><label class="hint">Type</label><select name="${k}_type"><option value="percent">percent</option><option value="flat">flat</option></select></div>
    </div>`;
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
        <p class="adm-subhead">Commissions</p>
        ${commissionRow('flight', 'Flight Commission', 0.02)}
        ${commissionRow('hotel', 'Hotel Commission', 0.08)}
        ${commissionRow('car', 'Car Rental Commission', 0.05)}
        ${commissionRow('insurance', 'Trip Insurance Commission', 0.08)}
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
      flight_rate: fd.get('flight_rate'), flight_type: fd.get('flight_type'),
      hotel_rate: fd.get('hotel_rate'), hotel_type: fd.get('hotel_type'),
      car_rate: fd.get('car_rate'), car_type: fd.get('car_type'),
      insurance_rate: fd.get('insurance_rate'), insurance_type: fd.get('insurance_type'),
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
      <td class="num">${a.referrals}</td>
      <td class="num">${a.bookings}</td>
      <td class="num">${money(a.pending + a.approved + a.paid)}</td>
      <td><button class="btn btn-ghost btn-xs" data-edit="${a.id}">${affExpanded.has(a.id) ? 'Close' : 'Edit'}</button></td>
    </tr>`;
    const editor = affExpanded.has(a.id)
      ? `<tr class="adm-detail"><td colspan="7">${affEditorHtml(a)}</td></tr>` : '';
    return main + editor;
  }).join('');
  $('#aff-list').innerHTML = `<table class="adm-table">
    <thead><tr><th>Code</th><th>Name</th><th>Status</th><th class="num">Signups</th><th class="num">Bookings</th><th class="num">Commission</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7">No affiliates yet.</td></tr>'}</tbody></table>`;

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

// ── Commissions ─────────────────────────────────────────────────────
const COMMISSION_STATUSES = ['none', 'pending', 'approved', 'paid', 'reversed', 'rejected'];
const COM_COLS = [
  { key: 'booking',    label: 'Booking',        val: (c) => (c.booking_reference || c.id || '').toLowerCase() },
  { key: 'affiliate',  label: 'Affiliate',      val: (c) => (affName(c) || '~~~').toLowerCase() },
  { key: 'amount',     label: 'Booking amount', num: true, val: (c) => Number(c.total_amount || 0) },
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

  const col = COM_COLS.find((c) => c.key === comSort.key) || COM_COLS[5];
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
      <td><a href="#" data-book="${c.id}">${esc(c.booking_reference || c.id.slice(0, 8))}</a></td>
      <td>${affCell}</td>
      <td class="num">${c.total_amount != null ? money(c.total_amount, c.total_currency) : '—'}</td>
      <td class="num">${c.commission_amount != null ? money(c.commission_amount, c.commission_currency) : '—'}</td>
      <td>${statusCell}</td>
      <td>${date(c.created_at)}</td></tr>`;
    let detail = '';
    if (comExpanded.has(c.id)) {
      const aff = c.affiliates;
      const commLine = (aff && aff.commissions)
        ? `<br><span style="display:inline-block;margin-top:8px;">Affiliate commission — ${COMMISSION_CATS.map(([k, l]) => `${l}: <strong>${rateLabel(aff.commissions[k])}</strong>`).join(' &nbsp;·&nbsp; ')} &nbsp;·&nbsp; Duration: <strong>${aff.commission_duration_months || 36} months</strong>${aff.source ? ` &nbsp;·&nbsp; Source: <strong>${esc(aff.source)}</strong>` : ''}</span>`
        : '';
      detail = `<tr class="adm-detail"><td colspan="6">
        <strong>${esc(c.origin || '?')} → ${esc(c.destination || '?')}</strong>
        &nbsp;·&nbsp; Depart ${c.departing_at ? date(c.departing_at) : '—'}
        &nbsp;·&nbsp; ${c.passenger_count || 1} pax
        &nbsp;·&nbsp; Order status: ${esc(c.status || '—')}
        &nbsp;·&nbsp; Ref: ${esc(c.booking_reference || '—')}
        &nbsp;·&nbsp; Total: ${money(c.total_amount, c.total_currency)}
        &nbsp;·&nbsp; Order ID: ${esc(c.id)}
        ${commLine}
      </td></tr>`;
    }
    return main + detail;
  }).join('');

  $('#com-list').innerHTML = `<table class="adm-table">
    <thead><tr>${head}</tr></thead>
    <tbody>${body || '<tr><td colspan="6">No orders.</td></tr>'}</tbody></table>`;

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
      const r2 = await callAdmin('assign_affiliate', { order_id: b.dataset.assign, affiliate_id: sel.value });
      if (!r2.ok) { msg('error', 'Assign failed: ' + r2.error); return; }
      msg('success', 'Affiliate assigned + commission calculated.');
      fetchCommissions();
    });
  });

  // Status dropdown — set directly (admin override / testing).
  $('#com-list').querySelectorAll('[data-status]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const r2 = await callAdmin('set_commission_status', { order_id: sel.dataset.status, status: sel.value });
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
