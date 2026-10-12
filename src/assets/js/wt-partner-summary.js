// ───────────────────────────────────────────────────────────────────
//  wt-partner-summary.js — /partner-dashboard/ (Summary tab).
//  Numbers come from the partner-portal edge fn, which resolves the partner
//  from the session. Period boundaries are computed server-side in Central.
//
//  One row of three cards (tier, activity window or guarantee, next payout),
//  one detail panel open at a time directly under the row, then the period's
//  performance. The `summary` answer carries `status`, so this page draws the
//  status strip itself and never asks for it a second time.
// ───────────────────────────────────────────────────────────────────
import { portal, portalGate } from './wt-partner-shared.js';
import { esc, int, money, fmtDate, plural, renderSeg } from './wt-portal-ui.js';
import { describeStatus, drawStrip } from './wt-partner-status.js';

const $ = (id) => document.getElementById(id);
const PERIODS = [['ytd', 'Year to date'], ['mtd', 'Month to date'], ['7d', 'Last 7 days'], ['24h', 'Last 24 hours']];
const PANEL_ID = { tier: 'panel-tier', tiers: 'panel-tiers', activity: 'panel-activity' };
const HEAD_ID = { tier: 'tierp-h', tiers: 'tiersp-h', activity: 'actp-h' };

let period = 'ytd';
let seq = 0;
let openPanel = '';          // '' | 'tier' | 'tiers' | 'activity'
let drawnSig = '';           // what the status row was last drawn from

const INFO_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><circle cx="12" cy="7.8" r="0.7" fill="currentColor"></circle></svg>';

async function load() {
  const mine = ++seq;
  $('kpis').setAttribute('aria-busy', 'true');
  const j = await portal('summary', { period });
  if (mine !== seq) return;                       // a newer period was picked meanwhile
  $('kpis').removeAttribute('aria-busy');
  if (!portalGate(j)) return;
  draw(j);
}

// ── Cards ───────────────────────────────────────────────────────────
const bar = (label, max, now, pct, warn) =>
  `<div class="pp-bar${warn ? ' pp-bar--warn' : ''}" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${now}"><i style="width:${pct}%"></i></div>`;

function tierCard(m) {
  const t = m.tier;
  return `<section class="pp-card pp-scard" aria-labelledby="tier-h">
      <div class="pp-scard-top">
        <h2 id="tier-h" class="pp-caps">Your tier</h2>
        <button type="button" class="pp-iconbtn" data-open="tiers" data-opener="tiers" aria-label="See all tiers" aria-expanded="${String(openPanel === 'tiers')}" aria-controls="panel-tiers">${INFO_ICON}</button>
      </div>
      <div class="pp-scard-name"><span class="pp-serif">${esc(t.name)}</span><span class="pp-chip pp-chip--amber">${esc(t.rateLabel)}</span></div>
      <div class="pp-sub pp-num">${esc(t.line)}</div>
      ${t.next ? `${bar('Progress to the next tier', t.next.max, t.next.now, t.next.pct, false)}<div class="pp-sub pp-num">${esc(t.next.short)}</div>` : ''}
      ${t.top ? '<div class="pp-sub">You\'re at the top tier.</div>' : ''}
      ${t.pending ? `<div class="pp-pending">${esc(t.pending.short)}</div>` : ''}
      <div class="pp-scard-foot"><button type="button" class="pp-outbtn pp-sm" data-open="tier" data-opener="tier" aria-expanded="${String(openPanel === 'tier')}" aria-controls="panel-tier" aria-describedby="tier-h">Details</button></div>
    </section>`;
}

function activityCard(m) {
  const a = m.act;
  return `<section class="pp-scard pp-act pp-act--${a.look}" aria-labelledby="act-h">
      <div class="pp-scard-top pp-scard-top--wrap">
        <h2 id="act-h" class="pp-caps">${esc(a.eyebrow)}</h2>
        <span class="pp-chip pp-chip--${esc(a.tone)}">${esc(a.tag)}</span>
      </div>
      <div class="pp-bignum"><span class="pp-serif pp-num">${esc(a.big)}</span>${a.unit ? `<span class="pp-unit">${esc(a.unit)}</span>` : ''}</div>
      ${a.bar ? bar(a.bar.label, a.bar.max, a.bar.now, a.bar.max ? Math.round((a.bar.now / a.bar.max) * 100) : 0, a.bar.warn) : ''}
      <div class="pp-sub">${esc(a.line)}</div>
      ${a.extra ? `<div class="pp-extra">${esc(a.extra)}</div>` : ''}
      <div class="pp-scard-foot"><button type="button" class="pp-outbtn pp-sm" data-open="activity" data-opener="activity" aria-expanded="${String(openPanel === 'activity')}" aria-controls="panel-activity" aria-describedby="act-h">Details</button></div>
    </section>`;
}

