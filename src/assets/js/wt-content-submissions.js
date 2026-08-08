// ───────────────────────────────────────────────────────────────────
//  wt-content-submissions.js — affiliate content-submission capture.
//  Lets an affiliate log a piece of promotional content (blog post, IG/
//  TikTok/YouTube post, etc.) they've published. Writes directly via the
//  browser Supabase client (anon key + RLS — own rows only); affiliate_id
//  is stamped server-side by a DB trigger, never trusted from the client
//  (see supabase/affiliate_content_submissions.sql).
// ───────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function date(s) { return s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }

const PLATFORM_LABEL = {
  instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube',
  facebook: 'Facebook', twitter: 'X / Twitter', blog: 'Blog / Website', other: 'Other',
};

export async function initContentSubmissions(supabase, user) {
  const form = $('content-sub-form');
  const list = $('content-sub-list');
  const alertEl = $('content-sub-alert');
  if (!form || !list) return;

  function msg(type, text) {
    if (!alertEl) return;
    alertEl.className = 'alert show alert-' + type;
    alertEl.textContent = text;
    setTimeout(() => { if (alertEl.textContent === text) alertEl.className = 'alert'; }, 4000);
  }

  function renderList(rows) {
    if (!rows.length) { list.innerHTML = '<p class="acct-sub">No content submitted yet.</p>'; return; }
    list.innerHTML = `<table class="adm-table">
      <thead><tr><th>Platform</th><th>Link</th><th>Title</th><th>Submitted</th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr>
          <td>${esc(PLATFORM_LABEL[r.platform] || r.platform)}</td>
          <td><a href="${esc(r.content_url)}" target="_blank" rel="noopener noreferrer">View</a></td>
          <td>${esc(r.title || '—')}</td>
          <td>${date(r.created_at)}</td>
        </tr>`).join('')}</tbody></table>`;
  }

  async function loadSubmissions() {
    const { data, error } = await supabase
      .from('affiliate_content_submissions')
      .select('id, platform, content_url, title, notes, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { list.innerHTML = '<p class="acct-sub">Could not load your submissions.</p>'; return; }
    renderList(data || []);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const content_url = String(fd.get('content_url') || '').trim();
    const platform = String(fd.get('platform') || 'other');
    const title = String(fd.get('title') || '').trim() || null;
    const notes = String(fd.get('notes') || '').trim() || null;
    if (!content_url) { msg('error', 'Add a link to your content first.'); return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    const { error } = await supabase.from('affiliate_content_submissions').insert({
      user_id: user.id, platform, content_url, title, notes,
    });
    if (submitBtn) submitBtn.disabled = false;

    if (error) { msg('error', 'Could not submit: ' + error.message); return; }
    msg('success', 'Content submitted — thank you!');
    form.reset();
    loadSubmissions();
  });

  loadSubmissions();
}
