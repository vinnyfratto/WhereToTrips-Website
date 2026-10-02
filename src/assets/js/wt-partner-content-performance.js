// ───────────────────────────────────────────────────────────────────
//  wt-partner-content-performance.js — /partner-dashboard/content-performance/
//  One row per approved asset. Sorting and filtering happen on the server;
//  the totals row covers the filtered rows.
// ───────────────────────────────────────────────────────────────────
import { portal, portalGate } from './wt-partner-shared.js';
import { esc, int, fmtDate, monthLabel, renderHead, options, previewTile } from './wt-portal-ui.js';

const $ = (id) => document.getElementById(id);
const COLS = [
  { k: 'date', label: 'Date requested' }, { k: 'name', label: 'Content', text: true },
  { k: 'channel', label: 'Channel', text: true }, { k: 'url', label: 'Tracking URL', text: true },
  { k: 'clicks', label: 'Clicks', right: true }, { k: 'downloads', label: 'Downloads', right: true },
  { k: 'new_accounts', label: 'New Accounts', right: true },
];
const state = { sort: 'date', dir: 'desc', month: '', channel: '' };
let optionsLoaded = false, seq = 0;

async function load() {
  const mine = ++seq;
  const j = await portal('content', { sort: state.sort, dir: state.dir, month: state.month, channel: state.channel });
  if (mine !== seq) return;
  if (!portalGate(j)) return;
  draw(j);
}

function draw(j) {
  renderHead($('head'), COLS, state, load, '<th scope="col" class="plain">Preview</th>');

  if (!optionsLoaded) {
    $('f-month').innerHTML = options(j.filter_options.months.map((m) => [m, monthLabel(m)]), 'All dates');
    $('f-channel').innerHTML = options(j.filter_options.channels, 'All channels');
    optionsLoaded = true;
  }
  $('f-month').value = state.month;
  $('f-channel').value = state.channel;

  const none = !j.rows.length;
  const filtering = state.month || state.channel;
  $('rows').innerHTML = none
    ? `<tr><td colspan="8" class="pp-empty-row">${filtering
        ? 'No content matches these filters.'
        : 'Nothing here yet. Once a piece is approved it shows up here with its tracking link. <a href="/partner-dashboard/content/">Submit content</a>'}</td></tr>`
    : j.rows.map((r) => `<tr>
        <td class="pp-num nw">${esc(fmtDate(r.date_requested))}</td>
        <td class="nm">${esc(r.name)}</td>
        <td>${esc(r.channel)}</td>
        <td><a href="${esc(r.tracking_url)}" rel="noopener">${esc(String(r.tracking_url).replace(/^https?:\/\//, ''))}</a></td>
        <td class="r pp-num">${int(r.clicks)}</td>
        <td class="r pp-num">${int(r.downloads)}</td>
        <td class="r pp-num">${int(r.new_accounts)}</td>
        <td>${previewTile(r.channel, r.preview && r.preview.image_url)}</td></tr>`).join('');

  const t = j.totals;
  $('foot').innerHTML = `<td colspan="4">Total</td><td class="r pp-num">${int(t.clicks)}</td><td class="r pp-num">${int(t.downloads)}</td><td class="r pp-num">${int(t.new_accounts)}</td><td></td>`;
}

$('f-month').addEventListener('change', (e) => { state.month = e.target.value; load(); });
$('f-channel').addEventListener('change', (e) => { state.channel = e.target.value; load(); });
$('clear').addEventListener('click', () => { state.month = ''; state.channel = ''; load(); });

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
else load();
