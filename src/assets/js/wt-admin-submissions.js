// ───────────────────────────────────────────────────────────────────
//  wt-admin-submissions.js — internal early-access / contact admin panel.
//  Every data call goes through the `admin` edge fn, which verifies the
//  caller is in the `admins` table server-side — same gate as the
//  affiliate admin (wt-admin.js). No admin capability is reachable from
//  the browser without that server-side check.
// ───────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.WT_SUPABASE || {};
const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
const ADMIN_FN = cfg.url + '/functions/v1/admin';

let TOKEN = null;
const loaded = {};

const $ = (s, r = document) => r.querySelector(s);
const panel = (name) => $(`[data-panel="${name}"]`);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function date(s) { return s ? new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'; }
function msg(type, text) { const m = $('#adm-msg'); m.className = 'alert show alert-' + type; m.textContent = text; setTimeout(() => { if (m.textContent === text) m.className = 'alert'; }, 5000); }

async function callAdmin(action, params = {}) {
  const res = await fetch(ADMIN_FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: 'Bearer ' + TOKEN },
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

  const data = await callAdmin('submissions_overview');
  if (!data.ok) {
    $('#adm-gate').style.display = 'none';
    if (data.error === 'forbidden') { $('#adm-denied').style.display = 'block'; }
    else { $('#adm-denied').style.display = 'block'; $('#adm-denied .acct-sub').textContent = 'Could not load admin (' + (data.error || 'error') + ').'; }
    return;
  }

  $('#adm-gate').style.display = 'none';
  $('#adm-root').style.display = 'block';

  $('#adm-logout').addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = '/account/login/'; });

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
    loadList(name);
  }
}

// ── Overview ────────────────────────────────────────────────────────
function renderOverview(d) {
  const card = (label, val) => `<div class="stat-card"><p class="label">${label}</p><p class="value">${val}</p></div>`;
  const rows = (d.last_14_days || []).map((r) => `<tr><td>${esc(r.date)}</td><td class="num">${r.count}</td></tr>`).join('');

  panel('overview').innerHTML = `
    <div class="adm-overview-grid">
      ${card('Total submissions', d.total)}
      ${card('Early access', d.by_intent.early_access || 0)}
      ${card('Contact', d.by_intent.contact || 0)}
    </div>
    <div class="adm-card">
      <h3>Last 14 days</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Date</th><th class="num">Submissions</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="2">No submissions yet.</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

// ── Early Access / Contact lists ────────────────────────────────────
async function loadList(intent) {
  panel(intent).innerHTML = `
    <div class="adm-card">
      <div class="adm-form-row">
        <div class="field"><label>Search (name or email)</label><input id="sub-search-${intent}" type="text" placeholder="jane@example.com" /></div>
      </div>
      <div id="sub-list-${intent}" class="adm-wrap-scroll">Loading…</div>
    </div>`;
  $(`#sub-search-${intent}`).addEventListener('input', debounce(() => fetchList(intent), 300));
  fetchList(intent);
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

async function fetchList(intent) {
  const search = $(`#sub-search-${intent}`) ? $(`#sub-search-${intent}`).value.trim() : '';
  const r = await callAdmin('list_submissions', { intent, search });
  const rows = (r.submissions || []).map((s) => `
    <tr>
      <td>${date(s.created_at)}</td>
      <td>${esc(s.name || '—')}</td>
      <td>${esc(s.email || '—')}</td>
      <td>${esc(s.company || '—')}</td>
      <td>${esc((s.message || s.subject || '—'))}</td>
      <td>${esc(s.source_path || '—')}</td>
      <td>${esc(s.utm_source || '—')}</td>
      <td><button class="btn btn-ghost btn-xs" data-del="${s.id}">Delete</button></td>
    </tr>`).join('');
  const list = $(`#sub-list-${intent}`);
  if (!list) return;
  list.innerHTML = `<table class="adm-table">
    <thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Company</th><th>Message</th><th>Page</th><th>UTM source</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="8">No submissions yet.</td></tr>'}</tbody></table>`;
  list.querySelectorAll('[data-del]').forEach((b) => {
    b.addEventListener('click', async () => {
      if (!confirm('Delete this submission?')) return;
      const r2 = await callAdmin('delete_submission', { id: b.dataset.del });
      if (!r2.ok) { msg('error', 'Delete failed: ' + r2.error); return; }
      msg('success', 'Submission deleted.');
      fetchList(intent);
    });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
