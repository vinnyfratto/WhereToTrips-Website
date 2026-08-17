// ───────────────────────────────────────────────────────────────────
//  wt-admin-crm-prospect.js — the prospect record (spec §8.2).
//
//  Header, the persistent onboarding checklist, then tabs. Conflict flags and
//  exclusion reasons are a BANNER, not a buried field.
//
//  Two things on this page are contractual rather than cosmetic, so the copy
//  is part of the feature:
//   • Stage gates explain WHY a move is blocked, in the words of the clause
//     that blocks it, so an admin can act on the message rather than guess.
//   • Termination states plainly what survives. Tails survive every type
//     except core_misconduct (Agr. §8.5, §8.6), and termination never
//     deactivates a tracking asset.
// ───────────────────────────────────────────────────────────────────
import {
  $, bootAdminPage, callCrm, date, dateTime, daysAgo, esc, msg, panel, titleise, wireTabs,
} from './wt-crm-shared.js';

const STAGES = [
  'sourced', 'qualifying', 'qualified', 'contacted', 'engaged',
  'agreement_sent', 'signed', 'onboarding', 'active', 'inactive',
  'paused', 'declined', 'excluded', 'terminated',
];
const TERMINATION_TYPES = ['voluntary', 'convenience', 'inactivity', 'uncured_breach', 'core_misconduct'];
const PLATFORMS = ['blog', 'youtube', 'instagram', 'tiktok', 'facebook', 'pinterest', 'x', 'linkedin', 'newsletter', 'podcast', 'other'];
const METRICS = ['followers', 'subscribers', 'monthly_sessions', 'email_list', 'downloads'];
const CHANNELS = ['email', 'dm_instagram', 'dm_tiktok', 'dm_other', 'phone', 'video_call', 'in_person', 'sms', 'contact_form', 'other'];
const OUTCOMES = ['no_response', 'replied_interested', 'replied_declined', 'meeting_scheduled', 'info_requested', 'other'];
const CONTRACT_STATUSES = ['not_started', 'drafting', 'internal_review', 'ready_to_send', 'sent', 'viewed', 'partially_signed', 'executed', 'declined', 'expired', 'voided', 'superseded'];
const FORM_STATUSES = ['not_requested', 'requested', 'sent_for_signature', 'received', 'verified', 'expired'];

const ID = new URLSearchParams(location.search).get('id');
let D = null;

// ── Load and paint ─────────────────────────────────────────────────
async function load() {
  const res = await callCrm('get_prospect', { id: ID });
  if (!res.ok) { msg('error', res.error); return false; }
  D = res;
  paintHeader();
  paintOnboarding();
  paintOverview();
  return true;
}

function paintHeader() {
  const p = D.prospect;
  $('#pr-name').textContent = p.display_name;
  $('#pr-sub').textContent = [
    titleise(p.stage),
    `${daysAgo(p.stage_entered_at)} in stage`,
    titleise(p.creator_type),
    p.tier ? `Tier ${p.tier}` : null,
    p.market,
  ].filter(Boolean).join(' · ');

  const banners = [];
  if (p.conflict_flag) {
    banners.push(`<div class="alert show alert-error"><strong>Conflict flagged.</strong>
      ${esc(p.conflict_notes || 'No detail recorded.')}</div>`);
  }
  if (p.stage === 'excluded') {
    banners.push(`<div class="alert show alert-error"><strong>Excluded.</strong>
      ${esc(p.exclusion_reason || 'No reason recorded.')}
      This record is kept deliberately so nobody re-researches them.</div>`);
  }
  if (p.stage === 'declined') {
    banners.push(`<div class="alert show alert-info"><strong>Declined.</strong>
      ${esc(p.decline_reason || 'No reason recorded.')}</div>`);
  }
  if (p.stage === 'terminated') {
    const core = p.termination_type === 'core_misconduct';
    banners.push(`<div class="alert show ${core ? 'alert-error' : 'alert-info'}">
      <strong>Terminated (${esc(titleise(p.termination_type || 'unknown'))}).</strong>
      ${esc(p.termination_note || '')}
      ${core
        ? 'The Partner Share is forfeited from the termination date, including for travelers whose three-year terms have not expired (Agreement §8.6).'
        : 'Tails survive: this partner keeps earning on travelers already attributed for the remainder of each three-year term (Agreement §8.5).'}
      Tracking assets are not deactivated by termination.</div>`);
  }
  if (p.archived_at) {
    banners.push('<div class="alert show alert-info"><strong>Archived.</strong> Soft-deleted; nothing is removed.</div>');
  }
  $('#pr-banner').innerHTML = banners.join('');
}

