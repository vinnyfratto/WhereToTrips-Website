// ───────────────────────────────────────────────────────────────────
//  wt-site-analytics.js — the Site Analytics page (/analytics/).
//
//  WhereToTrips.com tab   website traffic from PostHog, people only (crawlers and our
//                         own admin pages are left out and counted): pageviews,
//                         visitors, sessions, bounce, session time, traffic over time,
//                         channels and sources, top pages and referrers, audience
//                         (country, city, device, browser, OS, new vs returning),
//                         campaigns, entry and exit pages, transitions, bot quality.
//  Search tab             Google Search Console: clicks, impressions, queries,
//                         pages, sitemaps.
//
//  The app has its own page, /app-analytics/ (wt-app-analytics.js). Sign-in, the
//  refresh and the "Go live" feed are in wt-analytics-core.js.
// ───────────────────────────────────────────────────────────────────
import {
  $, esc, card, bar, errCard, controlsHtml, wireControls, bucketCol, formatBucket,
  openDrillModal, viewAllBtnHtml, DASH_TZ, startAnalyticsPage,
} from './wt-analytics-core.js';

// ── WhereToTrips.com ────────────────────────────────────────────────
// 1m 47s, 45s. Session lengths come back in whole seconds.
const fmtDuration = (s) => {
  const n = Math.max(0, Math.round(Number(s) || 0));
  if (n < 60) return n + 's';
  return Math.floor(n / 60) + 'm ' + String(n % 60).padStart(2, '0') + 's';
};

// One audience breakdown (country, device, browser...). `total` is the number of
// people in the period, so a short top-N list shows each row's real share rather
// than a share of whatever happened to be listed.
function audienceTable(title, rows, errKey, errors, { label, total, pageviews = true } = {}) {
  const list = rows || [];
  const denom = total > 0 ? total : list.reduce((n, r) => n + (Number(r.visitors) || 0), 0);
  const body = list.map((r) => {
    const v = Number(r.visitors) || 0;
    const pct = denom > 0 ? Math.min(100, Math.round((v / denom) * 100)) : 0;
    return `
      <tr>
        <td>${esc(label ? label(r) : r.key)}</td>
        <td class="num">${fmtInt(v)}</td>
        ${pageviews ? `<td class="num">${fmtInt(r.pageviews || 0)}</td>` : ''}
        <td class="num">${pct}%</td>
        <td style="width:22%;">${bar(pct)}</td>
      </tr>`;
  }).join('');
  return errCard(title, `
    <div class="adm-card">
      <h3>${esc(title)}</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th></th><th class="num">Visitors</th>${pageviews ? '<th class="num">Pageviews</th>' : ''}<th class="num">Share</th><th></th></tr></thead>
        <tbody>${body || `<tr><td colspan="${pageviews ? 5 : 4}">No data yet.</td></tr>`}</tbody>
      </table></div>
    </div>`, errKey, errors);
}

