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
    const res = await fetch(FN + 'get-affiliate-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.anonKey, 'Authorization': 'Bearer ' + token },
      body: '{}',
    });
    stats = await res.json();
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
