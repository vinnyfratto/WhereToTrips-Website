/* ───────────────────────────────────────────────────────────────────
   wt-admin-nav.js — the ONE header for every admin page.

   Header = Logo | ADMIN PORTAL, then the sections as drop-downs styled like
   the main site's nav, then Log out. Every admin page loads this script
   (a plain, synchronous script, so it also works on the standalone tools that
   are copied through untouched) and gets the same bar. To add or rename a
   page, change NAV below and nowhere else. (The tab strips under the bar come
   from src/_data/adminSubnav.js; keep the labels in the two places the same.)

   A menu is a list of groups. A group may carry a small heading ("Partner
   Admin", "CRM"); a menu with one anonymous group is a plain list. An item is
   [label, path, otherPathsThatCountAsHere, badgeKey].

   The page marks where it wants the header with a <script> tag; this inserts
   the bar just before it. Page-specific header buttons (the settings gear on
   the image tools) go in <div id="adm-actions" hidden> before the script and
   are moved into the bar.

   Log out: the admin pages' own scripts wire #adm-logout. The standalone
   tools have none, so they set data-logout="self" on this script's tag.

   Badges: a number beside an item (Review Queue shows how many submissions are
   waiting). window.wtAdminNav.setBadge(key, n) sets one; pages that already
   hold a signed-in client call it with their own count. As a fallback the bar
   asks the partner-admin function itself, using the stored session, when that
   session is still fresh.
   ─────────────────────────────────────────────────────────────────── */
