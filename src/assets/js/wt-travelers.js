// ───────────────────────────────────────────────────────────────────
//  wt-travelers.js — the profile's Saved Travelers section.
//
//  Mirrors the app (Wander_App src/components/profile/PeopleView.tsx).
//  "Friends" merged into Saved Travelers: ONE list of everyone you book for.
//    • You — derived from your own profile, never stored twice.
//    • Travelers you CREATED — profiles.saved_passengers; all their details
//      are yours to see and edit (the Edit form in wt-profile.js).
//    • Travelers you INVITED — their own WhereTo account, connected to yours.
//      Name and photo only: "<Name> is stored in their account and not
//      visible here."
//  Plus the invites still in flight: waiting on you, and the ones you sent.
//
//  Every invite write goes through the traveler-invite edge function (it
//  matches a phone/email to an account, sends the push/email, and accepts).
//  The browser can only read its own rows and delete them: withdraw one you
//  sent, decline one you got, or remove a connection.
// ───────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d][\d\s\-().]{5,}$/;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const fullName = (a, b) => [a, b].filter(Boolean).join(' ').trim();
const nameKey = (a, b) => fullName(a, b).toLowerCase().replace(/\s+/g, ' ');
function initials(a, b) {
  return (((a || '').trim().charAt(0)) + ((b || '').trim().charAt(0))).toUpperCase() || '?';
}
function avatar(photo, a, b) {
  return photo
    ? '<img class="pv-avatar" src="' + esc(photo) + '" alt="" />'
    : '<span class="pv-avatar pv-avatar--initials">' + esc(initials(a, b)) + '</span>';
}
function formatPhoneKey(k) {
  const d = String(k || '').replace(/\D/g, '');
  return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : d;
}
function sentAgo(iso) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return 'sent today';
  if (days === 1) return 'sent yesterday';
  if (days < 30) return 'sent ' + days + ' days ago';
  const m = Math.round(days / 30);
  return 'sent ' + m + ' month' + (m === 1 ? '' : 's') + ' ago';
}
function documentLine(t) {
  if (!(t.document_number || '').trim()) return 'No travel document yet';
  return (t.document_type === 'identity_card' ? "Driver's License" : 'Passport') + ' on file';
}

/** The same words the app texts, so an invite reads the same from either. */
function inviteText(url, first) {
  return (first ? 'Hi ' + first + ', ' : '') +
    'I added you as a Saved Traveler on WhereTo so we can book trips together. ' +
    'Get the WhereTo app and create a free account, then tap this link to accept: ' + url;
}
function smsHref(phone, body) {
  // "?&body=" is the form both iOS and Android read.
  return 'sms:' + encodeURIComponent(phone) + '?&body=' + encodeURIComponent(body);
}

// ── Data ────────────────────────────────────────────────────────────

export function emptyPeople() {
  return { loaded: false, friends: [], incoming: [], sent: [], invite: null };
}

/** Connections plus pending invites either way. RLS returns only this
 *  account's rows — the ones it sent, and the ones addressed to it. */
export async function loadPeople(supabase, user) {
  const out = emptyPeople();
  const { data: rows } = await supabase.from('friends').select('id, friend_id, created_at').eq('user_id', user.id);
  if (rows && rows.length) {
    const { data: profs } = await supabase.from('public_profiles')
      .select('id, first_name, last_name, profile_photo').in('id', rows.map((r) => r.friend_id));
    const byId = new Map((profs || []).map((x) => [x.id, x]));
    out.friends = rows.map((r) => {
      const x = byId.get(r.friend_id) || {};
      return { id: r.id, friendId: r.friend_id, firstName: x.first_name || '', lastName: x.last_name || '', photo: x.profile_photo || '' };
    }).filter((f) => f.firstName || f.lastName);
  }
  const { data: pending } = await supabase.from('friend_requests').select('*')
    .eq('status', 'pending').order('created_at', { ascending: false });
  for (const r of pending || []) (r.sender_id === user.id ? out.sent : out.incoming).push(r);
  out.loaded = true;
  return out;
}

