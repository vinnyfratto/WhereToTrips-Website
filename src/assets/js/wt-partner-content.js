// ───────────────────────────────────────────────────────────────────
//  wt-partner-content.js — /partner-dashboard/content/ (Submit Content).
//  Gated by wt-partner-shared.js's requirePartner(); the actual form +
//  submissions list is wt-content-submissions.js (shared, in case another
//  surface embeds it later).
// ───────────────────────────────────────────────────────────────────
import { requirePartner } from './wt-partner-shared.js';
import { initContentSubmissions } from './wt-content-submissions.js';

async function init() {
  const ctx = await requirePartner();
  if (!ctx) return;
  await initContentSubmissions(ctx.supabase, ctx.user);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }
