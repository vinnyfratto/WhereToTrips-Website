// ───────────────────────────────────────────────────────────────────
//  wt-affiliate.js — promo-link capture (Step 2).
//  Handles WhereToTrips.com/promo/<code-or-vanity-slug>.
//
//  Static-host strategy (DECISION): GitHub Pages can't serve a dynamic
//  /promo/:code, so the pretty path is caught by 404.html (the Pages
//  catch-all). Both 404.html and the real /promo/ index call run():
//   1. resolve the code from the path (or ?ref= / ?code= query),
//   2. POST it to the track-click edge function (logs an affiliate_clicks row),
//   3. set a first-party last-click cookie wt_ref (60-day) [+ wt_ref_click],
//   4. redirect to the signup page so attribution flows into signUp metadata.
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

export async function run() {
  const code = extractCode();
  if (!code) { window.location.replace('/'); return; }

  // Always set the attribution cookie first (last-click wins) so the credit
  // survives even if the click-logging request is slow or fails.
  setCookie('wt_ref', code, REF_DAYS);

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
        landing_path: location.pathname + location.search,
        referrer: document.referrer || null,
      }),
    });
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json && json.click_id) setCookie('wt_ref_click', json.click_id, REF_DAYS);
      // Unknown / inactive code: drop the cookie so we don't mis-credit.
      if (json && json.valid === false) {
        document.cookie = 'wt_ref=; Max-Age=0; path=/; SameSite=Lax';
      }
    }
  } catch (_e) {
    // Network/edge errors are non-fatal — the cookie is already set.
  }

  window.location.replace(DEST);
}
