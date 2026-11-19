// ───────────────────────────────────────────────────────────────────
//  wt-review-detail.js — everything about one submitted piece, on one card.
//
//  Used by the Review Queue (wt-admin-review.js). Left: the piece exactly as
//  the partner filled in the submit form (what they sent, title, content type,
//  platform, the file shown right here, their notes for the reviewer, a live
//  event's date and venue), then the tracking link and every review round.
//  Right: who the partner is (CRM record, account, channels, Agreement) and
//  everything else they have sent us.
//
//  Data: partner-admin review_detail. The file links it returns last ten
//  minutes, which is why the card is fetched fresh each time it opens.
// ───────────────────────────────────────────────────────────────────
import { esc, fmtDate, fmtDateTime, money, num, pill } from './wt-padmin-core.js';

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
const yes = (v) => (v == null ? dash : v ? 'Yes' : 'No');
const ext = (u) => `<a class="pa-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`;
const cap = (v) => String(v ?? '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const mail = (e) => (e ? `<a class="pa-link" href="mailto:${esc(e)}">${esc(e)}</a>` : dash);

/** A definition list, skipping rows with nothing in them unless `keep` names them. */
function kv(rows, keep = []) {
  const out = rows.filter(([k, v]) => keep.includes(k) || (v != null && v !== '' && v !== dash));
  return out.length ? `<dl class="pa-kv">${out.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>` : '';
}

// The file itself, shown on the page: image, video, audio or PDF.
function fileHtml(f, minutes) {
  if (!f.url) return `<p class="acct-sub">${esc(f.name)}: the file could not be opened.</p>`;
  const t = String(f.mime_type || '').toLowerCase();
  const u = esc(f.url);
  const name = esc(f.name);
  let media = '';
  if (t.startsWith('image/')) media = `<a href="${u}" target="_blank" rel="noopener noreferrer"><img src="${u}" alt="${name}" class="rv-media"></a>`;
  else if (t.startsWith('video/')) media = `<video src="${u}" class="rv-media" controls playsinline preload="metadata"${f.preview_url ? ` poster="${esc(f.preview_url)}"` : ''}></video>`;
  else if (t.startsWith('audio/')) media = `<audio src="${u}" class="rv-audio" controls preload="metadata"></audio>`;
  else if (t === 'application/pdf') media = `<iframe src="${u}" class="rv-frame" title="${name}"></iframe>`;
  else if (f.preview_url) media = `<img src="${esc(f.preview_url)}" alt="${name}" class="rv-media">`;
  return `<figure class="rv-file">${media}
    <figcaption class="pa-muted pa-small">${name}${f.size ? ' · ' + esc(size(f.size)) : ''}${f.mime_type ? ' · ' + esc(f.mime_type) : ''}
      · <a class="pa-link" href="${u}" target="_blank" rel="noopener noreferrer">Open in a new tab</a>
      <span class="pa-muted">(the link works for ${minutes} minutes; reopen this card for a fresh one)</span></figcaption></figure>`;
}

function pieceHtml(d) {
  const s = d.submission;
  const live = s.submission_kind === 'live_event';
  const form = kv([
    ['What they sent', esc(s.sending)],
    ['Title', txt(s.title)],
    ['Content type', txt(s.content_type)],
    ['Platform', txt(s.platform)],
    ...(live ? [['Event date', s.event_at ? esc(fmtDate(s.event_at)) : dash], ['Venue or channel', txt(s.event_venue)]] : []),
    ['Draft link', s.draft_url ? ext(s.draft_url) : dash],
    ['Live link', s.live_url ? ext(s.live_url) : dash],
  ], ['What they sent', 'Title', 'Content type', 'Platform']);

  const files = s.files.length
    ? s.files.map((f) => fileHtml(f, s.file_minutes)).join('')
    : live ? '' : '<p class="acct-sub">No file is attached.</p>';

  const notes = s.notes
    ? `<div class="rv-notes">${esc(s.notes)}</div>`
    : '<p class="acct-sub" style="margin:0;">The partner left no notes.</p>';

  const process = kv([
    ['Status', statusPill(s.status)],
    ['Submitted', esc(fmtDateTime(s.submitted_at))],
    ['Review due', s.sla_due_at ? esc(fmtDateTime(s.sla_due_at)) + (s.sla_state === 'over_contract' ? ' ' + pill('over contract', 'red') : s.sla_state === 'over_target' ? ' ' + pill('over target', 'amber') : '') : dash],
    ['First response', s.first_response_at ? esc(fmtDateTime(s.first_response_at)) : dash],
    ['Decided', s.decided_at ? esc(fmtDateTime(s.decided_at)) : dash],
    ['Sent back in', s.resubmitted_at ? esc(fmtDateTime(s.resubmitted_at)) : dash],
    ['Replaces', s.replaces ? `<button type="button" class="pa-link-btn" data-rv-open="${esc(s.replaces.id)}">${esc(s.replaces.title || 'an earlier piece')}</button> ${statusPill(s.replaces.status)}` : dash],
    ['Escalated', s.escalated_at ? esc(fmtDateTime(s.escalated_at)) : dash],
    ['Published', s.published_at ? esc(fmtDateTime(s.published_at)) : dash],
    ['Submitted by', s.submitted_by && s.submitted_by !== 'partner' ? esc(s.submitted_by) : dash],
  ], ['Status', 'Submitted']);

  return `
    <section class="rv-sec">
      <h4>What the partner submitted</h4>
      ${form}
      ${files}
      <h5>Notes for the reviewer</h5>
      ${notes}
    </section>
    <section class="rv-sec"><h4>Where it stands</h4>${process}</section>
    ${assetHtml(d)}
    ${historyHtml(d)}`;
}

function assetHtml(d) {
  const a = d.asset;
  if (!a) return '';
  const m = a.metrics || {};
  return `<section class="rv-sec"><h4>Tracking link</h4>${kv([
    ['Link', a.tracking_url ? ext(a.tracking_url) : dash],
    ['Code', a.tracking_code ? `<code>${esc(a.tracking_code)}</code>` : dash],
    ['Opens', a.landing_path ? `<code>${esc(a.landing_path)}</code>` : 'Default (sign-up on a computer, Get the App on a phone)'],
    ['Status', a.status ? esc(cap(a.status)) : dash],
    ['Issued', a.issued_at ? esc(fmtDateTime(a.issued_at)) : dash],
    ['First sign-up credited', a.first_attribution_at ? esc(fmtDateTime(a.first_attribution_at)) : dash],
    ['Turned off', a.deactivated_at ? `${esc(fmtDateTime(a.deactivated_at))}${a.deactivation_reason ? ' · ' + esc(a.deactivation_reason) : ''}` : dash],
    ['Downloads', num(m.downloads)],
    ['Registered users', num(m.reg_users)],
    ['Bookings', num(m.bookings)],
    ['Est. revenue', money(m.est_revenue)],
  ], ['Opens'])}
    ${a.id ? `<button type="button" class="pa-link-btn" data-rv-landing="${esc(a.id)}">Change the page it opens</button>` : ''}</section>`;
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
      <div>${pill(l, t)} <strong>Round ${esc(r.round)}</strong> · ${esc(fmtDateTime(r.reviewed_at))}${r.reviewer ? ' · ' + esc(r.reviewer) : ''}</div>
      ${checks}
      ${r.revision_instructions ? `<p class="rv-said"><span class="pa-muted">Told the partner:</span> ${esc(r.revision_instructions)}</p>` : ''}
      ${r.reviewer_notes ? `<p class="rv-said"><span class="pa-muted">Internal note:</span> ${esc(r.reviewer_notes)}</p>` : ''}
    </li>`;
  }).join('');
  const events = d.events.map((e) => {
    const f = e.changed_fields || {};
    const extra = e.action === 'landing_changed' ? ` (${esc(f.from || 'default')} → ${esc(f.to || 'default')})` : '';
    return `<li>${esc(fmtDateTime(e.occurred_at))} · ${esc(EVENT[e.action] || e.action.replace(/_/g, ' '))}${extra} · <span class="pa-muted">${esc(e.by)}</span></li>`;
  }).join('');
  if (!rounds && !events) return '';
  return `<section class="rv-sec"><h4>Review history</h4>
    ${rounds ? `<ol class="rv-rounds">${rounds}</ol>` : '<p class="acct-sub">Not reviewed yet.</p>'}
    ${events ? `<h5>Timeline</h5><ul class="rv-events">${events}</ul>` : ''}</section>`;
}

function partnerHtml(d) {
  const p = d.partner;
  const where = [p.city, p.state_region, p.country].filter(Boolean).join(', ');
  const acct = p.account || {};
  const c = p.contract;
  const name = p.partner_id
    ? `<a class="pa-link" href="/admin-partner/?id=${encodeURIComponent(p.partner_id)}">${esc(p.display_name)}</a>`
    : esc(p.display_name);
  const verified = [['identity', p.identity_verified], ['location', p.location_verified], ['activity', p.activity_verified]]
    .filter(([, v]) => v != null).map(([k, v]) => `${v ? '✓' : '✗'} ${k}`).join(' · ');

  const who = kv([
    ['Name', name],
    ['Partner ID', txt(p.partner_id)],
    ['Legal name', txt(p.legal_name)],
    ['Entity', txt(p.entity_type)],
    ['Email', mail(p.primary_email)],
    ['Other email', p.secondary_email ? mail(p.secondary_email) : dash],
    ['Sign-in email', acct.email && acct.email !== p.primary_email ? mail(acct.email) : dash],
    ['Account name', acct.name && acct.name !== p.display_name ? esc(acct.name) : dash],
    ['Phone', txt(p.phone || acct.phone)],
    ['Mailing address', txt(p.mailing_address)],
    ['Location', txt(where)],
    ['Market', txt(p.market)],
    ['Time zone', txt(p.timezone)],
    ['Language', txt(p.primary_language)],
    ['Creator type', txt(p.creator_type)],
    ['Tier', txt(p.tier)],
    ['CRM stage', txt(p.stage)],
    ['Source', txt(p.source)],
    ['Verified', verified || dash],
  ], ['Name', 'Email']);

  const program = kv([
    ['Partner since', p.partner_since ? esc(fmtDate(p.partner_since)) : dash],
    ['Account status', txt(p.account_status)],
    ['Referral code', p.affiliate_code ? `<code>${esc(p.affiliate_code)}</code>` : dash],
    ['Vanity link', p.vanity_slug ? `<code>${esc(p.vanity_slug)}</code>` : dash],
    ['Agreement', c ? `${esc(cap(c.status))}${c.executed_at ? ' · signed ' + esc(fmtDate(c.executed_at)) : ''}${c.agreement_version ? ' · v' + esc(c.agreement_version) : ''}` : dash],
    ['Terms accepted', p.terms_accepted_at ? esc(fmtDate(p.terms_accepted_at)) : p.tc ? esc(fmtDate(p.tc.acknowledged_at)) + (p.tc.tc_version ? ' · v' + esc(p.tc.tc_version) : '') : dash],
    ['Tax form', txt(p.tax_form)],
    ['Conflict', p.conflict_flag ? pill('Flagged', 'amber') + (p.conflict_notes ? ' ' + esc(p.conflict_notes) : '') : dash],
  ]);

  const channels = p.channels.length
    ? `<ul class="rv-channels">${p.channels.map((ch) => {
      const handle = ch.handle || ch.url || '';
      const link = ch.url ? `<a class="pa-link" href="${esc(ch.url)}" target="_blank" rel="noopener noreferrer">${esc(handle)}</a>` : esc(handle);
      const aud = ch.audience_size ? ` · ${num(ch.audience_size)} ${esc(ch.audience_metric || 'followers')}` : '';
      const eng = ch.engagement_rate ? ` · ${esc(Number(ch.engagement_rate).toFixed(1))}% engagement` : '';
      return `<li><strong>${esc(ch.platform_label || ch.platform)}</strong>${ch.is_primary ? ' ' + pill('main', 'blue') : ''} ${link}${aud}${eng}${ch.notes ? `<br><span class="pa-muted pa-small">${esc(ch.notes)}</span>` : ''}</li>`;
    }).join('')}</ul>`
    : '<p class="acct-sub" style="margin:0;">No channels on their record.</p>';

  const t = p.submissions.tally;
  const others = p.submissions.rows;
  const list = others.length
    ? `<p class="acct-sub" style="margin:0 0 6px;">${num(t.approved)} approved · ${num(t.changes)} sent back · ${num(t.rejected)} rejected · ${num(t.pending)} waiting</p>
      <ul class="rv-others">${others.map((o) => `<li>
        <button type="button" class="pa-link-btn" data-rv-open="${esc(o.id)}">${esc(o.title || 'Untitled')}</button>
        ${statusPill(o.status)}<br><span class="pa-muted pa-small">${esc([o.live_event ? 'Live event' : o.content_type, o.platform].filter(Boolean).join(' · '))} · sent ${esc(fmtDate(o.submitted_at))}</span></li>`).join('')}</ul>`
    : '<p class="acct-sub" style="margin:0;">This is the first piece they have sent.</p>';

  const notes = [
    p.qualification_notes ? `<p class="rv-said"><span class="pa-muted">Qualification:</span> ${esc(p.qualification_notes)}</p>` : '',
    p.notes ? `<p class="rv-said"><span class="pa-muted">CRM notes:</span> ${esc(p.notes)}</p>` : '',
  ].join('');

  return `
    <section class="rv-sec"><h4>The partner</h4>${who}
      <p class="pa-small" style="margin:8px 0 0;"><a class="pa-link" href="/admin-crm-prospect/?id=${encodeURIComponent(p.prospect_id)}">Open their CRM record</a>${p.partner_id ? ` · <a class="pa-link" href="/admin-partner/?id=${encodeURIComponent(p.partner_id)}">Partner dashboard</a>` : ''}</p></section>
    <section class="rv-sec"><h4>Channels</h4>${channels}</section>
    <section class="rv-sec"><h4>In the program</h4>${program || '<p class="acct-sub" style="margin:0;">No partner account is linked to this CRM record yet.</p>'}${notes}</section>
    <section class="rv-sec"><h4>Everything else they have sent</h4>${list}</section>`;
}

/** The whole card body: the piece on the left, the partner on the right. */
export function detailHtml(d) {
  return `<div class="rv-cols"><div class="rv-col">${pieceHtml(d)}</div><div class="rv-col rv-side">${partnerHtml(d)}</div></div>`;
}
