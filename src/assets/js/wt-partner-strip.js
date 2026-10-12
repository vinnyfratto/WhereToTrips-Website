// ───────────────────────────────────────────────────────────────────
//  wt-partner-strip.js — fills the status strip under the header on every
//  portal page (tier, revenue share rate, activity window, "View status").
//
//  Loaded by layouts/partner.njk, so no page script has to remember it. The
//  Summary page already receives `status` inside its own `summary` response and
//  draws the strip itself (it sets `stripFrom: page`), so it is skipped here and
//  the status is never asked for twice. If the call fails, or the visitor is not
//  a partner, the strip simply stays hidden: it is a convenience, not a gate.
// ───────────────────────────────────────────────────────────────────
import { loadStatus, drawStrip } from './wt-partner-status.js';

async function run() {
  const el = document.getElementById('pp-strip');
  if (!el || el.dataset.from === 'page') return;
  const status = await loadStatus();
  if (status) drawStrip(status);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
else run();
