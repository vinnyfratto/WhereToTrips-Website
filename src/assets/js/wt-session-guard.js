/* ───────────────────────────────────────────────────────────────────
   wt-session-guard.js — one safeguard for every signed-in page.

   A person can end up with a session the SERVER no longer knows about: they
   signed out in another tab or on another device, the session was revoked, or
   it was ended on the server. The browser still holds the old token, so some
   pages keep working (the database only checks a token's signature) while
   every page that asks one of our server functions is refused, and the person
   sees a dead-end error.

   This watches calls to our server functions. When one that carried a signed-in
   user's token is refused because the session is gone, and nothing signed-in
   succeeds in the next few seconds, it clears the stale session and sends the
   person to sign in, then back to where they were.

   The few-second wait is deliberate. Right after a sign-in, Supabase's servers
   can briefly disagree about the clock and refuse a fresh token for a moment;
   the pages retry on their own and that clears in a second or two. A refusal
   that is followed by a success is not treated as an ended session.

   Does nothing for a visitor who is not signed in. A plain script (not a
   module) so it can be loaded first, before any page script makes a call.
   ─────────────────────────────────────────────────────────────────── */
(function () {
  if (window.__wtSessionGuard) return;
  window.__wtSessionGuard = true;

  var WAIT_MS = 6000;
  var FN_MARK = '.supabase.co/functions/v1/';
  var GONE = /^(invalid_session|unauthorized)$/;
  var lastOk = 0;
  var pendingFrom = 0;
  var timer = null;

  function onAuthPage() { return /^\/account\/(login|signup|reset)\b/.test(location.pathname); }

  function bearer(input, init) {
    var h = (init && init.headers) || (input && input.headers);
    var v = null;
    if (h && typeof h.get === 'function') v = h.get('Authorization');
    else if (h) v = h.Authorization || h.authorization;
    return v ? String(v).replace(/^Bearer\s+/i, '') : '';
  }

  // Only a SIGNED-IN user's token counts. The anon key (role "anon") is sent
  // on public calls and a refusal there says nothing about a session.
  function isUserToken(t) {
    try {
      var p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return p && p.role === 'authenticated';
    } catch (e) { return false; }
  }

  function endSession() {
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (/^sb-.+-auth-token(-code-verifier)?$/.test(k)) localStorage.removeItem(k);
      });
    } catch (e) { /* storage blocked: the redirect still helps */ }
    if (onAuthPage()) return;
    var back = location.pathname + location.search;
    location.replace('/account/login/?next=' + encodeURIComponent(back));
  }

  function refused(body) {
    return !!body && (GONE.test(String(body.error || '')) || /invalid jwt/i.test(String(body.message || '')));
  }

  function noteRefusal() {
    if (timer) return;
    pendingFrom = Date.now();
    timer = setTimeout(function () {
      timer = null;
      if (lastOk < pendingFrom) endSession();   // nothing signed-in worked in the meantime
    }, WAIT_MS);
  }

  var realFetch = window.fetch;
  if (typeof realFetch !== 'function') return;
  window.fetch = function (input, init) {
    var promise = realFetch.apply(this, arguments);
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(FN_MARK) === -1) return promise;
    var token = bearer(input, init);
    if (!token || !isUserToken(token)) return promise;
    promise.then(function (res) {
      if (res.ok) { lastOk = Date.now(); return; }
      if (res.status === 401) res.clone().json().then(function (b) { if (refused(b)) noteRefusal(); }).catch(function () {});
    }, function () { /* a network error is not an ended session */ });
    return promise;
  };
})();
