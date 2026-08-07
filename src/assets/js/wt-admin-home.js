// ───────────────────────────────────────────────────────────────────
//  wt-admin-home.js — gate for /admin-dashboard/, the jump-off hub that
//  links to every internal admin tool (analytics, affiliate/submission
//  admin, image/content tools, the CMS). No data calls of its own: the
//  page is a tile grid of links, so this only needs the same session +
//  admins-table check every other admin page uses (enforced server-side
//  in the `admin` edge fn — this client check just avoids flashing the
//  tile grid at a signed-out visitor).
// ───────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.WT_SUPABASE || {};
const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
const ADMIN_FN = cfg.url + '/functions/v1/admin';

const $ = (s, r = document) => r.querySelector(s);

async function callAdmin(action, params = {}) {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return { ok: false, error: 'signed_out' };
  const res = await fetch(ADMIN_FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: 'Bearer ' + sess.session.access_token },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json().catch(() => ({ ok: false, error: 'network' }));
}

async function init() {
  if (!$('#wt-admin-page')) return;
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) { window.location.href = '/account/login/'; return; }

  const data = await callAdmin('overview');
  if (!data.ok) {
    $('#adm-gate').style.display = 'none';
    if (data.error === 'forbidden') { $('#adm-denied').style.display = 'block'; }
    else { $('#adm-denied').style.display = 'block'; $('#adm-denied .acct-sub').textContent = 'Could not load admin (' + (data.error || 'error') + ').'; }
    return;
  }

  $('#adm-gate').style.display = 'none';
  $('#adm-root').style.display = 'block';
  $('#adm-logout').addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = '/account/login/'; });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
