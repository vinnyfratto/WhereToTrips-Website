// ───────────────────────────────────────────────────────────────────
//  wt-analytics.js — analytics for both PostHog-tracked channels
//  (WhereToTrips.com website + the WhereTo app), via the `admin` edge
//  fn's analytics_overview action (same admins-table gate as the
//  affiliate/submissions admin). Lives at /analytics/ — /admin-dashboard/
//  is the separate jump-off hub linking to this and every other admin
//  surface. Requires the edge fn to have
//  POSTHOG_PROJECT_ID + POSTHOG_PERSONAL_API_KEY secrets set — if not,
//  the fn returns ok:false and this page shows that plainly instead of
//  a blank dashboard.
//
//  Not literally push-based real-time: it polls the admin fn every 60s
//  while the tab is visible (or every 4s in "Go live" mode — see below),
//  and PostHog itself ingests events within roughly seconds to a couple
//  minutes.
//
//  "Go live" is an opt-in toggle next to the range buttons (Last hour/6
//  hours/Today/This week/Last 30 days — Today stays the default view). It
//  swaps the aggregate cards for a raw, auto-refreshing feed of the last
//  30 minutes of events (admin fn's analytics_live action) — for watching
//  exactly what fires while actively testing, rather than waiting on
//  aggregates.
// ───────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.WT_SUPABASE || {};
const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
const ADMIN_FN = cfg.url + '/functions/v1/admin';
const REFRESH_MS = 60_000;
const LIVE_REFRESH_MS = 4_000;

let TOKEN = null;
let currentChannel = 'website';
let currentRange = 'today';
let liveMode = false;
let pollTimer = null;
const RANGES = [
  ['hour', 'Last hour'], ['6h', '6 hours'],
  ['today', 'Today'], ['week', 'This week'], ['30d', 'Last 30 days'],
];

const $ = (s, r = document) => r.querySelector(s);
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function msg(type, text) { const m = $('#adm-msg'); m.className = 'alert show alert-' + type; m.textContent = text; setTimeout(() => { if (m.textContent === text) m.className = 'alert'; }, 5000); }

async function callAdmin(action, params = {}) {
  const res = await fetch(ADMIN_FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json().catch(() => ({ ok: false, error: 'network' }));
}

// ── boot ────────────────────────────────────────────────────────────
async function init() {
  if (!$('#wt-admin-page')) return;
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) { window.location.href = '/account/login/'; return; }
  TOKEN = sess.session.access_token;

  // overview action already exists on this fn and is a cheap way to confirm
  // this user is an admin before we even try the PostHog call.
  const gateCheck = await callAdmin('overview');
  if (!gateCheck.ok) {
    $('#adm-gate').style.display = 'none';
    if (gateCheck.error === 'forbidden') { $('#adm-denied').style.display = 'block'; }
    else { $('#adm-denied').style.display = 'block'; $('#adm-denied .acct-sub').textContent = 'Could not load admin (' + (gateCheck.error || 'error') + ').'; }
    return;
  }

  $('#adm-gate').style.display = 'none';
  $('#adm-root').style.display = 'block';
  $('#adm-logout').addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = '/account/login/'; });

  document.querySelectorAll('[data-channel]').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.dataset.channel === currentChannel) return;
      currentChannel = b.dataset.channel;
      document.querySelectorAll('[data-channel]').forEach((t) => t.classList.toggle('is-active', t.dataset.channel === currentChannel));
      tick();
    });
  });

  await tick();
  scheduleNext();
}

// Single dispatcher so the same poll loop can serve either mode — a plain
// setInterval can't change its own delay, so this reschedules itself each
// time with whatever delay the current mode wants.
async function tick(silent) {
  if (liveMode) return loadLive(silent);
  return loadAnalytics(silent);
}
function scheduleNext() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    if (document.visibilityState === 'visible') await tick(true);
    scheduleNext();
  }, liveMode ? LIVE_REFRESH_MS : REFRESH_MS);
}
function toggleLive() {
  liveMode = !liveMode;
  tick();
  scheduleNext();
}

// ── Live feed ───────────────────────────────────────────────────────
async function loadLive(silent = false) {
  const root = $('#analytics-root');
  if (!silent) root.innerHTML = `<div class="adm-card">Loading…</div>`;

  const d = await callAdmin('analytics_live', { channel: currentChannel });

  if (!d.ok) {
    root.innerHTML = `
      <div class="acct-card">
        <p class="eyebrow">Not available</p>
        <h1 style="font-size:1.5rem;">Live feed unavailable</h1>
        <p class="acct-sub">PostHog query failed (${esc(d.error || 'unknown error')}).</p>
      </div>`;
    return;
  }
  renderLiveFeed(d.events || []);
}

