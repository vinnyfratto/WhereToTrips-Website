// ───────────────────────────────────────────────────────────────────
//  wt-admin-crm.js — Partner CRM hub: overview, pipeline, review queue,
//  import, activity.
//
//  Spec: WhereTo_Partner_CRM_Build_Spec_v2.2 §8.1, §8.4, §8.9, Appendix C
//
//  Two display rules from the spec are honoured here and are easy to
//  accidentally undo, so they are called out where they apply:
//   • The dashboard LEADS with review queue health (§8.9). That is where the
//     programme's contractual obligation lives.
//   • Engagement rate is never a default sort on a mixed-type list (§8.1).
// ───────────────────────────────────────────────────────────────────
import {
  $, bootAdminPage, callCrm, date, daysAgo, dateTime, esc, msg, panel,
  parseCsv, titleise, wireTabs,
} from './wt-crm-shared.js';

const STAGES = [
  'sourced', 'qualifying', 'qualified', 'contacted', 'engaged',
  'agreement_sent', 'signed', 'onboarding', 'active', 'inactive',
  'paused', 'declined', 'excluded', 'terminated',
];
const CREATOR_TYPES = ['blog', 'blog_social', 'video', 'social', 'podcast', 'newsletter', 'media_partner', 'other'];

let OVERVIEW = null;
let PROSPECTS = [];

