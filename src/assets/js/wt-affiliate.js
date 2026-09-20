// ───────────────────────────────────────────────────────────────────
//  wt-affiliate.js — promo-link capture (Step 2).
//  Handles WhereToTrips.com/promo/<code-or-vanity-slug> and the per-post
//  WhereToTrips.com/c/<content-code>.
//
//  Static-host strategy (DECISION): GitHub Pages can't serve a dynamic
//  /promo/:code, so the pretty path is caught by 404.html (the Pages
//  catch-all). Both 404.html and the real /promo/ index call run():
//   1. resolve the code from the path (or ?ref= / ?code= query),
//   2. POST it to the track-click edge function (logs an affiliate_clicks row),
//   3. set a first-party last-click cookie wt_ref (60-day) [+ wt_ref_click],
//   4. redirect to the signup page so attribution flows into signUp metadata.
//
//  /c/<content-code> is the same flow with one difference: the link names
//  a post, not a partner, so who gets the credit is only known once the
//  edge function answers. The cookie is set from that response rather than
//  up front — which also means a failed call leaves no attribution at all,
//  where a /promo/ link would still have credited the partner offline.
//  Worth it: without it there is no way to tell which post did the work.
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

// Pull the code from /promo/<code> (also accepts the legacy /affiliate/<code>)
// or ?ref=/?code= fallback.
export function extractCode() {
  const m = location.pathname.match(/\/(?:promo|affiliate)\/([^/?#]+)/i);
  if (m && m[1]) return decodeURIComponent(m[1]);
  const q = new URLSearchParams(location.search);
  return q.get('ref') || q.get('code') || null;
}

// Pull the per-post code from /c/<content-code>.
export function extractContentCode() {
  const m = location.pathname.match(/^\/c\/([^/?#]+)/i);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

export async function run() {
  const contentCode = extractContentCode();
  const code = contentCode ? null : extractCode();
  if (!contentCode && !code) { window.location.replace('/'); return; }

  // For a /promo/ link the code IS the partner, so set the attribution
  // cookie first (last-click wins) — the credit then survives even if the
  // click-logging request is slow or fails. A /c/ link can't do this: it
  // doesn't know whose post it is until the function says.
  if (code) setCookie('wt_ref', code, REF_DAYS);

  try {
    const res = await fetch(cfg.url + '/functions/v1/track-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.anonKey,
        'Authorization': 'Bearer ' + cfg.anonKey,
      },
      body: JSON.stringify({
        code: code || undefined,
        content_code: contentCode || undefined,
        landing_path: location.pathname + location.search,
        referrer: document.referrer || null,
      }),
    });
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json && json.valid && contentCode && json.affiliate_code) {
        setCookie('wt_ref', json.affiliate_code, REF_DAYS);
        setCookie('wt_content', contentCode, REF_DAYS);
      }
      if (json && json.click_id) setCookie('wt_ref_click', json.click_id, REF_DAYS);
      // Unknown / inactive code, or a post that isn't approved: drop the
      // cookie so we don't mis-credit.
      if (json && json.valid === false) {
        document.cookie = 'wt_ref=; Max-Age=0; path=/; SameSite=Lax';
        document.cookie = 'wt_content=; Max-Age=0; path=/; SameSite=Lax';
      }
    }
  } catch (_e) {
    // Network/edge errors are non-fatal for /promo/ — the cookie is already
    // set. A /c/ link just loses this one click's attribution.
  }

  window.location.replace(DEST);
}
