// ───────────────────────────────────────────────────────────────────
//  wt-internal-accounts.js — shared allowlist of internal/test accounts
//  whose website traffic shouldn't count. Called from wt-auth.js (signup +
//  login) and wt-profile.js (profile page load, so an already-logged-in
//  return visit is covered too, not just a fresh login).
//
//  Fully suppresses PostHog capture for these emails via
//  posthog.opt_out_capturing() rather than filtering them out in reporting
//  — no events get created at all, so they don't inflate volume or pollute
//  the /analytics/ dashboard. Sticks per-browser via PostHog's own
//  persistence until posthog.opt_in_capturing() is called manually.
//
//  App-side exclusion is a deliberate NOT-yet: per docs/analytics/CLAUDE.md,
//  Vinny + Chris are still the only real app testers pre-launch, so opting
//  the app out too would drop nearly all current app event data. Revisit at
//  app go-live (2026-08-19 decision).
// ───────────────────────────────────────────────────────────────────
const INTERNAL_TEST_EMAILS = new Set([
  'vinnyfratto@gmail.com',
  'vinnytemp1@yahoo.com',
  'vinny.upsidedownshirts@gmail.com',
  'vinny.geekhousecoffee@gmail.com',
  'cctx01@gmail.com',
  'vfratto@vcinnovationsgroup.com',
  'ccupero@vcinnovationsgroup.com',
]);

export function maybeOptOutInternal(email) {
  if (!window.posthog || !email) return;
  if (INTERNAL_TEST_EMAILS.has(String(email).trim().toLowerCase())) {
    window.posthog.opt_out_capturing();
  }
}