function relTime(ms) {
  const diff = Math.max(0, Date.now() - ms);
  if (diff < 1000) return 'just now';
  if (diff < 60_000) return Math.floor(diff / 1000) + 's ago';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm ago';
  return Math.floor(diff / 3_600_000) + 'h ago';
}
// Candidate property columns — properties vary a lot event to event, so
// these are whichever generally-useful ones tend to show up, not the full
// (often huge) properties blob. Which ones actually render as columns is
// picked live via the ⚙ Columns button (liveColumns below) — session-only,
// nothing here persists yet. A "save this view" step is the natural next
// thing to add once it's clear which columns people actually want kept.
const LIVE_PROP_KEYS = [
  'destination_code', 'destination_id', 'booking_id', 'search_id',
  'click_type', 'product_type', 'entry_point', 'module_source',
  'price', 'value', 'currency', 'passenger_count', '$pathname', 'surface',
];
let liveColumns = new Set(['destination_code', 'booking_id', 'search_id', 'product_type', 'price']);
let columnsPickerOpen = false;
let lastLiveEvents = [];

function columnsPickerHtml() {
  const options = LIVE_PROP_KEYS.map((k) => `
    <label style="display:flex; align-items:center; gap:7px; padding:4px 2px; font-size:.85em; cursor:pointer; white-space:nowrap;">
      <input type="checkbox" data-live-col="${esc(k)}" ${liveColumns.has(k) ? 'checked' : ''} />
      ${esc(k)}
    </label>`).join('');
  return `
    <div style="position:relative; display:inline-block;">
      <button type="button" id="adm-cols-btn" class="btn btn-xs btn-ghost">⚙ Columns</button>
      ${columnsPickerOpen ? `
        <div id="adm-cols-panel" style="position:absolute; right:0; top:calc(100% + 6px); z-index:20;
             background:var(--card); border:1px solid var(--wg200); border-radius:var(--radius-md);
             box-shadow:var(--shadow-sm); padding:10px 14px; min-width:190px;">
          <p class="acct-sub" style="margin:0 0 6px; font-size:.75em; text-transform:uppercase; letter-spacing:.5px;">Show columns</p>
          ${options}
        </div>` : ''}
    </div>`;
}
function wireColumnsPicker() {
  const btn = $('#adm-cols-btn');
  if (btn) btn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    columnsPickerOpen = !columnsPickerOpen;
    renderLiveFeed(lastLiveEvents);
  });
  const panel = $('#adm-cols-panel');
  if (panel) {
    panel.addEventListener('click', (ev) => ev.stopPropagation());
    panel.querySelectorAll('[data-live-col]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const key = cb.dataset.liveCol;
        if (cb.checked) liveColumns.add(key); else liveColumns.delete(key);
        renderLiveFeed(lastLiveEvents);
      });
    });
  }
}
// Closes the columns panel on an outside click — re-registered every
// render since the panel itself is torn down and rebuilt each time.
document.addEventListener('click', () => {
  if (columnsPickerOpen) { columnsPickerOpen = false; if (liveMode) renderLiveFeed(lastLiveEvents); }
});