function payoutCard(n = {}) {
  const count = Number(n.booking_count) || 0;
  let amount = money(n.amount_cents), pill, line;
  if (n.below_threshold) {
    amount = money(n.balance_cents);
    pill = 'Rolls to the next payout';
    line = plural(count, 'approved booking is', 'approved bookings are') + ' waiting for your balance to reach $50.';
  } else if (count === 0) {
    pill = 'Nothing scheduled yet';
    line = 'No approved bookings are waiting.';
  } else {
    pill = 'Arrives ' + fmtDate(n.date);
    line = plural(count, 'approved booking', 'approved bookings') + ' in this payout';
  }
  return `<section class="pp-deep pp-scard" aria-labelledby="pay-h">
      <h2 id="pay-h">Next payout</h2>
      <div class="amt pp-num">${esc(amount)}</div>
      <div class="pp-pill">${esc(pill)}</div>
      <div class="n">${esc(line)}</div>
      <div class="pp-scard-foot"><a class="btn-w" href="/partner-dashboard/revenue/">View revenue details</a></div>
    </section>`;
}

// ── Detail panels ───────────────────────────────────────────────────
const panelHead = (hid, title) =>
  `<div class="pp-dpanel-head"><h2 id="${hid}" tabindex="-1">${esc(title)}</h2><button type="button" class="pp-outbtn pp-sm" data-close>Close</button></div>`;
const hiddenUnless = (name) => (openPanel === name ? '' : ' hidden');

function tierPanel(m) {
  const t = m.tier;
  return `<section id="panel-tier" class="pp-card pp-dpanel" aria-labelledby="tierp-h"${hiddenUnless('tier')}>
      ${panelHead('tierp-h', 'Your tier in detail')}
      <div class="pp-two2">
        <div>
          <div class="pp-fields2 pp-stats">
            <div class="pp-stat"><div class="pp-serif pp-num">${int(t.thisYear)}</div><div class="pp-sub">${esc(t.thisYearLabel)}</div></div>
            <div class="pp-stat"><div class="pp-serif pp-num">${int(t.lastYear)}</div><div class="pp-sub">${esc(t.lastYearLabel)}</div></div>
          </div>
          ${t.pending ? `<div class="pp-callout">${esc(t.pending.text)}</div>` : ''}
          ${t.next ? `<div class="pp-nextline">
              <div class="pp-nextrow"><span class="pp-strong">${esc(t.next.text)}</span><span class="pp-num pp-sub">${esc(t.next.progress)}</span></div>
              ${bar('Progress to the next tier', t.next.max, t.next.now, t.next.pct, false)}
            </div>` : ''}
        </div>
        <div>
          <p class="pp-p">${esc(t.hold)}</p>
          <p class="pp-p pp-p--small">${esc(t.footnote)}</p>
          <div><button type="button" class="pp-linkbtn" data-open="tiers">See all tiers</button></div>
        </div>
      </div>
    </section>`;
}