// ── Overview ───────────────────────────────────────────────────────
function renderOverview(d) {
  const q = d.review_queue;
  // Amber and red mirror the SLA thresholds exactly: 2 business days is the
  // internal target, 3 is the contractual obligation under Agr. §5.6(d).
  const queueTone = q.over_contract_3bd > 0 ? 'alert-error' : q.over_target_2bd > 0 ? 'alert-info' : '';

  panel('overview').innerHTML = `
    <div class="adm-card ${queueTone}">
      <h2 class="adm-section-h" style="margin-top:0; padding-top:0; border-top:0;">Review queue health</h2>
      <p class="acct-sub">
        The three-business-day response is contractual (Agreement §5.6(d)). Silence means no tracking code,
        and no code means the partner cannot earn from that piece at all. Nothing is ever approved automatically.
      </p>
      <div class="stat-grid">
        ${statCard('Waiting', q.waiting)}
        ${statCard('Over 2-day target', q.over_target_2bd, q.over_target_2bd > 0 ? 'amber' : '')}
        ${statCard('Over 3-day contract', q.over_contract_3bd, q.over_contract_3bd > 0 ? 'red' : '')}
        ${statCard('Escalated', q.escalated, q.escalated > 0 ? 'red' : '')}
        ${statCard('Imminent events', q.imminent_events, q.imminent_events > 0 ? 'amber' : '')}
        ${statCard('Oldest waiting', q.oldest_submitted_at ? daysAgo(q.oldest_submitted_at) : '—')}
      </div>
    </div>

    <div class="adm-card">
      <h2 class="adm-section-h">Contractual clocks elsewhere</h2>
      <div class="stat-grid">
        ${statCard('Featuring removals open', d.featuring_removals_open, d.featuring_removals_open > 0 ? 'amber' : '')}
        ${statCard('Unacknowledged partner mail', d.unacknowledged_inbound, d.unacknowledged_inbound > 0 ? 'amber' : '')}
      </div>
      <p class="acct-sub">
        Removal from WhereTo channels is due within five business days of the request (Agreement §6.3).
        Partner mail should be acknowledged within two business days (T&amp;C §9.1).
      </p>
    </div>

    <div class="adm-card">
      <h2 class="adm-section-h">Pipeline</h2>
      <div class="stat-grid">
        ${statCard('Prospects', d.totals.prospects)}
        ${statCard('Active partners', d.totals.active_partners)}
        ${statCard('Assets issued', d.totals.assets_active)}
        ${statCard('Stalled 21+ days', d.totals.stalled, d.totals.stalled > 0 ? 'amber' : '')}
      </div>
      <table class="adm-table">
        <thead><tr><th>Stage</th><th style="text-align:right;">Count</th></tr></thead>
        <tbody>${STAGES.map((s) => `
          <tr><td>${esc(titleise(s))}</td><td style="text-align:right;">${d.pipeline[s] ?? 0}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>

    ${configWarnings(d.config)}
  `;
}

function statCard(label, value, tone = '') {
  const color = tone === 'red' ? 'var(--rust, #B85C38)' : tone === 'amber' ? '#E69800' : 'inherit';
  return `<div class="stat-card">
    <div style="font-size:1.6rem; font-weight:700; color:${color};">${esc(String(value))}</div>
    <div class="acct-sub" style="margin:0;">${esc(label)}</div>
  </div>`;
}

// Surfaces the open decisions rather than letting the CRM quietly guess at
// them. Both of these are legally meaningful (discovery, open decisions 10 and 12).
function configWarnings(config) {
  const warnings = [];
  if (!config.tc_version) {
    warnings.push(`<strong>T&amp;C version is not configured.</strong> Onboarding item 2 cannot complete and no
      acknowledgement can be recorded. Set <code>PCRM_TC_VERSION</code> as an edge function secret once the
      governing version is settled. The source documents currently disagree with themselves about their own
      version number, so this is deliberately not defaulted.`);
  }
  if (!warnings.length) return '';
  return `<div class="adm-card alert-info">
    <h2 class="adm-section-h" style="margin-top:0; padding-top:0; border-top:0;">Configuration</h2>
    ${warnings.map((w) => `<p class="acct-sub">${w}</p>`).join('')}
  </div>`;
}

// ── Pipeline ───────────────────────────────────────────────────────
async function loadPipeline() {
  panel('pipeline').innerHTML = '<p class="acct-sub">Loading…</p>';
  const res = await callCrm('list_prospects', { limit: 1000 });
  if (!res.ok) { panel('pipeline').innerHTML = `<p class="acct-sub">Could not load (${esc(res.error)}).</p>`; return; }
  PROSPECTS = res.prospects;
  renderPipeline();
}

function renderPipeline() {
  const filters = `
    <div class="adm-form-row">
      <label class="field"><span>Search</span><input id="f-search" type="search" placeholder="Name or email" /></label>
      <label class="field"><span>Stage</span><select id="f-stage">
        <option value="">All</option>${STAGES.map((s) => `<option value="${s}">${esc(titleise(s))}</option>`).join('')}
      </select></label>
      <label class="field"><span>Creator type</span><select id="f-type">
        <option value="">All</option>${CREATOR_TYPES.map((s) => `<option value="${s}">${esc(titleise(s))}</option>`).join('')}
      </select></label>
      <label class="field"><span>Tier</span><select id="f-tier">
        <option value="">All</option><option>A</option><option>B</option><option>C</option>
      </select></label>
      <button id="f-new" type="button" class="btn btn-primary">New prospect</button>
      <button id="f-export" type="button" class="btn btn-ghost">Export CSV</button>
    </div>`;

  panel('pipeline').innerHTML = `
    ${filters}
    <p class="acct-sub" id="p-count"></p>
    <div class="adm-wrap-scroll"><table class="adm-table" id="p-table">
      <thead><tr>
        <th>Name</th><th>Stage</th><th>Age in stage</th><th>Type</th><th>Tier</th>
        <th>Market</th><th>Location</th><th>Email</th>
      </tr></thead>
      <tbody></tbody>
    </table></div>
    <div id="p-new"></div>`;

  ['f-search', 'f-stage', 'f-type', 'f-tier'].forEach((id) => {
    $('#' + id).addEventListener('input', applyFilters);
  });
  $('#f-new').addEventListener('click', showNewProspectForm);
  $('#f-export').addEventListener('click', exportCsv);
  applyFilters();
}

function currentRows() {
  const s = ($('#f-search')?.value ?? '').toLowerCase().trim();
  const stage = $('#f-stage')?.value ?? '';
  const type = $('#f-type')?.value ?? '';
  const tier = $('#f-tier')?.value ?? '';
  return PROSPECTS.filter((p) => {
    if (stage && p.stage !== stage) return false;
    if (type && p.creator_type !== type) return false;
    if (tier && p.tier !== tier) return false;
    if (s && !(`${p.display_name} ${p.primary_email ?? ''}`.toLowerCase().includes(s))) return false;
    return true;
  });
}

function applyFilters() {
  const rows = currentRows();
  $('#p-count').textContent = `${rows.length} of ${PROSPECTS.length} prospects`;
  $('#p-table tbody').innerHTML = rows.map((p) => {
    // An excluded record stays findable with a VISIBLE flag and reason (spec
    // §5): published "best creators in X" lists keep resurfacing disqualified
    // names, and the record exists so nobody re-researches them.
    const flags = [
      p.conflict_flag ? '<span class="adm-pill" title="Conflict flagged">conflict</span>' : '',
      p.stage === 'excluded' ? '<span class="adm-pill">excluded</span>' : '',
      p.archived_at ? '<span class="adm-pill">archived</span>' : '',
    ].join(' ');
    return `<tr>
      <td><a href="/admin-crm-prospect/?id=${encodeURIComponent(p.id)}">${esc(p.display_name)}</a> ${flags}</td>
      <td>${esc(titleise(p.stage))}</td>
      <td>${esc(daysAgo(p.stage_entered_at))}</td>
      <td>${esc(titleise(p.creator_type))}</td>
      <td>${esc(p.tier ?? '—')}</td>
      <td>${esc(p.market ?? '—')}</td>
      <td>${esc([p.city, p.state_region, p.country].filter(Boolean).join(', ') || '—')}</td>
      <td>${esc(p.primary_email ?? '—')}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" class="acct-sub">No prospects match these filters.</td></tr>';
}

