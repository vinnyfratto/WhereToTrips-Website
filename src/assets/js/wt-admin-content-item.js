// ───────────────────────────────────────────────────────────────────
//  wt-admin-content-item.js — one of our own posts (/admin-content-item/?id=).
//
//  Its tracking link (copy it, change the page it opens, turn it off), what it
//  brought in (clicks, downloads, installs, sign-ups, bookings and what we
//  earned on them), day by day, and the bookings themselves. Its details
//  (title, platform, where it is posted, notes) can be edited here.
//
//  Data: partner-admin house_detail / house_update (house.ts).
// ───────────────────────────────────────────────────────────────────
import { boot, callPA, esc, fmtDate, fmtDateTime, money, notify, num, pill, $ } from './wt-padmin-core.js';
import { landingLabel, landingPickerHtml, loadPages, readLandingPicker, wireLandingPicker } from './wt-landing-picker.js';
import { PLATFORMS, platformLabel, copyButton, wireCopy } from './wt-admin-content-shared.js';

const id = new URLSearchParams(location.search).get('id') || '';
let pageList = [];
let d = null;

const STATUS = { booked: 'Booked', pending: 'Booked', approved: 'Booked', paid: 'Booked', reversed: 'Canceled', rejected: 'Canceled' };

function statsHtml(t) {
  const tile = (label, value, sub) => `<div class="oc-stat"><span class="oc-stat-l">${esc(label)}</span><span class="oc-stat-n">${value}</span>${sub ? `<span class="oc-stat-s">${esc(sub)}</span>` : ''}</div>`;
  return `<div class="oc-stats">
    ${tile('Clicks', num(t.clicks), 'Visits through the link')}
    ${tile('Downloads', num(t.downloads), 'App store visits from it')}
    ${tile('Installs', num(t.installs), 'App installs credited')}
    ${tile('Sign-ups', num(t.sign_ups), 'New accounts')}
    ${tile('Bookings', num(t.bookings), 'Flights and hotels')}
    ${tile('Our revenue', money(t.revenue), 'What we earn on them')}
  </div>`;
}