function tiersPanel(m) {
  const T = m.tiers;
  const note = ([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`;
  return `<section id="panel-tiers" class="pp-card pp-dpanel" aria-labelledby="tiersp-h"${hiddenUnless('tiers')}>
      ${panelHead('tiersp-h', 'All tiers')}
      <div class="pp-scroll">
        <table class="pp-t pp-t--tiers">
          <caption class="pp-sr">Partner tiers, revenue share rates and trip requirements</caption>
          <thead><tr><th scope="col" class="plain">Tier</th><th scope="col" class="plain">Revenue share</th><th scope="col" class="plain">Completed trips per calendar year</th></tr></thead>
          <tbody>${T.rows.map((r) => `<tr class="${r.here ? 'is-here' : ''}">
            <td class="nw pp-strong">${esc(r.name)}${r.here ? ' <span class="pp-chip pp-chip--deep pp-here">You are here</span>' : ''}</td>
            <td class="pp-num pp-strong">${esc(r.rate)}</td>
            <td>${esc(r.range)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="pp-two2 pp-notes">
        <ul>${T.notes.slice(0, 2).map(note).join('')}</ul>
        <ul>${T.notes.slice(2).map(note).join('')}</ul>
      </div>
    </section>`;
}

function activityPanel(m) {
  const a = m.act;
  return `<section id="panel-activity" class="pp-card pp-dpanel" aria-labelledby="actp-h"${hiddenUnless('activity')}>
      ${panelHead('actp-h', a.panelTitle)}
      <div class="pp-two2">
        <div>
          <dl class="pp-dl pp-dl--panel">${a.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
          ${a.dots ? `<ol class="pp-dots" aria-label="Calendar months requalified">${a.dots.map((d) =>
            `<li class="${d.done ? 'is-done' : ''}" aria-label="${esc(d.label)}">${esc(d.text)}</li>`).join('')}</ol>` : ''}
        </div>
        <div>
          ${a.paras.map((p) => `<p class="pp-p">${esc(p)}</p>`).join('')}
          <p class="pp-p pp-p--small">${esc(a.note)}</p>
        </div>
      </div>
    </section>`;
}

// ── Opening and closing a panel ─────────────────────────────────────
// One at a time, full width under the cards. Opening moves focus to the panel's
// heading; closing (Close, or the same opener again) returns it to the opener.
function setPanel(next) {
  const prev = openPanel;
  openPanel = next;
  for (const [name, id] of Object.entries(PANEL_ID)) {
    const el = $(id);
    if (el) el.hidden = name !== next;
  }
  document.querySelectorAll('[data-opener]').forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.opener === next)));
  if (next) {
    const h = $(HEAD_ID[next]);
    if (h) h.focus();
  } else if (prev) {
    const opener = document.querySelector(`[data-opener="${prev}"]`);
    if (opener) opener.focus();
  }
}

// ── The page ────────────────────────────────────────────────────────
function drawStatusRow(j) {
  const m = describeStatus(j.status);
  drawStrip(m ? j.status : null);
  const sig = JSON.stringify([j.status, j.next_payout]);
  if (sig === drawnSig) return;                    // a period change leaves these alone
  drawnSig = sig;
  if (!m) {
    // The status could not be worked out. Next payout still stands on its own.
    openPanel = '';
    $('status-row').innerHTML = payoutCard(j.next_payout);
    $('panels').innerHTML = '';
    return;
  }
  $('status-row').innerHTML = tierCard(m) + activityCard(m) + payoutCard(j.next_payout);
  $('panels').innerHTML = tierPanel(m) + tiersPanel(m) + activityPanel(m);
}

function drawPeriod() {
  renderSeg($('period'), PERIODS, period, (p) => { period = p; drawPeriod(); load(); });
}

function draw(j) {
  drawStatusRow(j);

  const m = j.metrics;
  const kpis = [
    ['Clicks', int(m.clicks), 'Link visits'],
    ['App Downloads', int(m.downloads), 'Installs from your links'],
    ['New Accounts', int(m.new_accounts), 'Accounts created'],
    ['Bookings', int(m.bookings), 'Airfare and hotel'],
    ['Total Est. Revenue', money(m.total_est_revenue_cents), 'Before payout'],
  ];
  $('kpis').innerHTML = kpis.map(([l, v, s]) =>
    `<div class="pp-card pp-kpi"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div><div class="s">${esc(s)}</div></div>`).join('');

  $('top-list').innerHTML = j.top_content.length
    ? j.top_content.map((t, i) => `<li><span class="rank">${i + 1}</span>
        <div class="main"><b>${esc(t.name)}</b><span>${esc(t.channel)}</span></div>
        <div class="cnt"><b>${int(t.new_accounts)}</b><span>new accounts</span></div></li>`).join('')
    : '<li class="pp-empty pp-empty--li">Your top content shows here once your first piece brings in new accounts.</li>';
}

$('wt-dash-root').addEventListener('click', (e) => {
  const opener = e.target.closest('[data-open]');
  if (opener) { const name = opener.dataset.open; setPanel(openPanel === name ? '' : name); return; }
  if (e.target.closest('[data-close]')) setPanel('');
});

function init() {
  drawPeriod();
  load();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
