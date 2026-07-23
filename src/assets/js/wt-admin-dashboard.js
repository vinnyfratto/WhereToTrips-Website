// ───────────────────────────────────────────────────────────────────
//  wt-admin-dashboard.js — analytics for both PostHog-tracked channels
//  (WhereToTrips.com website + the WhereTo app), via the `admin` edge
//  fn's analytics_overview action (same admins-table gate as the
//  affiliate/submissions admin). Requires the edge fn to have
//  POSTHOG_PROJECT_ID + POSTHOG_PERSONAL_API_KEY secrets set — if not,
//  the fn returns ok:false and this page shows that plainly instead of
//  a blank dashboard.
//
//  Not literally push-based real-time: it polls the admin fn every 60s
//  while the tab is visible, and PostHog itself ingests events within
//  roughly seconds to a couple minutes.
// ───────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.WT_SUPABASE || {};
const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
const ADMIN_FN = cfg.url + '/functions/v1/admin';
const REFRESH_MS = 60_000;

let TOKEN = null;
let currentChannel = 'website';
let currentRange = 'today';
let pollTimer = null;
const RANGES = [['today', 'Today'], ['week', 'This week'], ['30d', 'Last 30 days']];

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
      loadAnalytics();
    });
  });

  await loadAnalytics();
  pollTimer = setInterval(() => { if (document.visibilityState === 'visible') loadAnalytics(true); }, REFRESH_MS);
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
function bucketCol() { return currentRange === 'today' ? 'Hour' : currentRange === '30d' ? 'Week' : 'Day'; }
function formatBucket(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (currentRange === 'today') return d.toLocaleTimeString('en-US', { hour: 'numeric', timeZone: 'UTC' }) + ' UTC';
  if (currentRange === '30d') return 'Week of ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
function bar(pct) {
  return `<div style="background:var(--wg200); border-radius:6px; overflow:hidden; height:10px;"><div style="width:${pct}%; background:var(--rust); height:100%;"></div></div>`;
}
const card = (label, val) => `<div class="stat-card"><p class="label">${label}</p><p class="value">${val}</p></div>`;

// ── WhereToTrips.com ────────────────────────────────────────────────
function renderWebsiteAnalytics(d) {
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

  $('#analytics-root').innerHTML = `
    <div class="adm-form-row" style="justify-content:space-between; align-items:center; margin-bottom:14px;">
      <p class="acct-sub" style="margin:0;">Live from PostHog · refreshes every 60s</p>
      <div style="display:flex; gap:8px;">${rangeBtnsHtml()}</div>
    </div>
    <div class="adm-overview-grid">
      ${card('Pageviews', d.totals.pageviews)}
      ${card('Unique visitors', d.totals.visitors)}
    </div>
    <div class="adm-card">
      <h3>Traffic over time</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>${bucketCol()}</th><th class="num">Pageviews</th><th class="num">Visitors</th><th></th></tr></thead>
        <tbody>${seriesRows || '<tr><td colspan="4">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>
    <div class="adm-overview-grid" style="grid-template-columns: 1fr 1fr;">
      <div class="adm-card">
        <h3>Top pages</h3>
        <div class="adm-wrap-scroll"><table class="adm-table">
          <thead><tr><th>Page</th><th class="num">Views</th></tr></thead>
          <tbody>${pageRows || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody>
        </table></div>
      </div>
      <div class="adm-card">
        <h3>Top referrers</h3>
        <div class="adm-wrap-scroll"><table class="adm-table">
          <thead><tr><th>Domain</th><th class="num">Visits</th></tr></thead>
          <tbody>${refRows || '<tr><td colspan="2">No referral traffic yet.</td></tr>'}</tbody>
        </table></div>
      </div>
    </div>`;

  wireRangeBtns();
}

// ── App ─────────────────────────────────────────────────────────────
function eventLabel(name) {
  return String(name || '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Unknown';
}

function renderAppAnalytics(d) {
  const maxCount = Math.max(1, ...(d.series || []).map((r) => r.active_users));
  const seriesRows = (d.series || []).map((r) => `
    <tr>
      <td>${esc(formatBucket(r.bucket))}</td>
      <td class="num">${r.active_users}</td>
      <td class="num">${r.events}</td>
      <td style="width:40%;">${bar(Math.round((r.active_users / maxCount) * 100))}</td>
    </tr>`).join('');

  const eventRows = (d.top_events || []).map((e) => `<tr><td>${esc(eventLabel(e.name))}</td><td class="num">${e.count}</td></tr>`).join('');

  const funnelCards = (d.funnels || []).map((f) => {
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

  $('#analytics-root').innerHTML = `
    <div class="adm-form-row" style="justify-content:space-between; align-items:center; margin-bottom:14px;">
      <p class="acct-sub" style="margin:0;">Live from PostHog · refreshes every 60s</p>
      <div style="display:flex; gap:8px;">${rangeBtnsHtml()}</div>
    </div>
    <div class="adm-overview-grid">
      ${card('Active users', d.totals.active_users)}
      ${card('New signups', d.totals.signups)}
      ${card('Flights booked', d.totals.bookings)}
      ${card('Total events', d.totals.events)}
    </div>
    <div class="adm-card">
      <h3>Active users over time</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>${bucketCol()}</th><th class="num">Active users</th><th class="num">Events</th><th></th></tr></thead>
        <tbody>${seriesRows || '<tr><td colspan="4">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>
    <div class="adm-card">
      <h3>Top events</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Event</th><th class="num">Count</th></tr></thead>
        <tbody>${eventRows || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>
    ${funnelCards}`;

  wireRangeBtns();
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

function renderTravelMetrics(d) {
  const errors = d.errors || {};
  const identity = (k) => (k === null || k === undefined || k === '') ? '(none)' : String(k);

  const workflows   = tallyTable('Workflows', d.workflows, 'workflows', errors, eventLabel);
  const regions     = tallyTable('Selected Regions', d.regions, 'regions', errors, identity);
  const subregions  = tallyTable('Selected Sub-Regions', d.subregions, 'subregions', errors, identity);
  const vibes       = tallyTable('Selected Vibes', d.vibes, 'vibes', errors, eventLabel);
  const blogsByDest = tallyTable('Blogs Loaded — by destination', d.blogs && d.blogs.by_destination, 'blog_destinations', errors, identity);
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
      <div style="display:flex; gap:8px;">${rangeBtnsHtml()}</div>
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

  wireRangeBtns();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
