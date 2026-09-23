// ───────────────────────────────────────────────────────────────────
//  wt-affiliate-signup.js — invite-gated affiliate onboarding (Step 3).
//  Powers /AffiliateSignUp. Reads ?invite=<token>, validates it BEFORE
//  showing the form, then creates (or links) the user's account and mints
//  the affiliate via the create-affiliate edge function.
// ───────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { initPasswordToggles } from './wt-password-toggle.js';

const cfg = window.WT_SUPABASE || {};
const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
const FN = cfg.url + '/functions/v1/';
const SITE = window.location.origin;

// ── helpers ─────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
function show(type, msg) {
  const el = $('wt-alert');
  if (!el) return;
  el.className = 'alert show alert-' + type;
  el.textContent = msg;
}
function hideAlert() { const el = $('wt-alert'); if (el) el.className = 'alert'; }
function busy(btn, on, label) {
  if (!btn) return;
  btn.disabled = on;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Working…'; }
  else if (btn.dataset.label) { btn.textContent = btn.dataset.label; }
}
function pct(rate) {
  const r = (rate == null ? 0.05 : Number(rate));
  return (r * 100).toFixed(r * 100 % 1 === 0 ? 0 : 1) + '%';
}
async function callFn(name, body, bearer) {
  const res = await fetch(FN + name, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': cfg.anonKey,
      'Authorization': 'Bearer ' + (bearer || cfg.anonKey),
    },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ ok: false, error: 'network' }));
}

const ERRORS = {
  vanity_taken:     'That custom link is already taken — try another.',
  vanity_reserved:  'That custom link is reserved — please choose another.',
  invalid_vanity:   'Custom link must be 3–30 characters: lowercase letters, numbers, or hyphens.',
  already_affiliate:'This account is already an affiliate. Head to your dashboard.',
  invite_used:      'This invitation has already been used.',
  invite_expired:   'This invitation has expired. Please contact us for a new one.',
  invite_not_found: 'This invitation is not valid.',
  create_failed:    'Something went wrong creating your affiliate account. Please try again.',
  network:          'Network error — please try again.',
};

// ── password confirmation ───────────────────────────────────────────
// The second field exists so a typo in the first one can't lock a new
// partner out of the account we just minted their affiliate code on.
function wirePasswordMatch() {
  const pw = $('aff-password');
  const pw2 = $('aff-password2');
  const note = $('aff-pw-match');
  if (!pw || !pw2 || !note) return;

  const paint = () => {
    // Stay quiet until they've actually started the second field — an
    // empty box isn't a mismatch yet.
    if (!pw2.value) { note.textContent = ''; note.style.color = ''; return; }
    const ok = pw.value === pw2.value;
    note.textContent = ok ? 'Passwords match.' : 'Passwords do not match.';
    // Same two colours the .alert-success / .alert-error text uses — the
    // site's --rust token is azure under the reskin, so a mismatch in it
    // would read as an ordinary link, not a problem.
    note.style.color = ok ? '#1f5b34' : '#8f2c1b';
  };
  pw.addEventListener('input', paint);
  pw2.addEventListener('input', paint);
}

// ── existing accounts ───────────────────────────────────────────────
// A creator who already uses the app must end up with ONE account that is
// also a partner. create-affiliate attaches the partner to whoever is signed
// in, so all this page has to do is get them signed in to the account they
// already have. A sign-in link does that for password and Google accounts
// alike (the site has no Google button), and lands back here to finish.

function inviteUrl(token) {
  return '/AffiliateSignUp/?invite=' + encodeURIComponent(token);
}

async function sendSignInLink(email, token, btn) {
  hideAlert();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { show('error', 'Please enter a valid email address.'); return; }
  busy(btn, true, 'Sending…');
  // Our own function sends it (from partners@), not Supabase Auth's mailer.
  const r = await callFn('partner-signin-link', { token, email });
  busy(btn, false);
  if (!r.ok) {
    const msg = {
      no_account:   "We couldn't find a WhereTo account for " + email + '. Check the spelling, or create a new account below.',
      rate_limited: 'A link was just sent. Please wait a minute before asking for another.',
      invite_invalid: 'This invitation is no longer valid. Please contact us for a new one.',
    }[r.error] || 'Something went wrong sending the link. Please try again.';
    show('error', msg);
    return;
  }
  show('success', 'Check ' + email + ' for a sign-in link. Open it on this device and you will come straight back here to finish.');
}

/** Swap the create-account form for "sign in to the account you have". */
function showExisting(email, providers, token) {
  $('aff-form').style.display = 'none';
  $('aff-existing').style.display = 'block';
  $('aff-existing-email').textContent = email;
  if ((providers || []).includes('email')) {
    $('aff-pw-login').href = '/account/login/?next=' + encodeURIComponent(inviteUrl(token));
    $('aff-pw-login-row').style.display = 'block';
  }
  const btn = $('aff-send-link');
  btn.onclick = () => sendSignInLink(email, token, btn);
}

