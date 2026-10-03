// ───────────────────────────────────────────────────────────────────
//  wt-review-queue.js — the partner content review queue, shared by the CRM
//  hub (Review Queue tab) and the Affiliate program admin (Content tab), so a
//  submission is reviewed in the same way wherever an admin looks for it.
//
//  Everything goes through the `partner-crm` edge function, which checks the
//  admin gate and the reviewer role server-side. Review covers brand
//  accuracy only: three checks, no compliance or disclosure field
//  (Agreement §5.6, T&C §12.6).
//
//  renderReviewQueue(host, { call, notify, onChange })
//    call(action, params)  -> Promise<{ ok, ... }>  the partner-crm caller
//    notify(type, text)    -> shows a message ('success' | 'error')
//    onChange()            -> optional; runs after a decision is saved
// ───────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const titleize = (s) => String(s ?? '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const date = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const daysAgo = (s) => {
  if (!s) return '—';
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  return d === 0 ? 'today' : d === 1 ? '1 day' : `${d} days`;
};
const size = (n) => !n ? '' : n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

function slaPill(state) {
  if (state === 'over_contract') return '<span class="adm-pill" style="background:#B85C38; color:#fff;">over contract</span>';
  if (state === 'over_target') return '<span class="adm-pill" style="background:#E69800; color:#fff;">over target</span>';
  if (state === 'ok') return '<span class="adm-pill">on time</span>';
  return '—';
}

/** How many submissions are waiting, or null when this admin can't see the queue. */
export async function countWaiting(call) {
  try {
    const r = await call('review_queue');
    return r && r.ok ? r.queue.length : null;
  } catch (_e) { return null; }
}

