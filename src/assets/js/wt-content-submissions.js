// ───────────────────────────────────────────────────────────────────
//  wt-content-submissions.js — affiliate content-submission capture.
//  Lets an affiliate log a piece of promotional content (blog post, IG/
//  TikTok/YouTube post, etc.) they've published.
//
//  Reads come straight from the browser Supabase client (anon key + RLS —
//  own rows only). Writes go through the `submit-content` edge function
//  instead of a direct insert, because a browser insert can't send mail:
//  the function writes the row AND fires the admin notification plus the
//  partner's receipt in one call (see supabase/functions/submit-content).
//  affiliate_id is still stamped server-side by a DB trigger, never
//  trusted from the client (see supabase/affiliate_content_submissions.sql).
// ───────────────────────────────────────────────────────────────────
const cfg = window.WT_SUPABASE || {};
const FN = cfg.url + '/functions/v1/';

const $ = (id) => document.getElementById(id);

const SUBMIT_ERRORS = {
  not_a_partner:    'This account is not a partner account.',
  invalid_url:      'That link does not look right — it should start with http:// or https://.',
  missing_url:      'Add a link to your content first.',
  invalid_platform: 'Pick a platform from the list.',
  unauthorized:     'Your session expired. Please log in again.',
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function date(s) { return s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }

const STATUS_LABEL = {
  pending: 'In review', approved: 'Approved', rejected: 'Not approved',
};

const PLATFORM_LABEL = {
  instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube',
  facebook: 'Facebook', twitter: 'X / Twitter', blog: 'Blog / Website', other: 'Other',
};

// `partner` carries the affiliate identity from requirePartner's stats: a
// share link is /promo/<partner>/<content-code>, so the list can't build
// one without knowing which partner it is looking at.
export async function initContentSubmissions(supabase, partner) {
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

  function empty() { list.innerHTML = '<p class="acct-sub">No recent submissions.</p>'; }

  // The Share link column is the reason this table exists now. A pending
  // row says so rather than showing a blank cell, because "nothing there
  // yet" and "something is broken" look identical otherwise.
  // The partner segment is their chosen slug if they set one, otherwise
  // their code. Neither is shown to them anywhere else any more — the link
  // is the only place it surfaces.
  const seg = (partner && (partner.vanity_slug || partner.code)) || null;

  function shareCell(r) {
    if (r.status === 'approved' && r.content_code && seg) {
      const url = location.origin + '/promo/' + seg + '/' + r.content_code;
      return `<a href="#" data-copy-link="${esc(url)}" title="Click to copy">${esc(url)}</a>`;
    }
    if (r.status === 'rejected') return '<span class="acct-sub">Not approved</span>';
    return '<span class="acct-sub">Pending review</span>';
  }

  function renderList(rows) {
    if (!rows.length) { empty(); return; }
    list.innerHTML = `<table class="adm-table">
      <thead><tr><th>Platform</th><th>Link</th><th>Title</th><th>Status</th><th>Share link</th><th>Submitted</th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr>
          <td>${esc(PLATFORM_LABEL[r.platform] || r.platform)}</td>
          <td><a href="${esc(r.content_url)}" target="_blank" rel="noopener noreferrer">View</a></td>
          <td>${esc(r.title || '—')}</td>
          <td>${esc(STATUS_LABEL[r.status] || 'In review')}</td>
          <td>${shareCell(r)}</td>
          <td>${date(r.created_at)}</td>
        </tr>`).join('')}</tbody></table>`;

    list.querySelectorAll('[data-copy-link]').forEach((el) => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        try {
          await navigator.clipboard.writeText(el.getAttribute('data-copy-link'));
          const old = el.textContent;
          el.textContent = 'Copied!';
          setTimeout(() => { el.textContent = old; }, 1200);
        } catch (_e) { /* clipboard blocked — the link is still readable */ }
      });
    });
  }

  async function loadSubmissions() {
    const { data, error } = await supabase
      .from('affiliate_content_submissions')
      .select('id, platform, content_url, title, notes, status, content_code, review_note, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    // A read failure reads the same as an empty list on purpose: a partner
    // with nothing submitted yet was being shown an error, which looked
    // like the portal was broken. The real reason still goes to the console.
    if (error) { console.error('[content-submissions] load failed:', error.message); empty(); return; }
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

    let r;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(FN + 'submit-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.anonKey,
          Authorization: 'Bearer ' + (sess.session?.access_token || cfg.anonKey),
        },
        body: JSON.stringify({ platform, content_url, title, notes }),
      });
      r = await res.json();
    } catch (_e) {
      r = { ok: false, error: 'network' };
    }
    if (submitBtn) submitBtn.disabled = false;

    if (!r || !r.ok) {
      msg('error', SUBMIT_ERRORS[r?.error] || 'Could not submit your content — please try again.');
      return;
    }
    msg('success', 'Content submitted — thank you!');
    form.reset();
    loadSubmissions();
  });

  loadSubmissions();
}
