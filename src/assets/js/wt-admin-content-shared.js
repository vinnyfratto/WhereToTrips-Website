// ───────────────────────────────────────────────────────────────────
//  wt-admin-content-shared.js — what the Our Content list and a post's
//  summary page share: the platform list and a Copy button for a link.
// ───────────────────────────────────────────────────────────────────
import { esc, notify } from './wt-padmin-core.js';

// The same platforms a partner picks from when they submit content.
export const PLATFORMS = [
  ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'],
  ['pinterest', 'Pinterest'], ['x', 'X'], ['linkedin', 'LinkedIn'], ['newsletter', 'Newsletter'],
  ['podcast', 'Podcast'], ['blog', 'Blog or website'], ['other', 'Other'],
];
const LABEL = Object.fromEntries(PLATFORMS);
export const platformLabel = (v) => LABEL[v] || v || '';

export const copyButton = (url, label = 'Copy') =>
  `<button type="button" class="btn btn-ghost btn-xs oc-copy" data-copy="${esc(url)}">${esc(label)}</button>`;

/** Wires every Copy button inside `host`. */
export function wireCopy(host) {
  host.querySelectorAll('[data-copy]').forEach((b) => {
    if (b.dataset.wired) return;
    b.dataset.wired = '1';
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        const was = b.textContent;
        b.textContent = 'Copied';
        setTimeout(() => { b.textContent = was; }, 1500);
      } catch (_e) {
        notify('error', 'Could not copy. Select the link and copy it by hand.');
      }
    });
  });
}
