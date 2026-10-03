// ───────────────────────────────────────────────────────────────────
//  wt-partner-assets.js — /partner-dashboard/assets/ (placeholder).
//  Same partner sign-in as the rest of the portal; the library itself is not built yet.
// ───────────────────────────────────────────────────────────────────
import { portal, portalGate } from './wt-partner-shared.js';

async function init() { portalGate(await portal('me')); }

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