function renderWebsiteAnalytics(d) {
  const errors = d.errors || {};
  const eng = errors.channels ? null : (d.engagement || null);
  const bots = d.bots || { bot_pageviews: 0, bot_visitors: 0, bot_pct: 0, internal_pageviews: 0, top_agents: [] };
  const totals = d.totals || { pageviews: 0, visitors: 0 };
  const maxCount = Math.max(1, ...(d.series || []).map((r) => r.pageviews));
  const seriesRows = (d.series || []).map((r) => `
    <tr>
      <td>${esc(formatBucket(r.bucket))}</td>
      <td class="num">${r.pageviews}</td>
      <td class="num">${r.visitors}</td>
      <td style="width:40%;">${bar(Math.round((r.pageviews / maxCount) * 100))}</td>
    </tr>`).join('');

  const pages = d.top_pages || [];
  const refs = d.top_referrers || [];
  const pageRowHtml = (p) => `<tr><td>${esc(p.path)}</td><td class="num">${p.views}</td></tr>`;
  const refRowHtml = (r) => `<tr><td>${esc(r.domain)}</td><td class="num">${r.visits}</td></tr>`;
  const pageRows = pages.slice(0, 10).map(pageRowHtml).join('');
  const refRows = refs.slice(0, 10).map(refRowHtml).join('');

  // The numbers here count people. Crawlers and our own admin pages are left out
  // by the backend; say how much, so nobody wonders why this is lower than the
  // raw PostHog count.
  const leftOut = [];
  const pv = (n) => (Number(n) === 1 ? 'pageview' : 'pageviews');
  if (bots.bot_pageviews) leftOut.push(`${fmtInt(bots.bot_pageviews)} crawler ${pv(bots.bot_pageviews)} (Google Play and other bots)`);
  if (bots.internal_pageviews) leftOut.push(`${fmtInt(bots.internal_pageviews)} ${pv(bots.internal_pageviews)} of our own admin pages`);
  const leftOutNote = leftOut.length
    ? `<p class="acct-sub" style="margin:0 0 14px;">People only. Left out of every number below: ${leftOut.join(' and ')}.</p>`
    : '';

  const na = 'n/a';
  const totalsCards = `<div class="adm-overview-grid">
      ${errors.totals ? card('Pageviews', na) + card('Unique visitors', na) : card('Pageviews', fmtInt(totals.pageviews)) + card('Unique visitors', fmtInt(totals.visitors))}
      ${card('Sessions', eng ? fmtInt(eng.sessions) : na)}
      ${card('Bounce rate', eng ? eng.bounce_pct + '%' : na)}
      ${card('Avg. session', eng ? fmtDuration(eng.avg_seconds) : na)}
      ${card('Pages per session', eng ? eng.pages_per_session : na)}
    </div>`;

  const trafficCard = errCard('Traffic over time', `
    <div class="adm-card">
      <h3>Traffic over time</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>${bucketCol()}</th><th class="num">Pageviews</th><th class="num">Visitors</th><th></th></tr></thead>
        <tbody>${seriesRows || '<tr><td colspan="4">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'series', errors);

  // Where visitors come from: PostHog's own channel classification per session
  // (Direct, Referral, Organic Search, Organic Social, Paid Social, AI, Email...).
  // It needs no UTM tags, so it answers the question the Campaigns table cannot.
  const channelList = d.channels || [];
  const sessionsAll = channelList.reduce((n, c) => n + (Number(c.sessions) || 0), 0);
  const channelRowsHtml = channelList.map((c) => {
    const share = sessionsAll > 0 ? Math.round((c.sessions / sessionsAll) * 100) : 0;
    return `
      <tr>
        <td>${esc(c.channel)}</td>
        <td class="num">${fmtInt(c.sessions)}</td>
        <td class="num">${share}%</td>
        <td class="num">${c.bounce_pct}%</td>
        <td class="num">${fmtDuration(c.avg_seconds)}</td>
        <td style="width:18%;">${bar(share)}</td>
      </tr>`;
  }).join('');
  const sourceRowsHtml = (d.sources || []).slice(0, 12).map((s) => `
      <tr><td>${esc(s.channel)}</td><td>${esc(s.domain === '$direct' ? '(direct)' : s.domain)}</td><td class="num">${fmtInt(s.sessions)}</td></tr>`).join('');
  const channelsCard = errCard('Where visitors come from', `
    <div class="adm-card">
      <h3>Where visitors come from</h3>
      <p class="acct-sub" style="margin:-4px 0 12px;">Sessions by channel, as PostHog classifies them. This works without UTM tags.</p>
      <div class="adm-overview-grid" style="grid-template-columns: 1.5fr 1fr; align-items:start;">
        <div class="adm-wrap-scroll"><table class="adm-table">
          <thead><tr><th>Channel</th><th class="num">Sessions</th><th class="num">Share</th><th class="num">Bounce</th><th class="num">Avg. time</th><th></th></tr></thead>
          <tbody>${channelRowsHtml || '<tr><td colspan="6">No data yet.</td></tr>'}</tbody>
        </table></div>
        ${errors.sources ? `<p class="acct-sub">Unavailable — ${esc(errors.sources)}</p>` : `<div class="adm-wrap-scroll"><table class="adm-table">
          <thead><tr><th>Channel</th><th>Source</th><th class="num">Sessions</th></tr></thead>
          <tbody>${sourceRowsHtml || '<tr><td colspan="3">No data yet.</td></tr>'}</tbody>
        </table></div>`}
      </div>
    </div>`, 'channels', errors);

  const topPagesCard = errCard('Top pages', `
    <div class="adm-card">
      <h3>Top pages ${pages.length > 10 ? viewAllBtnHtml('pages') : ''}</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Page</th><th class="num">Views</th></tr></thead>
        <tbody>${pageRows || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'top_pages', errors);

  const topRefCard = errCard('Top referrers', `
    <div class="adm-card">
      <h3>Top referrers ${refs.length > 10 ? viewAllBtnHtml('referrers') : ''}</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Domain</th><th class="num">Visits</th></tr></thead>
        <tbody>${refRows || '<tr><td colspan="2">No referral traffic yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'top_referrers', errors);

  // Audience: who they are and where they are, all from the same human pageviews.
  const aud = d.audience || {};
  const vt = aud.visitor_type || {};
  const newV = Number(vt.new_visitors) || 0;
  const retV = Number(vt.returning_visitors) || 0;
  const cityLabel = (r) => {
    const place = r.state ? `${r.city}, ${r.state}` : r.city;
    return r.country && r.country !== 'US' ? `${place} (${r.country})` : place;
  };
  const audienceHtml = `
    <h2 class="adm-section-h">Audience</h2>
    <p class="acct-sub" style="margin:-4px 0 16px;">
      People only. Location comes from the visitor's IP address, so a VPN or a phone
      carrier can put someone in a different city.
    </p>
    <div class="adm-grid-2">
      ${audienceTable('Country', aud.countries, 'audience', errors, { total: totals.visitors })}
      ${audienceTable('City', aud.cities, 'cities', errors, { total: totals.visitors, pageviews: false, label: cityLabel })}
    </div>
    <div class="adm-grid-2">
      ${audienceTable('Device', aud.devices, 'audience', errors, { total: totals.visitors })}
      ${audienceTable('Browser', aud.browsers, 'audience', errors, { total: totals.visitors })}
    </div>
    <div class="adm-grid-2">
      ${audienceTable('Operating system', aud.os, 'audience', errors, { total: totals.visitors })}
      ${audienceTable('New vs returning', [{ key: 'New visitors', visitors: newV }, { key: 'Returning visitors', visitors: retV }], 'visitor_type', errors, { total: newV + retV, pageviews: false })}
    </div>`;

  // Campaigns — UTM-tagged traffic only (additive to Top Referrers above,
  // which covers organic/direct/referral with no UTM at all).
  const campaigns = d.campaigns || [];
  const campaignRowHtml = (c) => `<tr><td>${esc(c.source)}</td><td>${esc(c.medium)}</td><td>${esc(c.campaign)}</td><td class="num">${c.pageviews}</td><td class="num">${c.visitors}</td></tr>`;
  const campaignsCard = errCard('Campaigns (UTM-tagged traffic)', `
    <div class="adm-card">
      <h3>Campaigns (UTM-tagged traffic) ${campaigns.length > 10 ? viewAllBtnHtml('campaigns') : ''}</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Source</th><th>Medium</th><th>Campaign</th><th class="num">Pageviews</th><th class="num">Visitors</th></tr></thead>
        <tbody>${campaigns.slice(0, 10).map(campaignRowHtml).join('') || '<tr><td colspan="5">No UTM-tagged traffic yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'campaigns', errors);

  // Paths — entry and exit pages come from PostHog sessions (one count per visit,
  // with the real session boundary), and entry pages carry that landing page's
  // bounce rate. Transitions are adjacent pageviews of one visitor, at most 30
  // minutes apart. Each piece can fail on its own and says so.
  const paths = d.paths || { entry_pages: [], exit_pages: [], transitions: [] };
  const entryRowHtml = (p) => `<tr><td>${esc(p.path)}</td><td class="num">${fmtInt(p.count)}</td><td class="num">${p.bounce_pct}%</td></tr>`;
  const exitRowHtml = (p) => `<tr><td>${esc(p.path)}</td><td class="num">${fmtInt(p.count)}</td></tr>`;
  const transRowHtml = (t) => `<tr><td>${esc(t.from)}</td><td>→</td><td>${esc(t.to)}</td><td class="num">${t.count}</td></tr>`;
  const unavailable = (key) => `<p class="acct-sub">Unavailable — ${esc(errors[key])}</p>`;
  const entrySection = errors.entry_pages ? unavailable('entry_pages') : `
    <div class="adm-wrap-scroll"><table class="adm-table">
      <thead><tr><th>Page</th><th class="num">Sessions</th><th class="num">Bounce</th></tr></thead>
      <tbody>${paths.entry_pages.slice(0, 10).map(entryRowHtml).join('') || '<tr><td colspan="3">No data yet.</td></tr>'}</tbody>
    </table></div>`;
  const exitSection = errors.exit_pages ? unavailable('exit_pages') : `
    <div class="adm-wrap-scroll"><table class="adm-table">
      <thead><tr><th>Page</th><th class="num">Sessions</th></tr></thead>
      <tbody>${paths.exit_pages.slice(0, 10).map(exitRowHtml).join('') || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody>
    </table></div>`;
  const transSection = errors.transitions ? unavailable('transitions') : `
    <div class="adm-wrap-scroll"><table class="adm-table">
      <thead><tr><th>From</th><th></th><th>To</th><th class="num">Count</th></tr></thead>
      <tbody>${paths.transitions.slice(0, 10).map(transRowHtml).join('') || '<tr><td colspan="4">No data yet.</td></tr>'}</tbody>
    </table></div>`;
  const pathsCard = `
    <div class="adm-card">
      <h3>User paths</h3>
      <p class="acct-sub" style="margin:-4px 0 12px;">Entry and exit pages count each visit once, using PostHog's sessions. Bounce is the share of those visits that viewed one page and did nothing else. Transitions are adjacent pageviews of one visitor, at most 30 minutes apart.</p>
      <div class="adm-overview-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:16px;">
        <div>
          <p class="acct-sub" style="margin:0 0 6px; font-weight:600;">Entry pages ${!errors.entry_pages && paths.entry_pages.length > 10 ? viewAllBtnHtml('entry') : ''}</p>
          ${entrySection}
        </div>
        <div>
          <p class="acct-sub" style="margin:0 0 6px; font-weight:600;">Exit pages ${!errors.exit_pages && paths.exit_pages.length > 10 ? viewAllBtnHtml('exit') : ''}</p>
          ${exitSection}
        </div>
      </div>
      <p class="acct-sub" style="margin:0 0 6px; font-weight:600;">Top page-to-page transitions ${!errors.transitions && paths.transitions.length > 10 ? viewAllBtnHtml('transitions') : ''}</p>
      ${transSection}
    </div>`;

  // Bot detection — UA-regex split (see BOT_UA_RE in the admin fn). These
  // visits are already left out of every number above.
  const botAgentRowHtml = (a) => `<tr><td style="max-width:420px; overflow-wrap:anywhere;">${esc(a.ua)}</td><td>${esc(a.domain || '—')}</td><td class="num">${a.pageviews}</td></tr>`;
  const botsCard = errCard('Traffic quality (bot detection)', `
    <div class="adm-card">
      <h3>Traffic quality (bot detection)</h3>
      <p class="acct-sub" style="margin:-4px 0 12px;">Visits whose user agent matches a known crawler, bot or headless browser, including Google Play's listing checks. They are left out of every number above. Anything spoofing a real browser UA will read as human, so treat this as a floor, not a ceiling.</p>
      <div class="adm-overview-grid" style="margin-bottom:16px;">
        ${card('Bot pageviews', `${fmtInt(bots.bot_pageviews)} <span class="acct-sub" style="font-size:.6em;">(${bots.bot_pct}%)</span>`)}
        ${card('Bot visitors', fmtInt(bots.bot_visitors))}
        ${card('Our own admin pageviews', fmtInt(bots.internal_pageviews || 0))}
      </div>
      <p class="acct-sub" style="margin:0 0 6px; font-weight:600;">Top bot user agents ${bots.top_agents.length > 10 ? viewAllBtnHtml('bots') : ''}</p>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>User agent</th><th>Referring domain</th><th class="num">Pageviews</th></tr></thead>
        <tbody>${bots.top_agents.slice(0, 10).map(botAgentRowHtml).join('') || '<tr><td colspan="3">No bot traffic detected.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'bot_split', errors);

  $('#analytics-root').innerHTML = `
    <div class="adm-form-row" style="justify-content:space-between; align-items:center; margin-bottom:14px;">
      <p class="acct-sub" style="margin:0;">Live from PostHog · refreshes every 60s · times in Central (CT)</p>
      ${controlsHtml()}
    </div>
    ${leftOutNote}
    ${totalsCards}
    ${trafficCard}
    ${channelsCard}
    <div class="adm-overview-grid" style="grid-template-columns: 1fr 1fr;">
      ${topPagesCard}
      ${topRefCard}
    </div>
    ${audienceHtml}
    ${campaignsCard}
    ${pathsCard}
    ${botsCard}`;

  wireControls();
  wireWebsiteDrillButtons({ pages, refs, campaigns, paths, bots });
}

function wireWebsiteDrillButtons({ pages, refs, campaigns, paths, bots }) {
  const map = {
    pages: () => openDrillModal('All pages', ['Page', 'Views'], pages.map((p) => `<tr><td>${esc(p.path)}</td><td class="num">${p.views}</td></tr>`)),
    referrers: () => openDrillModal('All referrers', ['Domain', 'Visits'], refs.map((r) => `<tr><td>${esc(r.domain)}</td><td class="num">${r.visits}</td></tr>`)),
    campaigns: () => openDrillModal('All campaigns', ['Source', 'Medium', 'Campaign', 'Pageviews', 'Visitors'],
      campaigns.map((c) => `<tr><td>${esc(c.source)}</td><td>${esc(c.medium)}</td><td>${esc(c.campaign)}</td><td class="num">${c.pageviews}</td><td class="num">${c.visitors}</td></tr>`)),
    entry: () => openDrillModal('All entry pages', ['Page', 'Sessions', 'Bounce'], paths.entry_pages.map((p) => `<tr><td>${esc(p.path)}</td><td class="num">${fmtInt(p.count)}</td><td class="num">${p.bounce_pct}%</td></tr>`)),
    exit: () => openDrillModal('All exit pages', ['Page', 'Sessions'], paths.exit_pages.map((p) => `<tr><td>${esc(p.path)}</td><td class="num">${fmtInt(p.count)}</td></tr>`)),
    transitions: () => openDrillModal('All page-to-page transitions', ['From', '', 'To', 'Count'],
      paths.transitions.map((t) => `<tr><td>${esc(t.from)}</td><td>→</td><td>${esc(t.to)}</td><td class="num">${t.count}</td></tr>`)),
    bots: () => openDrillModal('All bot user agents', ['User agent', 'Referring domain', 'Pageviews'],
      bots.top_agents.map((a) => `<tr><td style="max-width:420px; overflow-wrap:anywhere;">${esc(a.ua)}</td><td>${esc(a.domain || '—')}</td><td class="num">${a.pageviews}</td></tr>`)),
  };
  $('#analytics-root').querySelectorAll('[data-drill]').forEach((btn) => {
    const fn = map[btn.dataset.drill];
    if (fn) btn.addEventListener('click', fn);
  });
}

// ── Search (Google Search Console) ──────────────────────────────────
const fmtPct = (n) => (Number(n || 0) * 100).toFixed(1) + '%';
const fmtPos = (n) => Number(n || 0).toFixed(1);
const fmtInt = (n) => Number(n || 0).toLocaleString('en-US');
function fmtDay(ymd) {
  const [y, m, dd] = String(ymd).split('-').map(Number);
  if (!y) return '—';
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
function shortUrl(u) {
  try { const x = new URL(u); return x.host.replace(/^wheretotrips\.com$/, '') + x.pathname + x.search; } catch { return u; }
}

function renderSearchAnalytics(d) {
  const errors = d.errors || {};
  const t = d.totals || {};
  const maxImp = Math.max(1, ...(d.series || []).map((r) => r.impressions));
  const seriesRows = (d.series || []).map((r) => `
    <tr>
      <td>${esc(fmtDay(r.date))}</td>
      <td class="num">${fmtInt(r.clicks)}</td>
      <td class="num">${fmtInt(r.impressions)}</td>
      <td class="num">${fmtPos(r.position)}</td>
      <td style="width:35%;">${bar(Math.round((r.impressions / maxImp) * 100))}</td>
    </tr>`).join('');

  const queries = d.queries || [];
  const pages = d.pages || [];
  const queryRowHtml = (q) => `<tr><td>${esc(q.query)}</td><td class="num">${fmtInt(q.clicks)}</td><td class="num">${fmtInt(q.impressions)}</td><td class="num">${fmtPct(q.ctr)}</td><td class="num">${fmtPos(q.position)}</td></tr>`;
  const pageRowHtml = (p) => `<tr><td style="overflow-wrap:anywhere;"><a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(shortUrl(p.page) || '/')}</a></td><td class="num">${fmtInt(p.clicks)}</td><td class="num">${fmtInt(p.impressions)}</td><td class="num">${fmtPos(p.position)}</td></tr>`;

  const totalsCards = errors.totals
    ? `<div class="adm-card"><h3>Totals</h3><p class="acct-sub">Unavailable — ${esc(errors.totals)}</p></div>`
    : `<div class="adm-overview-grid">${card('Clicks', fmtInt(t.clicks))}${card('Impressions', fmtInt(t.impressions))}${card('Click-through rate', fmtPct(t.ctr))}${card('Average position', fmtPos(t.position))}</div>`;

  const trafficCard = errCard('Search over time', `
    <div class="adm-card">
      <h3>Search over time</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Day</th><th class="num">Clicks</th><th class="num">Impressions</th><th class="num">Position</th><th></th></tr></thead>
        <tbody>${seriesRows || '<tr><td colspan="5">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'series', errors);

  const queriesCard = errCard('Top queries', `
    <div class="adm-card">
      <h3>Top queries ${queries.length > 10 ? viewAllBtnHtml('queries') : ''}</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Query</th><th class="num">Clicks</th><th class="num">Impressions</th><th class="num">CTR</th><th class="num">Position</th></tr></thead>
        <tbody>${queries.slice(0, 10).map(queryRowHtml).join('') || '<tr><td colspan="5">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'queries', errors);

  const pagesCard = errCard('Top pages', `
    <div class="adm-card">
      <h3>Top pages ${pages.length > 10 ? viewAllBtnHtml('pages') : ''}</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Page</th><th class="num">Clicks</th><th class="num">Impressions</th><th class="num">Position</th></tr></thead>
        <tbody>${pages.slice(0, 10).map(pageRowHtml).join('') || '<tr><td colspan="4">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'pages', errors);

  const hostsCard = errCard('Where the pages live', `
    <div class="adm-card">
      <h3>Where the pages live</h3>
      <p class="acct-sub" style="margin:-4px 0 12px;">Search Console covers every wheretotrips.com address, so the Help Center on support.wheretotrips.com is counted next to the website. ${fmtInt(d.pages_total)} pages got at least one impression in this range.</p>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Address</th><th class="num">Pages seen</th><th class="num">Clicks</th><th class="num">Impressions</th></tr></thead>
        <tbody>${(d.hosts || []).map((h) => `<tr><td>${esc(h.host)}</td><td class="num">${fmtInt(h.pages)}</td><td class="num">${fmtInt(h.clicks)}</td><td class="num">${fmtInt(h.impressions)}</td></tr>`).join('') || '<tr><td colspan="4">No data yet.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'pages', errors);

  const sm = d.sitemaps || [];
  const sitemapsCard = errCard('Sitemaps', `
    <div class="adm-card">
      <h3>Sitemaps</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Sitemap</th><th>Last read</th><th class="num">Errors</th><th class="num">Warnings</th></tr></thead>
        <tbody>${sm.map((s) => `<tr><td>${esc(s.path)}</td><td>${s.last_downloaded ? esc(new Date(s.last_downloaded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: DASH_TZ })) : '—'}</td><td class="num">${s.errors}</td><td class="num">${s.warnings}</td></tr>`).join('') || '<tr><td colspan="4">No sitemaps submitted.</td></tr>'}</tbody>
      </table></div>
    </div>`, 'sitemaps', errors);

  $('#analytics-root').innerHTML = `
    <div class="adm-form-row" style="justify-content:space-between; align-items:center; margin-bottom:14px;">
      <p class="acct-sub" style="margin:0;">Google Search Console · ${esc(d.window ? fmtDay(d.window.startDate) + ' to ' + fmtDay(d.window.endDate) : '')} · Google dates days in Pacific time and runs about 2 days behind</p>
      ${controlsHtml()}
    </div>
    ${totalsCards}
    ${trafficCard}
    <div class="adm-overview-grid" style="grid-template-columns: 1fr 1fr;">
      ${queriesCard}
      ${pagesCard}
    </div>
    ${hostsCard}
    ${sitemapsCard}`;

  wireControls();
  const map = {
    queries: () => openDrillModal('All queries', ['Query', 'Clicks', 'Impressions', 'CTR', 'Position'], queries.map(queryRowHtml)),
    pages: () => openDrillModal('Top pages', ['Page', 'Clicks', 'Impressions', 'Position'], pages.map(pageRowHtml)),
  };
  $('#analytics-root').querySelectorAll('[data-drill]').forEach((btn) => {
    const fn = map[btn.dataset.drill];
    if (fn) btn.addEventListener('click', fn);
  });
}

startAnalyticsPage({
  defaultChannel: 'website',
  channelRenderers: { website: renderWebsiteAnalytics, search: renderSearchAnalytics },
});
