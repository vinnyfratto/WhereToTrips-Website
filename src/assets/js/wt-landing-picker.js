// ───────────────────────────────────────────────────────────────────
//  wt-landing-picker.js — "Link opens": which page a partner's tracking link
//  sends a visitor to. Used where a reviewer approves a piece (Review Queue,
//  the CRM hub's queue tab, the program admin's Content tab) and where an
//  approved link's page is changed later (Review Queue → Approved Requests).
//
//  The choice is stored on the tracking asset, never in the link itself, so a
//  link already posted in a caption keeps working and only its destination
//  moves. Empty means the default: sign-up on a computer, Get the App on a
//  phone, which is what every link did before a page could be picked.
//
//  The page list is /assets/data/landing-pages.json, built from the sitemap,
//  so every public page on the site is offered with nothing to maintain. The
//  Help Center is Zoho, not this site, so it is never in the list. "Another
//  page" takes a typed path (a query string or #anchor is fine) and checks the
//  page exists before it is saved.
//
//  The server (partner-crm cleanLandingPath) is the real gate; the checks here
//  are only so a mistake is caught before the click, in plain words.
// ───────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const DEFAULT_LABEL = 'Default: sign-up on a computer, Get the App on a phone';
const CUSTOM = '__custom';
const BLOCKED = ['/promo', '/affiliate', '/admin', '/partner-dashboard', '/dashboard', '/help', '/api', '/auth'];

