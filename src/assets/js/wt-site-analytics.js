// ───────────────────────────────────────────────────────────────────
//  wt-site-analytics.js — the Site Analytics page (/analytics/).
//
//  WhereToTrips.com tab   website traffic from PostHog: pageviews, visitors, top
//                         pages and referrers, campaigns, user paths, bots.
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

  const pages = d.top_pages || [];
  const refs = d.top_referrers || [];
  const pageRowHtml = (p) => `<tr><td>${esc(p.path)}</td><td class="num">${p.views}</td></tr>`;
  const refRowHtml = (r) => `<tr><td>${esc(r.domain)}</td><td class="num">${r.visits}</td></tr>`;
  const pageRows = pages.slice(0, 10).map(pageRowHtml).join('');
  const refRows = refs.slice(0, 10).map(refRowHtml).join('');

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

  // Paths — entry pages, exit pages, top page-to-page transitions. Each of
  // the 3 underlying queries can fail independently (window-function syntax
  // is the riskiest part of this whole change), so each sub-table shows its
  // own "Unavailable" instead of one error blanking the whole card.
  const paths = d.paths || { entry_pages: [], exit_pages: [], transitions: [] };
  const entryRowHtml = (p) => `<tr><td>${esc(p.path)}</td><td class="num">${p.count}</td></tr>`;
  const exitRowHtml = (p) => `<tr><td>${esc(p.path)}</td><td class="num">${p.count}</td></tr>`;
  const transRowHtml = (t) => `<tr><td>${esc(t.from)}</td><td>→</td><td>${esc(t.to)}</td><td class="num">${t.count}</td></tr>`;
  const unavailable = (key) => `<p class="acct-sub">Unavailable — ${esc(errors[key])}</p>`;
  const entrySection = errors.entry_pages ? unavailable('entry_pages') : `
    <div class="adm-wrap-scroll"><table class="adm-table">
      <thead><tr><th>Page</th><th class="num">Sessions</th></tr></thead>
      <tbody>${paths.entry_pages.slice(0, 10).map(entryRowHtml).join('') || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody>
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
      <p class="acct-sub" style="margin:-4px 0 12px;">Built from pageview order per visitor (no session boundary yet — see note in the admin fn). Not PostHog's native Paths insight.</p>
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

  // Bot detection — UA-regex split (see BOT_UA_RE in the admin fn).
  const bots = d.bots || { bot_pageviews: 0, bot_visitors: 0, bot_pct: 0, top_agents: [] };
  const botAgentRowHtml = (a) => `<tr><td style="max-width:420px; overflow-wrap:anywhere;">${esc(a.ua)}</td><td>${esc(a.domain || '—')}</td><td class="num">${a.pageviews}</td></tr>`;
  const botsCard = errCard('Traffic quality (bot detection)', `
    <div class="adm-card">
      <h3>Traffic quality (bot detection)</h3>
      <p class="acct-sub" style="margin:-4px 0 12px;">User-agent match against known crawler/bot/headless signatures. Anything spoofing a real browser UA will read as human — treat this as a floor, not a ceiling.</p>
      <div class="adm-overview-grid" style="margin-bottom:16px;">
        ${card('Bot pageviews', `${bots.bot_pageviews} <span class="acct-sub" style="font-size:.6em;">(${bots.bot_pct}%)</span>`)}
        ${card('Bot visitors', bots.bot_visitors)}
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
    ${totalsCards}
    ${trafficCard}
    <div class="adm-overview-grid" style="grid-template-columns: 1fr 1fr;">
      ${topPagesCard}
      ${topRefCard}
    </div>
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
    entry: () => openDrillModal('All entry pages', ['Page', 'Sessions'], paths.entry_pages.map((p) => `<tr><td>${esc(p.path)}</td><td class="num">${p.count}</td></tr>`)),
    exit: () => openDrillModal('All exit pages', ['Page', 'Sessions'], paths.exit_pages.map((p) => `<tr><td>${esc(p.path)}</td><td class="num">${p.count}</td></tr>`)),
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
