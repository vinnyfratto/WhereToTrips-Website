// ───────────────────────────────────────────────────────────────────
//  wt-admin-data-settings.js — the "Data settings" card on the admin home.
//
//  Two things steer what the summary figures call live:
//    - the launch day of each store (Android, iOS). Live figures count from the
//      first one. A store with no day has not launched and counts nothing.
//    - the accounts and partners to leave out: team members, beta testers, store
//      reviewers and test labs, plus partners that exist only for testing. The demo
//      travelers are always left out.
//  Nothing is deleted. Take a line off the list and that account counts again. The
//  server checks every value, saves only what changed, and logs who changed it.
//
//  renderDataSettings(host, { onSaved })
// ───────────────────────────────────────────────────────────────────
import { callPA, esc, fmtDate, notify, num } from './wt-padmin-core.js';

const plural = (n, one, many = one + 's') => `${num(n)} ${n === 1 ? one : many}`;

function statusLine(s) {
  if (!s.live_since) return 'No launch day set, so nothing counts as live yet';
  const left = s.counts.ignored_users + s.counts.test_partners;
  return `Live since ${fmtDate(s.live_since)}` + (left ? ` · ${plural(s.counts.ignored_users, 'account')} and ${plural(s.counts.test_partners, 'partner')} left out` : '');
}

function leftOutLine(s) {
  const c = s.counts;
  const listed = c.ignored_users - c.demo_users;
  const bits = [plural(c.demo_users, 'demo traveler'), plural(Math.max(listed, 0), 'listed account'), plural(c.test_partners, 'test partner')];
  return `Left out of live figures right now: ${bits.join(', ')}.`;
}

export async function renderDataSettings(host, { onSaved }) {
  host.innerHTML = `
    <div class="adm-card pa-settings">
      <details>
        <summary><span class="pa-settings-t">Data settings</span><span class="pa-settings-s" id="ds-status">Loading…</span></summary>
        <div id="ds-body" class="pa-settings-body"></div>
      </details>
    </div>`;
  const $status = host.querySelector('#ds-status');
  const $body = host.querySelector('#ds-body');

  async function load() {
    const s = await callPA('data_settings_get');
    if (!s.ok) {
      $status.textContent = 'Could not load (' + (s.error || 'error') + ')';
      $body.innerHTML = '';
      return;
    }
    $status.textContent = statusLine(s);
    draw(s);
  }

  function draw(s) {
    const unmatched = s.unmatched_emails || [];
    $body.innerHTML = `
      <form id="ds-form" novalidate>
        <h4 class="pa-settings-h">Launch days</h4>
        <div class="pa-form-grid">
          <div class="field"><label for="ds-android">Android</label>
            <input id="ds-android" type="date" value="${esc(s.launch.android || '')}" /></div>
          <div class="field"><label for="ds-ios">iOS</label>
            <input id="ds-ios" type="date" value="${esc(s.launch.ios || '')}" /></div>
        </div>
        <p class="hint pa-settings-p">The first day each store listing was open to the public, in Central time. Leave iOS empty until the App Store approves it. Live figures start on the earliest of these days, and installs are counted for each store from its own day.</p>

        <h4 class="pa-settings-h">Accounts to leave out</h4>
        <div class="field">
          <label for="ds-entries" class="visually-hidden">Accounts to leave out</label>
          <textarea id="ds-entries" rows="5" spellcheck="false" autocapitalize="off" autocomplete="off"
            placeholder="friend@example.com&#10;@cloudtestlabaccounts.com">${esc(s.entries)}</textarea>
        </div>
        <p class="hint pa-settings-p">One per line: an email address, or a whole domain with an @ in front. Use it for your team, friends and family testers, and the accounts App Review and Google use. ${esc(leftOutLine(s))}</p>
        ${unmatched.length ? `<p class="hint pa-settings-p">No account yet for: ${esc(unmatched.join(', '))}. That is fine for an account that has not signed up.</p>` : ''}

        <h4 class="pa-settings-h">Test partners</h4>
        <div class="field">
          <label for="ds-partners" class="visually-hidden">Test partners</label>
          <input id="ds-partners" type="text" value="${esc(s.partners)}" placeholder="P-1001, P-1002" autocomplete="off" spellcheck="false" />
        </div>
        <p class="hint pa-settings-p">Partners that exist only for testing, by Partner ID. They do not count as partners and nothing they did is counted.${
          s.listed_partners.length ? ' Now: ' + esc(s.listed_partners.map((p) => `${p.partner_id}${p.name ? ' ' + p.name : ''}`).join(', ')) + '.' : ''}</p>

        <p class="hint pa-settings-p">Nothing is deleted. Take a line off the list and that account counts again. Every change is logged.</p>
        <div class="pa-actions">
          <button type="submit" class="btn btn-primary btn-xs" id="ds-save">Save settings</button>
          <button type="button" class="btn btn-ghost btn-xs" id="ds-reset">Undo changes</button>
        </div>
      </form>`;

    $body.querySelector('#ds-reset').addEventListener('click', () => draw(s));
    $body.querySelector('#ds-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = (id) => $body.querySelector('#' + id).value;
      const btn = $body.querySelector('#ds-save');
      btn.disabled = true;
      const r = await callPA('data_settings_set', {
        launch: { android: val('ds-android'), ios: val('ds-ios') },
        entries: val('ds-entries'),
        partners: val('ds-partners'),
      });
      btn.disabled = false;
      if (!r.ok) { notify('error', r.message || 'Could not save (' + (r.error || 'error') + ').'); return; }
      notify('success', 'Saved. The figures above now use these settings.');
      $status.textContent = statusLine(r);
      draw(r);
      if (onSaved) await onSaved();
    });
  }

  await load();
}
