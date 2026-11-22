// ───────────────────────────────────────────────────────────────────
//  wt-partner-strip.js — fills the status strip under the header on every
//  portal page (the partner's name and activity window on the left,
//  revenue share and the tier pill at the right). The name
//  shows even when the status cannot load.
//
//  Loaded by layouts/partner.njk, so no page script has to remember it. The
//  Summary page already receives `status` inside its own `summary` response and
//  draws the strip itself (it sets `stripFrom: page`), so it is skipped here and
//  the status is never asked for twice. If the call fails, or the visitor is not
//  a partner, the strip simply stays hidden: it is a convenience, not a gate.
// ───────────────────────────────────────────────────────────────────
import { loadStatus, drawStrip, setStripName } from './wt-partner-status.js';
import { partnerName } from './wt-partner-shared.js';

async function run() {
  const el = document.getElementById('pp-strip');
  if (!el) return;
  // The partner's name opens the strip on every page, Summary included.
  partnerName().then((n) => { if (n) setStripName(n.full); });
  if (el.dataset.from === 'page') return;
  const status = await loadStatus();
  if (status) drawStrip(status);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
else run();
