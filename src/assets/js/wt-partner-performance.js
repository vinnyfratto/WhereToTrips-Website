// ───────────────────────────────────────────────────────────────────
//  wt-partner-performance.js — /partner-dashboard/ (Performance).
//  Stat cards, charts and commission structure. Gated by
//  wt-partner-shared.js's requirePartner(); numbers come from the
//  get-affiliate-stats edge fn (server-side, caller-scoped).
// ───────────────────────────────────────────────────────────────────
import { requirePartner } from './wt-partner-shared.js';
import Chart from 'https://esm.sh/chart.js@4/auto';

const $ = (id) => document.getElementById(id);

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function money(n, currency) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(n || 0);
  } catch { return '$' + (n || 0).toFixed(2); }
}


async function init() {
  const ctx = await requirePartner();
  if (!ctx) return;

  renderIdentity(ctx.stats.affiliate);
  renderCards(ctx.stats.totals);
  renderCharts(ctx.stats.series, ctx.stats.funnel, ctx.stats.totals.currency);
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

// The per-account code and its share links used to be rendered here, into
// a banner at the top of the page. Links are per CONTENT now, handed over
// when a post is approved, so there is no general code to show.
function renderIdentity(a) {
  renderCommissionStructure(a);
}

function renderCommissionStructure(a) {
  const el = $('commission-structure'); if (!el) return;
  const months = a.commission_duration_months || 36;

  // A revenue share is one number covering everything, so it does not list
  // per product. Partners on the old per-category rates still see theirs.
  const rev = a.commissions && a.commissions.revenue_share;
  if (rev || a.commission_type === 'revshare') {
    const rate = Number(rev ? rev.rate : a.commission_rate) * 100;
    const pct = (rate % 1 === 0 ? rate.toFixed(0) : rate.toFixed(1)) + '%';
    el.innerHTML =
      `<div class="comm-row"><span>Revenue share</span><strong>${pct} for ${months} months</strong></div>` +
      `<p class="acct-sub" style="margin:10px 0 0;">Your share of the commission WhereTo earns on each booking your links bring in.</p>`;
    return;
  }

  const c = a.commissions || DEFAULT_COMMISSIONS;
  el.innerHTML = COMMISSION_CATS.map(([k, label]) =>
    `<div class="comm-row"><span>${label}</span><strong>${rateLabel(c[k])} for ${months} months</strong></div>`
  ).join('');
}

function renderCards(t) {
  $('card-clicks').textContent = t.clicks;
  $('card-referrals').textContent = t.referrals;
  $('card-first-logins').textContent = t.app_signins;
  $('card-bookings').textContent = t.bookings;
  $('card-commission').textContent = money(t.commission.earned_total, t.currency);
  $('comm-pending').textContent = money(t.commission.pending, t.currency);
  $('comm-approved').textContent = money(t.commission.approved, t.currency);
  $('comm-paid').textContent = money(t.commission.paid, t.currency);
}

function renderCharts(series, funnel, currency) {
  const navy = cssVar('--navy', '#313131');
  const rust = cssVar('--rust', '#209CE0');
  const amber = cssVar('--amber', '#E69800');
  const grid = 'rgba(28,54,73,0.08)';
  Chart.defaults.font.family = cssVar('--sans', 'system-ui, sans-serif');
  Chart.defaults.color = '#5C616A';

  // 1) Referred signups + first logins over time (line).
  new Chart($('chart-signups'), {
    type: 'line',
    data: {
      labels: series.labels,
      datasets: [
        {
          label: 'Referred signups',
          data: series.signups,
          borderColor: rust,
          backgroundColor: 'rgba(32,156,224,0.12)',
          fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2,
        },
        {
          label: 'First logins',
          data: series.first_logins,
          borderColor: amber,
          backgroundColor: 'rgba(230,152,0,0.12)',
          fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2,
        },
      ],
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
      labels: ['Clicks', 'Signups', 'First Logins', 'Bookings'],
      datasets: [{
        label: 'Count',
        data: [funnel.clicks, funnel.signups, funnel.app_signins, funnel.bookings],
        backgroundColor: [navy, '#4A4A4A', amber, rust],
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
