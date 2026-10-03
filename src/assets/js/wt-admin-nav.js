/* ───────────────────────────────────────────────────────────────────
   wt-admin-nav.js — the ONE header for every admin page.

   Header = Logo | ADMIN PORTAL, then the sections as drop-downs styled like
   the main site's nav, then Log out. Every admin page loads this script
   (a plain, synchronous script, so it also works on the standalone tools that
   are copied through untouched) and gets the same bar. To add or rename a
   page, change NAV below and nowhere else.

   The page marks where it wants the header with a <script> tag; this inserts
   the bar just before it. Page-specific header buttons (the settings gear on
   the image tools) go in <div id="adm-actions" hidden> before the script and
   are moved into the bar.

   Log out: the admin pages' own scripts wire #adm-logout. The standalone
   tools have none, so they set data-logout="self" on this script's tag.
   ─────────────────────────────────────────────────────────────────── */
(function () {
  if (document.getElementById('adm-hdr')) return;

  var NAV = [
    { label: 'Partners', children: [
      ['Partner CRM', '/admin-crm/', ['/admin-crm-prospect/']],
      ['Partner Admin', '/admin-affiliates/'],
    ] },
    { label: 'Analytics', children: [
      ['Site Analytics', '/analytics/'],
      ['Site Submissions', '/admin-submissions/'],
    ] },
    { label: 'Images & Vibes', children: [
      ['Destination Images', '/DestImages/'],
      ['Vibe Images', '/vibesimages/'],
      ['Vibes Engine', '/vibes-engine/'],
      ['Vibe Engine Tester', '/vibes-engine/dashboard.html'],
      ['Dashboard Hero', '/DashboardHero/'],
      ['Stock Image Ingest', '/StockImages/'],
      ['Vibe Selection', '/VibeSelection/'],
      ['Vibe Taxonomy', '/VibeTaxonomy/'],
    ] },
    { label: 'Content', children: [
      ['Site CMS', '/admin/'],
    ] },
  ];
  var HOME = '/admin-dashboard/';

  var script = document.currentScript;
  var path = location.pathname.replace(/index\.html$/, '');
  if (path.length > 1 && !/\.[a-z]+$/i.test(path) && path.slice(-1) !== '/') path += '/';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function isHere(c) { return [c[1]].concat(c[2] || []).indexOf(path) !== -1; }

  var groups = NAV.map(function (g) {
    var current = g.children.some(isHere);
    return '<div class="adm-dd' + (current ? ' is-current' : '') + '">' +
      '<button type="button" aria-haspopup="true">' + esc(g.label) + ' <span class="caret" aria-hidden="true">▾</span></button>' +
      '<div class="adm-dd-menu">' + g.children.map(function (c) {
        return '<a href="' + esc(c[1]) + '"' + (isHere(c) ? ' aria-current="page"' : '') + '>' + esc(c[0]) + '</a>';
      }).join('') + '</div></div>';
  }).join('');

  var mobile = NAV.map(function (g) {
    return '<span class="adm-mlabel">' + esc(g.label) + '</span>' + g.children.map(function (c) {
      return '<a class="adm-msub" href="' + esc(c[1]) + '"' + (isHere(c) ? ' aria-current="page"' : '') + '>' + esc(c[0]) + '</a>';
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
})();
