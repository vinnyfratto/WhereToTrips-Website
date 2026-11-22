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

const TILE = { instagram: 'IG', facebook: 'FB', tiktok: 'TT', youtube: 'YT', pinterest: 'PI', x: 'X', linkedin: 'IN', newsletter: 'NL', podcast: 'PC', blog: 'BL', other: '?' };

/**
 * A post's preview: its image when the piece came with one, else a platform
 * tile. It opens the piece itself (the file sent with it, else where it is
 * posted) in a new tab; with neither, there is nothing to open and it is not a link.
 */
export function previewHtml(r, size = '') {
  const p = r.preview || {};
  const img = p.image_url
    ? `<img class="oc-tile${size ? ' oc-tile--' + size : ''}" src="${esc(p.image_url)}" alt="" loading="lazy">`
    : `<span class="oc-tile oc-tile--${esc(r.platform || 'other')}${size ? ' oc-tile--' + size : ''}" aria-hidden="true">${esc(TILE[r.platform] || '?')}</span>`;
  const href = p.open_url;
  if (!href || !/^https:\/\//i.test(href)) return `<span class="oc-tile-wrap" title="Nothing to open yet: add where it is posted">${img}</span>`;
  return `<a class="oc-tile-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer" title="Open ${esc(r.title)}" aria-label="Open ${esc(r.title)} in a new tab">${img}</a>`;
}