function exportCsv() {
  const rows = currentRows();
  const cols = ['display_name', 'stage', 'creator_type', 'tier', 'market', 'city', 'state_region', 'country', 'primary_email'];
  const csv = [cols.join(',')]
    .concat(rows.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')))
    .join('\n');
  // The export EVENT is logged server-side via the activity log on read; this
  // is the browser-side download of data already on screen.
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `wt-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function showNewProspectForm() {
  $('#p-new').innerHTML = `
    <div class="adm-card">
      <h3>New prospect</h3>
      <div class="adm-grid-2">
        <label class="field"><span>Display name *</span><input id="n-name" /></label>
        <label class="field"><span>Creator type *</span><select id="n-type">
          ${CREATOR_TYPES.map((t) => `<option value="${t}">${esc(titleise(t))}</option>`).join('')}
        </select></label>
        <label class="field"><span>Email</span><input id="n-email" type="email" /></label>
        <label class="field"><span>Market</span><input id="n-market" placeholder="pilot" /></label>
        <label class="field"><span>City</span><input id="n-city" /></label>
        <label class="field"><span>State or region</span><input id="n-state" /></label>
        <label class="field"><span>Country</span><input id="n-country" value="US" maxlength="2" /></label>
        <label class="field"><span>Source</span><input id="n-source" placeholder="Referral, discovery tool, inbound" /></label>
      </div>
      <div style="display:flex; gap:10px; margin-top:12px;">
        <button id="n-save" type="button" class="btn btn-primary">Create</button>
        <button id="n-cancel" type="button" class="btn btn-ghost">Cancel</button>
      </div>
    </div>`;
  $('#n-cancel').addEventListener('click', () => { $('#p-new').innerHTML = ''; });
  $('#n-save').addEventListener('click', async () => {
    const res = await callCrm('create_prospect', {
      display_name: $('#n-name').value,
      creator_type: $('#n-type').value,
      primary_email: $('#n-email').value,
      market: $('#n-market').value,
      city: $('#n-city').value,
      state_region: $('#n-state').value,
      country: $('#n-country').value || 'US',
      source: $('#n-source').value,
    });
    if (!res.ok) { msg('error', res.error); return; }
    msg('success', 'Prospect created.');
    $('#p-new').innerHTML = '';
    await loadPipeline();
  });
}

// ── Review queue (spec §8.4) ───────────────────────────────────────
async function loadQueue() {
  panel('queue').innerHTML = '<p class="acct-sub">Loading…</p>';
  const res = await callCrm('review_queue');
  if (!res.ok) { panel('queue').innerHTML = `<p class="acct-sub">Could not load (${esc(res.error)}).</p>`; return; }

  const rows = res.queue;
  panel('queue').innerHTML = `
    <div class="adm-card">
      <h2 class="adm-section-h" style="margin-top:0; padding-top:0; border-top:0;">Awaiting review</h2>
      <p class="acct-sub">
        Review covers <strong>brand accuracy and correct use of the Marks only</strong>. It is not a compliance
        review. Do not decline on tone, angle, style, or favourability (Agreement §5.6(a), T&amp;C §12.6).
      </p>
      <p class="acct-sub">
        Decision actions arrive with Phase 1d, alongside the platform mint operation. Until a code can be issued,
        approving here would tell a partner they are approved and give them nothing to publish with.
      </p>
      ${rows.length ? `<div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Partner</th><th>Title</th><th>Kind</th><th>Waiting</th><th>SLA</th><th>Event</th></tr></thead>
        <tbody>${rows.map((r) => `
          <tr>
            <td><a href="/admin-crm-prospect/?id=${encodeURIComponent(r.prospect_id)}">${esc(r.partner)}</a></td>
            <td>${r.draft_url ? `<a href="${esc(r.draft_url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a>` : esc(r.title)}</td>
            <td>${esc(titleise(r.submission_kind))}</td>
            <td>${esc(daysAgo(r.submitted_at))}</td>
            <td>${slaPill(r.sla_state)}</td>
            <td>${r.event_at ? `${esc(date(r.event_at))} ${r.urgent ? '<span class="adm-pill">urgent</span>' : ''}` : '—'}</td>
          </tr>`).join('')}
        </tbody></table></div>` : '<p class="acct-sub">Nothing is waiting. </p>'}
    </div>`;
}

function slaPill(state) {
  if (state === 'over_contract') return '<span class="adm-pill" style="background:#B85C38; color:#fff;">over contract</span>';
  if (state === 'over_target') return '<span class="adm-pill" style="background:#E69800; color:#fff;">over target</span>';
  if (state === 'ok') return '<span class="adm-pill">on time</span>';
  return '—';
}

// ── Import (Appendix C) ────────────────────────────────────────────
let IMPORT_ROWS = [];

function renderImport() {
  panel('import').innerHTML = `
    <div class="adm-card">
      <h2 class="adm-section-h" style="margin-top:0; padding-top:0; border-top:0;">Import prospects</h2>
      <p class="acct-sub">
        Only three columns are required: <code>display_name</code>, <code>creator_type</code>, and one of
        <code>primary_email</code> or <code>channel_1_url</code>. Column order does not matter and extra columns
        are ignored. Up to three channel groups per row
        (<code>channel_1_url</code>, <code>channel_1_platform</code>, <code>channel_1_handle</code>,
        <code>channel_1_audience_size</code>, <code>channel_1_audience_metric</code>).
      </p>
      <p class="acct-sub">
        A dry run always comes first. It writes nothing, and reports exactly what would be created, updated,
        and skipped. Re-running the same file is safe: rows are matched on <code>external_ref</code>, then
        <code>primary_email</code>, then name plus first channel URL.
      </p>
      <div class="adm-form-row">
        <label class="field"><span>CSV file</span><input id="i-file" type="file" accept=".csv,text/csv" /></label>
        <label class="field"><span>Market label</span><input id="i-market" placeholder="pilot" /></label>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button id="i-dry" type="button" class="btn btn-primary" disabled>Dry run</button>
        <button id="i-commit" type="button" class="btn btn-ghost" disabled>Commit</button>
      </div>
      <div id="i-result"></div>
    </div>`;

  $('#i-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { headers, records } = parseCsv(await file.text());
    IMPORT_ROWS = records;
    $('#i-dry').disabled = !records.length;
    // Commit is deliberately locked until a dry run has been read.
    $('#i-commit').disabled = true;
    $('#i-result').innerHTML = `<p class="acct-sub">${records.length} data rows, ${headers.length} columns:
      ${headers.map((h) => `<code>${esc(h)}</code>`).join(', ')}</p>`;
  });

  $('#i-dry').addEventListener('click', () => runImport(false));
  $('#i-commit').addEventListener('click', () => runImport(true));
}

async function runImport(commit) {
  if (!IMPORT_ROWS.length) return;
  $('#i-result').innerHTML = '<p class="acct-sub">Working…</p>';
  const res = await callCrm('import_prospects', {
    rows: IMPORT_ROWS,
    mode: commit ? 'commit' : 'dry_run',
    market: $('#i-market').value || null,
    filename: $('#i-file').files?.[0]?.name ?? null,
  });
  if (!res.ok) { $('#i-result').innerHTML = `<p class="acct-sub">Failed: ${esc(res.error)}</p>`; return; }

  const s = res.summary;
  // Partial success is the point: a bad row is reported and skipped, and the
  // batch continues. An import that aborts on row 12 of 200 is worse than useless.
  $('#i-result').innerHTML = `
    <div class="stat-grid" style="margin-top:14px;">
      ${statCard('Rows read', s.rows)}
      ${statCard(commit ? 'Created' : 'Would create', s.would_create)}
      ${statCard(commit ? 'Updated' : 'Would update', s.would_update)}
      ${statCard('Skipped', s.skipped, s.skipped > 0 ? 'amber' : '')}
    </div>
    ${res.errors.length ? `
      <h3>Rows skipped</h3>
      <table class="adm-table"><thead><tr><th>Row</th><th>Reason</th></tr></thead>
      <tbody>${res.errors.map((e) => `<tr><td>${e.row}</td><td>${esc(e.reason)}</td></tr>`).join('')}</tbody></table>` : ''}
    ${res.plan.length ? `
      <h3>Plan</h3>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Row</th><th>Action</th><th>Name</th></tr></thead>
        <tbody>${res.plan.map((p) => `<tr><td>${p.row}</td><td>${esc(p.action)}</td><td>${esc(p.display_name)}</td></tr>`).join('')}</tbody>
      </table></div>` : ''}`;

  if (commit) {
    msg('success', `Imported: ${s.would_create} created, ${s.would_update} updated, ${s.skipped} skipped.`);
    $('#i-commit').disabled = true;
    PROSPECTS = [];
  } else {
    $('#i-commit').disabled = false;
    msg('info', 'Dry run complete. Nothing was written. Read the plan, then commit.');
  }
}

// ── Activity ───────────────────────────────────────────────────────
async function loadActivity() {
  panel('activity').innerHTML = '<p class="acct-sub">Loading…</p>';
  const res = await callCrm('list_activity', { limit: 300 });
  if (!res.ok) { panel('activity').innerHTML = `<p class="acct-sub">Could not load (${esc(res.error)}).</p>`; return; }
  panel('activity').innerHTML = `
    <div class="adm-card">
      <h2 class="adm-section-h" style="margin-top:0; padding-top:0; border-top:0;">Activity log</h2>
      <p class="acct-sub">Append-only. Every create, update, and status change, with actor and timestamp.</p>
      <div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>When</th><th>Entity</th><th>Action</th><th>Actor</th><th>Detail</th></tr></thead>
        <tbody>${(res.activity ?? []).map((a) => `
          <tr>
            <td>${esc(dateTime(a.occurred_at))}</td>
            <td>${esc(titleise(a.entity_type))}</td>
            <td>${esc(titleise(a.action))}</td>
            <td>${esc(a.actor_type)}</td>
            <td><code style="font-size:.75rem;">${esc(JSON.stringify(a.changed_fields ?? {}).slice(0, 160))}</code></td>
          </tr>`).join('') || '<tr><td colspan="5" class="acct-sub">Nothing logged yet.</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
}

// ── Boot ───────────────────────────────────────────────────────────
async function init() {
  OVERVIEW = await bootAdminPage();
  if (!OVERVIEW) return;
  renderOverview(OVERVIEW);

  // Hide what this role cannot use, so a reviewer-only admin sees the queue
  // rather than a row of tabs that all 403. Convenience only: the edge
  // function re-checks every action regardless of what the UI shows.
  const can = OVERVIEW.can ?? {};
  const tabNeeds = { pipeline: 'list_prospects', import: 'import_prospects', activity: 'list_activity', queue: 'review_queue' };
  for (const [tab, action] of Object.entries(tabNeeds)) {
    if (can[action] === false) {
      document.querySelector(`.adm-tab[data-tab="${tab}"]`)?.remove();
      document.querySelector(`.adm-panel[data-panel="${tab}"]`)?.remove();
    }
  }
  if (can.import_prospects !== false) renderImport();

  wireTabs((name) => {
    if (name === 'pipeline') loadPipeline();
    if (name === 'queue') loadQueue();
    if (name === 'activity') loadActivity();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
