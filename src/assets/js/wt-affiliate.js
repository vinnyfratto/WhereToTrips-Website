// ───────────────────────────────────────────────────────────────────
//  wt-affiliate.js — promo-link capture (Step 2).
//  Handles WhereToTrips.com/promo/<code-or-vanity-slug> and the per-post
//  WhereToTrips.com/promo/<code-or-vanity-slug>/<content-code>.
//
//  Static-host strategy (DECISION): GitHub Pages can't serve a dynamic
//  /promo/:code, so the pretty path is caught by 404.html (the Pages
//  catch-all). Both 404.html and the real /promo/ index call run():
//   1. resolve the code from the path (or ?ref= / ?code= query),
//   2. POST it to the track-click edge function (logs an affiliate_clicks row),
//   3. set a first-party last-click cookie wt_ref (60-day) [+ wt_ref_click],
//   4. redirect to the signup page so attribution flows into signUp metadata.
//
//  A per-post link is the same flow with one more segment. Because the
//  partner is still the FIRST segment, the wt_ref cookie is set up front
//  exactly as before — a failed or slow click call costs the per-post
//  detail, never the partner's credit. That is the whole reason the link
//  reads /promo/<partner>/<post> rather than naming only the post.
// ───────────────────────────────────────────────────────────────────
const cfg = window.WT_SUPABASE || {};
const REF_DAYS = 60;
const DEST = '/account/signup/'; // where a referred visitor lands to convert

function setCookie(name, value, days) {
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie =
    name + '=' + encodeURIComponent(value) +
    '; Expires=' + exp + '; Path=/; SameSite=Lax' +
    (location.protocol === 'https:' ? '; Secure' : '');
}

// Pull the partner from /promo/<code> (also accepts the legacy
// /affiliate/<code>) or the ?ref=/?code= fallback.
export function extractCode() {
  const m = location.pathname.match(/\/(?:promo|affiliate)\/([^/?#]+)/i);
  if (m && m[1]) return decodeURIComponent(m[1]);
  const q = new URLSearchParams(location.search);
  return q.get('ref') || q.get('code') || null;
}

// Pull the post from the second segment of /promo/<partner>/<content-code>.
// A code is only unique within its partner, so it is never read on its own.
export function extractContentCode() {
  const m = location.pathname.match(/\/(?:promo|affiliate)\/[^/?#]+\/([^/?#]+)/i);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

export async function run() {
  const code = extractCode();
  const contentCode = extractContentCode();
  if (!code) { window.location.replace('/'); return; }

  // The first segment IS the partner, so set the attribution cookie before
  // anything else (last-click wins). The credit then survives even if the
  // click-logging request is slow or fails; only the per-post detail, which
  // lives server-side on the click row, depends on that call landing.
  setCookie('wt_ref', code, REF_DAYS);
  if (contentCode) setCookie('wt_content', contentCode, REF_DAYS);

  try {
    const res = await fetch(cfg.url + '/functions/v1/track-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.anonKey,
        'Authorization': 'Bearer ' + cfg.anonKey,
      },
      body: JSON.stringify({
        code,
        content_code: contentCode || undefined,
        landing_path: location.pathname + location.search,
        referrer: document.referrer || null,
      }),
    });
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json && json.click_id) setCookie('wt_ref_click', json.click_id, REF_DAYS);
      // Unknown / inactive code, or a post that isn't approved: drop the
      // cookie so we don't mis-credit.
      if (json && json.valid === false) {
        document.cookie = 'wt_ref=; Max-Age=0; path=/; SameSite=Lax';
        document.cookie = 'wt_content=; Max-Age=0; path=/; SameSite=Lax';
      }
    }
  } catch (_e) {
    // Network/edge errors are non-fatal — the cookie is already set, so the
    // partner keeps the credit either way.
  }

  window.location.replace(DEST);
}
