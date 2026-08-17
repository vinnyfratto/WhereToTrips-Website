// ───────────────────────────────────────────────────────────────────
//  wt-crm-shared.js — Partner CRM client plumbing shared by the CRM pages.
//
//  Every data call goes through the `partner-crm` edge function, which checks
//  `admins` membership AND the graded CRM role server-side. The client-side
//  gate here is cosmetic: it exists only to avoid flashing the UI at a
//  signed-out visitor, exactly as wt-admin-home.js does. Real authorization is
//  never in the browser.
// ───────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.WT_SUPABASE || {};
export const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const CRM_FN = cfg.url + '/functions/v1/partner-crm';
let TOKEN = null;

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const panel = (name) => $(`[data-panel="${name}"]`);

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function date(s) {
  return s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export function dateTime(s) {
  return s ? new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

export function daysAgo(s) {
  if (!s) return '—';
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return '1 day';
  return `${d} days`;
}

export function titleise(s) {
  return String(s ?? '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function msg(type, text) {
  const m = $('#adm-msg');
  if (!m) return;
  m.className = 'alert show alert-' + type;
  m.textContent = text;
  // Errors from a stage gate are long and worth reading, so give them longer.
  setTimeout(() => { if (m.textContent === text) m.className = 'alert'; }, type === 'error' ? 12000 : 5000);
}

export async function callCrm(action, params = {}) {
  const res = await fetch(CRM_FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.anonKey,
      Authorization: 'Bearer ' + TOKEN,
    },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json().catch(() => ({ ok: false, error: 'network' }));
}

/**
 * Shared boot: require a session, confirm the caller passes the server-side
 * admin + role gate, then reveal the page. Returns the overview payload so
 * callers do not need a second round trip.
 */
export async function bootAdminPage() {
  if (!$('#wt-admin-page')) return null;

  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) { window.location.href = '/account/login/'; return null; }
  TOKEN = sess.session.access_token;

  const data = await callCrm('overview');
  if (!data.ok) {
    $('#adm-gate').style.display = 'none';
    $('#adm-denied').style.display = 'block';
    if (data.error !== 'forbidden') {
      const sub = $('#adm-denied .acct-sub');
      // 'unknown_action' means the edge function is deployed but this build is
      // newer, and a Postgres relation error means the migrations have not run.
      // Both are worth saying plainly rather than showing a bare "denied".
      sub.textContent = /relation .* does not exist/i.test(data.error || '')
        ? 'The Partner CRM tables are not in the database yet. Run the three partner_crm_*.sql migrations, then reload.'
        : 'Could not load the CRM (' + (data.error || 'error') + ').';
    }
    return null;
  }

  $('#adm-gate').style.display = 'none';
  $('#adm-root').style.display = 'block';
  $('#adm-logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/account/login/';
  });
  return data;
}

/** Tab wiring shared by both CRM pages. `onShow(name)` loads lazily, once. */
export function wireTabs(onShow) {
  const loaded = {};
  $$('.adm-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.tab;
      $$('.adm-tab').forEach((b) => b.classList.toggle('is-active', b === btn));
      $$('.adm-panel').forEach((p) => { p.hidden = p.dataset.panel !== name; });
      if (!loaded[name]) { loaded[name] = true; onShow(name); }
    });
  });
}

/**
 * Minimal RFC 4180 CSV reader: handles quoted fields, embedded commas,
 * embedded newlines, and doubled quotes. Used by the import screen so a
 * pasted or uploaded file behaves the way a spreadsheet export actually looks.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const nonEmpty = rows.filter((r) => r.some((c) => String(c).trim().length));
  if (!nonEmpty.length) return { headers: [], records: [] };

  // Headers are the contract between the file and the importer, matched on
  // text rather than position, so column order and extra columns are tolerated
  // (Appendix C). Normalisation itself happens server-side.
  const headers = nonEmpty[0].map((h) => String(h).trim());
  const records = nonEmpty.slice(1).map((r) => {
    const o = {};
    headers.forEach((h, i) => { o[h] = r[i] ?? ''; });
    return o;
  });
  return { headers, records };
}
