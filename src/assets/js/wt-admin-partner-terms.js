// ───────────────────────────────────────────────────────────────────
//  wt-admin-partner-terms.js — the "Partner terms" card on the Partner Dashboard.
//
//  Shows the terms a partner is on and lets an admin change them. Everything is
//  saved through partner-admin's update_partner_terms, which changes only what is
//  named, keeps the rest of the rate settings, and writes an audit row.
//
//  renderTerms(host, partner, { call, notify, onSaved })
// ───────────────────────────────────────────────────────────────────
import { esc, pill } from './wt-padmin-ui.js';

const SOURCES = ['Direct', 'ABC Affiliate Program', 'XYZ Affiliate Program'];
const STATUSES = ['active', 'pending', 'suspended', 'terminated'];
const STATUS_TONE = { active: 'green', pending: 'amber', suspended: 'red', terminated: '' };
const LEGACY = [['flight', 'Flight'], ['hotel', 'Hotel'], ['car', 'Car rental'], ['insurance', 'Trip insurance']];

const ERRORS = {
  invalid_vanity: 'The custom link must be 3 to 30 letters, numbers or hyphens.',
  vanity_reserved: 'That custom link is reserved. Pick another.',
  vanity_taken: 'Another partner already has that custom link.',
  bad_duration: 'Duration must be a whole number of months, 1 to 240.',
  nothing_to_update: 'Nothing was changed.',
};

function legacyText(cats) {
  if (!cats || typeof cats !== 'object') return 'Not set';
  const parts = LEGACY.map(([k, label]) => {
    const c = cats[k];
    if (!c) return null;
    const rate = Number(c.rate ?? c);
    if (!Number.isFinite(rate)) return null;
    return `${label} ${c.type === 'flat' ? '$' + rate.toFixed(2) : +(rate * 100).toFixed(2) + '%'}`;
  }).filter(Boolean);
  return parts.length ? 'Per-product rates: ' + parts.join(', ') : 'Not set';
}

export function renderTerms(host, partner, { call, notify, onSaved }) {
  const t = partner.terms || {};
  const share = t.revenue_share_percent;
  const sources = t.source && !SOURCES.includes(t.source) ? [t.source, ...SOURCES] : SOURCES;

  host.innerHTML = `
    <div class="adm-card">
      <div class="pa-card-h">
        <h3>Partner terms</h3>
        <button type="button" class="btn btn-ghost btn-xs" id="terms-edit">Edit terms</button>
      </div>
      <dl class="pa-kv" id="terms-view">
        <dt>Revenue share</dt>
        <dd>${share === null || share === undefined
          ? esc(legacyText(t.legacy_rates))
          : `${esc(+share.toFixed(2))}% of the commission WhereTo earns, for ${esc(t.duration_months)} months`}</dd>
        <dt>Status</dt><dd>${pill(partner.status, STATUS_TONE[partner.status] ?? '')}</dd>
        <dt>Custom link</dt><dd>${t.vanity_slug ? esc(t.vanity_slug) : '<span class="pa-muted">None</span>'}</dd>
        <dt>Source</dt><dd>${t.source ? esc(t.source) : '<span class="pa-muted">None</span>'}</dd>
      </dl>
      <form id="terms-form" hidden>
        <div class="pa-form-grid">
          <div class="field"><label for="tf-status">Status</label>
            <select id="tf-status">${STATUSES.map((s) => `<option value="${s}"${s === partner.status ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
          <div class="field"><label for="tf-share">Revenue share % <span class="hint">of WhereTo's commission</span></label>
            <input id="tf-share" type="number" min="0" max="100" step="0.01" value="${share === null || share === undefined ? '' : esc(+share.toFixed(2))}" placeholder="${share === null || share === undefined ? 'unchanged' : ''}" /></div>
          <div class="field"><label for="tf-months">Duration (months)</label>
            <input id="tf-months" type="number" min="1" max="240" step="1" value="${esc(t.duration_months ?? 36)}" /></div>
          <div class="field"><label for="tf-vanity">Custom link</label>
            <input id="tf-vanity" type="text" value="${esc(t.vanity_slug ?? '')}" placeholder="(none)" /></div>
          <div class="field"><label for="tf-source">Source</label>
            <select id="tf-source">${sources.map((s) => `<option value="${esc(s)}"${s === (t.source || 'Direct') ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
        </div>
        <p class="hint" style="margin:12px 0;">A new revenue share applies to bookings made after the change. Bookings already recorded keep the rate they were recorded with. Every change is logged.</p>
        <div class="pa-actions">
          <button type="submit" class="btn btn-primary btn-xs">Save changes</button>
          <button type="button" class="btn btn-ghost btn-xs" id="terms-cancel">Cancel</button>
        </div>
      </form>
    </div>`;

  const form = host.querySelector('#terms-form');
  const view = host.querySelector('#terms-view');
  const edit = host.querySelector('#terms-edit');
  const open = (on) => { form.hidden = !on; view.hidden = on; edit.hidden = on; };
  edit.addEventListener('click', () => open(true));
  host.querySelector('#terms-cancel').addEventListener('click', () => open(false));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = (id) => host.querySelector('#' + id).value.trim();
    const params = { id: partner.partner_id };
    if (val('tf-status') !== partner.status) params.status = val('tf-status');
    if (val('tf-share') !== '' && Number(val('tf-share')) !== share) params.revenue_share_percent = Number(val('tf-share'));
    if (Number(val('tf-months')) !== Number(t.duration_months ?? 36)) params.commission_duration_months = Number(val('tf-months'));
    if (val('tf-vanity') !== (t.vanity_slug ?? '')) params.vanity_slug = val('tf-vanity') || null;
    if (val('tf-source') !== (t.source || 'Direct')) params.source = val('tf-source');
    if (Object.keys(params).length === 1) { notify('info', ERRORS.nothing_to_update); open(false); return; }

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    const r = await call('update_partner_terms', params);
    btn.disabled = false;
    if (!r.ok) { notify('error', ERRORS[r.error] || 'Could not save (' + (r.error || 'error') + ').'); return; }
    notify('success', 'Terms saved.');
    if (onSaved) await onSaved();
  });
}