export async function renderReviewQueue(host, { call, notify, onChange }) {
  host.innerHTML = '<p class="acct-sub">Loading…</p>';
  const res = await call('review_queue');
  if (!res.ok) {
    host.innerHTML = `<p class="acct-sub">Could not load the review queue (${esc(res.error || 'error')}).</p>`;
    return;
  }
  const rows = res.queue;

  host.innerHTML = `
    <div class="adm-card">
      <h2 class="adm-section-h" style="margin-top:0; padding-top:0; border-top:0;">Awaiting review${rows.length ? ` (${rows.length})` : ''}</h2>
      <p class="acct-sub">
        Review covers <strong>brand accuracy and correct use of the Marks only</strong>. It is not a compliance
        review. Do not decline on tone, angle, style, or favorability (Agreement §5.6(a), T&amp;C §12.6).
      </p>
      <p class="acct-sub">
        Approving issues the partner a tracking link and code for that piece and emails it to them. The file is
        private: <em>Open file</em> gives you a link that expires in five minutes.
      </p>
      ${rows.length ? `<div class="adm-wrap-scroll"><table class="adm-table">
        <thead><tr><th>Partner</th><th>Title</th><th>Platform</th><th>Kind</th><th>File</th><th>Waiting</th><th>SLA</th><th>Event</th><th></th></tr></thead>
        <tbody>${rows.map((r) => `
          <tr>
            <td><a href="/admin-crm-prospect/?id=${encodeURIComponent(r.prospect_id)}">${esc(r.partner)}</a></td>
            <td>${esc(r.title)}</td>
            <td>${esc(titleize(r.intended_platform))}</td>
            <td>${esc(titleize(r.submission_kind))}</td>
            <td>${r.file ? `<button type="button" class="btn btn-ghost btn-xs" data-open-file="${esc(r.file.id)}">Open file</button>
                <span class="acct-sub" style="margin:0;">${esc(size(r.file.file_size_bytes))}</span>` : '—'}</td>
            <td>${esc(daysAgo(r.submitted_at))}</td>
            <td>${slaPill(r.sla_state)}</td>
            <td>${r.event_at ? `${esc(date(r.event_at))}${r.event_venue ? ' · ' + esc(r.event_venue) : ''} ${r.urgent ? '<span class="adm-pill">urgent</span>' : ''}` : '—'}</td>
            <td><button type="button" class="btn btn-primary btn-xs" data-decide="${esc(r.id)}">Review</button></td>
          </tr>
          <tr hidden data-decide-row="${esc(r.id)}"><td colspan="9">
            <div class="adm-form-row" style="flex-direction:column; align-items:stretch; gap:10px;">
              <div role="radiogroup" aria-label="Decision" style="display:flex; gap:18px; flex-wrap:wrap;">
                <label><input type="radio" name="d-${esc(r.id)}" value="approved" checked /> Approve</label>
                <label><input type="radio" name="d-${esc(r.id)}" value="revisions_requested" /> Ask for changes</label>
                <label><input type="radio" name="d-${esc(r.id)}" value="declined" /> Decline</label>
              </div>
              <fieldset style="border:0; padding:0; margin:0;">
                <legend class="acct-sub" style="padding:0;">Approval needs all three (brand accuracy only):</legend>
                <label style="display:block;"><input type="checkbox" data-check="check_description_accurate" /> WhereTo and what it does are described accurately</label>
                <label style="display:block;"><input type="checkbox" data-check="check_live_vs_planned" /> Anything planned is not presented as available</label>
                <label style="display:block;"><input type="checkbox" data-check="check_marks_used_correctly" /> Logo, name and Marks follow the brand guidelines</label>
              </fieldset>
              <label class="field"><span>Note to the partner <span class="hint">(required to ask for changes or decline; they see this)</span></span>
                <textarea data-instructions rows="2"></textarea></label>
              <label class="field"><span>Internal note <span class="hint">(never shown to the partner)</span></span>
                <textarea data-internal rows="2"></textarea></label>
              <div><button type="button" class="btn btn-primary" data-submit-decision="${esc(r.id)}">Save decision</button></div>
            </div>
          </td></tr>`).join('')}
        </tbody></table></div>` : '<p class="acct-sub">Nothing is waiting.</p>'}
    </div>`;

  host.querySelectorAll('[data-open-file]').forEach((b) => b.addEventListener('click', async () => {
    // Open the tab first (a popup blocker only allows it on the click itself), then point it at the link.
    const tab = window.open('', '_blank');
    const f = await call('submission_file_url', { attachment_id: b.dataset.openFile });
    if (f.ok && tab) { tab.opener = null; tab.location.href = f.url; }
    else { if (tab) tab.close(); notify('error', 'Could not open the file: ' + (f.error || 'unknown error')); }
  }));

  host.querySelectorAll('[data-decide]').forEach((b) => b.addEventListener('click', () => {
    const row = host.querySelector(`[data-decide-row="${CSS.escape(b.dataset.decide)}"]`);
    row.hidden = !row.hidden;
  }));

  host.querySelectorAll('[data-submit-decision]').forEach((b) => b.addEventListener('click', async () => {
    const id = b.dataset.submitDecision;
    const row = host.querySelector(`[data-decide-row="${CSS.escape(id)}"]`);
    const decision = row.querySelector('input[type=radio]:checked').value;
    const params = {
      submission_id: id, decision,
      revision_instructions: row.querySelector('[data-instructions]').value,
      reviewer_notes: row.querySelector('[data-internal]').value,
    };
    row.querySelectorAll('[data-check]').forEach((c) => { params[c.dataset.check] = c.checked; });
    b.disabled = true;
    const r = await call('review_submission', params);
    b.disabled = false;
    if (!r.ok) { notify('error', r.error || 'Could not save the decision'); return; }
    if (decision === 'approved' && r.asset) {
      notify('success', `Approved. Tracking link issued: ${r.asset.tracking_url}${r.emailed ? ' (emailed to the partner)' : ''}`);
    } else {
      notify('success', (decision === 'declined' ? 'Declined' : 'Changes requested') + (r.emailed ? ' and the partner was told.' : '.'));
    }
    if (onChange) onChange();
    await renderReviewQueue(host, { call, notify, onChange });
  }));
}
