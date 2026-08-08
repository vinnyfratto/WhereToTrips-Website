// ───────────────────────────────────────────────────────────────────
//  wt-partner-settings.js — /partner-dashboard/settings/ (Settings).
//  Gated by wt-partner-shared.js's requirePartner(); the actual editor is
//  the shared wt-profile.js (same one /account/profile uses). logoutId is
//  pointed at a non-existent id — the shared partner header's #wt-logout
//  is already wired once by requirePartner(), so wt-profile.js's own
//  default logout wiring would otherwise double-bind the same button.
// ───────────────────────────────────────────────────────────────────
import { requirePartner } from './wt-partner-shared.js';
import { initProfileForm } from './wt-profile.js';

async function init() {
  const ctx = await requirePartner();
  if (!ctx) return;
  await initProfileForm(ctx.supabase, ctx.user, { alertId: 'wt-prof-alert', logoutId: 'wt-logout-handled-by-partner-header' });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }
