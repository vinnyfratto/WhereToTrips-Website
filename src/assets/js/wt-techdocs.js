// ───────────────────────────────────────────────────────────────────
//  wt-techdocs.js — access gate for the internal /techdocs/ page.
//  Only the accounts in ALLOW may view the rendered docs.
//
//  SCOPE / LIMITATION: this is an ACCOUNT-LEVEL gate at the UI. The docs are
//  baked into the static page HTML at build time, so this restricts who sees
//  them in the browser, not who can retrieve the page source. For true
//  confidentiality, make the app repo private and serve the docs through an
//  auth-checked endpoint (a Supabase Edge Function that verifies the JWT +
//  email, the same way get-affiliate-stats does).
//
//  To change who has access, edit the ALLOW list below.
// ───────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOW = [
  'vinnyfratto@gmail.com',
  'cctx01@gmail.com',
  'vinnytemp1@yahoo.com',
];

const cfg = window.WT_SUPABASE || {};
const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const LOGIN = '/account/login/?next=' + encodeURIComponent('/techdocs/');

async function init() {
  const gate = document.getElementById('td-gate');
  const denied = document.getElementById('td-denied');
  const content = document.getElementById('td-content');
  if (!gate || !content) return;

  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (_e) { /* treat as logged out */ }

  // Not signed in → send to login, then back here.
  if (!session) {
    window.location.href = LOGIN;
    return;
  }

  const email = ((session.user && session.user.email) || '').toLowerCase();
  if (ALLOW.indexOf(email) === -1) {
    const who = document.getElementById('td-who');
    if (who) who.textContent = email || 'this account';
    const out = document.getElementById('td-logout');
    if (out) out.addEventListener('click', async () => {
      try { await supabase.auth.signOut(); } catch (_e) { /* ignore */ }
      window.location.href = LOGIN;
    });
    gate.style.display = 'none';
    denied.style.display = 'block';
    return;
  }

  // Authorized.
  gate.style.display = 'none';
  content.style.display = 'block';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }
