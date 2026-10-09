// ───────────────────────────────────────────────────────────────────
//  wt-app-analytics.js — the App Analytics page (/app-analytics/).
//
//  App tab              app usage from PostHog: active users, installs, top
//                       events, funnels, flight add-ons, devices, location.
//  Travel Metrics tab   what people plan and book in the app: workflows, regions,
//                       vibes, blogs, hotels previewed, pre-bookings, bookings.
//
//  The website has its own page, /analytics/ (wt-site-analytics.js). Sign-in, the
//  refresh and the "Go live" feed are in wt-analytics-core.js.
// ───────────────────────────────────────────────────────────────────
import {
  $, esc, card, bar, errCard, controlsHtml, wireControls, bucketCol, formatBucket,
  eventLabel, startAnalyticsPage,
} from './wt-analytics-core.js';

const fmtMoney = (n, ccy) => {
  const amount = Number(n || 0);
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy || 'USD' }).format(amount); }
  catch { return '$' + amount.toFixed(2); }
};
// Flight ancillaries only — commission-bearing bags/seats. No hotel
// equivalent exists yet: LiteAPI/Nuitee's board type (breakfast, etc.) is
// baked into the room rate, not a separately purchasable service. Shared
// between the App tab (right next to the booking funnels) and Travel
// Metrics (alongside the other commerce cards) — same data, same card,
// two spots someone might reasonably look for it.
function addonsCardHtml(d, errors) {
  if (errors.addons) {
    return `<div class="adm-card"><h3>Flight Add-ons (bags &amp; seats)</h3><p class="acct-sub">Unavailable — ${esc(errors.addons)}</p></div>`;
  }
  const a = d.addons || { bags: { count: 0, revenue: 0 }, seats: { count: 0, revenue: 0 }, currency: null };
  return `
    <div class="adm-card">
      <h3>Flight Add-ons (bags &amp; seats)</h3>
      <div class="adm-overview-grid">
        ${card('Bags sold', a.bags.count)}
        ${card('Bag revenue', fmtMoney(a.bags.revenue, a.currency))}
        ${card('Seats sold', a.seats.count)}
        ${card('Seat revenue', fmtMoney(a.seats.revenue, a.currency))}
      </div>
    </div>`;
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
        ${card('App installs', d.totals.installs ?? 0)}
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
    ${addonsCardHtml(d, errors)}
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

  const addonsCard = addonsCardHtml(d, errors);

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
    ${bookings}
    ${addonsCard}`;

  wireControls();
}

startAnalyticsPage({
  defaultChannel: 'app',
  channelRenderers: { app: renderAppAnalytics, travel: renderTravelMetrics },
});
