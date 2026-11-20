// ───────────────────────────────────────────────────────────────────
//  wt-review-detail.js — everything about one submitted piece, on one card.
//
//  Used by the Review Queue (wt-admin-review.js). The card reads top down:
//    header   the title, who sent it, what it is, its status and review clock
//    left     the piece exactly as the partner filled in the submit form (what
//             they sent, content type, platform, a live event's date and venue,
//             their notes for the reviewer), the file shown right here, then the
//             tracking link with the page it opens, every review round, and
//             everything else this partner has sent us
//    right    the decision (pending pieces only, passed in by the caller), then
//             who the partner is and where they stand in the program
//
//  Data: partner-admin review_detail. The file links it returns last ten
//  minutes, which is why the card is fetched fresh each time it opens.
// ───────────────────────────────────────────────────────────────────
import { esc, fmtDate, fmtDateTime, money, num, pill } from './wt-padmin-core.js';
import { landingPickerHtml } from './wt-landing-picker.js';

const dash = '<span class="pa-dash">—</span>';
const STATUS = {
  draft: ['Draft', ''], submitted: ['Waiting for review', 'pending'], in_review: ['In review', 'pending'],
  approved: ['Approved', 'approved'], published: ['Published', 'approved'], declined: ['Rejected', 'rejected'],
  revisions_requested: ['Changes requested', 'changes'], withdrawn: ['Withdrawn', ''],
};
const DECISION = { approved: ['Approved', 'approved'], declined: ['Rejected', 'rejected'], revisions_requested: ['Changes requested', 'changes'] };
const EVENT = {
  submitted: 'Submitted', draft_saved: 'Saved as a draft', resubmitted: 'Sent back in', approved: 'Approved',
  declined: 'Rejected', revisions_requested: 'Changes requested', landing_changed: 'Link page changed', published: 'Published',
};