function dailyHtml(days) {
  const active = days.filter((x) => x.clicks || x.downloads || x.installs || x.sign_ups || x.bookings);
  if (!active.length) return '<p class="acct-sub" style="margin:0;">Nothing has come through this link yet.</p>';
  const max = Math.max(1, ...days.map((x) => x.clicks));
  // Newest first; only days something happened, so a quiet month is not 30 rows of zeros.
  return `<div class="pa-table-wrap"><table class="pa-table oc-daily">
    <thead><tr><th>Day</th><th class="oc-bar-h">Clicks</th><th class="num">Downloads</th><th class="num">Installs</th><th class="num">Sign-ups</th><th class="num">Bookings</th></tr></thead>
    <tbody>${active.slice().reverse().map((x) => `<tr>
      <td class="nowrap">${esc(fmtDate(x.day + 'T12:00:00'))}</td>
      <td><span class="oc-bar" style="width:${Math.max(2, Math.round((x.clicks / max) * 100))}%"></span><span class="oc-bar-n">${num(x.clicks)}</span></td>
      <td class="num">${num(x.downloads)}</td><td class="num">${num(x.installs)}</td><td class="num">${num(x.sign_ups)}</td><td class="num">${num(x.bookings)}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

function bookingsHtml(list) {
  if (!list.length) return '<p class="acct-sub" style="margin:0;">No bookings yet.</p>';
  return `<div class="pa-table-wrap"><table class="pa-table">
    <thead><tr><th>Booked</th><th>Type</th><th>Booking</th><th>Travel dates</th><th>Status</th><th class="num">Our revenue</th></tr></thead>
    <tbody>${list.map((b) => `<tr>
      <td class="nowrap">${esc(fmtDate(b.created_at))}</td>
      <td>${esc(b.kind === 'flight' ? 'Flight' : 'Hotel')}</td>
      <td>${esc(b.title || b.reference || '')}</td>
      <td class="nowrap">${b.starts_on ? esc(fmtDate(b.starts_on + 'T12:00:00')) + (b.ends_on ? ' – ' + esc(fmtDate(b.ends_on + 'T12:00:00')) : '') : '—'}</td>
      <td>${esc(STATUS[b.status] || b.status)}</td>
      <td class="num">${money(b.revenue)}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

function render() {
  const it = d.item;
  const on = it.status === 'active';
  $('#oc-item').innerHTML = `
    <div class="dash-head oc-head">
      <div>
        <p class="eyebrow">Our Content · ${esc(platformLabel(it.platform))}</p>
        <h1>${esc(it.title)}</h1>
        <p class="pa-lede">Created ${esc(fmtDate(it.created_at))}${it.created_by ? ' by ' + esc(it.created_by) : ''}${on ? '' : ' · ' + pill('Turned off')}</p>
      </div>
    </div>

    ${statsHtml(d.totals)}

    <div class="oc-two">
      <section class="adm-card oc-card">
        <div class="pa-card-h"><h3>Tracking link</h3>
          <button type="button" class="btn btn-ghost btn-xs" id="oc-toggle">${on ? 'Turn off' : 'Turn back on'}</button></div>
        <p class="oc-made-link"><code>${esc(it.tracking_url)}</code> ${copyButton(it.tracking_url, 'Copy link')}</p>
        ${on ? '' : '<p class="alert show alert-error" style="margin:0 0 12px;">This link is off. Visits through it still reach WhereTo but are no longer counted here.</p>'}
        <div id="oc-landing-box">
          ${landingPickerHtml('oc-landing', { label: 'Link opens', hint: 'the link itself never changes; a new page applies from the next click on' })}
          <button type="button" class="btn btn-primary btn-xs" id="oc-landing-save">Save page</button>
        </div>
        <dl class="pa-kv oc-kv">
          <dt>Code</dt><dd><code>${esc(it.tracking_code)}</code></dd>
          <dt>First click</dt><dd>${d.totals.first_click_at ? esc(fmtDateTime(d.totals.first_click_at)) : '—'}</dd>
          <dt>Latest click</dt><dd>${d.totals.last_click_at ? esc(fmtDateTime(d.totals.last_click_at)) : '—'}</dd>
        </dl>
      </section>

      <section class="adm-card oc-card">
        <div class="pa-card-h"><h3>Details</h3><button type="button" class="btn btn-ghost btn-xs" id="oc-edit">Edit</button></div>
        <div id="oc-details">
          <dl class="pa-kv oc-kv">
            <dt>Title</dt><dd>${esc(it.title)}</dd>
            <dt>Platform</dt><dd>${esc(platformLabel(it.platform))}</dd>
            <dt>Posted at</dt><dd>${it.post_url ? `<a class="pa-link" href="${esc(it.post_url)}" target="_blank" rel="noopener noreferrer">${esc(it.post_url)}</a>` : '<span class="pa-muted">Not added yet</span>'}</dd>
            <dt>Notes</dt><dd class="oc-notes">${it.notes ? esc(it.notes) : '<span class="pa-muted">None</span>'}</dd>
          </dl>
        </div>
      </section>
    </div>

    <section class="adm-card oc-card">
      <div class="pa-card-h"><h3>Day by day</h3><span class="pa-muted pa-small">Last ${d.days} days, Central time, days with activity only</span></div>
      ${dailyHtml(d.daily)}
    </section>

    <section class="adm-card oc-card">
      <div class="pa-card-h"><h3>Bookings</h3></div>
      ${bookingsHtml(d.bookings)}
    </section>`;

  wireCopy($('#oc-item'));
  wireLandingPicker($('#oc-landing-box'), it.landing_path || null);
  $('#oc-landing-save').addEventListener('click', saveLanding);
  $('#oc-toggle').addEventListener('click', toggle);
  $('#oc-edit').addEventListener('click', editDetails);
}

async function update(fields) {
  const r = await callPA('house_update', { id, ...fields });
  if (!r.ok) { notify('error', r.error === 'bad_post_url' ? 'The post address must start with https://.' : (r.error || 'Could not save.')); return false; }
  return true;
}

async function saveLanding() {
  const picked = await readLandingPicker($('#oc-landing-box'));
  if (!picked.ok) { notify('error', picked.error); return; }
  if ((picked.path || null) === (d.item.landing_path || null)) { notify('success', 'That is already the page this link opens.'); return; }
  const btn = $('#oc-landing-save');
  btn.disabled = true;
  const ok = await update({ landing_path: picked.path });
  btn.disabled = false;
  if (!ok) return;
  d.item.landing_path = picked.path;
  notify('success', `Saved. The link now opens ${picked.path ? landingLabel(picked.path, pageList) + ' (' + picked.path + ')' : 'the default page (sign-up on a computer, Get the App on a phone)'}.`);
}

async function toggle() {
  const on = d.item.status === 'active';
  if (on && !confirm('Turn this link off? Visits through it will no longer be counted. You can turn it back on later.')) return;
  if (await update({ status: on ? 'deactivated' : 'active' })) { notify('success', on ? 'Link turned off.' : 'Link is live again.'); await load(); }
}

function editDetails() {
  const it = d.item;
  $('#oc-details').innerHTML = `
    <label class="field"><span>Title</span><input type="text" id="oc-e-title" maxlength="160" value="${esc(it.title)}" /></label>
    <label class="field"><span>Platform</span><select id="oc-e-platform">${PLATFORMS.map(([v, l]) => `<option value="${v}"${v === it.platform ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <label class="field"><span>Where it is posted <span class="hint">(optional)</span></span><input type="url" id="oc-e-post" maxlength="500" value="${esc(it.post_url || '')}" placeholder="https://" /></label>
    <label class="field"><span>Notes <span class="hint">(optional)</span></span><textarea id="oc-e-notes" rows="3" maxlength="2000">${esc(it.notes || '')}</textarea></label>
    <div class="pa-actions"><button type="button" class="btn btn-primary btn-xs" id="oc-e-save">Save</button> <button type="button" class="btn btn-ghost btn-xs" id="oc-e-cancel">Cancel</button></div>`;
  $('#oc-e-cancel').addEventListener('click', render);
  $('#oc-e-save').addEventListener('click', async () => {
    const title = $('#oc-e-title').value.trim();
    if (!title) { notify('error', 'Give it a title.'); return; }
    const ok = await update({ title, platform: $('#oc-e-platform').value, post_url: $('#oc-e-post').value.trim(), notes: $('#oc-e-notes').value.trim() });
    if (ok) { notify('success', 'Saved.'); await load(); }
  });
}

async function load() {
  const r = await callPA('house_detail', { id });
  if (!r.ok) {
    $('#oc-item').innerHTML = `<p class="acct-sub">${r.error === 'not_found' ? 'There is no post with this link. It may have been opened from an old address.' : 'Could not load this post (' + esc(r.error || 'error') + ').'}</p>`;
    return;
  }
  d = r;
  document.title = `${r.item.title} — Our Content — WhereTo`;
  render();
}

boot(async () => {
  if (!id) { $('#oc-item').innerHTML = '<p class="acct-sub">No post was chosen. <a class="pa-link" href="/admin-content/">Back to Our Content</a></p>'; return; }
  pageList = await loadPages();
  await load();
});