async function callInvite(supabase, body) {
  const cfg = window.WT_SUPABASE || {};
  const { data: sess } = await supabase.auth.getSession();
  const token = sess && sess.session && sess.session.access_token;
  const res = await fetch(cfg.url + '/functions/v1/traveler-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, apikey: cfg.anonKey },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

// ── Read view ───────────────────────────────────────────────────────

export function travelersRead(p) {
  const pp = p.__people || emptyPeople();
  const created = Array.isArray(p.saved_passengers) ? p.saved_passengers : [];
  let html = '';

  // The same person created by you and connected from their own account.
  // Which to keep is not something the site can know, so it only says so.
  const createdNames = new Set(created.map((t) => nameKey(t.given_name, t.family_name)));
  for (const f of pp.friends) {
    if (!createdNames.has(nameKey(f.firstName, f.lastName))) continue;
    const n = fullName(f.firstName, f.lastName);
    html += '<div class="tv-notice"><strong>' + esc(n) + ' is here twice.</strong> Once as a traveler you created, ' +
      'and once from ' + esc(f.firstName || n) + "'s own account. You can keep both, but it's easy to book " +
      "with the wrong one. Remove whichever you don't need.</div>";
  }

  if (pp.incoming.length) {
    html += '<h3 class="pv-sub-head">Waiting for you</h3>';
    for (const r of pp.incoming) {
      const first = (r.sender_name || '').split(' ')[0] || 'them';
      html += '<div class="tv-incoming">' +
        '<div class="tv-row">' + avatar('', r.sender_name, '') +
          '<div class="tv-body"><span class="pv-list-name">' + esc(r.sender_name) + '</span>' +
          '<span class="tv-meta">Wants to add you as a Saved Traveler</span></div>' +
          '<button type="button" class="btn btn-primary btn-xs" data-tv-accept="' + esc(r.id) + '">Accept</button>' +
          '<button type="button" class="tv-link tv-link--muted" data-tv-decline="' + esc(r.id) + '">Decline</button>' +
        '</div>' +
        '<p class="tv-note">Once you accept, you can add each other to bookings. Your travel details fill in from ' +
        'your own account and are never shown to ' + esc(first) + '.</p></div>';
    }
  }

  const total = 1 + created.length + pp.friends.length;
  html += '<h3 class="pv-sub-head">Saved Travelers (' + total + ')</h3><ul class="pv-list pv-list--people tv-list">';

  // You, always first: derived from this profile.
  html += '<li class="tv-self">' + avatar(p.profile_photo, p.first_name, p.last_name) +
    '<div class="tv-body"><span class="pv-list-name">' + esc(fullName(p.first_name, p.last_name) || 'You') + '</span>' +
    '<button type="button" class="tv-link" data-open="profile">Edit in My Profile</button></div>' +
    '<span class="tv-you">YOU</span></li>';

  // Created: their details are yours. Passport numbers stay in the editor.
  for (const t of created) {
    html += '<li>' + avatar(t.profile_photo, t.given_name, t.family_name) +
      '<div class="tv-body"><span class="pv-list-name">' + esc(fullName(t.given_name, t.family_name)) + '</span>' +
      '<span class="tv-meta">' + esc(documentLine(t)) + '</span></div>' +
      '<button type="button" class="tv-link" data-edit="travellers">Edit</button></li>';
  }

  // Invited: name and photo only, by design. Under their own heading, as in
  // the app: yours to edit above, theirs below.
  if (pp.friends.length) {
    html += '</ul><h3 class="ph-group-label tv-group-label">Invited Travelers</h3><ul class="pv-list pv-list--people tv-list">';
  }
  for (const f of pp.friends) {
    const n = fullName(f.firstName, f.lastName);
    html += '<li>' + avatar(f.photo, f.firstName, f.lastName) +
      '<div class="tv-body"><span class="pv-list-name">' + esc(n) + '</span>' +
      '<span class="tv-meta">' + esc(f.firstName || n) + ' is stored in their account and not visible here.</span></div>' +
      '<button type="button" class="tv-link tv-link--danger" data-tv-unfriend="' + esc(f.friendId) + '" data-name="' + esc(n) + '">Remove</button></li>';
  }
  html += '</ul>';

  if (!created.length && !pp.friends.length && !pp.sent.length) {
    html += '<p class="pv-empty">Create a traveler to keep their details here, or invite someone to connect with their own WhereTo account.</p>';
  }

  if (pp.sent.length) {
    html += '<h3 class="pv-sub-head">Invited</h3>';
    for (const r of pp.sent) {
      const label = r.recipient_name || r.recipient_email || formatPhoneKey(r.recipient_phone) || 'Invited traveler';
      html += '<div class="tv-sent"><div class="tv-body"><span class="pv-list-name">' + esc(label) + '</span>' +
        '<span class="tv-meta">Invited, ' + esc(sentAgo(r.created_at)) + '</span></div>' +
        '<button type="button" class="btn btn-ghost btn-xs" data-tv-resend="' + esc(r.id) + '">Resend</button>' +
        '<button type="button" class="tv-link tv-link--danger" data-tv-withdraw="' + esc(r.id) + '" data-name="' + esc(label) + '">Withdraw</button>' +
        '</div>';
    }
  }

  if (pp.invite) html += invitePanel(pp.invite);

  // The app's tray: two ways onto the one list.
  html += '<div class="tv-tray">' +
    '<button type="button" class="btn btn-primary" data-add-trav-new>Create New</button>' +
    '<button type="button" class="btn btn-primary" data-tv-invite-open>Invite</button>' +
  '</div>';
  return html;
}

/** Inline invite form. No address book on the web, so people are typed in:
 *  a phone number or email each, as many as you like, then one send. */
function invitePanel(inv) {
  const texts = inv.texts || [];
  return '<div class="tv-invite" id="tv-invite">' +
    '<h3 class="pv-sub-head">Invite travelers</h3>' +
    '<p class="tv-note">People you invite keep their details in their own WhereTo account. Once they accept, you ' +
    'can add each other to bookings. Their travel details fill in from their account and are never shown to you.</p>' +
    (texts.length
      ? '<div class="tv-texts"><p class="tv-note"><strong>These people don\'t have WhereTo yet.</strong> Send them the ' +
        'invite by text from your phone:</p>' + texts.map((t) =>
          '<a class="btn btn-ghost btn-xs" href="' + esc(smsHref(t.phone, inviteText(t.url, t.first))) + '">Text ' +
          esc(t.label) + '</a>').join('') + '</div>'
      : '') +
    '<div class="field-row">' +
      '<div class="field"><label>Name <span class="hint">(optional)</span></label><input type="text" data-tv-name /></div>' +
      '<div class="field"><label>Phone or email</label><input type="text" data-tv-contact autocomplete="off" /></div>' +
    '</div>' +
    '<button type="button" class="pv-link-btn" data-tv-add>+ Add to the list</button>' +
    (inv.list.length
      ? '<ul class="tv-chosen">' + inv.list.map((c, i) =>
          '<li>' + esc(c.name ? c.name + ' · ' : '') + esc(c.email || c.phone) +
          ' <button type="button" class="tv-link tv-link--muted" data-tv-drop="' + i + '">Remove</button></li>').join('') + '</ul>'
      : '') +
    '<div class="pv-actions">' +
      '<button type="button" class="btn btn-primary" data-tv-send' + (inv.list.length ? '' : ' disabled') + '>' +
        (inv.list.length ? 'Invite ' + inv.list.length : 'Add someone to invite') + '</button>' +
      '<button type="button" class="btn btn-ghost" data-tv-invite-close>Close</button>' +
    '</div></div>';
}

// ── Clicks ──────────────────────────────────────────────────────────

/** Handles a click inside the section. Returns true when it was ours.
 *  `repaint()` redraws the section; `alert(type, msg)` shows the banner. */
export function handleTravelersClick(e, ctx) {
  const { supabase, user, p, repaint, alert } = ctx;
  const pp = p.__people;
  if (!pp) return false;
  const t = e.target;
  const reload = async () => { p.__people = Object.assign(await loadPeople(supabase, user), { invite: pp.invite }); repaint(); };
  const hit = (sel) => t.closest(sel);
  let el;

  if ((el = hit('[data-tv-invite-open]'))) {
    pp.invite = pp.invite || { list: [], texts: [] };
    repaint();
    const box = document.getElementById('tv-invite');
    if (box) { box.scrollIntoView({ behavior: 'smooth', block: 'start' }); const f = box.querySelector('[data-tv-contact]'); if (f) f.focus(); }
    return true;
  }
  if ((el = hit('[data-tv-invite-close]'))) { pp.invite = null; repaint(); return true; }

  if ((el = hit('[data-tv-add]'))) {
    const box = el.closest('.tv-invite');
    const name = box.querySelector('[data-tv-name]').value.trim();
    const contact = box.querySelector('[data-tv-contact]').value.trim();
    const isMail = EMAIL_RE.test(contact);
    if (!isMail && !PHONE_RE.test(contact)) { alert('error', 'Enter a phone number or an email address.'); return true; }
    pp.invite.list.push({ name, email: isMail ? contact : undefined, phone: isMail ? undefined : contact });
    repaint();
    const f = document.querySelector('#tv-invite [data-tv-contact]'); if (f) f.focus();
    return true;
  }
  if ((el = hit('[data-tv-drop]'))) { pp.invite.list.splice(Number(el.dataset.tvDrop), 1); repaint(); return true; }

  if ((el = hit('[data-tv-send]'))) {
    const list = pp.invite.list.slice();
    el.disabled = true; el.textContent = 'Sending…';
    (async () => {
      const invited = [], already = [], failed = [], texts = [];
      for (const c of list) {
        const label = c.name || c.email || c.phone;
        try {
          const r = await callInvite(supabase, { action: 'send', name: c.name || undefined, email: c.email, phone: c.phone });
          if (r.already_connected) { already.push(label); continue; }
          invited.push(label);
          if (r.text_needed && c.phone && r.invite_url) texts.push({ phone: c.phone, url: r.invite_url, first: (c.name || '').split(' ')[0], label });
        } catch (err) { failed.push(label + ': ' + err.message); }
      }
      pp.invite = texts.length ? { list: [], texts } : null;
      await reload();
      const msg = [
        invited.length ? 'Invited: ' + invited.join(', ') + '.' : '',
        already.length ? 'Already in your Saved Travelers: ' + already.join(', ') + '.' : '',
        failed.join(' '),
      ].filter(Boolean).join(' ');
      alert(failed.length && !invited.length ? 'error' : 'success', msg);
    })();
    return true;
  }

  if ((el = hit('[data-tv-accept]'))) {
    el.disabled = true;
    callInvite(supabase, { action: 'accept', request_id: el.dataset.tvAccept })
      .then((r) => { alert('success', "You're connected with " + (r.sender_name || 'them') + '.'); return reload(); })
      .catch((err) => { el.disabled = false; alert('error', err.message); });
    return true;
  }
  if ((el = hit('[data-tv-decline]'))) {
    if (!window.confirm('Decline this invite?')) return true;
    supabase.from('friend_requests').delete().eq('id', el.dataset.tvDecline).then(reload);
    return true;
  }
  if ((el = hit('[data-tv-withdraw]'))) {
    if (!window.confirm('Withdraw your invite to ' + el.dataset.name + '?')) return true;
    supabase.from('friend_requests').delete().eq('id', el.dataset.tvWithdraw).eq('sender_id', user.id).then(reload);
    return true;
  }
  if ((el = hit('[data-tv-resend]'))) {
    el.disabled = true; el.textContent = 'Sending…';
    callInvite(supabase, { action: 'resend', request_id: el.dataset.tvResend })
      .then((r) => {
        if (r.text_needed && r.phone && r.invite_url) {
          pp.invite = { list: [], texts: [{ phone: r.phone, url: r.invite_url, first: '', label: formatPhoneKey(r.phone) }] };
          repaint();
        } else { el.textContent = 'Sent'; }
        alert('success', 'Invite sent again.');
      })
      .catch((err) => { el.disabled = false; el.textContent = 'Resend'; alert('error', err.message); });
    return true;
  }
  if ((el = hit('[data-tv-unfriend]'))) {
    const n = el.dataset.name;
    if (!window.confirm('Remove ' + n + "? You'll also be removed from their Saved Travelers, and neither of you will be able to add the other to a booking.")) return true;
    const other = el.dataset.tvUnfriend;
    Promise.all([
      supabase.from('friends').delete().eq('user_id', user.id).eq('friend_id', other),
      supabase.from('friends').delete().eq('user_id', other).eq('friend_id', user.id),
    ]).then(reload);
    return true;
  }
  return false;
}

/** ?invite=TOKEN on the profile: accepting from a computer, where the invite
 *  link has no app to open. Same rule as the app: opening it IS the accept. */
export async function acceptFromUrl(supabase, alert) {
  const url = new URL(window.location.href);
  const token = (url.searchParams.get('invite') || '').replace(/[^A-Za-z0-9]/g, '');
  if (!token) return false;
  url.searchParams.delete('invite');
  history.replaceState(history.state, '', url);
  try {
    const r = await callInvite(supabase, { action: 'accept', token });
    alert('success', "You're connected with " + (r.sender_name || 'them') + '. You can add each other to bookings, and your travel details stay private to you.');
  } catch (err) {
    alert('error', err.message);
  }
  return true;
}
