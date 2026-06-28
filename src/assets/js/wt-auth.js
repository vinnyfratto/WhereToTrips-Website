// ───────────────────────────────────────────────────────────────────
//  wt-auth.js — WhereTo website auth + profile (Step 2).
//  Browser-native ES module. Talks to the SAME Supabase project as the app
//  (one user base) using the public anon key + RLS. No service-role key here.
//
//  Pages opt in by rendering a container with data-wt-page="signup|login|
//  reset|profile|account". Affiliate-link capture lives in wt-affiliate.js.
// ───────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { initProfileForm } from './wt-profile.js';

const cfg = window.WT_SUPABASE || {};
export const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // handles confirm / recovery tokens in the URL
  },
});

const SITE = window.location.origin;

// ── small helpers ───────────────────────────────────────────────────
function readCookie(name) {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return m ? decodeURIComponent(m.pop()) : null;
}
function clearCookie(name) {
  document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
}
function show(el, type, msg) {
  if (!el) return;
  el.className = 'alert show alert-' + type;
  el.textContent = msg;
}
function hide(el) { if (el) el.className = 'alert'; }
function busy(btn, on, label) {
  if (!btn) return;
  btn.disabled = on;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Working…'; }
  else if (btn.dataset.label) { btn.textContent = btn.dataset.label; }
}
function friendly(error) {
  const m = (error && error.message) || 'Something went wrong. Please try again.';
  if (/already registered/i.test(m)) return 'An account with this email already exists. Try logging in.';
  if (/invalid login/i.test(m)) return 'Email or password is incorrect.';
  if (/email not confirmed/i.test(m)) return 'Please confirm your email first — check your inbox.';
  return m;
}

// ── SIGNUP ──────────────────────────────────────────────────────────
function initSignup() {
  const form = document.getElementById('wt-signup-form');
  if (!form) return;
  const alertEl = document.getElementById('wt-alert');
  const btn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide(alertEl);

    const fd = new FormData(form);
    const firstName = (fd.get('first_name') || '').toString().trim();
    const lastName  = (fd.get('last_name') || '').toString().trim();
    const email     = (fd.get('email') || '').toString().trim();
    const password  = (fd.get('password') || '').toString();
    const marketing = fd.get('marketing_opt_in') === 'on';
    const terms     = fd.get('terms') === 'on';

    if (!terms) { show(alertEl, 'error', 'Please accept the Terms to continue.'); return; }
    if (password.length < 8) { show(alertEl, 'error', 'Password must be at least 8 characters.'); return; }

    // Affiliate attribution: pass the captured referral straight into auth
    // metadata so the server-side trigger credits it atomically at signup
    // (works even with email confirmation, and can't be spoofed client-side
    // for arbitrary users — see handle_new_user()).
    const refCode    = readCookie('wt_ref');
    const refClickId = readCookie('wt_ref_click');

    busy(btn, true, 'Creating your account…');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: SITE + '/account/login/',
        data: {
          first_name: firstName,
          last_name: lastName,
          signup_source: 'web',
          marketing_opt_in: marketing,
          terms_accepted: true,
          ...(refCode ? { ref_code: refCode } : {}),
          ...(refClickId ? { ref_click_id: refClickId } : {}),
        },
      },
    });
    busy(btn, false);

    if (error) { show(alertEl, 'error', friendly(error)); return; }

    // Attribution cookies have done their job — clear them.
    clearCookie('wt_ref');
    clearCookie('wt_ref_click');

    if (data.session) {
      // Email confirmation disabled → already signed in.
      window.location.href = '/account/profile/';
    } else {
      form.style.display = 'none';
      show(alertEl, 'success',
        'Account created! Check your email to confirm your address, then log in.');
    }
  });
}