// ── boot ────────────────────────────────────────────────────────────
async function init() {
  const root = $('wt-affsignup');
  if (!root) return;
  initPasswordToggles();

  const token = new URLSearchParams(location.search).get('invite');
  const loadingEl = $('aff-loading');
  const errorEl   = $('aff-invalid');
  const formWrap  = $('aff-form-wrap');

  if (!token) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = 'This page is invitation-only. Please use the affiliate invite link we sent you.';
    return;
  }

  // 1) Validate the invite before showing anything.
  const v = await callFn('validate-invite', { token });
  loadingEl.style.display = 'none';

  if (!v.ok || !v.valid) {
    errorEl.style.display = 'block';
    const reasonMsg = {
      used:      'This invitation has already been used.',
      expired:   'This invitation has expired. Please contact us for a new one.',
      not_found: 'This invitation link is not valid.',
    }[v.reason] || 'This invitation link is not valid.';
    errorEl.textContent = reasonMsg;
    return;
  }

  // 2) Show the form (commission preview + prefill).
  formWrap.style.display = 'block';
  $('aff-rate').textContent = pct(v.commission_rate);

  // Are we already logged in? Then link this account instead of creating one.
  const { data: sess } = await supabase.auth.getSession();
  let loggedIn = !!sess.session;

  const acctFields = $('aff-account-fields');
  const loggedNote = $('aff-logged-note');
  if (loggedIn) {
    acctFields.style.display = 'none';
    loggedNote.style.display = 'block';
    $('aff-logged-email').textContent = sess.session.user.email || 'your account';
    $('aff-logout').addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.reload();
    });
  } else if (v.account_exists && v.email) {
    showExisting(v.email, v.account_providers, token);
    return;
  } else {
    $('aff-other-link').addEventListener('click', (e) => {
      e.preventDefault();
      $('aff-other').style.display = 'block';
      $('aff-other-email').focus();
    });
    $('aff-other-send').addEventListener('click', () =>
      sendSignInLink(($('aff-other-email').value || '').trim(), token, $('aff-other-send')));
    wirePasswordMatch();
    if (v.email) $('aff-email').value = v.email;
    if (v.intended_name) {
      const parts = v.intended_name.split(' ');
      $('aff-first').value = parts[0] || '';
      $('aff-last').value = parts.slice(1).join(' ') || '';
    }
  }

  // 3) Submit.
  const form = $('aff-form');
  const btn = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const fd = new FormData(form);
    const terms = fd.get('terms') === 'on';
    if (!terms) { show('error', 'Please accept the Affiliate Terms to continue.'); return; }

    const vanity = (fd.get('vanity_slug') || '').toString().trim().toLowerCase();
    if (vanity && !/^[a-z0-9-]{3,30}$/.test(vanity)) {
      show('error', ERRORS.invalid_vanity); return;
    }

    let firstName = '', lastName = '';

    busy(btn, true, 'Creating your affiliate account…');

    // Create the user account if not already signed in.
    if (!loggedIn) {
      firstName = (fd.get('first_name') || '').toString().trim();
      lastName  = (fd.get('last_name') || '').toString().trim();
      const email = (fd.get('email') || '').toString().trim();
      const password = (fd.get('password') || '').toString();
      const confirm  = (fd.get('password_confirm') || '').toString();
      if (password.length < 8) { busy(btn, false); show('error', 'Password must be at least 8 characters.'); return; }
      if (password !== confirm) {
        busy(btn, false);
        show('error', 'The two passwords do not match. Please re-type them.');
        $('aff-password2').focus();
        return;
      }

      const { data: signUpData, error: signErr } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: SITE + '/AffiliateSignUp/?invite=' + encodeURIComponent(token),
          data: { first_name: firstName, last_name: lastName, signup_source: 'web', terms_accepted: true },
        },
      });
      // An email that already has an account never gets a second one. With
      // email confirmation off Supabase says "already registered"; with it on
      // it says nothing and returns a user with no identities instead.
      const exists = (signErr && /already registered/i.test(signErr.message))
        || (!signErr && signUpData.user && Array.isArray(signUpData.user.identities)
            && signUpData.user.identities.length === 0);
      if (exists) {
        busy(btn, false);
        showExisting(email, ['email'], token);
        return;
      }
      if (signErr) {
        busy(btn, false);
        show('error', signErr.message);
        return;
      }
      if (!signUpData.session) {
        // Email confirmation is on → no session yet to mint the affiliate.
        busy(btn, false);
        show('info', 'Account created! Confirm your email, then re-open this invite link to finish becoming an affiliate.');
        form.style.display = 'none';
        return;
      }
      loggedIn = true;
    } else {
      const u = sess.session.user.user_metadata || {};
      firstName = u.first_name || '';
      lastName = u.last_name || '';
    }

    // Mint the affiliate (needs the user's access token).
    const { data: s2 } = await supabase.auth.getSession();
    const accessToken = s2.session?.access_token;
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || (v.intended_name || null);

    const r = await callFn('create-affiliate',
      { token, vanity_slug: vanity || null, display_name: displayName },
      accessToken);
    busy(btn, false);

    if (!r.ok) { show('error', ERRORS[r.error] || ERRORS.create_failed); return; }

    // 4) Success — show the affiliate code + share links.
    renderSuccess(r);
  });
}

function renderSuccess(r) {
  $('aff-form-wrap').style.display = 'none';
  const panel = $('aff-success');
  panel.style.display = 'block';
  $('su-code').textContent = r.affiliate_code;
  $('su-rate').textContent = pct(r.commission_rate);

  const codeLink = SITE + '/promo/' + r.affiliate_code;
  $('su-link').textContent = codeLink;
  $('su-link').setAttribute('data-copy', codeLink);

  if (r.vanity_slug) {
    const vanityLink = SITE + '/promo/' + r.vanity_slug;
    $('su-vanity-row').style.display = 'block';
    $('su-vanity').textContent = vanityLink;
    $('su-vanity').setAttribute('data-copy', vanityLink);
  }

  panel.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(el.getAttribute('data-copy'));
        const old = el.textContent;
        el.textContent = 'Copied!';
        setTimeout(() => { el.textContent = old; }, 1200);
      } catch (_e) { /* clipboard blocked — ignore */ }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }
