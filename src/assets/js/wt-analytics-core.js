// ───────────────────────────────────────────────────────────────────
//  wt-analytics-core.js — what the two analytics pages share.
//
//    /analytics/       Site Analytics  (wt-site-analytics.js)
//                      tabs: WhereToTrips.com (PostHog), Search (Google Search Console)
//    /app-analytics/   App Analytics   (wt-app-analytics.js)
//                      tabs: App, Travel Metrics (PostHog)
//
//  This file is the plumbing: sign-in and the admin check, the 60-second
//  refresh, the "Go live" feed, the range buttons, the "View all" pop-up and the
//  small formatters. A page script holds what its tabs show. To change a tab,
//  edit that page's script. To add a tab, put a button with a data-channel in
//  the page's .njk, write its render function in the page's script and list it
//  in startAnalyticsPage(). The one tab this file treats differently is
//  `search` (Google Search Console: its own range buttons, no live feed).
//
//  Data comes from the `admin` edge fn (analytics_overview, search_overview,
//  analytics_live), behind the same admins-table gate as the affiliate and
//  submissions admin. It needs the POSTHOG_PROJECT_ID + POSTHOG_PERSONAL_API_KEY
//  secrets (and GSC_SERVICE_ACCOUNT_JSON for Search). If one is missing the fn
//  returns ok:false and the page says so plainly instead of showing a blank
//  dashboard.
//
//  Not literally push-based real-time: it polls the admin fn every 60s while
//  the tab is visible (or every 4s in "Go live" mode), and PostHog itself
//  ingests events within roughly seconds to a couple of minutes.
//
//  "Go live" is an opt-in toggle next to the range buttons (Last hour/6
//  hours/Today/Last 7 days/Last 30 days; Today stays the default view). It
//  swaps the aggregate cards for a raw, auto-refreshing feed of the last 30
//  minutes of events (the fn's analytics_live action), for watching exactly
//  what fires while actively testing, rather than waiting on aggregates.
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
let currentChannel = null;       // set by startAnalyticsPage()
let renderers = {};             // channel -> render function, set by startAnalyticsPage()
let currentRange = 'today';
let searchRange = '28d';
let liveMode = false;
let pollTimer = null;
const SEARCH_RANGES = [['7d', 'Last 7 days'], ['28d', 'Last 28 days'], ['90d', 'Last 3 months']];
const RANGES = [
  ['hour', 'Last hour'], ['6h', '6 hours'],
  ['today', 'Today'], ['week', 'Last 7 days'], ['30d', 'Last 30 days'],
];

export const $ = (s, r = document) => r.querySelector(s);
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function msg(type, text) { const m = $('#adm-msg'); m.className = 'alert show alert-' + type; m.textContent = text; setTimeout(() => { if (m.textContent === text) m.className = 'alert'; }, 5000); }

