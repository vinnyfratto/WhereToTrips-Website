// ───────────────────────────────────────────────────────────────────
//  wt-padmin-core.js — what every redesigned Partner Admin page shares that
//  needs the signed-in session.
//
//  boot()      signs the caller in (or sends them to the login page), asks the
//              partner-admin function who they are (that call IS the admin
//              check, made on the server), then reveals the page.
//  callFn()    one POST to an edge function with the caller's own session.
//
//  The formatters, ordering and the sortable table are in wt-padmin-ui.js and
//  are re-exported here, so a page needs one import.
// ───────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { $ } from './wt-padmin-ui.js';

export * from './wt-padmin-ui.js';

const cfg = window.WT_SUPABASE || {};
export const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// ── Server calls ────────────────────────────────────────────────────
export async function callFn(fn, action, params = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data && data.session ? data.session.access_token : '';
  try {
    const res = await fetch(`${cfg.url}/functions/v1/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action, ...params }),
    });
    return await res.json().catch(() => ({ ok: false, error: 'network' }));
  } catch (_e) {
    return { ok: false, error: 'network' };
  }
}
export const callPA = (action, params) => callFn('partner-admin', action, params);
export const callAdmin = (action, params) => callFn('admin', action, params);
export const callCrm = (action, params) => callFn('partner-crm', action, params);

// ── Page start ──────────────────────────────────────────────────────
function deny(text) {
  const gate = $('#adm-gate'); if (gate) gate.style.display = 'none';
  const d = $('#adm-denied'); if (!d) return;
  d.style.display = 'block';
  if (text) { const p = d.querySelector('.acct-sub'); if (p) p.textContent = text; }
}

/**
 * Run a page. `run(info)` is called once the caller is a signed-in admin and the
 * page is visible; `info` is what the partner-admin `badges` call returned.
 */
export async function boot(run) {
  if (!$('#wt-admin-page')) return;
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) {
    location.href = '/account/login/?next=' + encodeURIComponent(location.pathname + location.search + location.hash);
    return;
  }

  const info = await callPA('badges');
  if (!info.ok) {
    deny(info.error === 'forbidden' ? '' : 'Could not load this page (' + (info.error || 'error') + ').');
    return;
  }

  // An admin's browser is ours: keep its visits out of site analytics (base.njk).
  try { localStorage.setItem('wt_internal', '1'); } catch (_e) { /* storage blocked */ }

  if (info.review_pending != null && window.wtAdminNav) window.wtAdminNav.setBadge('review', info.review_pending);

  const gateEl = $('#adm-gate'); if (gateEl) gateEl.style.display = 'none';
  const root = $('#adm-root'); if (root) root.style.display = 'block';
  const out = $('#adm-logout');
  if (out) out.addEventListener('click', async () => { await supabase.auth.signOut(); location.href = '/account/login/'; });

  await run(info);
}
