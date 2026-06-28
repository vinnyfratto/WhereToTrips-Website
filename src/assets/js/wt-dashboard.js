// ───────────────────────────────────────────────────────────────────
//  wt-dashboard.js — affiliate dashboard (Step 4).
//  Gated: requires a logged-in user with an affiliates row. Pulls all
//  numbers from the get-affiliate-stats edge fn (server-side, caller-scoped
//  — no cross-affiliate data). Renders identity + cards + charts + funnel,
//  and embeds the shared profile editor (wt-profile.js).
// ───────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { initProfileForm } from './wt-profile.js';
import Chart from 'https://esm.sh/chart.js@4/auto';

const cfg = window.WT_SUPABASE || {};
const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
const FN = cfg.url + '/functions/v1/';
const SITE = window.location.origin;

const $ = (id) => document.getElementById(id);

// Brand tokens (read from CSS variables so charts match the theme).
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function money(n, currency) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(n || 0);
  } catch { return '$' + (n || 0).toFixed(2); }
}

function wireCopy(el, text) {
  if (!el) return;
  el.textContent = text;
  el.setAttribute('data-copy', text);
  el.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(text);
      const old = el.textContent;
      el.textContent = 'Copied!';
      setTimeout(() => { el.textContent = old; }, 1200);
    } catch (_e) { /* clipboard blocked */ }
  });
}

async function init() {
  const root = $('wt-dash');
  if (!root) return;
  const gate = $('wt-dash-gate');
  const notAff = $('wt-dash-notaff');

  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) { window.location.href = '/account/login/'; return; }
  const user = sess.session.user;
  const token = sess.session.access_token;

  let stats;
  try {
    const res = await fetch(FN + 'get-affiliate-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.anonKey, 'Authorization': 'Bearer ' + token },
      body: '{}',
    });
    stats = await res.json();
  } catch (_e) {
    gate.textContent = 'Could not load your dashboard. Please refresh.';
    return;
  }

  if (!stats || !stats.ok) { gate.textContent = 'Could not load your dashboard. Please refresh.'; return; }

  if (!stats.is_affiliate) {
    gate.style.display = 'none';
    notAff.style.display = 'block';
    return;
  }

  gate.style.display = 'none';
  root.style.display = 'block';

  renderIdentity(stats.affiliate);
  renderCards(stats.totals);
  renderCharts(stats.series, stats.funnel, stats.totals.currency);

  // Embedded profile editor (shared with /account/profile).
  await initProfileForm(supabase, user, { alertId: 'wt-prof-alert' });
}

const COMMISSION_CATS = [
  ['flight', 'Flight Commission'],
  ['hotel', 'Hotel Commission'],
  ['car', 'Car Rental Commission'],
  ['insurance', 'Trip Insurance Commission'],
];
const DEFAULT_COMMISSIONS = {
  flight: { rate: 0.02, type: 'percent' }, hotel: { rate: 0.08, type: 'percent' },
  car: { rate: 0.05, type: 'percent' }, insurance: { rate: 0.08, type: 'percent' },
};
function rateLabel(cat) {
  if (!cat) return '—';
  if (cat.type === 'flat') return money(cat.rate);
  const v = Number(cat.rate) * 100;
  return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + '%';
}

function renderIdentity(a) {
  $('dash-code').textContent = a.code;
  $('dash-status').textContent = a.status;
  const src = $('dash-source'); if (src) src.textContent = a.source || 'Direct';

  wireCopy($('dash-link'), SITE + '/promo/' + a.code);
  if (a.vanity_slug) {
    $('dash-vanity-row').style.display = 'block';
    wireCopy($('dash-vanity'), SITE + '/promo/' + a.vanity_slug);
  }
  renderCommissionStructure(a);
}

function renderCommissionStructure(a) {
  const el = $('commission-structure'); if (!el) return;
  const c = a.commissions || DEFAULT_COMMISSIONS;
  const months = a.commission_duration_months || 36;
  el.innerHTML = COMMISSION_CATS.map(([k, label]) =>
    `<div class="comm-row"><span>${label}</span><strong>${rateLabel(c[k])} for ${months} months</strong></div>`
  ).join('');
}

function renderCards(t) {
  $('card-clicks').textContent = t.clicks;
  $('card-referrals').textContent = t.referrals;
  $('card-bookings').textContent = t.bookings;
  $('card-commission').textContent = money(t.commission.earned_total, t.currency);
  $('comm-pending').textContent = money(t.commission.pending, t.currency);
  $('comm-approved').textContent = money(t.commission.approved, t.currency);
  $('comm-paid').textContent = money(t.commission.paid, t.currency);
}

function renderCharts(series, funnel, currency) {
  const navy = cssVar('--navy', '#1C3649');
  const rust = cssVar('--rust', '#B85C38');
  const grid = 'rgba(28,54,73,0.08)';
  Chart.defaults.font.family = cssVar('--sans', 'system-ui, sans-serif');
  Chart.defaults.color = '#5C5449';

  // 1) Referred signups over time (line).
  new Chart($('chart-signups'), {
    type: 'line',
    data: {
      labels: series.labels,
      datasets: [{
        label: 'Referred signups',
        data: series.signups,
        borderColor: rust,
        backgroundColor: 'rgba(184,92,56,0.12)',
        fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2,
      }],
    },
    options: chartOpts(grid),
  });

  // 2) Bookings (bars) + commission (line, 2nd axis).
  new Chart($('chart-bookings'), {
    data: {
      labels: series.labels,
      datasets: [
        { type: 'bar', label: 'Bookings', data: series.bookings, backgroundColor: navy, yAxisID: 'y', borderRadius: 3 },
        { type: 'line', label: 'Commission (' + currency + ')', data: series.commission, borderColor: rust, backgroundColor: rust, yAxisID: 'y1', tension: 0.3, pointRadius: 0, borderWidth: 2 },
      ],
    },
    options: {
      ...chartOpts(grid),
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8, autoSkip: true } },
        y:  { beginAtZero: true, position: 'left', grid: { color: grid }, ticks: { precision: 0 } },
        y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } },
      },
    },
  });

  // 3) Conversion funnel (horizontal bars).
  new Chart($('chart-funnel'), {
    type: 'bar',
    data: {
      labels: ['Clicks', 'Signups', 'Bookings'],
      datasets: [{
        label: 'Count',
        data: [funnel.clicks, funnel.signups, funnel.bookings],
        backgroundColor: [navy, '#2A4D65', rust],
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: grid } }, y: { grid: { display: false } } },
    },
  });
}

function chartOpts(grid) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: true, position: 'bottom' } },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8, autoSkip: true } },
      y: { beginAtZero: true, grid: { color: grid }, ticks: { precision: 0 } },
    },
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }
