// ───────────────────────────────────────────────────────────────────
//  wt-partner-shared.js — shared boot logic for the /partner-dashboard/*
//  pages (Performance, Submit Content, Settings). Each page is its own real
//  URL/Eleventy page sharing layouts/partner.njk + partials/partner-header.njk.
//
//  requirePartner() is the one gate every page calls: no session -> login;
//  no affiliates row (the program's internal/DB name for a partner — see
//  get-affiliate-stats) -> shared "not a partner yet" panel. Also wires the
//  Log out button that lives in the shared header, once, here — so a page
//  that also uses wt-profile.js's initProfileForm() should pass a
//  non-existent logoutId to avoid double-wiring the same button.
// ───────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.WT_SUPABASE || {};
export const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
const FN = cfg.url + '/functions/v1/';

const $ = (id) => document.getElementById(id);

// The server no longer recognizes this session (for example, it was signed out in
// another tab or browser), but this browser still holds the old token. Some pages
// still look fine on that token, and the portal does not. Clear it and sign in again.
async function sessionEnded() {
  const gate = $('wt-dash-gate');
  if (gate) { gate.style.display = ''; gate.textContent = 'Your session has ended. Taking you to sign in…'; }
  try { await supabase.auth.signOut({ scope: 'local' }); } catch (_e) { /* the redirect is what matters */ }
  window.location.href = '/account/login/';
}

function wireLogout() {
  const btn = $('wt-logout');
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/account/login/';
  });
}

// Returns { supabase, user, stats } once the caller is confirmed to be a
// logged-in partner, or null if it isn't (the page has already shown the
// right fallback state — the caller should just stop).
export async function requirePartner() {
  wireLogout();

  const gate = $('wt-dash-gate');
  const notAff = $('wt-dash-notaff');
  const root = $('wt-dash-root');

  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) { window.location.href = '/account/login/'; return null; }
  const user = sess.session.user;
  const token = sess.session.access_token;

  let stats;
  try {
    const ask = async () => (await fetch(FN + 'get-affiliate-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.anonKey, 'Authorization': 'Bearer ' + token },
      body: '{}',
    })).json();
    stats = await ask();
    // A just-issued token can read as "issued at future" for a second or two.
    for (let i = 0; i < 3 && stats && stats.error === 'invalid_session'; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      stats = await ask();
    }
    if (stats && stats.error === 'invalid_session') { await sessionEnded(); return null; }
  } catch (_e) {
    if (gate) gate.textContent = 'Could not load your account. Please refresh.';
    return null;
  }

  if (!stats || !stats.ok) {
    if (gate) gate.textContent = 'Could not load your account. Please refresh.';
    return null;
  }

  if (!stats.is_affiliate) {
    if (gate) gate.style.display = 'none';
    if (notAff) notAff.style.display = 'block';
    return null;
  }

  if (gate) gate.style.display = 'none';
  if (root) root.style.display = 'block';

  return { supabase, user, stats };
}

// ── Portal pages (Summary, Content performance, Bookings, Revenue, Submit) ──
// These talk to the partner-portal edge fn, which resolves the partner from the
// session itself. Nothing here ever sends a partner id.
export async function portal(action, body = {}) {
  wireLogout();
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) { window.location.href = '/account/login/'; return null; }
  const call = async () => {
    const res = await fetch(FN + 'partner-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.anonKey, 'Authorization': 'Bearer ' + sess.session.access_token },
      body: JSON.stringify({ action, ...body }),
    });
    return await res.json();
  };
  try {
    let j = await call();
    // A token minted a moment ago can read as "issued at future" to Supabase's
    // other servers for a second or two. Wait and ask again before giving up.
    for (let i = 0; i < 3 && j && j.error === 'invalid_session'; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      j = await call();
    }
    if (j && j.error === 'invalid_session') { await sessionEnded(); return null; }
    return j;
  } catch (_e) { return { ok: false, error: 'network' }; }
}

// Shows the right fallback for a portal response. Returns true when the page
// should render its data.
export function portalGate(j) {
  const gate = $('wt-dash-gate'), notAff = $('wt-dash-notaff'), root = $('wt-dash-root');
  // null means portal() is already sending the visitor to sign in; leave its message alone.
  if (j === null) return false;
  if (j && j.ok && j.is_affiliate === false) {
    if (gate) gate.style.display = 'none';
    if (notAff) notAff.style.display = 'block';
    return false;
  }
  if (!j || (!j.ok && j.error !== 'invalid')) {
    if (gate) { gate.style.display = ''; gate.textContent = 'We could not load this page. Please refresh.'; }
    return false;
  }
  if (gate) gate.style.display = 'none';
  if (root) root.style.display = 'block';
  return true;
}