export const statusPill = (s) => { const [l, t] = STATUS[s] || [s || '—', '']; return pill(l, t); };
const size = (n) => !n ? '' : n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const txt = (v) => (v == null || v === '' ? dash : esc(v));
const ext = (u) => `<a class="pa-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`;
const cap = (v) => String(v ?? '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const mail = (e) => (e ? `<a class="pa-link" href="mailto:${esc(e)}">${esc(e)}</a>` : dash);
const sameMinute = (a, b) => !!a && !!b && Math.abs(new Date(a) - new Date(b)) < 60000;
const muted = (t) => `<span class="pa-muted">${esc(t)}</span>`;
// "en" reads as "English"; anything the browser cannot name stays as stored.
const language = (code) => {
  try { return new Intl.DisplayNames(['en-US'], { type: 'language' }).of(code) || code; } catch { return code; }
};

/** A definition list, skipping rows with nothing in them unless `keep` names them. */
function kv(rows, keep = []) {
  const out = rows.filter(([k, v]) => keep.includes(k) || (v != null && v !== '' && v !== dash));
  return out.length ? `<dl class="pa-kv rv-kv">${out.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>` : '';
}

function slaPill(state) {
  if (state === 'over_contract') return ' ' + pill('over contract', 'red');
  if (state === 'over_target') return ' ' + pill('over target', 'amber');
  return '';
}

// ── Header ──────────────────────────────────────────────────────────
function headHtml(d) {
  const s = d.submission;
  const p = d.partner;
  const who = p.partner_id
    ? `<a class="pa-link" href="/admin-partner/?id=${encodeURIComponent(p.partner_id)}">${esc(p.display_name)}</a>`
    : `<a class="pa-link" href="/admin-crm-prospect/?id=${encodeURIComponent(p.prospect_id)}">${esc(p.display_name)}</a>`;
  const what = [s.content_type, s.platform].filter(Boolean).map(esc).join(' on ');
  const clock = [
    s.submitted_at ? `Submitted ${esc(fmtDateTime(s.submitted_at))}` : '',
    s.decided_at ? `Decided ${esc(fmtDateTime(s.decided_at))}`
      : s.sla_due_at ? `Review due ${esc(fmtDateTime(s.sla_due_at))}${slaPill(s.sla_state)}` : '',
  ].filter(Boolean).join('<span class="rv-dot">·</span>');
  return `
    <div class="rv-head">
      <div class="rv-head-main">
        <h3 class="rv-title">${esc(s.title || 'Untitled')}</h3>
        <p class="rv-byline">From ${who}${p.partner_id ? ` <span class="pa-muted">${esc(p.partner_id)}</span>` : ''}${what ? `<span class="rv-dot">·</span>${what}` : ''}</p>
        <p class="rv-clock">${statusPill(s.status)} ${clock}</p>
      </div>
      <button type="button" class="btn btn-ghost btn-xs" id="rv-cancel">Close</button>
    </div>`;
}

// ── The piece ───────────────────────────────────────────────────────
// The file itself, shown on the page: image, video, audio or PDF.
function fileHtml(f, minutes) {
  if (!f.url) return `<p class="acct-sub">${esc(f.name)}: the file could not be opened.</p>`;
  const t = String(f.mime_type || '').toLowerCase();
  const u = esc(f.url);
  const name = esc(f.name);
  let media = '';
  if (t.startsWith('image/')) media = `<a href="${u}" target="_blank" rel="noopener noreferrer" class="rv-stage"><img src="${u}" alt="${name}" class="rv-media"></a>`;
  else if (t.startsWith('video/')) media = `<div class="rv-stage"><video src="${u}" class="rv-media" controls playsinline preload="metadata"${f.preview_url ? ` poster="${esc(f.preview_url)}"` : ''}></video></div>`;
  else if (t.startsWith('audio/')) media = `<audio src="${u}" class="rv-audio" controls preload="metadata"></audio>`;
  else if (t === 'application/pdf') media = `<iframe src="${u}" class="rv-frame" title="${name}"></iframe>`;
  else if (f.preview_url) media = `<div class="rv-stage"><img src="${esc(f.preview_url)}" alt="${name}" class="rv-media"></div>`;
  return `<figure class="rv-file">${media}
    <figcaption><span class="rv-file-name">${name}</span>
      <span class="pa-muted">${[size(f.size), f.mime_type].filter(Boolean).map(esc).join(' · ')}</span>
      <a class="pa-link" href="${u}" target="_blank" rel="noopener noreferrer">Open full size</a>
      <span class="pa-muted rv-expiry">Link works for ${minutes} minutes. Reopen the card for a fresh one.</span></figcaption></figure>`;
}

function pieceHtml(d) {
  const s = d.submission;
  const live = s.submission_kind === 'live_event';
  const notes = s.notes ? `<span class="rv-notes">${esc(s.notes)}</span>` : muted('None');
  const form = kv([
    ['What they sent', esc(s.sending)],
    ['Content type', txt(s.content_type)],
    ['Platform', txt(s.platform)],
    ...(live ? [['Event date', s.event_at ? esc(fmtDateTime(s.event_at)) : dash], ['Venue or channel', txt(s.event_venue)]] : []),
    ['Draft link', s.draft_url ? ext(s.draft_url) : dash],
    ['Live link', s.live_url ? ext(s.live_url) : dash],
    ['Notes for the reviewer', notes],
  ], ['What they sent', 'Content type', 'Platform', 'Notes for the reviewer']);

  const files = s.files.length
    ? s.files.map((f) => fileHtml(f, s.file_minutes)).join('')
    : live ? '' : '<p class="acct-sub">No file is attached.</p>';

  // Status, submitted and due are in the header; this is only what else happened.
  const more = kv([
    // The first response is only news when it was not the decision itself.
    ['First response', s.first_response_at && !sameMinute(s.first_response_at, s.decided_at) ? esc(fmtDateTime(s.first_response_at)) : dash],
    ['Sent back in', s.resubmitted_at ? esc(fmtDateTime(s.resubmitted_at)) : dash],
    ['Replaces', s.replaces ? `<button type="button" class="pa-link-btn" data-rv-open="${esc(s.replaces.id)}">${esc(s.replaces.title || 'an earlier piece')}</button> ${statusPill(s.replaces.status)}` : dash],
    ['Escalated', s.escalated_at ? esc(fmtDateTime(s.escalated_at)) : dash],
    ['Published', s.published_at ? esc(fmtDateTime(s.published_at)) : dash],
    ['Submitted by', s.submitted_by && s.submitted_by !== 'partner' ? esc(s.submitted_by) : dash],
  ]);

  return `
    <section class="rv-sec">
      <h4>What the partner submitted</h4>
      ${form}
      ${files}
    </section>
    ${more ? `<section class="rv-sec"><h4>Along the way</h4>${more}</section>` : ''}
    ${assetHtml(d)}
    ${historyHtml(d)}`;
}

// The tracking link, with the page it opens set right here.
function assetHtml(d) {
  const a = d.asset;
  if (!a) return '';
  const m = a.metrics || {};
  const stat = (label, v) => `<div><span class="rv-stat-n">${v}</span><span class="rv-stat-l">${esc(label)}</span></div>`;
  return `<section class="rv-sec"><h4>Tracking link</h4>${kv([
    ['Link', a.tracking_url ? ext(a.tracking_url) : dash],
    ['Code', a.tracking_code ? `<code>${esc(a.tracking_code)}</code>` : dash],
    ['Status', a.status ? esc(cap(a.status)) : dash],
    ['Issued', a.issued_at ? esc(fmtDateTime(a.issued_at)) : dash],
    ['First sign-up credited', a.first_attribution_at ? esc(fmtDateTime(a.first_attribution_at)) : dash],
    ['Turned off', a.deactivated_at ? `${esc(fmtDateTime(a.deactivated_at))}${a.deactivation_reason ? ' · ' + esc(a.deactivation_reason) : ''}` : dash],
  ])}
    <div class="rv-stats">${stat('Downloads', num(m.downloads))}${stat('Registered users', num(m.reg_users))}${stat('Bookings', num(m.bookings))}${stat('Est. revenue', money(m.est_revenue))}</div>
    ${a.id ? `<div class="rv-landing" data-rv-landing-box="${esc(a.id)}">
      ${landingPickerHtml('rv-asset-landing', { label: 'Link opens', hint: 'the link itself never changes; a new page applies from the next click on' })}
      <div class="rv-landing-save"><button type="button" class="btn btn-primary btn-xs" data-rv-landing-save>Save page</button></div>
    </div>` : ''}</section>`;
}

function historyHtml(d) {
  const rounds = d.reviews.map((r) => {
    const [l, t] = DECISION[r.decision] || [r.decision, ''];
    const checks = r.decision === 'approved' || r.check_description_accurate != null
      ? `<ul class="rv-checks">
          <li>${r.check_description_accurate ? '✓' : '✗'} WhereTo described accurately</li>
          <li>${r.check_live_vs_planned ? '✓' : '✗'} Nothing planned shown as available</li>
          <li>${r.check_marks_used_correctly ? '✓' : '✗'} Logo, name and Marks used correctly</li></ul>` : '';
    return `<li class="rv-round">
      <div>${pill(l, t)} <strong>Round ${esc(r.round)}</strong> <span class="pa-muted">· ${esc(fmtDateTime(r.reviewed_at))}${r.reviewer ? ' · ' + esc(r.reviewer) : ''}</span></div>
      ${checks}
      ${r.revision_instructions ? `<p class="rv-said"><span class="pa-muted">Told the partner:</span> ${esc(r.revision_instructions)}</p>` : ''}
      ${r.reviewer_notes ? `<p class="rv-said"><span class="pa-muted">Internal note:</span> ${esc(r.reviewer_notes)}</p>` : ''}
    </li>`;
  }).join('');
  // A piece that was only submitted has nothing here the header does not already say.
  if (!rounds && d.events.length <= 1) return '';
  const events = d.events.map((e) => {
    const f = e.changed_fields || {};
    const extra = e.action === 'landing_changed' ? ` (${esc(f.from || 'default')} → ${esc(f.to || 'default')})` : '';
    return `<li><span class="rv-when">${esc(fmtDateTime(e.occurred_at))}</span><span>${esc(EVENT[e.action] || e.action.replace(/_/g, ' '))}${extra} <span class="pa-muted">· ${esc(e.by)}</span></span></li>`;
  }).join('');
  return `<section class="rv-sec"><h4>Review history</h4>
    ${rounds ? `<ol class="rv-rounds">${rounds}</ol>` : ''}
    ${events ? `<ul class="rv-events">${events}</ul>` : ''}</section>`;
}

// ── The partner ─────────────────────────────────────────────────────
function partnerHtml(d) {
  const p = d.partner;
  const where = [p.city, p.state_region, p.country].filter(Boolean).join(', ');
  const acct = p.account || {};
  const c = p.contract;
  const checks = [['identity', p.identity_verified], ['location', p.location_verified], ['activity', p.activity_verified]];
  const done = checks.filter(([, v]) => v).map(([k]) => k);
  const verified = checks.every(([, v]) => v == null) ? dash
    : done.length === checks.length ? 'Identity, location and activity'
      : done.length ? `${cap(done.join(', '))} only` : muted('Not yet');

  const channels = p.channels.length
    ? `<ul class="rv-channels">${p.channels.map((ch) => {
      const handle = ch.handle || ch.url || '';
      const link = ch.url ? `<a class="pa-link" href="${esc(ch.url)}" target="_blank" rel="noopener noreferrer">${esc(handle)}</a>` : esc(handle);
      const aud = ch.audience_size ? ` · ${num(ch.audience_size)} ${esc(ch.audience_metric || 'followers')}` : '';
      const eng = ch.engagement_rate ? ` · ${esc(Number(ch.engagement_rate).toFixed(1))}% engagement` : '';
      return `<li><strong>${esc(ch.platform_label || ch.platform)}</strong>${ch.is_primary ? ' ' + pill('main', 'blue') : ''} ${link}${aud}${eng}${ch.notes ? `<br><span class="pa-muted pa-small">${esc(ch.notes)}</span>` : ''}</li>`;
    }).join('')}</ul>`
    : muted('None on their record');

  const who = kv([
    ['Legal name', p.legal_name && p.legal_name !== p.display_name ? esc(p.legal_name) : dash],
    ['Entity', p.entity_type ? esc(cap(p.entity_type)) : dash],
    ['Email', mail(p.primary_email)],
    ['Other email', p.secondary_email ? mail(p.secondary_email) : dash],
    ['Sign-in email', acct.email && acct.email !== p.primary_email ? mail(acct.email) : dash],
    ['Account name', acct.name && acct.name !== p.display_name ? esc(acct.name) : dash],
    ['Phone', txt(p.phone || acct.phone)],
    ['Mailing address', txt(p.mailing_address)],
    ['Location', txt(where)],
    ['Market', txt(p.market)],
    ['Time zone', txt(p.timezone)],
    ['Language', p.primary_language ? esc(language(p.primary_language)) : dash],
    ['Creator type', txt(p.creator_type)],
    ['Tier', txt(p.tier)],
    ['CRM stage', txt(p.stage)],
    ['Source', txt(p.source)],
    ['Verified', verified],
    ['Channels', channels],
  ], ['Email', 'Channels']);

  const program = kv([
    ['Partner since', p.partner_since ? esc(fmtDate(p.partner_since)) : dash],
    ['Account status', txt(p.account_status)],
    ['Referral code', p.affiliate_code ? `<code>${esc(p.affiliate_code)}</code>` : dash],
    ['Vanity link', p.vanity_slug ? `<code>${esc(p.vanity_slug)}</code>` : dash],
    ['Agreement', c ? `${esc(cap(c.status))}${c.executed_at ? ' · signed ' + esc(fmtDate(c.executed_at)) : ''}${c.agreement_version ? ' · v' + esc(c.agreement_version) : ''}` : dash],
    ['Terms accepted', p.terms_accepted_at ? esc(fmtDate(p.terms_accepted_at)) : p.tc ? esc(fmtDate(p.tc.acknowledged_at)) + (p.tc.tc_version ? ' · v' + esc(p.tc.tc_version) : '') : dash],
    ['Tax form', txt(p.tax_form)],
    ['Conflict', p.conflict_flag ? pill('Flagged', 'amber') + (p.conflict_notes ? ' ' + esc(p.conflict_notes) : '') : dash],
    ['Qualification', p.qualification_notes ? `<span class="rv-notes">${esc(p.qualification_notes)}</span>` : dash],
    ['CRM notes', p.notes ? `<span class="rv-notes">${esc(p.notes)}</span>` : dash],
  ]);

  return `
    <section class="rv-sec">
      <h4>The partner</h4>
      ${who}
      <p class="rv-links"><a class="pa-link" href="/admin-crm-prospect/?id=${encodeURIComponent(p.prospect_id)}">CRM record</a>${p.partner_id ? `<a class="pa-link" href="/admin-partner/?id=${encodeURIComponent(p.partner_id)}">Partner dashboard</a>` : ''}</p>
    </section>
    <section class="rv-sec"><h4>In the program</h4>${program || '<p class="acct-sub" style="margin:0;">No partner account is linked to this CRM record yet.</p>'}</section>`;
}

// Everything else this partner has sent, each one a click away.
function othersHtml(d) {
  const p = d.partner;
  const t = p.submissions.tally;
  const others = p.submissions.rows;
  const tally = [['approved', t.approved, 'approved'], ['waiting', t.pending, 'pending'], ['sent back', t.changes, 'changes'], ['rejected', t.rejected, 'rejected']]
    .filter(([, n]) => n).map(([l, n, tone]) => pill(`${num(n)} ${l}`, tone)).join(' ');
  const list = others.length
    ? `<p class="rv-tally">${tally}</p>
      <ul class="rv-others">${others.map((o) => `<li>
        <button type="button" class="pa-link-btn" data-rv-open="${esc(o.id)}">${esc(o.title || 'Untitled')}</button>
        ${statusPill(o.status)}
        <span class="rv-meta">${esc([o.live_event ? 'Live event' : o.content_type, o.platform].filter(Boolean).join(' · '))} · sent ${esc(fmtDate(o.submitted_at))}</span></li>`).join('')}</ul>`
    : '<p class="acct-sub" style="margin:0;">This is the first piece they have sent.</p>';
  return `<section class="rv-sec"><h4>Their other pieces${others.length ? ` <span class="rv-count">${num(others.length)}</span>` : ''}</h4>${list}</section>`;
}

/**
 * The whole card body. `decision` is the decision form's markup (pending
 * pieces only); it sits at the top of the right column, beside the file.
 */
export function detailHtml(d, { decision = '' } = {}) {
  return `${headHtml(d)}
    <div class="rv-cols">
      <div class="rv-col">${pieceHtml(d)}${othersHtml(d)}</div>
      <div class="rv-col rv-side">${decision}${partnerHtml(d)}</div>
    </div>`;
}
