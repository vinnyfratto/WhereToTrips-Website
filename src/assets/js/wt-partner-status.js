// ───────────────────────────────────────────────────────────────────
//  wt-partner-status.js — the partner's tier, activity window and traveler
//  guarantee, as the portal words them.
//
//  describeStatus() is the ONE place that turns the `status` object from the
//  partner-portal function into text. The status strip (every portal page) and
//  the Summary cards both read its output, so they cannot disagree.
//
//  Nothing here decides a state. `activity.state` and `activity.display` are
//  computed on the server and only read here. Every number a rule depends on
//  (window length, recovery days, requalify months, tier thresholds and rates)
//  comes from the same object (`program`, `tier.tiers`), so a change to the
//  program is a server config change, not a page change.
// ───────────────────────────────────────────────────────────────────
import { portal } from './wt-partner-shared.js';
import { esc, fmtDate, int, plural, bpsPct, daysBetween } from './wt-portal-ui.js';

const NOTE_WHAT = "A qualified registration is a new, verified user who isn't already on WhereTo. Your own account counts once, ever.";
const RULES = {
  trips: 'Trips that include a hotel stay count toward your tier. A trip counts on its travel completion date, once its revenue is confirmed.',
  drop: 'Tiers can only drop on January 1, and never by more than one tier at a time.',
};

/**
 * True when `s` carries what the cards and the strip need. The page never works a
 * state out for itself, so a status without the server's state, display or
 * program numbers is treated as no status at all (the strip stays hidden).
 */
export function statusUsable(s) {
  if (!s || !s.tier || !s.activity || !s.program) return false;
  const a = s.activity, P = s.program;
  return ['active', 'warning', 'grace', 'inactive'].includes(a.state)
    && ['full', 'headsup', 'guarantee'].includes(a.display)
    && [P.window_days, P.grace_days, P.requalify_months].every((n) => Number.isFinite(Number(n)) && n !== null)
    && Number.isFinite(Number(s.guarantee_months));
}

// "1 day", "12 days", "today".
const daysPhrase = (n) => (n === 0 ? 'today' : plural(n, 'day', 'days'));

function describeTier(s) {
  const t = s.tier;
  const founding = !!t.is_founding;
  const thisYear = Number(t.trips_this_year) || 0;
  const next = t.next_tier || null;
  const up = t.pending_upgrade || null;

  let nextInfo = null;
  if (next) {
    const needed = Math.max(1, Number(next.trips_needed_total) || 1);
    const left = Math.max(0, Number(next.trips_remaining) || 0);
    nextInfo = {
      short: `${plural(left, 'more trip', 'more trips')} to ${next.name} (${bpsPct(next.rate_bps)})`,
      text: `Next tier: ${next.name} (${bpsPct(next.rate_bps)}) at ${int(needed)} trips`,
      progress: `${plural(left, 'more trip', 'more trips')} this year`,
      max: needed,
      now: Math.min(thisYear, needed),
      pct: Math.min(100, Math.round((thisYear / needed) * 100)),
    };
  }

  let pending = null;
  if (up) {
    pending = {
      short: `Moves to ${up.name} (${bpsPct(up.rate_bps)}) on ${fmtDate(up.effective_on)}`,
      text: `You reached ${up.name}. Your rate moves from ${bpsPct(t.rate_bps)} to ${bpsPct(up.rate_bps)} on ${fmtDate(up.effective_on)}, on all your travelers.`,
    };
  }

  let hold;
  if (founding) hold = `Your Founding Partner rate is locked at ${bpsPct(t.rate_bps)}, whatever your trip count. You keep it as long as you stay active.`;
  else if (up || !t.holds_through) hold = RULES.drop;
  else hold = `Your tier holds through ${fmtDate(t.holds_through)}. ${RULES.drop}`;

  return {
    name: t.name,
    rateLabel: `${bpsPct(t.rate_bps)} revenue share`,
    line: founding ? 'Founding Partner. Rate locked.' : `${plural(thisYear, 'completed trip', 'completed trips')} in ${t.year} so far`,
    next: nextInfo,
    top: !founding && !next,
    pending,
    thisYear,
    lastYear: Number(t.trips_last_year) || 0,
    thisYearLabel: `Completed trips in ${t.year} so far`,
    lastYearLabel: `Completed trips in ${Number(t.year) - 1}`,
    hold,
    footnote: RULES.trips,
  };
}