(function () {
  if (document.getElementById('adm-hdr')) return;

  var NAV = [
    { label: 'Partners', groups: [
      { heading: 'Partner Admin', items: [
        ['Overview', '/admin-affiliates/', ['/admin-partner-legacy/']],
        ['Partner Details', '/admin-partners/', ['/admin-partner/']],
        ['Review Queue', '/admin-review/', [], 'review'],
        ['Revenue Received', '/admin-revenue-received/'],
        ['Payment History', '/admin-payment-history/'],
      ] },
      { heading: 'CRM', items: [
        ['Applications', '/admin-crm-applications/'],
        ['Invites', '/admin-crm-invites/'],
        ['Partner CRM (legacy)', '/admin-crm/', ['/admin-crm-prospect/']],
      ] },
    ] },
    { label: 'Financial Tracking', groups: [
      { items: [
        ['Nuitee Booking Reconciliation', '/admin-financial/nuitee-reconciliation/'],
        ['Nuitee Booking Payments Received', '/admin-financial/nuitee-payments-received/'],
        ['Partner Payment Processing (ACH)', '/admin-financial/partner-ach/'],
        ['Partner 1099 Processing', '/admin-financial/partner-1099/'],
      ] },
    ] },
    { label: 'Analytics', groups: [
      { items: [
        ['Site Analytics', '/analytics/'],
        ['Site Submissions', '/admin-submissions/'],
      ] },
    ] },
    { label: 'Images & Vibes', groups: [
      { items: [
        ['Destination Images', '/DestImages/'],
        ['Vibe Images', '/vibesimages/'],
        ['Vibes Engine', '/vibes-engine/'],
        ['Vibe Engine Tester', '/vibes-engine/dashboard.html'],
        ['Dashboard Hero', '/DashboardHero/'],
        ['Stock Image Ingest', '/StockImages/'],
        ['Vibe Selection', '/VibeSelection/'],
        ['Vibe Taxonomy', '/VibeTaxonomy/'],
      ] },
    ] },
    { label: 'Content', groups: [
      { items: [
        ['Site CMS', '/admin/'],
      ] },
    ] },
  ];
  var HOME = '/admin-dashboard/';

  var script = document.currentScript;
  var path = location.pathname.replace(/index\.html$/, '');
  if (path.length > 1 && !/\.[a-z]+$/i.test(path) && path.slice(-1) !== '/') path += '/';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function isHere(c) { return [c[1]].concat(c[2] || []).indexOf(path) !== -1; }
  function allItems(g) { return g.groups.reduce(function (all, grp) { return all.concat(grp.items); }, []); }
  function badge(c) { return c[3] ? ' <span class="adm-badge" data-badge="' + esc(c[3]) + '" hidden></span>' : ''; }
  function link(c, cls) {
    return '<a' + (cls ? ' class="' + cls + '"' : '') + ' href="' + esc(c[1]) + '"' + (isHere(c) ? ' aria-current="page"' : '') + '>' + esc(c[0]) + badge(c) + '</a>';
  }

  var groups = NAV.map(function (g) {
    var current = allItems(g).some(isHere);
    return '<div class="adm-dd' + (current ? ' is-current' : '') + '">' +
      '<button type="button" aria-haspopup="true">' + esc(g.label) + ' <span class="caret" aria-hidden="true">▾</span></button>' +
      '<div class="adm-dd-menu">' + g.groups.map(function (grp) {
        return (grp.heading ? '<span class="adm-dd-head">' + esc(grp.heading) + '</span>' : '') +
          grp.items.map(function (c) { return link(c); }).join('');
      }).join('') + '</div></div>';
  }).join('');

  var mobile = NAV.map(function (g) {
    return '<span class="adm-mlabel">' + esc(g.label) + '</span>' + g.groups.map(function (grp) {
      return (grp.heading ? '<span class="adm-mhead">' + esc(grp.heading) + '</span>' : '') +
        grp.items.map(function (c) { return link(c, 'adm-msub'); }).join('');
    }).join('');
  }).join('');

  var header = document.createElement('header');
  header.id = 'adm-hdr';
  header.className = 'adm-hdr';
  header.innerHTML =
    '<div class="adm-hdr-in">' +
      '<a class="adm-brand" href="/" aria-label="WhereTo home"><img src="/assets/whereto-logo-azure.svg" alt="WhereTo" width="171" height="34"></a>' +
      '<a class="adm-tag' + (path === HOME ? ' is-current' : '') + '" href="' + HOME + '" title="Admin home">Admin Portal</a>' +
      '<nav class="adm-nav" aria-label="Admin">' + groups + '</nav>' +
      '<div class="adm-util"><span class="adm-actions"></span><button id="adm-logout" type="button" class="adm-logout">Log out</button></div>' +
      '<button class="adm-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="adm-mobile"><span></span><span></span><span></span></button>' +
    '</div>' +
    '<div class="adm-mobile" id="adm-mobile"><a class="adm-msub adm-mhome" href="' + HOME + '">Admin home</a>' + mobile + '</div>';

  // Fonts the bar needs, on pages that did not load them.
  if (!document.querySelector('link[href*="family=Noto+Sans"]')) {
    var f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap';
    document.head.appendChild(f);
  }

  var holder = script && script.previousElementSibling && script.previousElementSibling.id === 'adm-actions' ? script.previousElementSibling : document.getElementById('adm-actions');
  if (script && script.parentNode) script.parentNode.insertBefore(header, script); else document.body.insertBefore(header, document.body.firstChild);

  if (holder) {
    var slot = header.querySelector('.adm-actions');
    while (holder.firstChild) slot.appendChild(holder.firstChild);
    holder.parentNode.removeChild(holder);
  }

  var toggle = header.querySelector('.adm-toggle');
  toggle.addEventListener('click', function () {
    var open = header.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  if (script && script.getAttribute('data-logout') === 'self') {
    header.querySelector('#adm-logout').addEventListener('click', function () {
      // Local sign-out: drop the stored session, tell Supabase, go to login.
      try {
        Object.keys(localStorage).forEach(function (k) {
          var m = /^sb-(.+)-auth-token$/.exec(k);
          if (!m) return;
          var tok; try { tok = JSON.parse(localStorage.getItem(k) || '{}').access_token; } catch (e) { tok = null; }
          localStorage.removeItem(k);
          if (tok) { try { fetch('https://' + m[1] + '.supabase.co/auth/v1/logout?scope=local', { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, keepalive: true }); } catch (e) {} }
        });
      } catch (e) {}
      location.href = '/account/login/';
    });
  }

  // ── Badges ────────────────────────────────────────────────────────
  var counts = {};
  function paint(key) {
    var n = counts[key];
    // Menu items, the mobile list and any tab strip on the page share the key.
    document.querySelectorAll('[data-badge="' + key + '"]').forEach(function (el) {
      if (n > 0) { el.textContent = String(n); el.hidden = false; } else { el.textContent = ''; el.hidden = true; }
    });
  }
  window.wtAdminNav = {
    setBadge: function (key, n) { counts[key] = Number(n) || 0; paint(key); },
    repaint: function () { Object.keys(counts).forEach(paint); },
  };

  // Fallback for pages with no signed-in client of their own: ask once, with
  // the stored session, if it is still fresh. Any failure just leaves no badge.
  (function fetchBadges() {
    var cfg = window.WT_SUPABASE;
    if (!cfg || !cfg.url || !cfg.anonKey) return;
    var token = null;
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (!/^sb-.+-auth-token$/.test(k)) return;
        var s = JSON.parse(localStorage.getItem(k) || '{}');
        if (s && s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now() + 30000)) token = s.access_token;
      });
    } catch (e) { token = null; }
    if (!token) return;
    setTimeout(function () {
      if (counts.review != null) return;      // the page already supplied it
      fetch(cfg.url + '/functions/v1/partner-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'badges' }),
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.ok && counts.review == null) window.wtAdminNav.setBadge('review', j.review_pending);
      }).catch(function () {});
    }, 1200);
  })();
})();