// ── LOGIN ───────────────────────────────────────────────────────────
function initLogin() {
  const form = document.getElementById('wt-login-form');
  if (!form) return;
  const alertEl = document.getElementById('wt-alert');
  const btn = form.querySelector('button[type="submit"]');

  // If already signed in, skip straight to profile.
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) window.location.href = '/account/profile/';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide(alertEl);
    const fd = new FormData(form);
    busy(btn, true, 'Signing in…');
    const { error } = await supabase.auth.signInWithPassword({
      email: (fd.get('email') || '').toString().trim(),
      password: (fd.get('password') || '').toString(),
    });
    busy(btn, false);
    if (error) { show(alertEl, 'error', friendly(error)); return; }
    window.location.href = '/account/profile/';
  });
}

// ── PASSWORD RESET (request + set-new from recovery link) ───────────
function initReset() {
  const reqForm = document.getElementById('wt-reset-request-form');
  const setForm = document.getElementById('wt-reset-set-form');
  const alertEl = document.getElementById('wt-alert');

  // When arriving from a recovery email, Supabase establishes a recovery
  // session (detectSessionInUrl). Show the "set new password" form instead.
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      if (reqForm) reqForm.style.display = 'none';
      if (setForm) setForm.style.display = 'block';
      show(alertEl, 'info', 'Enter a new password for your account.');
    }
  });

  if (reqForm) {
    const btn = reqForm.querySelector('button[type="submit"]');
    reqForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hide(alertEl);
      const email = (new FormData(reqForm).get('email') || '').toString().trim();
      busy(btn, true, 'Sending…');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: SITE + '/account/reset/',
      });
      busy(btn, false);
      // Always show success (don't reveal whether the email exists).
      show(alertEl, 'success',
        'If an account exists for that email, a password-reset link is on its way.');
      reqForm.reset();
    });
  }

  if (setForm) {
    const btn = setForm.querySelector('button[type="submit"]');
    setForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hide(alertEl);
      const pw = (new FormData(setForm).get('password') || '').toString();
      if (pw.length < 8) { show(alertEl, 'error', 'Password must be at least 8 characters.'); return; }
      busy(btn, true, 'Updating…');
      const { error } = await supabase.auth.updateUser({ password: pw });
      busy(btn, false);
      if (error) { show(alertEl, 'error', friendly(error)); return; }
      show(alertEl, 'success', 'Password updated. Redirecting to your profile…');
      setTimeout(() => { window.location.href = '/account/profile/'; }, 1200);
    });
  }
}

// ── PROFILE (gated; app↔web parity incl. flight_prefs) ──────────────
async function initProfile() {
  const root = document.getElementById('wt-profile');
  if (!root) return;
  const gate = document.getElementById('wt-gate');

  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) {
    window.location.href = '/account/login/';
    return;
  }
  const user = sess.session.user;

  // Shared editor (same one the affiliate dashboard embeds).
  await initProfileForm(supabase, user);

  if (gate) gate.style.display = 'none';
  root.style.display = 'block';

  // Reveal the affiliate dashboard link if this user is an affiliate.
  try {
    const { data: aff } = await supabase
      .from('affiliates').select('id').eq('user_id', user.id).maybeSingle();
    if (aff) {
      const link = document.getElementById('wt-aff-dash-link');
      if (link) link.style.display = 'inline-block';
    }
  } catch (_e) { /* not an affiliate */ }

  // Reveal the Affiliate Admin link if this user is an admin (own-row RLS read).
  // Authorization is still enforced server-side in the `admin` edge fn.
  try {
    const { data: adm } = await supabase
      .from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
    if (adm) {
      const link = document.getElementById('wt-admin-link');
      if (link) link.style.display = 'inline-block';
    }
  } catch (_e) { /* not an admin */ }
}

// ── ACCOUNT index: route to profile or login ────────────────────────
async function initAccountIndex() {
  const { data } = await supabase.auth.getSession();
  window.location.href = data.session ? '/account/profile/' : '/account/login/';
}

// ── Router ──────────────────────────────────────────────────────────
function boot() {
  const root = document.querySelector('[data-wt-page]');
  const page = root ? root.getAttribute('data-wt-page') : null;
  switch (page) {
    case 'signup':  initSignup();  break;
    case 'login':   initLogin();   break;
    case 'reset':   initReset();   break;
    case 'profile': initProfile(); break;
    case 'account': initAccountIndex(); break;
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else { boot(); }