function describeTiers(s) {
  const t = s.tier;
  const list = Array.isArray(t.tiers) ? t.tiers : [];
  const rows = list.map((r) => ({
    name: r.name,
    rate: bpsPct(r.rate_bps),
    range: (r.max_trips == null ? `${int(r.min_trips)}+ trips` : `${int(r.min_trips)} to ${int(r.max_trips)} trips`) + (r.note ? ` (${r.note})` : ''),
    here: !t.is_founding && r.key === t.key,
  }));
  // The Trailblazer row exists only for a Founding Partner.
  if (t.founding_row) {
    rows.unshift({ name: t.founding_row.name, rate: `${bpsPct(t.founding_row.rate_bps)} locked`, range: 'No trip requirement', here: !!t.is_founding });
  }
  // New partners start on the Explorer rung for their first 12 months; its rate is read from the list.
  const floor = list.find((r) => r.key === 'explorer');
  const floorText = floor ? `${floor.name} (${bpsPct(floor.rate_bps)})` : 'Explorer';
  return {
    rows,
    notes: [
      ['Moving up', "when this year's trips cross a threshold, the new rate starts on the 1st of the next month, on your whole book of travelers. Nothing is paid retroactively."],
      ['Keeping it', `your tier holds through December 31 of the following year. ${RULES.drop}`],
      ['New partners', `start at ${floorText} for the first 12 months, then move to the annual rule.`],
      ['What counts', 'completed trips that include a hotel stay, on the travel completion date, once the revenue is confirmed.'],
    ],
  };
}

