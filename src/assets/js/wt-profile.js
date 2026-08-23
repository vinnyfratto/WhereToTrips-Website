// ───────────────────────────────────────────────────────────────────
//  wt-profile.js — the account area's profile editor.
//
//  Shape: a left rail that switches which group of sections is showing,
//  and a panel of sections that READ first and turn into a form one
//  section at a time. Nothing is edited until you ask to edit it, and a
//  save only writes the columns that section owns.
//
//  Used by both /account/profile/ (wt-auth.js) and
//  /partner-dashboard/settings/ (wt-partner-settings.js) so there is ONE
//  editor and ONE client. The partner page passes rail:false — it has its
//  own portal nav — and gets every section stacked instead.
//
//  Column parity with the app (src/store/authStore.ts updateProfile):
//    first_name last_name middle_name profile_photo phone marketing_opt_in
//    date_of_birth gender address travel_document emergency_contact
//    known_traveller_number redress_number loyalty_programs base_vibes
//    flight_prefs saved_passengers
//  Text values are trimmed to null rather than '' so "cleared" and "never
//  filled in" are the same state in the database — the same rule the app's
//  updateProfile applies.
// ───────────────────────────────────────────────────────────────────

import { maybeOptOutInternal } from './wt-internal-accounts.js';
import {
  COUNTRIES, COUNTRY_NAME, GENDERS, TITLES, DOC_TYPES, SEAT_CLASSES, STOP_PREFS,
  BUDGET_FLEX, HOTEL_LOYALTY, BASE_VIBES, BASE_VIBE_CAP,
} from './wt-profile-data.js';
import { AIRLINE_NAMES } from './wt-airlines.js';

// ── Small helpers ───────────────────────────────────────────────────

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function ico(name) {
  const el = document.querySelector('#wt-icons [data-ico="' + name + '"]');
  return el ? el.innerHTML : '';
}
function showAlert(id, type, msg) {
  const el = document.getElementById(id); if (!el) return;
  el.className = 'alert show alert-' + type; el.textContent = msg;
}
function hideAlert(id) { const el = document.getElementById(id); if (el) el.className = 'alert'; }
function busy(btn, on, label) {
  if (!btn) return;
  btn.disabled = on;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Saving…'; }
  else if (btn.dataset.label) { btn.textContent = btn.dataset.label; }
}
/** Cleared and never-filled-in are the same state. */
const orNull = (v) => (v && String(v).trim() ? String(v).trim() : null);
/** Drops empty keys so an untouched block is stored as null, not as an object
 *  full of empty strings. */
function objOrNull(obj) {
  const out = {};
  for (const k of Object.keys(obj)) if (obj[k]) out[k] = obj[k];
  return Object.keys(out).length ? out : null;
}
function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
}
const labelOf = (list, value) => {
  const hit = list.find((o) => o.value === value);
  return hit ? hit.label : (value || '');
};
function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = String(d).split('-').map(Number);
  if (!y || !m || !day) return d;
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Read view ───────────────────────────────────────────────────────

/** Label above value, two to a row — the shape a profile is READ in.
 *  Empty values say so rather than collapsing, so it is obvious at a glance
 *  what is still worth filling in. */
function readGrid(pairs) {
  return '<div class="pv-grid">' + pairs.map((p) =>
    '<div class="pv-item' + (p.wide ? ' pv-item--wide' : '') + '">' +
    '<p class="pv-label">' + esc(p.label) + '</p>' +
    (p.html != null
      ? '<div class="pv-value">' + p.html + '</div>'
      : '<p class="pv-value' + (p.value ? '' : ' is-empty') + '">' +
        esc(p.value || 'Not provided') + '</p>') +
    '</div>').join('') + '</div>';
}

function emptyNote(text) { return '<p class="pv-empty">' + esc(text) + '</p>'; }

// ── Field builders ──────────────────────────────────────────────────

function textField(name, label, o) {
  const opt = o || {};
  return '<div class="field"><label for="f-' + name + '">' + esc(label) +
    (opt.hint ? ' <span class="hint">' + esc(opt.hint) + '</span>' : '') + '</label>' +
    '<input id="f-' + name + '" data-f="' + name + '" type="' + (opt.type || 'text') + '"' +
    (opt.autocomplete ? ' autocomplete="' + opt.autocomplete + '"' : '') +
    (opt.placeholder ? ' placeholder="' + esc(opt.placeholder) + '"' : '') +
    (opt.disabled ? ' disabled' : '') +
    (opt.maxlength ? ' maxlength="' + opt.maxlength + '"' : '') +
    ' value="' + esc(opt.value || '') + '" /></div>';
}