function renderLiveFeed(events) {
  lastLiveEvents = events;
  const cols = LIVE_PROP_KEYS.filter((k) => liveColumns.has(k));
  const rows = events.map((e) => {
    const p = e.properties || {};
    const cells = cols.map((k) => `<td class="acct-sub" style="font-size:.85em;">${esc(p[k] ?? '')}</td>`).join('');
    return `
    <tr>
      <td style="white-space:nowrap;">${esc(relTime(e.ms))}</td>
      <td>${esc(eventLabel(e.event))}</td>
      ${cells}
      <td class="acct-sub" style="font-size:.8em; white-space:nowrap;">${esc(String(e.distinct_id || '').slice(0, 8))}</td>
    </tr>`;
  }).join('');
  const colHeads = cols.map((k) => `<th>${esc(k)}</th>`).join('');
  const span = 3 + cols.length;

  $('#analytics-root').innerHTML = `
    <div class="adm-form-row" style="justify-content:space-between; align-items:center; margin-bottom:14px;">
      <p class="acct-sub" style="margin:0;">🔴 Live — last 30 minutes, refreshes every 4s</p>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        ${columnsPickerHtml()}
        ${controlsHtml()}
      </div>
    </div>
    <div class="adm-card">
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>When</th><th>Event</th>${colHeads}<th>Who</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="${span}">No events in the last 30 minutes yet — go do something in the app.</td></tr>`}</tbody>
      </table></div>
    </div>`;

  wireControls();
  wireColumnsPicker();
}

// ── Analytics ───────────────────────────────────────────────────────
async function loadAnalytics(silent = false) {
  const root = $('#analytics-root');
  if (!silent) root.innerHTML = `<div class="adm-card">Loading…</div>`;

  const d = await callAdmin('analytics_overview', { range: currentRange, channel: currentChannel });

  if (!d.ok) {
    const hint = d.error === 'posthog_not_configured'
      ? 'PostHog isn’t wired up on the backend yet — set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY as secrets on the `admin` edge function, then redeploy it.'
      : `PostHog query failed (${esc(d.error || 'unknown error')}).`;
    root.innerHTML = `
      <div class="acct-card">
        <p class="eyebrow">Not available</p>
        <h1 style="font-size:1.5rem;">Analytics unavailable</h1>
        <p class="acct-sub">${hint}</p>
      </div>`;
    return;
  }

  if (d.channel === 'travel') renderTravelMetrics(d);
  else if (d.channel === 'app') renderAppAnalytics(d);
  else renderWebsiteAnalytics(d);
}

function rangeBtnsHtml() {
  return RANGES.map(([key, label]) =>
    `<button type="button" class="btn btn-xs ${key === currentRange ? 'btn-primary' : 'btn-ghost'}" data-range="${key}">${label}</button>`).join('');
}
function wireRangeBtns() {
  $('#analytics-root').querySelectorAll('[data-range]').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.dataset.range === currentRange) return;
      currentRange = b.dataset.range;
      loadAnalytics();
    });
  });
}
// Range buttons don't apply in live mode (it's always "the last 30 minutes"),
// so they're swapped out for the toggle alone rather than shown disabled.
function controlsHtml() {
  return `
    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
      ${liveMode ? '' : rangeBtnsHtml()}
      <button type="button" id="adm-live-btn" class="btn btn-xs ${liveMode ? 'btn-primary' : 'btn-ghost'}">
        ${liveMode ? '⏹ Stop live' : '🔴 Go live'}
      </button>
    </div>`;
}
function wireControls() {
  if (!liveMode) wireRangeBtns();
  const btn = $('#adm-live-btn');
  if (btn) btn.addEventListener('click', toggleLive);
}
function bucketCol() {
  if (currentRange === 'hour') return 'Time';
  if (currentRange === '6h' || currentRange === 'today') return 'Hour';
  if (currentRange === '30d') return 'Week';
  return 'Day';
}
const DASH_TZ = 'America/Chicago';
function formatBucket(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (currentRange === 'hour') return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: DASH_TZ }) + ' CT';
  if (currentRange === '6h' || currentRange === 'today') return d.toLocaleTimeString('en-US', { hour: 'numeric', timeZone: DASH_TZ }) + ' CT';
  if (currentRange === '30d') return 'Week of ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: DASH_TZ });
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: DASH_TZ });
}
function bar(pct) {
  return `<div style="background:var(--wg200); border-radius:6px; overflow:hidden; height:10px;"><div style="width:${pct}%; background:var(--rust); height:100%;"></div></div>`;
}
const card = (label, val) => `<div class="stat-card"><p class="label">${label}</p><p class="value">${val}</p></div>`;

// Renders `body` normally, or an "Unavailable" card if `errors[key]` is set —
// used so one bad HogQL query degrades just its own card, not the whole tab.
function errCard(title, body, key, errors) {
  if (errors && errors[key]) {
    return `<div class="adm-card"><h3>${esc(title)}</h3><p class="acct-sub">Unavailable — ${esc(errors[key])}</p></div>`;
  }
  return body;
}

// ── WhereToTrips.com ────────────────────────────────────────────────
function renderWebsiteAnalytics(d) {
  const errors = d.errors || {};
  const maxCount = Math.max(1, ...(d.series || []).map((r) => r.pageviews));
  const seriesRows = (d.series || []).map((r) => `
    <tr>
      <td>${esc(formatBucket(r.bucket))}</td>
      <td class="num">${r.pageviews}</td>
      <td class="num">${r.visitors}</td>
      <td style="width:40%;">${bar(Math.round((r.pageviews / maxCount) * 100))}</td>
    </tr>`).join('');

  const pageRows = (d.top_pages || []).map((p) => `<tr><td>${esc(p.path)}</td><td class="num">${p.views}</td></tr>`).join('');
  const refRows = (d.top_referrers || []).map((r) => `<tr><td>${esc(r.domain)}</td><td class="num">${r.visits}</td></tr>`).join('');

  const totalsCards = errors.totals
    ? `<div class="adm-card"><h3>Totals</h3><p class="acct-sub">Unavailable — ${esc(errors.totals)}</p></div>`
    : `<div class="adm-overview-grid">${card('Pageviews', d.totals.pageviews)}${card('Unique visitors', d.totals.visitors)}</div>`;

  const trafficCard = errCard('Traffic over time', `
    <div class="adm-card">
      <h3>Traffic over time</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>${bucketCol()}</th><th class="num">Pageviews</th><th class="num">Visitors</th><th></th></tr></thead>
        <tbody>${seriesRows || '<tr><td colspan="4">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'series', errors);

  const topPagesCard = errCard('Top pages', `
    <div class="adm-card">
      <h3>Top pages</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Page</th><th class="num">Views</th></tr></thead>
        <tbody>${pageRows || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'top_pages', errors);

  const topRefCard = errCard('Top referrers', `
    <div class="adm-card">
      <h3>Top referrers</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Domain</th><th class="num">Visits</th></tr></thead>
        <tbody>${refRows || '<tr><td colspan="2">No referral traffic yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'top_referrers', errors);

  $('#analytics-root').innerHTML = `
    <div class="adm-form-row" style="justify-content:space-between; align-items:center; margin-bottom:14px;">
      <p class="acct-sub" style="margin:0;">Live from PostHog · refreshes every 60s</p>
      ${controlsHtml()}
    </div>
    ${totalsCards}
    ${trafficCard}
    <div class="adm-overview-grid" style="grid-template-columns: 1fr 1fr;">
      ${topPagesCard}
      ${topRefCard}
    </div>`;

  wireControls();
}

// ── App ─────────────────────────────────────────────────────────────
function eventLabel(name) {
  return String(name || '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Unknown';
}

// ── Device breakdowns (App tab) ─────────────────────────────────────
// Every devices.* list from the admin fn is the same {key, users, sessions,
// events?} shape, so one table renders all of them. `extra` picks which of the
// optional numeric columns to show; share is computed client-side off the rows
// we got back, so a LIMIT-truncated list still adds up to a sensible 100%.
function deviceTable(title, rows, errKey, errors, extra) {
  if (errors && errors[errKey]) {
    return `<div class="adm-card"><h3>${esc(title)}</h3><p class="acct-sub">Unavailable — ${esc(errors[errKey])}</p></div>`;
  }
  const list = rows || [];
  const cols = extra || [];
  const total = list.reduce((sum, r) => sum + (Number(r.users) || 0), 0);
  const head = cols.map((c) => `<th class="num">${esc(c.label)}</th>`).join('');
  const body = list.map((r) => {
    const users = Number(r.users) || 0;
    const pct = total > 0 ? Math.round((users / total) * 100) : 0;
    const cells = cols.map((c) => `<td class="num">${Number(r[c.field]) || 0}</td>`).join('');
    return `
      <tr>
        <td>${esc(r.key)}</td>
        <td class="num">${users}</td>
        ${cells}
        <td class="num">${pct}%</td>
        <td style="width:22%;">${bar(pct)}</td>
      </tr>`;
  }).join('');
  const span = 4 + cols.length;
  return `
    <div class="adm-card">
      <h3>${esc(title)}</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th></th><th class="num">Users</th>${head}<th class="num">Share</th><th></th></tr></thead>
        <tbody>${body || `<tr><td colspan="${span}">No data yet.</td></tr>`}</tbody>
      </table></div>
    </div>`;
}

function renderDeviceSection(d) {
  const errors = d.errors || {};
  const dev = d.devices || {};
  const sessions = [{ label: 'Sessions', field: 'sessions' }];
  const sessionsAndEvents = [{ label: 'Sessions', field: 'sessions' }, { label: 'Events', field: 'events' }];

  return `
    <h2 class="adm-section-h">Devices</h2>
    <p class="acct-sub" style="margin:-4px 0 16px;">
      Captured on every app event by PostHog. Events sent before device capture was
      added show up as "(unknown)".
    </p>
    <div class="adm-grid-2">
      ${deviceTable('Platform', dev.os, 'device_os', errors, sessionsAndEvents)}
      ${deviceTable('OS version', dev.os_versions, 'device_os_versions', errors, sessions)}
    </div>
    <div class="adm-grid-2">
      ${deviceTable('Device model', dev.models, 'device_models', errors, sessions)}
      ${deviceTable('App version', dev.app_versions, 'device_app_versions', errors, sessionsAndEvents)}
    </div>
    ${deviceTable('Real device vs simulator', dev.environment, 'device_environment', errors, sessionsAndEvents)}`;
}

// ── Where users are (App tab) ───────────────────────────────────────
// Same table component and payload shape as the device breakdowns; PostHog
// resolves these from the request IP, so the app sends nothing for them.
function renderLocationSection(d) {
  const errors = d.errors || {};
  const loc = d.location || {};
  const sessions = [{ label: 'Sessions', field: 'sessions' }];
  const sessionsAndEvents = [{ label: 'Sessions', field: 'sessions' }, { label: 'Events', field: 'events' }];

  return `
    <h2 class="adm-section-h">Location</h2>
    <p class="acct-sub" style="margin:-4px 0 16px;">
      Where users opened the app, resolved from their IP. Mobile carrier IPs often
      do not resolve to a city, so those rows are grouped by country.
    </p>
    <div class="adm-grid-2">
      ${deviceTable('Country', loc.countries, 'location_countries', errors, sessionsAndEvents)}
      ${deviceTable('City', loc.cities, 'location_cities', errors, sessions)}
    </div>`;
}

function renderAppAnalytics(d) {
  const errors = d.errors || {};
  const maxCount = Math.max(1, ...(d.series || []).map((r) => r.active_users));
  const seriesRows = (d.series || []).map((r) => `
    <tr>
      <td>${esc(formatBucket(r.bucket))}</td>
      <td class="num">${r.active_users}</td>
      <td class="num">${r.events}</td>
      <td style="width:40%;">${bar(Math.round((r.active_users / maxCount) * 100))}</td>
    </tr>`).join('');

  const eventRows = (d.top_events || []).map((e) => `<tr><td>${esc(eventLabel(e.name))}</td><td class="num">${e.count}</td></tr>`).join('');

  const funnelCards = errors.funnels
    ? `<div class="adm-card"><h3>Funnels</h3><p class="acct-sub">Unavailable — ${esc(errors.funnels)}</p></div>`
    : (d.funnels || []).map((f) => {
      const rows = f.steps.map((s, i) => `
        <tr>
          <td>${i + 1}. ${esc(eventLabel(s.event))}</td>
          <td class="num">${s.count}</td>
          <td class="num">${i === 0 ? '100%' : s.pct + '%'}</td>
          <td style="width:30%;">${bar(s.pct)}</td>
        </tr>`).join('');
      return `
        <div class="adm-card">
          <h3>${esc(f.label)}</h3>
          <div class="adm-wrap-scroll"><table class="adm-table">
            <thead><tr><th>Step</th><th class="num">Count</th><th class="num">% of step 1</th><th></th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4">No data yet.</td></tr>'}</tbody>
          </table></div>
        </div>`;
    }).join('');

  const totalsCards = errors.totals
    ? `<div class="adm-card"><h3>Totals</h3><p class="acct-sub">Unavailable — ${esc(errors.totals)}</p></div>`
    : `<div class="adm-overview-grid">
        ${card('Active users', d.totals.active_users)}
        ${card('Sessions', d.totals.sessions ?? 0)}
        ${card('New signups', d.totals.signups)}
        ${card('Flights booked', d.totals.flight_bookings)}
        ${card('Hotels booked', d.totals.hotel_bookings)}
        ${card('Total events', d.totals.events)}
      </div>`;

  const seriesCard = errCard('Active users over time', `
    <div class="adm-card">
      <h3>Active users over time</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>${bucketCol()}</th><th class="num">Active users</th><th class="num">Events</th><th></th></tr></thead>
        <tbody>${seriesRows || '<tr><td colspan="4">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'series', errors);

  const topEventsCard = errCard('Top events', `
    <div class="adm-card">
      <h3>Top events</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Event</th><th class="num">Count</th></tr></thead>
        <tbody>${eventRows || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'top_events', errors);

  $('#analytics-root').innerHTML = `
    <div class="adm-form-row" style="justify-content:space-between; align-items:center; margin-bottom:14px;">
      <p class="acct-sub" style="margin:0;">Live from PostHog · refreshes every 60s</p>
      ${controlsHtml()}
    </div>
    ${totalsCards}
    ${seriesCard}
    ${topEventsCard}
    ${funnelCards}
    ${renderDeviceSection(d)}
    ${renderLocationSection(d)}`;

  wireControls();
}

// ── Travel Metrics ──────────────────────────────────────────────────
function tallyTable(title, tally, errKey, errors, labelFn) {
  const fn = labelFn || eventLabel;
  if (errors && errors[errKey]) {
    return `<div class="adm-card"><h3>${esc(title)}</h3><p class="acct-sub">Unavailable — ${esc(errors[errKey])}</p></div>`;
  }
  const rows = (tally || []).map((t) => `<tr><td>${esc(fn(t.key))}</td><td class="num">${t.count}</td></tr>`).join('');
  return `
    <div class="adm-card">
      <h3>${esc(title)}</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th></th><th class="num">Count</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

function destTallyTable(title, tally, errKey, errors) {
  if (errors && errors[errKey]) {
    return `<div class="adm-card"><h3>${esc(title)}</h3><p class="acct-sub">Unavailable — ${esc(errors[errKey])}</p></div>`;
  }
  const rows = (tally || []).map((t) => {
    const label = t.name ? `${esc(t.name)} (${esc(t.code)})` : esc(t.code);
    return `<tr><td>${label}</td><td class="num">${t.count}</td></tr>`;
  }).join('');
  return `
    <div class="adm-card">
      <h3>${esc(title)}</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Destination</th><th class="num">Count</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

function renderTravelMetrics(d) {
  const errors = d.errors || {};
  const identity = (k) => (k === null || k === undefined || k === '') ? '(none)' : String(k);

  const workflows   = tallyTable('Workflows', d.workflows, 'workflows', errors, eventLabel);
  const regions     = tallyTable('Selected Regions', d.regions, 'regions', errors, identity);
  const subregions  = tallyTable('Selected Sub-Regions', d.subregions, 'subregions', errors, identity);
  const vibes       = tallyTable('Selected Vibes', d.vibes, 'vibes', errors, eventLabel);
  const blogsByDest = destTallyTable('Blogs Loaded — by destination', d.blogs && d.blogs.by_destination, 'blog_destinations', errors);
  const blogsBySurf = tallyTable('Blogs Loaded — by surface', d.blogs && d.blogs.by_surface, 'blog_surfaces', errors, eventLabel);
  const hotelsByCity = tallyTable('Hotels Previewed — by city', d.hotels_previewed && d.hotels_previewed.by_city, 'hotels_by_city', errors, identity);
  const prebookings  = tallyTable('Pre-Bookings', d.prebookings, 'prebookings', errors, eventLabel);
  const bookingLabel = (k) => ({ flight_booked: 'Flights', hotel_booked: 'Hotels', together_booking_confirmed: 'Together (group)' }[k] || eventLabel(k));
  const bookings     = tallyTable('Bookings', d.bookings, 'bookings', errors, bookingLabel);

  const hotelsTotalCard = errors.hotels_total
    ? card('Hotels previewed', '—')
    : card('Hotels previewed (total)', (d.hotels_previewed && d.hotels_previewed.total) || 0);

  const topCards = errors.users
    ? `<div class="adm-overview-grid">${hotelsTotalCard}</div><p class="acct-sub">Users unavailable — ${esc(errors.users)}</p>`
    : `<div class="adm-overview-grid">
        ${card('Active users', d.users.total_active)}
        ${card('Logged in', d.users.identified)}
        ${card('Anonymous', d.users.anonymous)}
        ${hotelsTotalCard}
      </div>`;

  $('#analytics-root').innerHTML = `
    <div class="adm-form-row" style="justify-content:space-between; align-items:center; margin-bottom:14px;">
      <p class="acct-sub" style="margin:0;">Live from PostHog · refreshes every 60s</p>
      ${controlsHtml()}
    </div>
    ${topCards}
    ${workflows}
    <div class="adm-overview-grid" style="grid-template-columns: 1fr 1fr 1fr;">
      ${regions}
      ${subregions}
      ${vibes}
    </div>
    <div class="adm-overview-grid" style="grid-template-columns: 1fr 1fr;">
      ${blogsByDest}
      ${blogsBySurf}
    </div>
    <div class="adm-overview-grid" style="grid-template-columns: 1fr 1fr;">
      ${hotelsByCity}
      ${prebookings}
    </div>
    ${bookings}`;

  wireControls();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
