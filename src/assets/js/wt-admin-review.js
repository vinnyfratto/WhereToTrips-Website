// ───────────────────────────────────────────────────────────────────
//  wt-admin-review.js — Partner Admin → Review Queue.
//  (Step 1: Pending Review, the queue that was the "Content" tab. The three
//  history tabs arrive in the review step.)
// ───────────────────────────────────────────────────────────────────
import { boot, callCrm, notify, $ } from './wt-padmin-core.js';
import { renderReviewQueue, countWaiting } from './wt-review-queue.js';

boot(async () => {
  const refreshBadge = async () => {
    const n = await countWaiting(callCrm);
    if (n != null && window.wtAdminNav) window.wtAdminNav.setBadge('review', n);
  };
  await renderReviewQueue($('#pa-host'), { call: callCrm, notify, onChange: refreshBadge });
});