function selectField(name, label, options, o) {
  const opt = o || {};
  const blank = opt.blank === undefined ? 'No preference' : opt.blank;
  return '<div class="field"><label for="f-' + name + '">' + esc(label) +
    (opt.hint ? ' <span class="hint">' + esc(opt.hint) + '</span>' : '') + '</label>' +
    '<select id="f-' + name + '" data-f="' + name + '">' +
    (blank === false ? '' : '<option value="">' + esc(blank) + '</option>') +
    options.map((op) => '<option value="' + esc(op.value) + '"' +
      (opt.value === op.value ? ' selected' : '') + '>' + esc(op.label) + '</option>').join('') +
    '</select></div>';
}

const countryOptions = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));
function row(inner) { return '<div class="field-row">' + inner + '</div>'; }

// ── Reading a scope back out of the DOM ─────────────────────────────

/** Every data-f control inside `scope`, skipping anything that belongs to a
 *  nested repeatable row (those are read by their own reader). */
function readScope(scope, skipSelector) {
  const out = {};
  scope.querySelectorAll('[data-f]').forEach((el) => {
    if (skipSelector && el.closest(skipSelector) && el.closest(skipSelector) !== scope) return;
    out[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value.trim();
  });
  return out;
}

// ── Loyalty programs ────────────────────────────────────────────────

/** Old rows (pre-array) still carry loyalty_airline/loyalty_account_number.
 *  Every read MUST come through here or legacy data reads as empty and the
 *  next save silently deletes it — the same rule as the app's
 *  getLoyaltyPrograms(). */
export function readLoyaltyPrograms(holder) {
  if (!holder) return [];
  if (Array.isArray(holder.loyaltyPrograms)) return holder.loyaltyPrograms;
  if (Array.isArray(holder.loyalty_programs)) return holder.loyalty_programs;
  const air = holder.loyalty_airline, acct = holder.loyalty_account_number;
  if (air && String(air).trim() && acct && String(acct).trim()) {
    return [{
      id: 'legacy-' + (holder.id || 'self'),
      type: 'airline',
      code: String(air).trim().toUpperCase(),
      accountNumber: String(acct).trim(),
    }];
  }
  return [];
}

/** "American Airlines", "Marriott Bonvoy", or whatever was typed. */
export function describeLoyalty(lp) {
  if (lp.type === 'airline') return AIRLINE_NAMES[String(lp.code).toUpperCase()] || lp.code;
  if (lp.code === 'other') return (lp.programName || '').trim() || 'Other';
  const hit = HOTEL_LOYALTY.find((h) => h.code === lp.code);
  return hit ? hit.name : lp.code;
}

function loyaltyRow(lp) {
  const isHotel = lp.type === 'hotel';
  return '<div class="loy-row" data-loy data-id="' + esc(lp.id || uid()) + '">' +
    '<div class="field"><label>Type</label>' +
      '<select data-f="type"><option value="airline"' + (isHotel ? '' : ' selected') + '>Airline</option>' +
      '<option value="hotel"' + (isHotel ? ' selected' : '') + '>Hotel</option></select></div>' +
    '<div class="field"><label>Program</label>' +
      '<input data-f="code" type="text" value="' + esc(lp.code || '') + '" ' +
      'placeholder="' + (isHotel ? 'e.g. marriott_bonvoy' : 'Airline code, e.g. AA') + '" ' +
      'list="loy-hotel-programs" /></div>' +
    '<div class="field"><label>Program name <span class="hint">(if "other")</span></label>' +
      '<input data-f="programName" type="text" value="' + esc(lp.programName || '') + '" /></div>' +
    '<div class="field"><label>Member number</label>' +
      '<input data-f="accountNumber" type="text" value="' + esc(lp.accountNumber || '') + '" /></div>' +
    '<button type="button" class="btn btn-ghost btn-xs" data-remove-loy>Remove</button>' +
    '</div>';
}

function loyaltyEditor(programs) {
  return '<div class="loy-list" data-loy-list>' + programs.map(loyaltyRow).join('') + '</div>' +
    '<button type="button" class="pv-link-btn" data-add-loy>+ Add a program</button>' +
    '<datalist id="loy-hotel-programs">' +
      HOTEL_LOYALTY.map((h) => '<option value="' + esc(h.code) + '">' + esc(h.name) + '</option>').join('') +
    '</datalist>';
}

function readLoyaltyEditor(listEl) {
  if (!listEl) return [];
  return [...listEl.querySelectorAll('[data-loy]')].map((rowEl) => {
    const v = readScope(rowEl);
    return {
      id: rowEl.dataset.id,
      type: v.type === 'hotel' ? 'hotel' : 'airline',
      code: v.type === 'hotel' ? (v.code || '').toLowerCase() : (v.code || '').toUpperCase(),
      programName: v.programName || undefined,
      accountNumber: v.accountNumber || '',
    };
  }).filter((lp) => lp.code && lp.accountNumber);
}

// ── Saved travellers ────────────────────────────────────────────────

/** The people this account books for. The account holder is NOT one of them:
 *  the app derives their traveller record from this same profile (see
 *  src/utils/selfTraveller.ts), so storing a second copy here would start
 *  drifting the first time either was edited. */
function travellerCard(t, open) {
  const name = [t.given_name, t.family_name].filter(Boolean).join(' ') || 'New traveller';
  const sub = [t.document_number ? 'Doc ' + t.document_number : '', fmtDate(t.born_on)].filter(Boolean).join(' · ');
  const opts = (list, sel) => list.map((o) =>
    '<option value="' + o.value + '"' + (sel === o.value ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('');
  const countryOpts = (sel) => '<option value="">—</option>' + COUNTRIES.map((c) =>
    '<option value="' + c.code + '"' + (sel === c.code ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');

  return '<details class="trav"' + (open ? ' open' : '') + ' data-trav data-id="' + esc(t.id) + '">' +
    '<summary><span class="trav-name">' + esc(name) + '</span>' +
    (sub ? '<span class="trav-sub">' + esc(sub) + '</span>' : '') + '</summary>' +
    '<div class="trav-body">' +
      row('<div class="field"><label>Title</label><select data-f="title">' + opts(TITLES, t.title) + '</select></div>' +
          '<div class="field"><label>Date of birth</label><input data-f="born_on" type="date" value="' + esc(t.born_on || '') + '" /></div>') +
      row('<div class="field"><label>First name</label><input data-f="given_name" type="text" value="' + esc(t.given_name || '') + '" /></div>' +
          '<div class="field"><label>Last name</label><input data-f="family_name" type="text" value="' + esc(t.family_name || '') + '" /></div>') +
      row('<div class="field"><label>Middle name <span class="hint">(if on their ID)</span></label><input data-f="middle_name" type="text" value="' + esc(t.middle_name || '') + '" /></div>' +
          '<div class="field"><label>Gender</label><select data-f="gender">' + opts(GENDERS, t.gender) + '</select></div>') +
      row('<div class="field"><label>Email</label><input data-f="email" type="email" value="' + esc(t.email || '') + '" /></div>' +
          '<div class="field"><label>Phone</label><input data-f="phone_number" type="tel" value="' + esc(t.phone_number || '') + '" /></div>') +
      row('<div class="field"><label>Nationality</label><select data-f="nationality">' + countryOpts(t.nationality) + '</select></div>' +
          '<div class="field"><label>Document</label><select data-f="document_type">' + opts(DOC_TYPES, t.document_type) + '</select></div>') +
      row('<div class="field"><label>Document number</label><input data-f="document_number" type="text" value="' + esc(t.document_number || '') + '" /></div>' +
          '<div class="field"><label>Expires</label><input data-f="document_expiry" type="date" value="' + esc(t.document_expiry || '') + '" /></div>') +
      row('<div class="field"><label>Issuing country</label><select data-f="document_issuing_country">' + countryOpts(t.document_issuing_country) + '</select></div>' +
          '<div class="field"><label>Known Traveller number <span class="hint">(9 characters)</span></label>' +
          '<input data-f="known_traveller_number" type="text" maxlength="9" value="' + esc(t.known_traveller_number || '') + '" /></div>') +
      row('<div class="field"><label>Redress number <span class="hint">(optional)</span></label>' +
          '<input data-f="redress_number" type="text" value="' + esc(t.redress_number || '') + '" /></div>' +
          '<div class="field"><label>Photo URL <span class="hint">(optional)</span></label>' +
          '<input data-f="profile_photo" type="url" value="' + esc(t.profile_photo || '') + '" /></div>') +
      '<h3 class="trav-sub-head">Loyalty programs</h3>' +
      loyaltyEditor(readLoyaltyPrograms(t)) +
      '<p class="trav-actions"><button type="button" class="btn btn-ghost btn-xs" data-remove-trav>Remove this traveller</button></p>' +
    '</div></details>';
}

function readTravellers(listEl) {
  if (!listEl) return [];
  return [...listEl.querySelectorAll('[data-trav]')].map((card) => {
    const v = readScope(card.querySelector('.trav-body'), '[data-loy]');
    const t = { id: card.dataset.id };
    for (const k of ['title', 'given_name', 'middle_name', 'family_name', 'born_on', 'gender',
      'nationality', 'email', 'phone_number', 'document_type', 'document_number',
      'document_issuing_country', 'document_expiry', 'known_traveller_number',
      'redress_number', 'profile_photo']) {
      if (v[k]) t[k] = v[k];
    }
    const lps = readLoyaltyEditor(card.querySelector('[data-loy-list]'));
    if (lps.length) t.loyaltyPrograms = lps;
    return t;
  }).filter((t) => t.given_name || t.family_name);
}

function initials(first, last) {
  return ((first || '').trim().charAt(0) + (last || '').trim().charAt(0)).toUpperCase() || '?';
}

// ── Sections ────────────────────────────────────────────────────────
// Each one owns its own columns: it reads them, edits them, and a save
// writes only those. read() returns the panel body; edit() returns the
// fields; collect() turns the edited scope into a profiles update.

const SECTIONS = {

  basic: {
    title: 'Basic information',
    blurb: 'Make sure this matches your travel ID — your passport or licence.',
    read: (p, user) => readGrid([
      { label: 'Name', value: [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ') },
      { label: 'Date of birth', value: fmtDate(p.date_of_birth) },
      { label: 'Gender', value: labelOf(GENDERS, p.gender) },
      {
        label: 'Profile photo',
        html: p.profile_photo
          ? '<img class="pv-avatar" src="' + esc(p.profile_photo) + '" alt="" />'
          : '<span class="pv-avatar pv-avatar--initials">' + esc(initials(p.first_name, p.last_name)) + '</span>',
      },
    ]),
    edit: (p) =>
      row(textField('first_name', 'First name', { value: p.first_name, autocomplete: 'given-name' }) +
          textField('last_name', 'Last name', { value: p.last_name, autocomplete: 'family-name' })) +
      row(textField('middle_name', 'Middle name', { value: p.middle_name, hint: '(if on your ID)' }) +
          textField('date_of_birth', 'Date of birth', { value: p.date_of_birth, type: 'date' })) +
      row(selectField('gender', 'Gender', GENDERS, { value: p.gender, blank: '—' }) +
          textField('profile_photo', 'Profile photo URL', { value: p.profile_photo, type: 'url', placeholder: 'https://…' })),
    collect: (v) => ({
      first_name: v.first_name,
      last_name: v.last_name,
      middle_name: orNull(v.middle_name),
      date_of_birth: orNull(v.date_of_birth),
      gender: v.gender || null,
      profile_photo: orNull(v.profile_photo),
    }),
  },

  contact: {
    title: 'Contact',
    blurb: 'How we reach you about a trip, and who we call if something goes wrong.',
    read: (p, user) => readGrid([
      { label: 'Mobile number', value: p.phone },
      { label: 'Email', value: user.email },
      {
        label: 'Emergency contact',
        value: p.emergency_contact && p.emergency_contact.name
          ? [p.emergency_contact.name +
             (p.emergency_contact.relationship ? ' (' + p.emergency_contact.relationship + ')' : ''),
             p.emergency_contact.phone].filter(Boolean).join(' · ')
          : '',
      },
      {
        label: 'Address',
        value: p.address && (p.address.line1 || p.address.city)
          ? [p.address.line1, p.address.line2, p.address.city, p.address.region,
             p.address.postalCode, COUNTRY_NAME[p.address.country] || p.address.country]
            .filter(Boolean).join(', ')
          : '',
      },
    ]),
    edit: (p) => {
      const ad = p.address || {}, ec = p.emergency_contact || {};
      return row(textField('phone', 'Mobile number', { value: p.phone, type: 'tel', autocomplete: 'tel' }) +
                 textField('email_ro', 'Email', { value: p.__email, type: 'email', hint: '(managed by your login)', disabled: true })) +
        '<h3 class="pv-sub-head">Emergency contact</h3>' +
        row(textField('ec_name', 'Name', { value: ec.name }) +
            textField('ec_relationship', 'Relationship', { value: ec.relationship, hint: '(optional)' })) +
        row(textField('ec_phone', 'Phone', { value: ec.phone, type: 'tel' }) +
            textField('ec_email', 'Email', { value: ec.email, type: 'email', hint: '(optional)' })) +
        '<h3 class="pv-sub-head">Home address</h3>' +
        textField('ad_line1', 'Address', { value: ad.line1 }) +
        textField('ad_line2', 'Address line 2', { value: ad.line2, hint: '(optional)' }) +
        row(textField('ad_city', 'City', { value: ad.city }) +
            textField('ad_region', 'State / province', { value: ad.region })) +
        row(textField('ad_postalCode', 'Postal code', { value: ad.postalCode }) +
            selectField('ad_country', 'Country', countryOptions, { value: ad.country, blank: '—' }));
    },
    collect: (v) => ({
      phone: orNull(v.phone),
      emergency_contact: objOrNull({
        name: v.ec_name, relationship: v.ec_relationship, phone: v.ec_phone, email: v.ec_email,
      }),
      address: objOrNull({
        line1: v.ad_line1, line2: v.ad_line2, city: v.ad_city,
        region: v.ad_region, postalCode: v.ad_postalCode, country: v.ad_country,
      }),
    }),
  },

  document: {
    title: 'Travel documents',
    blurb: 'Your own passport or ID, so booking for yourself fills in as fast as booking for anyone you have saved.',
    read: (p) => {
      const td = p.travel_document || {};
      return readGrid([
        { label: 'Document', value: td.number ? labelOf(DOC_TYPES, td.type) + ' · ' + td.number : '' },
        { label: 'Expires', value: fmtDate(td.expiry) },
        { label: 'Issuing country', value: COUNTRY_NAME[td.issuingCountry] || td.issuingCountry },
        { label: 'Known Traveller number', value: p.known_traveller_number },
        { label: 'Redress number', value: p.redress_number },
      ]);
    },
    edit: (p) => {
      const td = p.travel_document || {};
      return row(selectField('td_type', 'Document', DOC_TYPES, { value: td.type, blank: '—' }) +
                 textField('td_number', 'Document number', { value: td.number })) +
        row(selectField('td_issuingCountry', 'Issuing country', countryOptions, { value: td.issuingCountry, blank: '—' }) +
            textField('td_expiry', 'Expires', { value: td.expiry, type: 'date' })) +
        row(textField('known_traveller_number', 'Known Traveller number', {
              value: p.known_traveller_number, hint: '(TSA PreCheck / Global Entry, 9 characters)', maxlength: 9 }) +
            textField('redress_number', 'Redress number', { value: p.redress_number, hint: '(optional)' }));
    },
    validate: (v) => (v.known_traveller_number && !/^[A-Za-z0-9]{9}$/.test(v.known_traveller_number)
      ? 'A Known Traveller number is exactly 9 letters and digits.' : null),
    collect: (v) => ({
      // A document is only meaningful whole — a number with no expiry would
      // fail at the airline anyway, so a partial one is stored as nothing.
      travel_document: (v.td_number && v.td_type)
        ? { type: v.td_type, number: v.td_number, issuingCountry: v.td_issuingCountry || '', expiry: v.td_expiry || '' }
        : null,
      known_traveller_number: orNull(v.known_traveller_number),
      redress_number: orNull(v.redress_number),
    }),
  },

  flight: {
    title: 'Flight preferences',
    blurb: 'These sync with the WhereTo app to shape what it suggests.',
    read: (p) => {
      const fp = p.flight_prefs || {};
      const airlines = Array.isArray(fp.preferredAirlines) ? fp.preferredAirlines : [];
      return readGrid([
        { label: 'Nearest airport', value: fp.nearestAirport },
        { label: 'Seat class', value: labelOf(SEAT_CLASSES, fp.seatClass) },
        { label: 'Stops', value: labelOf(STOP_PREFS, fp.stopCount) },
        { label: 'Budget flexibility', value: labelOf(BUDGET_FLEX, fp.budgetFlexibility) },
        {
          label: 'Preferred airlines', wide: true,
          value: airlines.map((c) => AIRLINE_NAMES[c] || c).join(', '),
        },
      ]);
    },
    edit: (p) => {
      const fp = p.flight_prefs || {};
      return textField('fp_nearestAirport', 'Nearest airport', {
          value: fp.nearestAirport, hint: '(name or IATA code)', placeholder: 'e.g. JFK' }) +
        row(selectField('fp_seatClass', 'Seat class', SEAT_CLASSES, { value: fp.seatClass }) +
            selectField('fp_stopCount', 'Stops', STOP_PREFS, { value: fp.stopCount })) +
        row(textField('fp_preferredAirlines', 'Preferred airlines', {
              value: Array.isArray(fp.preferredAirlines) ? fp.preferredAirlines.join(', ') : '',
              hint: '(IATA codes, comma-separated)', placeholder: 'e.g. AA, DL, B6' }) +
            selectField('fp_budgetFlexibility', 'Budget flexibility', BUDGET_FLEX, { value: fp.budgetFlexibility }));
    },
    collect: (v) => {
      const airlines = v.fp_preferredAirlines
        ? v.fp_preferredAirlines.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
        : [];
      // No dateFlex: nothing searches nearby dates off a profile preference,
      // so it was a setting that changed nothing (the app dropped it too).
      return {
        flight_prefs: objOrNull({
          nearestAirport: v.fp_nearestAirport,
          seatClass: v.fp_seatClass,
          preferredAirlines: airlines.length ? airlines : '',
          stopCount: v.fp_stopCount,
          budgetFlexibility: v.fp_budgetFlexibility,
        }) || {},
      };
    },
  },

  vibes: {
    title: 'My vibes',
    blurb: 'The travel personality the app starts your matches from. Pick up to ' + BASE_VIBE_CAP + '.',
    read: (p) => {
      const keys = Array.isArray(p.base_vibes) ? p.base_vibes : [];
      if (!keys.length) return emptyNote('No vibes picked yet.');
      return '<div class="vibe-chips is-static">' + keys.map((k) => {
        const v = BASE_VIBES.find((b) => b.key === k);
        return '<span class="vibe-chip is-on">' + esc(v ? v.label : k) + '</span>';
      }).join('') + '</div>';
    },
    edit: (p) => {
      const set = new Set(Array.isArray(p.base_vibes) ? p.base_vibes : []);
      return '<div class="vibe-chips" data-vibes>' + BASE_VIBES.map((v) =>
        '<button type="button" class="vibe-chip" data-vibe="' + v.key + '" aria-pressed="' +
        (set.has(v.key) ? 'true' : 'false') + '">' + esc(v.label) + '</button>').join('') + '</div>';
    },
    collect: (v, scope) => ({
      base_vibes: [...scope.querySelectorAll('[data-vibe][aria-pressed="true"]')].map((c) => c.dataset.vibe),
    }),
  },

  loyalty: {
    title: 'Loyalty programs',
    blurb: 'Airline and hotel membership numbers, passed through when a booking supports them.',
    read: (p) => {
      const list = readLoyaltyPrograms({ loyalty_programs: p.loyalty_programs });
      if (!list.length) return emptyNote('No programs saved yet.');
      return '<ul class="pv-list">' + list.map((lp) =>
        '<li><span class="pv-list-name">' + esc(describeLoyalty(lp)) + '</span>' +
        '<span class="pv-list-meta">' + esc(lp.accountNumber) + '</span></li>').join('') + '</ul>';
    },
    edit: (p) => loyaltyEditor(readLoyaltyPrograms({ loyalty_programs: p.loyalty_programs })),
    collect: (v, scope) => ({ loyalty_programs: readLoyaltyEditor(scope.querySelector('[data-loy-list]')) }),
  },

  travellers: {
    title: 'Saved travellers',
    blurb: 'The people you book for. You are already one of them — your own details come from this profile, ' +
      'so there is nothing to add for yourself.',
    read: (p) => {
      const list = Array.isArray(p.saved_passengers) ? p.saved_passengers : [];
      if (!list.length) return emptyNote('No travellers saved yet.');
      return '<ul class="pv-list">' + list.map((t) => {
        const name = [t.given_name, t.middle_name, t.family_name].filter(Boolean).join(' ');
        const meta = [labelOf(DOC_TYPES, t.document_type) + (t.document_number ? ' ' + t.document_number : ''),
          fmtDate(t.born_on)].filter((s) => s && s.trim()).join(' · ');
        return '<li>' +
          (t.profile_photo
            ? '<img class="pv-avatar pv-avatar--sm" src="' + esc(t.profile_photo) + '" alt="" />'
            : '<span class="pv-avatar pv-avatar--sm pv-avatar--initials">' +
              esc(initials(t.given_name, t.family_name)) + '</span>') +
          '<span class="pv-list-name">' + esc(name) + '</span>' +
          '<span class="pv-list-meta">' + esc(meta) + '</span></li>';
      }).join('') + '</ul>';
    },
    edit: (p) => {
      const list = Array.isArray(p.saved_passengers) ? p.saved_passengers : [];
      return '<div class="trav-list" data-trav-list>' + list.map((t) => travellerCard(t, false)).join('') + '</div>' +
        '<button type="button" class="pv-link-btn" data-add-trav>+ Add a traveller</button>';
    },
    collect: (v, scope) => ({ saved_passengers: readTravellers(scope.querySelector('[data-trav-list]')) }),
  },

  comms: {
    title: 'Communications',
    blurb: 'Control which emails you get from us. Booking confirmations and trip updates are always sent.',
    read: (p) => readGrid([
      { label: 'Travel ideas and product updates', value: p.marketing_opt_in ? 'On' : 'Off' },
    ]),
    edit: (p) => '<label class="check"><input data-f="marketing_opt_in" type="checkbox"' +
      (p.marketing_opt_in ? ' checked' : '') + ' />' +
      '<span>Send me travel ideas and product updates by email.</span></label>',
    collect: (v) => ({ marketing_opt_in: !!v.marketing_opt_in }),
  },
};

// The rail's groups. Splitting the profile across these is the point — one
// page of thirty fields is a form, not a profile.
const GROUPS = [
  { key: 'profile', icon: 'user-circle', label: 'Profile',
    blurb: 'Your personal details and travel documents',
    sections: ['basic', 'contact', 'document'] },
  { key: 'preferences', icon: 'compass', label: 'Travel preferences',
    blurb: 'How you like to fly, and what you like to do',
    sections: ['flight', 'vibes', 'loyalty'] },
  { key: 'travellers', icon: 'users-group-rounded', label: 'Saved travellers',
    blurb: 'The people you book for',
    sections: ['travellers'] },
  { key: 'comms', icon: 'letter', label: 'Communications',
    blurb: 'Control which emails you get',
    sections: ['comms'] },
];

// ── Public entry point ──────────────────────────────────────────────

const PROFILE_COLS =
  'first_name,last_name,middle_name,profile_photo,phone,marketing_opt_in,date_of_birth,gender,' +
  'address,travel_document,emergency_contact,known_traveller_number,redress_number,' +
  'loyalty_programs,base_vibes,flight_prefs,saved_passengers';

export async function initProfileForm(supabase, user, opts = {}) {
  const alertId = opts.alertId || 'wt-alert';
  const mount = document.getElementById(opts.mountId || 'wt-profile-body');
  const railMount = opts.rail === false ? null : document.getElementById('wt-profile-rail');
  const logoutId = opts.logoutId || 'wt-logout';
  if (!mount) return;

  maybeOptOutInternal(user.email);

  const { data, error } = await supabase
    .from('profiles').select(PROFILE_COLS).eq('id', user.id).single();
  if (error) showAlert(alertId, 'error', 'Could not load your profile. ' + error.message);

  // The working copy. Each section's save merges its own columns back in, so
  // the read views stay true without re-fetching the row.
  const p = Object.assign({}, data || {});
  p.__email = user.email;

  let active = 'profile';
  const editing = new Set();

  // ── Rail ──
  function paintRail() {
    // The panel is headed by whoever the profile is for, the way a passport
    // page is — it changes the moment the name does.
    const nameEl = document.getElementById('wt-profile-name');
    if (nameEl) {
      nameEl.textContent = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Your profile';
    }
    if (!railMount) return;
    railMount.innerHTML =
      '<div class="rail-me">' +
        (p.profile_photo
          ? '<img class="pv-avatar pv-avatar--lg" src="' + esc(p.profile_photo) + '" alt="" />'
          : '<span class="pv-avatar pv-avatar--lg pv-avatar--initials">' +
            esc(initials(p.first_name, p.last_name)) + '</span>') +
        '<div><p class="rail-hi">Hi, ' + esc(p.first_name || 'there') + '</p>' +
        '<p class="rail-email">' + esc(user.email) + '</p></div>' +
      '</div>' +
      '<nav class="rail-nav">' +
        GROUPS.map((g) => '<button type="button" class="rail-item' +
          (g.key === active ? ' is-active' : '') + '" data-group="' + g.key + '"' +
          (g.key === active ? ' aria-current="true"' : '') + '>' +
          '<span class="rail-icon">' + ico(g.icon) + '</span>' +
          '<span class="rail-text"><span class="rail-title">' + esc(g.label) + '</span>' +
          '<span class="rail-blurb">' + esc(g.blurb) + '</span></span>' +
          '<span class="rail-chev">' + ico('alt-arrow-right') + '</span></button>').join('') +
        '<a class="rail-item" href="/account/bookings/">' +
          '<span class="rail-icon">' + ico('suitcase') + '</span>' +
          '<span class="rail-text"><span class="rail-title">My bookings</span>' +
          '<span class="rail-blurb">The flights and hotels you have booked</span></span>' +
          '<span class="rail-chev">' + ico('alt-arrow-right') + '</span></a>' +
      '</nav>';
  }

  // ── Panel ──
  function sectionHtml(key) {
    const s = SECTIONS[key];
    const isEditing = editing.has(key);
    return '<section class="pv-sec" data-sec="' + key + '">' +
      '<div class="pv-sec-head">' +
        '<div><h2 class="pv-sec-title">' + esc(s.title) + '</h2>' +
        (s.blurb ? '<p class="pv-sec-blurb">' + esc(s.blurb) + '</p>' : '') + '</div>' +
        (isEditing ? '' : '<button type="button" class="pv-edit" data-edit="' + key + '">Edit</button>') +
      '</div>' +
      (isEditing
        ? '<form class="pv-form" data-form="' + key + '" novalidate>' + s.edit(p) +
          '<div class="pv-actions">' +
            '<button type="submit" class="btn btn-primary">Save</button>' +
            '<button type="button" class="btn btn-ghost" data-cancel="' + key + '">Cancel</button>' +
          '</div></form>'
        : '<div class="pv-read">' + s.read(p, user) + '</div>') +
      '</section>';
  }

  function paintPanel() {
    const keys = railMount
      ? (GROUPS.find((g) => g.key === active) || GROUPS[0]).sections
      : GROUPS.flatMap((g) => g.sections);
    mount.innerHTML = keys.map(sectionHtml).join('');
  }

  function repaintSection(key) {
    const el = mount.querySelector('[data-sec="' + key + '"]');
    if (!el) return;
    el.outerHTML = sectionHtml(key);
  }

  paintRail();
  paintPanel();

  // ── Rail navigation ──
  if (railMount) {
    railMount.addEventListener('click', (e) => {
      const item = e.target.closest('[data-group]');
      if (!item) return;
      active = item.dataset.group;
      editing.clear();
      hideAlert(alertId);
      paintRail();
      paintPanel();
      // Deep-linkable, and the browser's Back button walks the groups the way
      // it walks pages.
      const url = new URL(window.location.href);
      url.searchParams.set('section', active);
      history.pushState({ section: active }, '', url);
    });
  }
  window.addEventListener('popstate', () => {
    if (!railMount) return;
    const want = new URLSearchParams(window.location.search).get('section') || 'profile';
    if (!GROUPS.some((g) => g.key === want) || want === active) return;
    active = want; editing.clear(); paintRail(); paintPanel();
  });
  const initialSection = new URLSearchParams(window.location.search).get('section');
  if (railMount && initialSection && GROUPS.some((g) => g.key === initialSection)) {
    active = initialSection; paintRail(); paintPanel();
  }

  // ── Section edit / cancel, and the repeatable rows inside a section ──
  mount.addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    if (edit) { editing.add(edit.dataset.edit); hideAlert(alertId); repaintSection(edit.dataset.edit); return; }

    const cancel = e.target.closest('[data-cancel]');
    if (cancel) { editing.delete(cancel.dataset.cancel); hideAlert(alertId); repaintSection(cancel.dataset.cancel); return; }

    const addLoy = e.target.closest('[data-add-loy]');
    if (addLoy) {
      addLoy.previousElementSibling.insertAdjacentHTML('beforeend', loyaltyRow({ id: uid(), type: 'airline' }));
      return;
    }
    const rmLoy = e.target.closest('[data-remove-loy]');
    if (rmLoy) { rmLoy.closest('[data-loy]').remove(); return; }

    if (e.target.closest('[data-add-trav]')) {
      const list = mount.querySelector('[data-trav-list]');
      list.insertAdjacentHTML('beforeend', travellerCard({ id: uid(), title: 'mr' }, true));
      list.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    const rmTrav = e.target.closest('[data-remove-trav]');
    if (rmTrav) { rmTrav.closest('[data-trav]').remove(); return; }

    const chip = e.target.closest('[data-vibe]');
    if (chip) {
      const on = chip.getAttribute('aria-pressed') === 'true';
      const chosen = mount.querySelectorAll('[data-vibe][aria-pressed="true"]').length;
      if (!on && chosen >= BASE_VIBE_CAP) {
        showAlert(alertId, 'info', 'Pick up to ' + BASE_VIBE_CAP + ' vibes — unpick one first.');
        return;
      }
      chip.setAttribute('aria-pressed', on ? 'false' : 'true');
      hideAlert(alertId);
    }
  });

  // A traveller's summary follows the name as it is typed, so a card collapsed
  // after editing is not still labelled "New traveller".
  mount.addEventListener('input', (e) => {
    const f = e.target.dataset && e.target.dataset.f;
    if (f !== 'given_name' && f !== 'family_name') return;
    const card = e.target.closest('[data-trav]');
    if (!card) return;
    const v = readScope(card.querySelector('.trav-body'), '[data-loy]');
    const nameEl = card.querySelector('.trav-name');
    if (nameEl) nameEl.textContent = [v.given_name, v.family_name].filter(Boolean).join(' ') || 'New traveller';
  });

  // ── Save one section ──
  mount.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    hideAlert(alertId);

    const key = form.dataset.form;
    const s = SECTIONS[key];
    const v = readScope(form, '[data-loy], [data-trav]');

    const complaint = s.validate && s.validate(v);
    if (complaint) { showAlert(alertId, 'error', complaint); return; }

    const updates = s.collect(v, form);
    const btn = form.querySelector('button[type="submit"]');
    busy(btn, true, 'Saving…');
    const { error: upErr } = await supabase.from('profiles').update(updates).eq('id', user.id);
    busy(btn, false);
    if (upErr) { showAlert(alertId, 'error', 'Save failed: ' + upErr.message); return; }

    Object.assign(p, updates);
    editing.delete(key);
    repaintSection(key);
    paintRail(); // name or photo may have just changed
    showAlert(alertId, 'success', s.title + ' saved.');
  });

  // ── Logout ──
  const out = document.getElementById(logoutId);
  if (out) {
    out.addEventListener('click', async () => {
      if (window.posthog) {
        window.posthog.capture('logout', { surface: 'whereto_trips_web' });
        // Clears registered super properties (platform/surface) — re-register
        // immediately so the next anonymous visitor on this device does not
        // silently lose its reporting category. Mirrors the app-side fix in
        // Wander_App/src/utils/analytics.ts (2026-08-09).
        window.posthog.reset();
        window.posthog.register({ platform: 'website', surface: 'whereto_trips_web' });
      }
      await supabase.auth.signOut();
      window.location.href = '/account/login/';
    });
  }
}
