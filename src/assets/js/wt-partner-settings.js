// ───────────────────────────────────────────────────────────────────
//  wt-partner-settings.js — /partner-dashboard/settings/ (Profile).
//  Gated by wt-partner-shared.js's requirePartner(); the actual editor is
//  the shared wt-profile.js (same one /account/profile uses). That editor
//  renders its own Log Out button, which is where a partner signs out: the
//  portal header has none.
// ───────────────────────────────────────────────────────────────────
import { requirePartner } from './wt-partner-shared.js';
import { initProfileForm } from './wt-profile.js';

async function init() {
  const ctx = await requirePartner();
  if (!ctx) return;
  await initProfileForm(ctx.supabase, ctx.user, {
    alertId: 'wt-prof-alert',
    rail: false,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }
