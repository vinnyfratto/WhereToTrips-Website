// ───────────────────────────────────────────────────────────────────
//  wt-partner-performance.js — /partner-dashboard/ (Performance).
//  Stat cards, charts and commission structure. Gated by
//  wt-partner-shared.js's requirePartner(); numbers come from the
//  get-affiliate-stats edge fn (server-side, caller-scoped).
// ───────────────────────────────────────────────────────────────────
import { requirePartner } from './wt-partner-shared.js';
import { openTimelineModal, fmtDate, money as fmtMoney } from './wt-commission-timeline.js';
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
  renderBookings(ctx.stats.bookings || []);
}

// ── Your bookings ───────────────────────────────────────────────────
// Unpaid = pending (inside the 14-day hold after the trip, or awaiting
// approval) + approved (ready for the next payout). A cancelled trip's
// reversed commission shows under Unpaid with its reason rather than just
// disappearing. Each row opens its timeline.
function renderBookings(bookings) {
  const tabs = document.querySelectorAll('[data-pb-tab]');
  let tab = 'unpaid';
  const draw = () => {
    tabs.forEach((b) => b.classList.toggle('active', b.dataset.pbTab === tab));
    const rows = bookings.filter((b) => tab === 'paid'
      ? b.commission_status === 'paid'
      : b.commission_status !== 'paid');
    const owed = bookings.filter((b) => b.commission_status === 'pending' || b.commission_status === 'approved');
    const ready = owed.filter((b) => b.commission_status === 'approved');
    const cur = (owed[0] || bookings[0] || {}).commission_currency;
    const sum = owed.reduce((n, b) => n + Number(b.commission_amount || 0), 0);
    const readySum = ready.reduce((n, b) => n + Number(b.commission_amount || 0), 0);
    const paid = bookings.filter((b) => b.commission_status === 'paid');
    $('pb-sum').textContent = tab === 'paid'
      ? (paid.length ? `${paid.length} paid booking${paid.length === 1 ? '' : 's'}, ${fmtMoney(paid.reduce((n, b) => n + Number(b.commission_amount || 0), 0), cur)} in total.` : '')
      : (owed.length
        ? `${fmtMoney(sum, cur)} not yet paid out across ${owed.length} booking${owed.length === 1 ? '' : 's'}`
          + (readySum ? `, ${fmtMoney(readySum, cur)} of it ready for the next payout.` : '. Commission becomes payable 14 days after each trip ends.')
        : '');

    const list = $('pb-list');
    if (!rows.length) {
      list.innerHTML = `<p class="pb-empty">${tab === 'paid' ? 'Nothing paid out yet.' : 'No unpaid bookings right now. When someone you referred books a trip, it shows up here.'}</p>`;
      return;
    }
    list.innerHTML = '';
    rows.forEach((b) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pb-row';
      const dates = b.starts_on ? fmtDate(b.starts_on) + (b.ends_on ? ' – ' + fmtDate(b.ends_on) : '') : '';
      const cancelled = b.commission_status === 'reversed' || b.commission_status === 'rejected';
      const when = b.commission_status === 'paid' ? 'Paid'
        : b.commission_status === 'approved' ? 'Ready to pay out'
        : cancelled ? 'Trip cancelled'
        : b.commission_hold_until ? 'Payable ' + fmtDate(String(b.commission_hold_until).slice(0, 10)) : 'Pending';
      btn.innerHTML = `
        <div class="pb-main">
          <div class="pb-title"></div>
          <div class="pb-meta"></div>
        </div>
        <div class="pb-right">
          <div class="pb-amt"></div>
          <div class="pb-when${b.commission_status === 'approved' ? ' ready' : ''}"></div>
        </div>`;
      btn.querySelector('.pb-title').textContent = (b.booking_kind === 'flight' ? '✈ ' : '') + (b.title || (b.booking_kind === 'flight' ? 'Flight' : 'Hotel'));
      btn.querySelector('.pb-meta').textContent = [b.reference ? 'Conf. ' + b.reference : '', b.where_, dates].filter(Boolean).join(' · ');
      btn.querySelector('.pb-amt').textContent = cancelled ? '—' : fmtMoney(b.commission_amount, b.commission_currency);
      btn.querySelector('.pb-when').textContent = when;
      btn.addEventListener('click', () => openTimelineModal(b));
      list.appendChild(btn);
    });
  };
  tabs.forEach((b) => b.addEventListener('click', () => { tab = b.dataset.pbTab; draw(); }));
  draw();
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
  Chart.defaults.color = '#464B53';

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