function describeActivity(s) {
  const a = s.activity, P = s.program;
  const state = a.state;                       // active | warning | grace | inactive
  const display = a.display;                   // full | headsup | guarantee (decided by the server)
  const win = Number(P.window_days);
  const graceDays = Number(P.grace_days);
  const need = Number(P.requalify_months);
  const gm = Number(s.guarantee_months);
  const past = Number(a.travelers_past_guarantee) || 0;
  const inG = Number(a.travelers_in_guarantee) || 0;
  const firstEnd = a.first_guarantee_ends_on || null;
  const last = a.last_qualified_registration_on || null;
  const daysToFirstEnd = firstEnd && s.as_of ? daysBetween(s.as_of, firstEnd) : null;

  const atRisk = past > 0
    ? `${plural(past, 'traveler is', 'travelers are')} past their guarantee and ${past === 1 ? 'earns' : 'earn'} for you only while you stay active.`
    : 'All your travelers are still inside their guarantee, so nothing is at risk yet.';

  let act;
  if (display === 'guarantee') {
    // Nothing is at stake yet, so the countdown gives way to a calm "Your guarantee" card.
    const windowBits = [];
    if ((state === 'active' || state === 'warning') && a.days_left != null) {
      windowBits.push(`${plural(a.days_left, 'day', 'days')} left in your current ${win}-day window.`);
    }
    windowBits.push(last ? `Last qualified registration ${fmtDate(last)}.` : 'No qualified registration yet.');
    const paras = [];
    if (inG > 0) paras.push(atRisk);
    paras.push(firstEnd
      ? `Your activity window doesn't affect your earnings until your first guarantee ends on ${fmtDate(firstEnd)}. After that, you keep earning on that traveler for as long as you stay active.`
      : `Every traveler you bring in earns you revenue share for at least ${gm} months, whatever your activity.`);
    act = {
      kind: 'guarantee', look: 'plain',
      eyebrow: 'Your guarantee', panelTitle: 'Your guarantee in detail',
      tag: 'Fully covered', tone: 'info',
      big: int(inG), unit: `${inG === 1 ? 'traveler' : 'travelers'} inside the ${gm}-month guarantee`,
      line: firstEnd ? `Next guarantee ends ${fmtDate(firstEnd)}` : 'Your first qualified registration starts the clock',
      extra: '', bar: null, dots: null,
      rows: [
        ['Guarantee per traveler', `${gm} months from registration`],
        ['Travelers inside guarantee', int(inG)],
        ['Next guarantee ends', firstEnd ? `${fmtDate(firstEnd)} (${daysPhrase(daysToFirstEnd)})` : 'None yet'],
        ['Activity window', windowBits.join(' ')],
      ],
      paras, note: NOTE_WHAT,
    };
  } else if (state === 'grace') {
    const left = Number(a.grace_days_left) || 0;
    const used = Math.max(0, Math.min(graceDays, graceDays - left));
    act = {
      kind: 'grace', look: 'warn',
      eyebrow: 'Recovery period', panelTitle: 'Your activity window in detail',
      tag: 'Window missed', tone: 'amber',
      big: int(left), unit: `${left === 1 ? 'day' : 'days'} left to recover`,
      line: `Recover by ${fmtDate(a.grace_ends_on)}`,
      extra: '',
      bar: { label: `${used} of ${graceDays} recovery days used`, max: graceDays, now: used, warn: true },
      dots: null,
      rows: [
        [`${win}-day window closed`, fmtDate(a.window_ends_on)],
        ['Recover by', fmtDate(a.grace_ends_on)],
        ['Last qualified registration', fmtDate(last)],
      ],
      paras: [`One qualified registration before ${fmtDate(a.grace_ends_on)} keeps you active. If not, earnings stop going forward on travelers past their guarantee. Nothing already earned is taken back.`],
      note: NOTE_WHAT,
    };
  } else if (state === 'inactive') {
    const done = Math.max(0, Math.min(need, Number(a.requalify_months_completed) || 0));
    const used = !!a.reinstatement_used;       // the one reinstatement is spent: no requalify path is offered
    const kept = fmtDate(a.house_account_on);
    act = {
      kind: 'inactive', look: 'quiet',
      eyebrow: 'Activity status', panelTitle: 'Your activity window in detail',
      tag: used ? 'Reinstatement used' : 'Requalify to resume', tone: 'muted',
      big: 'Inactive', unit: '',
      line: used ? 'Reinstatement already used' : `${done} of ${need} months to requalify done`,
      extra: '', bar: null,
      dots: used ? null : Array.from({ length: need }, (_x, i) => ({
        n: i + 1, done: i + 1 <= done, text: i + 1 <= done ? '✓' : String(i + 1),
        label: `Month ${i + 1} ${i + 1 <= done ? 'done' : 'still needed'}`,
      })),
      rows: used
        ? [['Inactive since', fmtDate(a.inactive_since)], ['Reinstatement', 'Already used'], ['Travelers kept until', kept]]
        : [
          ['Inactive since', fmtDate(a.inactive_since)],
          ['To requalify', `1 qualified registration in each of ${need} consecutive calendar months`],
          ['Months completed', `${done} of ${need}`],
          ['Travelers kept until', kept],
        ],
      paras: [
        'Earnings are paused on travelers past their guarantee.',
        used
          ? 'Your travelers inside their guarantee still earn. New registrations still earn as usual. Your one reinstatement has been used.'
          : 'Your travelers inside their guarantee still earn. New registrations during these months earn as usual. You can be reinstated once.',
      ],
      note: used
        ? `On ${kept}, travelers past their guarantee become WhereTo accounts. ${NOTE_WHAT}`
        : `If you haven't requalified by ${kept}, travelers past their guarantee become WhereTo accounts. ${NOTE_WHAT}`,
    };
  } else {
    // active, or active with 14 days or fewer left ("warning")
    const warn = state === 'warning';
    const left = a.days_left == null ? null : Number(a.days_left);
    const used = left == null ? null : Math.max(0, Math.min(win, win - left));
    act = {
      kind: warn ? 'warning' : 'active', look: warn ? 'warn' : 'plain',
      eyebrow: 'Activity window', panelTitle: 'Your activity window in detail',
      tag: warn ? 'Closing soon' : 'On track', tone: warn ? 'amber' : 'ok',
      big: left == null ? '—' : int(left), unit: `${left === 1 ? 'day' : 'days'} left in your ${win}-day window`,
      line: `Next qualified registration needed by ${fmtDate(a.window_ends_on)}`,
      extra: '',
      bar: used == null ? null : { label: `Day ${used} of ${win}`, max: win, now: used, warn },
      dots: null,
      rows: [['Last qualified registration', fmtDate(last)], ['Next one needed by', fmtDate(a.window_ends_on)]],
      paras: [atRisk], note: NOTE_WHAT,
    };
  }
  if (display === 'headsup' && firstEnd) {
    act.extra = `Your first guarantee ends ${fmtDate(firstEnd)}. After that, staying active keeps those travelers earning.`;
  }
  return act;
}

