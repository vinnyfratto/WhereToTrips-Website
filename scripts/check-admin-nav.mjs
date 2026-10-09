// Every link in the admin header menus and the tab strips under it must point at
// a page that was built, and a tab strip must use the same label as the header
// menu for the same page (the two lists are kept by hand in two places:
// src/assets/js/wt-admin-nav.js and src/_data/adminSubnav.js).
//
//   npm run build && node scripts/check-admin-nav.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, '_site');
const require = createRequire(import.meta.url);

const navSrc = fs.readFileSync(path.join(root, 'src/assets/js/wt-admin-nav.js'), 'utf8');
const block = navSrc.slice(navSrc.indexOf('var NAV = ['), navSrc.indexOf('var HOME'));
if (!block) throw new Error('could not find NAV in wt-admin-nav.js');

// Items are  ['Label', '/path/', [...], 'badge']
const navItems = [...block.matchAll(/\[\s*'([^']+)'\s*,\s*'(\/[^']*)'/g)].map((m) => ({ label: m[1], href: m[2] }));
const navLabelByPath = new Map(navItems.map((i) => [i.href, i.label]));

const problems = [];
function builtPage(href) {
  const clean = href.split('#')[0].split('?')[0];
  const file = path.join(site, clean.endsWith('/') ? clean + 'index.html' : clean);
  return fs.existsSync(file);
}

for (const i of navItems) {
  if (!builtPage(i.href)) problems.push(`menu "${i.label}" points at ${i.href}, which was not built`);
}

const strips = require('../src/_data/adminSubnav.js');
for (const [key, strip] of Object.entries(strips)) {
  for (const t of strip.tabs) {
    if (!builtPage(t.href)) problems.push(`tab strip "${key}" tab "${t.label}" points at ${t.href}, which was not built`);
    const menuLabel = navLabelByPath.get(t.href);
    if (!menuLabel) problems.push(`tab strip "${key}" tab "${t.label}" (${t.href}) is not in the header menu`);
    else if (menuLabel !== t.label) problems.push(`tab strip "${key}" calls ${t.href} "${t.label}" but the header menu calls it "${menuLabel}"`);
  }
}

if (problems.length) {
  console.error('Admin navigation problems:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log(`Admin navigation OK: ${navItems.length} menu links, ${Object.values(strips).reduce((n, s) => n + s.tabs.length, 0)} tabs.`);
