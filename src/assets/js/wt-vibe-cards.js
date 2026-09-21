/* ════════════════════════════════════════════════════════════════════
   wt-vibe-cards.js — Featured Travel Vibes cards (home page)

   Two jobs, both ports of what the app's Destination Result card does:

   1. Cycle the destination's own photos. Every frame is in the DOM
      stacked on top of the last, so the swap is a pure opacity crossfade
      on layers the browser has already decoded — the same "transition on
      one persistent view" trick expo-image gives the app, rather than
      swapping a src and flashing an empty box. A frame that has not
      finished loading is skipped, never shown half-drawn.

      Only the FIRST frame carries a src. The rest carry data-src and are
      hydrated by hydrate() below when the box first comes near the
      viewport. They used to ship as loading="lazy" and it looked right
      until it shipped: a lazy image that sits at opacity 0 underneath an
      opaque sibling is never "needed", so Chrome never fetches it, so
      complete stays false forever, so next() skipped every frame and
      nothing on the site ever cycled past photo one. Deferring in JS is
      the only way to get both halves — nothing fetched for a card nobody
      scrolls to, and everything fetched once they do.

      Each card carries its own --cycle-delay so six cards never flip in
      lockstep (the whole grid pulsing at once reads as a glitch). No
      dots: the photos are decoration, not a control.

   2. Fit the destination name. The banner name is a fixed 28/38px in
      CSS, which is right for "Oaxaca" and too wide for "San Sebastian".
      This measures the real text and scales the whole thing down to fit
      — a destination name must never lose a letter to an ellipsis.
   ════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var HOLD  = 5000;   // ms a frame stays up
  var FADE  = 1100;   // must match .dest-photo-frame's transition
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Give the deferred frames their src. Idempotent. */
  function hydrate(box) {
    var pending = box.querySelectorAll('img[data-src]');
    for (var i = 0; i < pending.length; i++) {
      pending[i].src = pending[i].getAttribute('data-src');
      pending[i].removeAttribute('data-src');
    }
  }


  /* ── 1. Photo cycling ─────────────────────────────────────────── */
  function startCycle(box) {
    var frames = box.querySelectorAll('.dest-photo-frame');
    if (frames.length < 2) return;

    var i = 0;
    var timer = null;
    var visible = true;

    function next() {
      // Walk forward to the next frame that has actually decoded. If none
      // has yet, hold on the current one and try again next tick.
      for (var step = 1; step <= frames.length; step++) {
        var n = (i + step) % frames.length;
        if (n === i) break;
        if (frames[n].complete && frames[n].naturalWidth > 0) {
          frames[i].classList.remove('is-on');
          frames[n].classList.add('is-on');
          i = n;
          break;
        }
      }
    }

    function tick() { if (visible && !document.hidden) next(); }

    // The per-box stagger doubles as a load schedule: this box's frames
    // are fetched when its turn comes round, not all 70-odd at once while
    // the page is still painting.
    var delay = parseFloat(getComputedStyle(box).getPropertyValue('--cycle-delay')) || 0;
    setTimeout(function () {
      // Hydrate on the TIMER, not on the observer. An observer that never
      // fires (a backgrounded or unrendered tab, a browser that throttles
      // it) would otherwise mean the frames never load and the box sits on
      // photo one forever — which is the exact failure the data-src change
      // was made to fix, so it must not depend on anything conditional.
      // The first swap is another HOLD+FADE away, which is ample.
      hydrate(box);
      timer = setInterval(tick, HOLD + FADE);
    }, Math.max(delay, 0.3) * 1000);

    // The observer is a pure optimisation: stop swapping photos on a card
    // nobody is looking at. It is allowed to never fire.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) hydrate(box);
      }, { rootMargin: '400px' }).observe(box);
    }

    box.addEventListener('mouseenter', function () { visible = false; });
    box.addEventListener('mouseleave', function () { visible = true; });
  }

  /* ── 2. Scale the banner name to fit ──────────────────────────── */
  function fitName(el) {
    el.style.fontSize = '';
    var box = el.parentElement;
    if (!box) return;
    var room = box.clientWidth - 36;           // .dest-banner's 18px gutters
    var natural = el.scrollWidth;
    if (natural <= room || !natural) return;
    var base = parseFloat(getComputedStyle(el).fontSize) || 28;
    el.style.fontSize = Math.floor(base * Math.max(0.45, room / natural)) + 'px';
  }

  function fitAll() {
    document.querySelectorAll('.dest-banner-name').forEach(fitName);
  }

  function init() {
    if (!reduce.matches) {
      document.querySelectorAll('[data-cycle]').forEach(startCycle);
    }
    fitAll();
    // The drop cap is RCL Morland; until it loads the measurement is made
    // against a fallback serif of a different width.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
    window.addEventListener('resize', fitAll);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