/**
 * Everything the strip and the Summary cards say, from one `status` object.
 * Returns null when the object is not usable (the callers then show nothing).
 */
export function describeStatus(s) {
  if (!statusUsable(s)) return null;
  const tier = describeTier(s);
  const act = describeActivity(s);
  const a = s.activity;

  // The strip follows `display`: a guarantee card gets a guarantee line, never a countdown.
  let text, warn = false;
  if (a.display === 'guarantee') {
    text = a.first_guarantee_ends_on ? `Next guarantee ends ${fmtDate(a.first_guarantee_ends_on)}` : 'Your guarantee starts with your first traveler';
  } else if (a.state === 'inactive') {
    text = 'Inactive: earnings paused on older travelers'; warn = true;
  } else if (a.state === 'grace') {
    text = `Recovery period: ${plural(a.grace_days_left, 'day', 'days')} left`; warn = true;
  } else {
    text = a.days_left == null ? 'Your activity window has not started' : `${plural(a.days_left, 'day', 'days')} left in your ${s.program.window_days}-day activity window`;
    warn = a.state === 'warning';
  }
  return {
    founding: !!s.tier.is_founding,
    tier, act,
    tiers: describeTiers(s),
    strip: {
      tier: s.tier.is_founding ? 'Trailblazer · Founding Partner' : s.tier.name,
      rate: `${bpsPct(s.tier.rate_bps)} revenue share`,
      text, warn,
    },
  };
}

/** Fills (or hides) the strip under the header from a `status` object. */
export function drawStrip(status) {
  const el = document.getElementById('pp-strip');
  if (!el) return;
  const m = describeStatus(status);
  if (!m) { el.hidden = true; el.innerHTML = ''; el.dataset.sig = ''; return; }
  const sig = JSON.stringify(m.strip);
  if (el.dataset.sig === sig && !el.hidden) return;           // nothing changed: leave the DOM (and focus) alone
  el.dataset.sig = sig;
  const s = m.strip;
  el.innerHTML = `<div class="wrap pp-strip-in">
      <span class="pp-chip pp-chip--deep">${esc(s.tier)}</span>
      <span class="pp-strip-rate">${esc(s.rate)}</span>
      <span class="pp-strip-rule" aria-hidden="true"></span>
      <span class="pp-strip-text${s.warn ? ' is-warn' : ''}">${esc(s.text)}</span>
      <a class="pp-strip-link" href="/partner-dashboard/">View status</a>
    </div>`;
  el.hidden = false;
}

// One `status` call per page load, shared by the strip and by any page that
// wants a fact from it (Travelers reads whether the partner is a Founding Partner).
let pending = null;
export function loadStatus() {
  if (!pending) {
    pending = portal('status').then(
      (j) => (j && j.ok && j.is_affiliate !== false && statusUsable(j.status) ? j.status : null),
      () => null,
    );
  }
  return pending;
}