// Sections of the dropdown, by the page's first path segment. Anything not
// named here lands in "Other pages", so a new section still shows up.
const GROUPS = [
  ['Sign-up and the app', (u) => u === '/account/signup/' || u === '/get-app/' || u === '/app/'],
  ['Main pages', (u) => u === '/' || /^\/(how-it-works|whereto|wander|faq)\//.test(u)],
  ['Partners', (u) => u.startsWith('/partners/')],
  ['Travel vibes', (u) => u.startsWith('/travel-vibes/')],
  ['Featured vibes', (u) => u.startsWith('/featured-vibes/')],
  ['Destinations', (u) => u.startsWith('/destinations/')],
  ['Insights', (u) => u.startsWith('/insights/')],
  ['About, press and legal', (u) => /^\/(about|press|contact|legal|privacy-choices)\//.test(u)],
];

let pagesPromise = null;
/** Every page a link may open: [{ url, title }], sign-up and Get the App first. */
export function loadPages() {
  if (!pagesPromise) {
    pagesPromise = fetch('/assets/data/landing-pages.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : { extra: [], pages: [] }))
      .then((d) => {
        const seen = new Set();
        return [...(d.extra || []), ...(d.pages || [])].filter((p) => p && p.url && !seen.has(p.url) && seen.add(p.url))
          .map((p) => ({ url: p.url, title: shortTitle(p.title) || p.url }));
      })
      .catch(() => []);
  }
  return pagesPromise;
}

// "How WhereTo Works — Start with what you want to do" reads as "How WhereTo Works".
function shortTitle(t) {
  return String(t || '').split(/\s+[—|]\s+/)[0].trim();
}

/** What a stored path reads as in a table: the page's title, or the path itself. */
export function landingLabel(path, pages = []) {
  if (!path) return 'Default (sign-up / Get the App)';
  const bare = path.split(/[?#]/)[0];
  const hit = pages.find((p) => p.url === path) || pages.find((p) => p.url === bare);
  return hit ? (hit.url === path ? hit.title : `${hit.title} (${path.slice(bare.length)})`) : path;
}

/** The field's markup. Call wireLandingPicker() on it once it is in the page. */
export function landingPickerHtml(id, { label = 'Link opens', hint = 'the page a visitor lands on when they open this tracking link' } = {}) {
  return `
    <div class="field" data-landing-picker="${esc(id)}">
      <label for="${esc(id)}">${esc(label)} <span class="hint">(${esc(hint)})</span></label>
      <select id="${esc(id)}" data-landing-select><option value="">${esc(DEFAULT_LABEL)}</option></select>
      <input type="text" data-landing-custom placeholder="/partners/creators/directory/" autocomplete="off" spellcheck="false" hidden
        aria-label="Path of the page on wheretotrips.com" style="margin-top:6px;" />
      <span class="hint" data-landing-note></span>
    </div>`;
}

/** Fills the dropdown and selects `current` (a stored path, or null for the default). */
export async function wireLandingPicker(root, current = null) {
  const box = root.matches('[data-landing-picker]') ? root : root.querySelector('[data-landing-picker]');
  if (!box) return;
  const sel = box.querySelector('[data-landing-select]');
  const custom = box.querySelector('[data-landing-custom]');
  const note = box.querySelector('[data-landing-note]');
  const pages = await loadPages();

  const grouped = new Map(GROUPS.map(([name]) => [name, []]));
  grouped.set('Other pages', []);
  for (const p of pages) {
    const g = GROUPS.find(([, test]) => test(p.url));
    grouped.get(g ? g[0] : 'Other pages').push(p);
  }
  sel.innerHTML = `<option value="">${esc(DEFAULT_LABEL)}</option>`
    + [...grouped].filter(([, list]) => list.length).map(([name, list]) => `<optgroup label="${esc(name)}">${
      list.map((p) => `<option value="${esc(p.url)}">${esc(p.title)} · ${esc(p.url)}</option>`).join('')}</optgroup>`).join('')
    + `<option value="${CUSTOM}">Another page (type the path)…</option>`;

  const sync = () => {
    custom.hidden = sel.value !== CUSTOM;
    note.textContent = '';
    if (!custom.hidden) custom.focus();
  };
  sel.addEventListener('change', sync);
  custom.addEventListener('input', () => { note.textContent = ''; });

  if (current && pages.some((p) => p.url === current)) sel.value = current;
  else if (current) { sel.value = CUSTOM; custom.value = current; }
  else sel.value = '';
  custom.hidden = sel.value !== CUSTOM;
}

function checkPath(v) {
  if (/^https?:\/\//i.test(v)) {
    let u;
    try { u = new URL(v); } catch { return { ok: false, error: 'That link could not be read.' }; }
    if (!/^(www\.)?wheretotrips\.com$/i.test(u.hostname)) return { ok: false, error: 'The page must be on wheretotrips.com.' };
    v = u.pathname + u.search + u.hash;
  }
  if (!v.startsWith('/') || v.startsWith('//')) return { ok: false, error: 'Type a path on wheretotrips.com, starting with / (for example /partners/).' };
  if (/[\s\\]/.test(v)) return { ok: false, error: 'The path cannot contain spaces or backslashes.' };
  const lower = v.toLowerCase();
  const blocked = BLOCKED.find((p) =>
    lower === p || ['/', '?', '#'].some((x) => lower.startsWith(p + x))
    || (p === '/admin' && lower.startsWith('/admin-')));
  if (blocked) return { ok: false, error: `A partner link cannot send visitors to ${blocked}/.` };
  return { ok: true, path: v };
}

/**
 * The picked page, checked: { ok: true, path } (null = the default) or
 * { ok: false, error }. A typed path is also fetched, so a page that does not
 * exist is caught here rather than by the partner's audience.
 */
export async function readLandingPicker(root) {
  const box = root.matches('[data-landing-picker]') ? root : root.querySelector('[data-landing-picker]');
  if (!box) return { ok: true, path: null };
  const sel = box.querySelector('[data-landing-select]');
  const note = box.querySelector('[data-landing-note]');
  if (sel.value !== CUSTOM) return { ok: true, path: sel.value || null };

  const raw = box.querySelector('[data-landing-custom]').value.trim();
  if (!raw) { note.textContent = 'Type the path, or pick a page from the list.'; return { ok: false, error: 'Type the path of the page the link should open, or pick one from the list.' }; }
  const c = checkPath(raw);
  if (!c.ok) { note.textContent = c.error; return c; }
  try {
    const r = await fetch(c.path.split('#')[0], { method: 'HEAD', cache: 'no-cache' });
    if (r.status === 404) {
      const error = `There is no page at ${c.path} on this site. Check the path, or pick a page from the list.`;
      note.textContent = error;
      return { ok: false, error };
    }
  } catch (_e) { /* offline or blocked: the server still checks the shape, so let it through */ }
  return c;
}