function paintOnboarding() {
  const done = D.onboarding.filter((i) => i.complete).length;
  $('#pr-onboarding').innerHTML = `
    <h2 class="adm-section-h" style="margin-top:0; padding-top:0; border-top:0;">
      Onboarding ${done} / 6
    </h2>
    <p class="acct-sub">
      A partner is <strong>active</strong> only when all six are complete. Item 6 is the one that matters:
      under Agreement v3.x a partner with a signed contract, a verified W-9, and an account still cannot earn
      a cent until an asset has been issued.
    </p>
    <table class="adm-table">
      <tbody>${D.onboarding.map((i) => `
        <tr>
          <td style="width:2.4rem;">${i.complete ? '<span class="check">✓</span>' : '<span class="adm-pill">—</span>'}</td>
          <td>${esc(i.label)}</td>
          <td class="acct-sub">${i.complete ? esc(i.detail ? date(i.detail) : 'Complete') : esc(i.blocked_reason ?? '')}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

// ── Overview tab ───────────────────────────────────────────────────
function paintOverview() {
  const p = D.prospect;
  const cm = D.content_minimum;
  panel('overview').innerHTML = `
    <div class="adm-card">
      <h3>Stage</h3>
      <div class="adm-form-row">
        <label class="field"><span>Move to</span><select id="s-stage">
          ${STAGES.map((s) => `<option value="${s}" ${s === p.stage ? 'selected' : ''}>${esc(titleise(s))}</option>`).join('')}
        </select></label>
        <label class="field" style="flex:2;"><span>Reason (required for any non-sequential move)</span>
          <input id="s-reason" placeholder="Why this move" /></label>
        <button id="s-go" type="button" class="btn btn-primary">Change stage</button>
      </div>
      <div id="s-extra"></div>
    </div>

    <div class="adm-card">
      <h3>Content minimum</h3>
      <p style="font-size:1.4rem; font-weight:700; margin:0;">${cm.published} / ${cm.required}</p>
      <p class="acct-sub">${esc(cm.proration_basis)} · ${cm.waiting_days_excluded} business days excluded
        while awaiting our review (Agreement §5.1 protects this time).</p>
    </div>

    <div class="adm-card">
      <h3>Details</h3>
      <div class="adm-grid-2">
        ${field('display_name', 'Display name', p.display_name)}
        ${field('legal_name', 'Legal name', p.legal_name)}
        ${select('entity_type', 'Entity type', ['individual', 'llc', 'corporation', 'partnership', 'unknown'], p.entity_type)}
        ${field('primary_email', 'Primary email', p.primary_email)}
        ${field('secondary_email', 'Secondary email', p.secondary_email)}
        ${field('phone', 'Phone', p.phone)}
        ${field('city', 'City', p.city)}
        ${field('state_region', 'State or region', p.state_region)}
        ${field('country', 'Country', p.country)}
        ${field('market', 'Market', p.market)}
        ${select('tier', 'Tier', ['', 'A', 'B', 'C'], p.tier)}
        ${field('source', 'Source', p.source)}
        ${field('content_year_start', 'Content year start', p.content_year_start, 'date')}
        ${field('mailing_address', 'Mailing address', p.mailing_address)}
      </div>
      <p class="acct-sub">The mailing address decides which state an undeliverable balance would eventually be
        reported to, so it matters twice (Unclaimed Property SOP §2).</p>
      <div class="adm-grid-2" style="margin-top:10px;">
        ${check('identity_verified', 'Identity verified', p.identity_verified)}
        ${check('location_verified', 'Location verified', p.location_verified)}
        ${check('activity_verified', 'Still publishing', p.activity_verified)}
        ${check('conflict_flag', 'Conflict flagged', p.conflict_flag)}
        ${check('suppressed_from_bulk', 'Suppressed from bulk mail', p.suppressed_from_bulk)}
      </div>
      <p class="acct-sub">Suppression applies to bulk only. A suppressed partner still receives transactional
        mail: an approval notice is not marketing.</p>
      <label class="field"><span>Qualification notes</span><textarea id="f-qualification_notes" rows="3">${esc(p.qualification_notes ?? '')}</textarea></label>
      <label class="field"><span>Conflict notes</span><textarea id="f-conflict_notes" rows="2">${esc(p.conflict_notes ?? '')}</textarea></label>
      <label class="field"><span>Notes</span><textarea id="f-notes" rows="3">${esc(p.notes ?? '')}</textarea></label>
      <p class="acct-sub">Never record a taxpayer or bank identifier in any field. The CRM refuses them.</p>
      <button id="f-save" type="button" class="btn btn-primary">Save details</button>
    </div>`;

  $('#s-stage').addEventListener('change', renderStageExtras);
  renderStageExtras();
  $('#s-go').addEventListener('click', changeStage);
  $('#f-save').addEventListener('click', saveDetails);
}

function field(name, label, value, type = 'text') {
  const v = type === 'date' && value ? String(value).slice(0, 10) : (value ?? '');
  return `<label class="field"><span>${esc(label)}</span><input id="f-${name}" type="${type}" value="${esc(v)}" /></label>`;
}
function select(name, label, options, value) {
  return `<label class="field"><span>${esc(label)}</span><select id="f-${name}">
    ${options.map((o) => `<option value="${esc(o)}" ${o === (value ?? '') ? 'selected' : ''}>${o ? esc(titleise(o)) : '—'}</option>`).join('')}
  </select></label>`;
}
function check(name, label, value) {
  return `<label class="field" style="flex-direction:row; align-items:center; gap:8px;">
    <input id="f-${name}" type="checkbox" ${value ? 'checked' : ''} /><span>${esc(label)}</span></label>`;
}

function renderStageExtras() {
  const target = $('#s-stage').value;
  let html = '';
  if (target === 'declined') {
    html = `<label class="field"><span>Decline reason (required)</span><input id="s-decline" /></label>`;
  } else if (target === 'excluded') {
    html = `<label class="field"><span>Exclusion reason (required)</span><input id="s-exclusion"
      placeholder="Relocated, conflict, dormant, not a creator, dead domain" /></label>`;
  } else if (target === 'terminated') {
    html = `
      <label class="field"><span>Termination type (required)</span><select id="s-term">
        ${TERMINATION_TYPES.map((t) => `<option value="${t}">${esc(titleise(t))}</option>`).join('')}
      </select></label>
      <label class="field"><span>Note</span><input id="s-termnote" /></label>
      <div id="s-termwarn"></div>`;
  }
  $('#s-extra').innerHTML = html;

  if (target === 'terminated') {
    const paint = () => {
      const core = $('#s-term').value === 'core_misconduct';
      // The one field in the system that can cost a partner three years of
      // accrued earnings. Say so, at the point of the decision.
      $('#s-termwarn').innerHTML = core
        ? `<div class="alert show alert-error">
             <strong>Core Misconduct forfeits the Partner Share.</strong> This ends entitlement from today,
             including for travelers whose three-year Attribution Terms have not expired (Agreement §8.6).
             It is the only termination type that does this. A note is mandatory.
             <label class="field" style="flex-direction:row; align-items:center; gap:8px; margin-top:8px;">
               <input id="s-confirm" type="checkbox" /><span>I understand and confirm</span></label>
           </div>`
        : `<div class="alert show alert-info">Tails survive this type. The partner keeps earning on travelers
             already attributed for the remainder of each three-year term (Agreement §8.5), and their tracking
             assets are not deactivated.</div>`;
    };
    $('#s-term').addEventListener('change', paint);
    paint();
  }
}

async function changeStage() {
  const target = $('#s-stage').value;
  const res = await callCrm('change_stage', {
    id: ID,
    stage: target,
    reason: $('#s-reason').value,
    decline_reason: $('#s-decline')?.value,
    exclusion_reason: $('#s-exclusion')?.value,
    termination_type: $('#s-term')?.value,
    termination_note: $('#s-termnote')?.value,
    confirm_forfeiture: $('#s-confirm')?.checked,
  });
  if (!res.ok) { msg('error', res.error); return; }
  msg('success', ['Stage updated.', ...(res.notes ?? [])].join(' '));
  await load();
}

async function saveDetails() {
  const payload = { id: ID };
  for (const name of ['display_name', 'legal_name', 'entity_type', 'primary_email', 'secondary_email', 'phone',
    'city', 'state_region', 'country', 'market', 'tier', 'source', 'content_year_start', 'mailing_address',
    'qualification_notes', 'conflict_notes', 'notes']) {
    const el = $('#f-' + name);
    if (el) payload[name] = el.value;
  }
  for (const name of ['identity_verified', 'location_verified', 'activity_verified', 'conflict_flag', 'suppressed_from_bulk']) {
    const el = $('#f-' + name);
    if (el) payload[name] = el.checked;
  }
  const res = await callCrm('update_prospect', payload);
  if (!res.ok) { msg('error', res.error); return; }
  msg('success', 'Saved.');
  await load();
}

// ── Channels ───────────────────────────────────────────────────────
function paintChannels() {
  panel('channels').innerHTML = `
    <div class="adm-card">
      <h3>Channels</h3>
      <p class="acct-sub">
        Audience metrics are never comparable across types. 40,000 newsletter subscribers and 40,000 TikTok
        followers are not the same number, so they are not sorted together (spec §4.2, §8.1).
      </p>
      <table class="adm-table">
        <thead><tr><th>Platform</th><th>Handle</th><th>Audience</th><th>Verified</th><th>Last active</th><th></th></tr></thead>
        <tbody>${(D.channels ?? []).map((c) => `
          <tr>
            <td>${esc(titleise(c.platform))} ${c.is_primary ? '<span class="adm-pill">primary</span>' : ''}</td>
            <td>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.handle || c.url)}</a>` : esc(c.handle ?? '—')}</td>
            <td>${c.audience_size ? `${Number(c.audience_size).toLocaleString()} ${esc(c.audience_metric ?? '')}` : '—'}</td>
            <td>${c.metrics_verified_at ? esc(date(c.metrics_verified_at)) : '<span class="acct-sub">estimate</span>'}</td>
            <td>${esc(date(c.last_activity_at))}</td>
            <td><button class="btn btn-ghost btn-xs" data-del-channel="${esc(c.id)}">Remove</button></td>
          </tr>`).join('') || '<tr><td colspan="6" class="acct-sub">No channels recorded.</td></tr>'}
        </tbody>
      </table>

      <h4>Add a channel</h4>
      <div class="adm-grid-2">
        <label class="field"><span>Platform</span><select id="c-platform">
          ${PLATFORMS.map((p) => `<option value="${p}">${esc(titleise(p))}</option>`).join('')}</select></label>
        <label class="field"><span>Handle</span><input id="c-handle" /></label>
        <label class="field"><span>URL</span><input id="c-url" type="url" /></label>
        <label class="field"><span>Audience size</span><input id="c-size" type="number" /></label>
        <label class="field"><span>Audience metric</span><select id="c-metric">
          <option value="">—</option>${METRICS.map((m) => `<option value="${m}">${esc(titleise(m))}</option>`).join('')}</select></label>
        <label class="field"><span>Metrics verified on</span><input id="c-verified" type="date" /></label>
        <label class="field"><span>Last activity</span><input id="c-active" type="date" /></label>
        <label class="field" style="flex-direction:row; align-items:center; gap:8px;">
          <input id="c-primary" type="checkbox" /><span>Primary channel</span></label>
      </div>
      <button id="c-add" type="button" class="btn btn-primary">Add channel</button>
    </div>`;

  $('#c-add').addEventListener('click', async () => {
    const res = await callCrm('upsert_channel', {
      prospect_id: ID,
      platform: $('#c-platform').value,
      handle: $('#c-handle').value,
      url: $('#c-url').value,
      audience_size: $('#c-size').value,
      audience_metric: $('#c-metric').value,
      metrics_verified_at: $('#c-verified').value,
      last_activity_at: $('#c-active').value,
      is_primary: $('#c-primary').checked,
    });
    if (!res.ok) { msg('error', res.error); return; }
    msg('success', 'Channel added.');
    await load(); paintChannels();
  });

  panel('channels').querySelectorAll('[data-del-channel]').forEach((b) => {
    b.addEventListener('click', async () => {
      const res = await callCrm('delete_channel', { id: b.dataset.delChannel });
      if (!res.ok) { msg('error', res.error); return; }
      await load(); paintChannels();
    });
  });
}

// ── Qualification ──────────────────────────────────────────────────
function paintQualification() {
  const market = D.prospect.market;
  const relevant = (D.criteria ?? []).filter((c) => !market || c.market === market);
  const metById = new Map((D.prospect_criteria ?? []).map((pc) => [pc.criterion_id, pc]));

  panel('qualification').innerHTML = `
    <div class="adm-card">
      <h3>Qualification criteria${market ? ` — ${esc(market)}` : ''}</h3>
      <p class="acct-sub">
        Criteria are configuration, not columns. Adding a market is data entry, and every required criterion
        gates the move to <strong>qualified</strong>.
      </p>
      ${relevant.length ? `<table class="adm-table">
        <thead><tr><th></th><th>Criterion</th><th>Required</th><th>Checked</th></tr></thead>
        <tbody>${relevant.map((c) => {
          const pc = metById.get(c.id);
          return `<tr>
            <td><input type="checkbox" data-crit="${esc(c.id)}" ${pc?.is_met ? 'checked' : ''} /></td>
            <td>${esc(c.label)}</td>
            <td>${c.is_required ? 'Yes' : 'No'}</td>
            <td class="acct-sub">${pc?.checked_at ? esc(date(pc.checked_at)) : '—'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>` : `<p class="acct-sub">No criteria configured${market ? ` for market "${esc(market)}"` : ''}.
        Set the prospect's market, or add criteria for it.</p>`}
    </div>`;

  panel('qualification').querySelectorAll('[data-crit]').forEach((cb) => {
    cb.addEventListener('change', async () => {
      const res = await callCrm('set_criterion', {
        prospect_id: ID, criterion_id: cb.dataset.crit, is_met: cb.checked,
      });
      if (!res.ok) { msg('error', res.error); cb.checked = !cb.checked; return; }
      await load();
    });
  });
}

// ── Communications ─────────────────────────────────────────────────
function paintCommunications() {
  panel('communications').innerHTML = `
    <div class="adm-card">
      <h3>Log a touch</h3>
      <p class="acct-sub">If logging a call takes more than about fifteen seconds it will not get logged,
        and the log is the deliverable.</p>
      <div class="adm-grid-2">
        <label class="field"><span>Direction</span><select id="m-dir">
          <option value="outbound">Outbound</option><option value="inbound">Inbound</option></select></label>
        <label class="field"><span>Channel</span><select id="m-chan">
          ${CHANNELS.map((c) => `<option value="${c}">${esc(titleise(c))}</option>`).join('')}</select></label>
        <label class="field"><span>Outcome</span><select id="m-out">
          <option value="">—</option>${OUTCOMES.map((o) => `<option value="${o}">${esc(titleise(o))}</option>`).join('')}</select></label>
        <label class="field"><span>When</span><input id="m-when" type="datetime-local" /></label>
      </div>
      <label class="field"><span>Subject</span><input id="m-subject" /></label>
      <label class="field"><span>Notes</span><textarea id="m-body" rows="3"></textarea></label>
      <button id="m-add" type="button" class="btn btn-primary">Log it</button>
    </div>

    <div class="adm-card">
      <h3>Timeline</h3>
      <p class="acct-sub">Manual entries, ingested mail, and system events in one reverse-chronological list.</p>
      ${(D.communications ?? []).map((c) => `
        <div class="comm-row">
          <div>
            <strong>${esc(titleise(c.direction))} · ${esc(titleise(c.channel))}</strong>
            ${c.source === 'system' ? '<span class="adm-pill">system</span>' : ''}
            ${c.is_urgent_escalation ? '<span class="adm-pill" style="background:#B85C38;color:#fff;">urgent escalation</span>' : ''}
            ${c.attachments_withheld ? '<span class="adm-pill" title="An attachment existed and was deliberately not stored">attachment withheld</span>' : ''}
            <span class="acct-sub"> ${esc(dateTime(c.occurred_at))}</span>
          </div>
          ${c.subject ? `<div>${esc(c.subject)}</div>` : ''}
          ${c.body ? `<div class="acct-sub" style="white-space:pre-wrap;">${esc(c.body)}</div>` : ''}
          ${c.outcome ? `<div class="acct-sub">Outcome: ${esc(titleise(c.outcome))}</div>` : ''}
          ${c.direction === 'inbound' && !c.acknowledged_at
            ? `<button class="btn btn-ghost btn-xs" data-ack="${esc(c.id)}">Mark acknowledged</button>
               <span class="acct-sub">T&amp;C §9.1: within two business days</span>`
            : ''}
        </div>`).join('') || '<p class="acct-sub">Nothing logged yet.</p>'}
    </div>`;

  $('#m-add').addEventListener('click', async () => {
    const when = $('#m-when').value;
    const res = await callCrm('log_communication', {
      prospect_id: ID,
      direction: $('#m-dir').value,
      channel: $('#m-chan').value,
      outcome: $('#m-out').value,
      occurred_at: when ? new Date(when).toISOString() : null,
      subject: $('#m-subject').value,
      body: $('#m-body').value,
    });
    if (!res.ok) { msg('error', res.error); return; }
    msg('success', 'Logged.');
    await load(); paintCommunications();
  });

  panel('communications').querySelectorAll('[data-ack]').forEach((b) => {
    b.addEventListener('click', async () => {
      const res = await callCrm('acknowledge_communication', { id: b.dataset.ack });
      if (!res.ok) { msg('error', res.error); return; }
      await load(); paintCommunications();
    });
  });
}

// ── Contracts ──────────────────────────────────────────────────────
function paintContracts() {
  panel('contracts').innerHTML = `
    <div class="adm-card">
      <h3>Contracts</h3>
      <p class="acct-sub">
        Phase 1 tracks status manually. Zoho Sign envelope IDs entered here become the join key when the API
        lands in Phase 2. Reaching <strong>executed</strong> moves the prospect to onboarding, but never
        straight to active: onboarding gates that.
      </p>
      <table class="adm-table">
        <thead><tr><th>Agreement</th><th>T&amp;C</th><th>Status</th><th>Sent</th><th>Executed</th><th>Signer</th></tr></thead>
        <tbody>${(D.contracts ?? []).map((c) => `
          <tr>
            <td>${esc(c.agreement_version)}</td>
            <td>${esc(c.tc_version)}</td>
            <td>${esc(titleise(c.status))}</td>
            <td>${esc(date(c.sent_at))}</td>
            <td>${esc(date(c.executed_at))}</td>
            <td>${esc(c.signer_name ?? '—')}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="acct-sub">No contract recorded.</td></tr>'}
      </tbody></table>

      <h4>Record a contract</h4>
      <div class="adm-grid-2">
        <label class="field"><span>Agreement version *</span><input id="k-agr" placeholder="3.2" /></label>
        <label class="field"><span>T&amp;C version *</span><input id="k-tc" placeholder="3.2" /></label>
        <label class="field"><span>Status</span><select id="k-status">
          ${CONTRACT_STATUSES.map((s) => `<option value="${s}">${esc(titleise(s))}</option>`).join('')}</select></label>
        <label class="field"><span>Zoho Sign envelope ID</span><input id="k-env" /></label>
        <label class="field"><span>Signer name</span><input id="k-name" /></label>
        <label class="field"><span>Signer email</span><input id="k-email" type="email" /></label>
      </div>
      <label class="field"><span>Schedule A notes</span><textarea id="k-sched" rows="2"></textarea></label>
      <button id="k-save" type="button" class="btn btn-primary">Save contract</button>
      <p class="acct-sub">Version strings are a legal record. The governing documents currently disagree with
        themselves about their own version numbers, so confirm before issuing.</p>
    </div>`;

  $('#k-save').addEventListener('click', async () => {
    const res = await callCrm('upsert_contract', {
      prospect_id: ID,
      agreement_version: $('#k-agr').value,
      tc_version: $('#k-tc').value,
      status: $('#k-status').value,
      esign_envelope_id: $('#k-env').value,
      signer_name: $('#k-name').value,
      signer_email: $('#k-email').value,
      schedule_a_notes: $('#k-sched').value,
    });
    if (!res.ok) { msg('error', res.error); return; }
    msg('success', ['Contract saved.', ...(res.notes ?? [])].join(' '));
    await load(); paintContracts(); paintOnboarding();
  });
}

// ── Compliance ─────────────────────────────────────────────────────
function paintCompliance() {
  panel('compliance').innerHTML = `
    <div class="adm-card alert-info">
      <h3 style="margin-top:0;">The CRM holds no W-9 or ACH file, and no numbers from either</h3>
      <p class="acct-sub">
        Both forms are collected through Zoho Sign and delivered straight to the secured folder on the
        VPN-protected server. This screen records only that it happened. There is no upload here, and no field
        that will accept a taxpayer identification number, an account number, or a routing number.
      </p>
      <p class="acct-sub">
        If a form arrives by email anyway, move it to the secured folder, set the status here, and delete it
        from Inbox, Sent, and Deleted Items the same day.
      </p>
    </div>

    <div class="adm-card">
      <h3>Forms</h3>
      <table class="adm-table">
        <thead><tr><th>Form</th><th>Status</th><th>Tax year</th><th>Verified</th><th>Location ref</th></tr></thead>
        <tbody>${(D.compliance_forms ?? []).map((f) => `
          <tr>
            <td>${f.form_type === 'w9' ? 'W-9' : 'ACH authorization'}</td>
            <td>${esc(titleise(f.status))}</td>
            <td>${f.tax_year ?? '—'}</td>
            <td>${esc(date(f.verified_at))}</td>
            <td class="acct-sub">${esc(f.storage_location_ref ?? '—')}</td>
          </tr>`).join('') || '<tr><td colspan="5" class="acct-sub">Nothing recorded.</td></tr>'}
      </tbody></table>

      <h4>Set status</h4>
      <div class="adm-grid-2">
        <label class="field"><span>Form</span><select id="w-type">
          <option value="w9">W-9</option><option value="ach_authorization">ACH authorization</option></select></label>
        <label class="field"><span>Status</span><select id="w-status">
          ${FORM_STATUSES.map((s) => `<option value="${s}">${esc(titleise(s))}</option>`).join('')}</select></label>
        <label class="field"><span>Tax year</span><input id="w-year" type="number" value="${new Date().getFullYear()}" /></label>
        <label class="field"><span>TIN type (type only, never the number)</span><select id="w-tin">
          <option value="">—</option><option value="ssn">SSN</option><option value="ein">EIN</option>
          <option value="unknown">Unknown</option></select></label>
        <label class="field"><span>Zoho Sign envelope ID</span><input id="w-env" /></label>
        <label class="field"><span>Secured folder reference</span><input id="w-loc" placeholder="Folder path, not a link" /></label>
      </div>
      <label class="field"><span>Notes (no identifying numbers)</span><input id="w-notes" /></label>
      <button id="w-save" type="button" class="btn btn-primary">Save status</button>
    </div>

    <div class="adm-card">
      <h3>T&amp;C acknowledgements</h3>
      <p class="acct-sub">Append-only. A new version produces a new row, never an edit.</p>
      <table class="adm-table">
        <thead><tr><th>Version</th><th>When</th><th>Method</th></tr></thead>
        <tbody>${(D.tc_acknowledgements ?? []).map((a) => `
          <tr><td>${esc(a.tc_version)}</td><td>${esc(dateTime(a.acknowledged_at))}</td><td>${esc(titleise(a.method))}</td></tr>`).join('')
          || '<tr><td colspan="3" class="acct-sub">None recorded.</td></tr>'}
      </tbody></table>
      <div class="adm-form-row">
        <label class="field"><span>Version</span><input id="t-ver" placeholder="Leave blank to use the configured version" /></label>
        <button id="t-save" type="button" class="btn btn-ghost">Record acknowledgement</button>
      </div>
    </div>`;

  $('#w-save').addEventListener('click', async () => {
    const res = await callCrm('set_compliance_form', {
      prospect_id: ID,
      form_type: $('#w-type').value,
      status: $('#w-status').value,
      tax_year: $('#w-year').value,
      tin_type: $('#w-tin').value,
      esign_envelope_id: $('#w-env').value,
      storage_location_ref: $('#w-loc').value,
      notes: $('#w-notes').value,
    });
    if (!res.ok) { msg('error', res.error); return; }
    msg('success', ['Status saved.', ...(res.notes ?? [])].join(' '));
    await load(); paintCompliance(); paintOnboarding();
  });

  $('#t-save').addEventListener('click', async () => {
    const res = await callCrm('record_tc_ack', { prospect_id: ID, tc_version: $('#t-ver').value || null });
    if (!res.ok) { msg('error', res.error); return; }
    msg('success', 'Acknowledgement recorded.');
    await load(); paintCompliance(); paintOnboarding();
  });
}

// ── Content and assets ─────────────────────────────────────────────
function paintContent() {
  panel('content').innerHTML = `
    <div class="adm-card">
      <h3>Submissions</h3>
      <p class="acct-sub">
        One submission is one approved asset is one tracking URL and promo code. There is no partner-level code.
        Submission and review screens arrive with Phase 1d.
      </p>
      <table class="adm-table">
        <thead><tr><th>Title</th><th>Kind</th><th>Status</th><th>Submitted</th><th>SLA due</th><th>Published</th></tr></thead>
        <tbody>${(D.submissions ?? []).map((s) => `
          <tr>
            <td>${s.draft_url ? `<a href="${esc(s.draft_url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>` : esc(s.title)}</td>
            <td>${esc(titleise(s.submission_kind))}${s.counts_toward_minimum ? '' : ' <span class="adm-pill">not counted</span>'}</td>
            <td>${esc(titleise(s.status))}</td>
            <td>${esc(date(s.submitted_at))}</td>
            <td>${esc(date(s.sla_due_at))}</td>
            <td>${esc(date(s.published_at))}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="acct-sub">No submissions.</td></tr>'}
      </tbody></table>
    </div>`;
}

function paintAssets() {
  panel('assets').innerHTML = `
    <div class="adm-card">
      <h3>Tracking assets</h3>
      <p class="acct-sub">
        Codes are minted by the platform, never generated here. Deactivation is prospective only: travelers
        already attributed keep their full three-year term and keep being paid on (Agreement §3.7).
      </p>
      <table class="adm-table">
        <thead><tr><th>Code</th><th>URL</th><th>Status</th><th>Issued</th><th>First attribution</th></tr></thead>
        <tbody>${(D.tracking_assets ?? []).map((a) => `
          <tr>
            <td><code>${esc(a.tracking_code)}</code></td>
            <td><a href="${esc(a.tracking_url)}" target="_blank" rel="noopener noreferrer">${esc(a.tracking_url)}</a></td>
            <td>${esc(titleise(a.status))}</td>
            <td>${esc(date(a.issued_at))}</td>
            <td>${esc(date(a.first_attribution_at))}</td>
          </tr>`).join('') || `<tr><td colspan="5" class="acct-sub">No assets issued.
            Issuance requires the platform mint operation, which is Phase 1d.</td></tr>`}
      </tbody></table>
    </div>`;
}

function paintActivity() {
  panel('activity').innerHTML = `
    <div class="adm-card">
      <h3>Activity</h3>
      <table class="adm-table">
        <thead><tr><th>When</th><th>Entity</th><th>Action</th><th>Actor</th><th>Detail</th></tr></thead>
        <tbody>${(D.activity ?? []).map((a) => `
          <tr>
            <td>${esc(dateTime(a.occurred_at))}</td>
            <td>${esc(titleise(a.entity_type))}</td>
            <td>${esc(titleise(a.action))}</td>
            <td>${esc(a.actor_type)}</td>
            <td><code style="font-size:.75rem;">${esc(JSON.stringify(a.changed_fields ?? {}).slice(0, 200))}</code></td>
          </tr>`).join('') || '<tr><td colspan="5" class="acct-sub">Nothing logged yet.</td></tr>'}
      </tbody></table>
    </div>`;
}

// ── Boot ───────────────────────────────────────────────────────────
async function init() {
  const booted = await bootAdminPage();
  if (!booted) return;
  if (!ID) { msg('error', 'No prospect id in the URL.'); return; }
  if (!(await load())) return;

  wireTabs((name) => {
    if (name === 'channels') paintChannels();
    if (name === 'qualification') paintQualification();
    if (name === 'communications') paintCommunications();
    if (name === 'contracts') paintContracts();
    if (name === 'compliance') paintCompliance();
    if (name === 'content') paintContent();
    if (name === 'assets') paintAssets();
    if (name === 'activity') paintActivity();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