async function callAdmin(action, params = {}) {
  const res = await fetch(ADMIN_FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json().catch(() => ({ ok: false, error: 'network' }));
}

// ── boot ────────────────────────────────────────────────────────────
// A page calls this once. `defaultChannel` is the tab that opens first (it must be
// the one marked is-active in the page's .njk); `channelRenderers` maps each tab's
// data-channel to the function that draws it from the fn's answer.
export function startAnalyticsPage({ defaultChannel, channelRenderers }) {
  currentChannel = defaultChannel;
  renderers = channelRenderers;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}

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
      if (currentChannel === 'search') liveMode = false;
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

// ── Drill-in modal — "View all" on any card whose table is capped for
// display. The backend already returns up to 50 rows; the modal just shows
// the same array unsliced, so there's no extra round trip. ──────────────
function ensureDrillModal() {
  let modal = document.getElementById('adm-drill-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'adm-drill-modal';
  modal.style.cssText = 'position:fixed; inset:0; z-index:100; display:none; align-items:flex-start; justify-content:center; background:rgba(0,0,0,.5); padding:40px 16px; overflow-y:auto;';
  modal.innerHTML = `
    <div class="adm-card" style="max-width:960px; width:100%; max-height:85vh; display:flex; flex-direction:column;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:12px;">
        <h3 id="adm-drill-title" style="margin:0;"></h3>
        <button type="button" id="adm-drill-close" class="btn btn-xs btn-ghost">✕ Close</button>
      </div>
      <div id="adm-drill-body" style="overflow:auto;"></div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (ev) => { if (ev.target === modal) closeDrillModal(); });
  modal.querySelector('#adm-drill-close').addEventListener('click', closeDrillModal);
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeDrillModal(); });
  return modal;
}
function closeDrillModal() {
  const modal = document.getElementById('adm-drill-modal');
  if (modal) modal.style.display = 'none';
}
// `rows` is an array of already-escaped-safe HTML row strings (each a full
// `<tr>...</tr>`) so callers can reuse their existing per-row renderers.
export function openDrillModal(title, headers, rowsHtml) {
  const modal = ensureDrillModal();
  $('#adm-drill-title').textContent = title;
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  $('#adm-drill-body').innerHTML = `
    <div class="adm-wrap-scroll"><table class="adm-table">
      <thead><tr>${head}</tr></thead>
      <tbody>${rowsHtml.join('') || `<tr><td colspan="${headers.length}">No data.</td></tr>`}</tbody>
    </table></div>`;
  modal.style.display = 'flex';
}
export function viewAllBtnHtml(id) {
  return `<button type="button" class="btn btn-xs btn-ghost" data-drill="${id}" style="float:right; margin-top:-2px;">View all →</button>`;
}

// ── Analytics ───────────────────────────────────────────────────────
async function loadAnalytics(silent = false) {
  const root = $('#analytics-root');
  if (!silent) root.innerHTML = `<div class="adm-card">Loading…</div>`;

  const d = currentChannel === 'search'
    ? await callAdmin('search_overview', { range: searchRange })
    : await callAdmin('analytics_overview', { range: currentRange, channel: currentChannel });

  if (!d.ok) {
    const hint = d.error === 'posthog_not_configured'
      ? 'PostHog isn’t wired up on the backend yet — set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY as secrets on the `admin` edge function, then redeploy it.'
      : d.error === 'gsc_not_configured'
        ? 'Search Console isn’t connected yet — add the GSC_SERVICE_ACCOUNT_JSON secret to the `admin` edge function (a Google service account added as a user on the Search Console property), then redeploy it.'
        : currentChannel === 'search'
          ? `Search Console query failed (${esc(d.error || 'unknown error')}).`
          : `PostHog query failed (${esc(d.error || 'unknown error')}).`;
    root.innerHTML = `
      <div class="acct-card">
        <p class="eyebrow">Not available</p>
        <h1 style="font-size:1.5rem;">Analytics unavailable</h1>
        <p class="acct-sub">${hint}</p>
      </div>`;
    return;
  }

  (renderers[d.channel] || renderers[currentChannel])(d);
}

function rangeBtnsHtml() {
  const [list, active] = currentChannel === 'search' ? [SEARCH_RANGES, searchRange] : [RANGES, currentRange];
  return list.map(([key, label]) =>
    `<button type="button" class="btn btn-xs ${key === active ? 'btn-primary' : 'btn-ghost'}" data-range="${key}">${label}</button>`).join('');
}
function wireRangeBtns() {
  $('#analytics-root').querySelectorAll('[data-range]').forEach((b) => {
    b.addEventListener('click', () => {
      if (currentChannel === 'search') {
        if (b.dataset.range === searchRange) return;
        searchRange = b.dataset.range;
      } else {
        if (b.dataset.range === currentRange) return;
        currentRange = b.dataset.range;
      }
      loadAnalytics();
    });
  });
}
// Range buttons don't apply in live mode (it's always "the last 30 minutes"),
// so they're swapped out for the toggle alone rather than shown disabled.
export function controlsHtml() {
  return `
    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
      ${liveMode ? '' : rangeBtnsHtml()}
      ${currentChannel === 'search' ? '' : `<button type="button" id="adm-live-btn" class="btn btn-xs ${liveMode ? 'btn-primary' : 'btn-ghost'}">
        ${liveMode ? '⏹ Stop live' : '🔴 Go live'}
      </button>`}
    </div>`;
}
export function wireControls() {
  if (!liveMode) wireRangeBtns();
  const btn = $('#adm-live-btn');
  if (btn) btn.addEventListener('click', toggleLive);
}
export function bucketCol() {
  if (currentRange === 'hour') return 'Time';
  if (currentRange === '6h' || currentRange === 'today') return 'Hour';
  if (currentRange === '30d') return 'Week';
  return 'Day';
}
export const DASH_TZ = 'America/Chicago';
export function formatBucket(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (currentRange === 'hour') return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: DASH_TZ }) + ' CT';
  if (currentRange === '6h' || currentRange === 'today') return d.toLocaleTimeString('en-US', { hour: 'numeric', timeZone: DASH_TZ }) + ' CT';
  if (currentRange === '30d') return 'Week of ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: DASH_TZ });
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: DASH_TZ });
}
export function bar(pct) {
  return `<div style="background:var(--wg200); border-radius:6px; overflow:hidden; height:10px;"><div style="width:${pct}%; background:var(--rust); height:100%;"></div></div>`;
}

export const card = (label, val) => `<div class="stat-card"><p class="label">${label}</p><p class="value">${val}</p></div>`;

// Renders `body` normally, or an "Unavailable" card if `errors[key]` is set —
// used so one bad HogQL query degrades just its own card, not the whole tab.
export function errCard(title, body, key, errors) {
  if (errors && errors[key]) {
    return `<div class="adm-card"><h3>${esc(title)}</h3><p class="acct-sub">Unavailable — ${esc(errors[key])}</p></div>`;
  }
  return body;
}

// ── Event names ─────────────────────────────────────────────────────
export function eventLabel(name) {
  return String(name || '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Unknown';
}
