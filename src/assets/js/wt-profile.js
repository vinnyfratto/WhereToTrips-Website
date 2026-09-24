// ───────────────────────────────────────────────────────────────────
//  wt-profile.js — the account area's profile.
//
//  Shape: the app's own profile, because that is where nearly everyone
//  reads it. A photo header, the name, two shortcut tiles, then plain
//  grouped rows — and opening a row shows THAT section on its own, with a
//  back arrow and its own URL. Sections READ first and turn into a form
//  only when asked, and a save writes only the columns that section owns.
//
//  On a phone the hub and a section are never both on screen. Wide screens
//  keep the same pieces with the menu beside the section, and open
//  Profile by default rather than landing on an empty panel.
//
//  Used by both /account/profile/ (wt-auth.js) and
//  /partner-dashboard/settings/ (wt-partner-settings.js) so there is ONE
//  editor and ONE client. The partner page passes rail:false — it has its
//  own portal nav — and gets every section stacked with no hub.
//
//  Column parity with the app (src/store/authStore.ts updateProfile):
//    first_name last_name middle_name profile_photo phone marketing_opt_in
//    date_of_birth gender address travel_document emergency_contact
//    known_traveller_number redress_number loyalty_programs
//    flight_prefs saved_passengers
//  Text values are trimmed to null rather than '' so "cleared" and "never
//  filled in" are the same state in the database — the same rule the app's
//  updateProfile applies.
// ───────────────────────────────────────────────────────────────────

import { maybeOptOutInternal } from './wt-internal-accounts.js';
import {
  AIRLINES, COUNTRIES, COUNTRY_NAME, GENDERS, TITLES, DOC_TYPES,
  BUDGET_FLEX, HOTEL_LOYALTY, HOTEL_CHAINS, subdivisionsFor, subdivisionLabel,
} from './wt-profile-data.js';
import { addressHtml, stateCode } from './wt-address.js';
import { AIRLINE_NAMES, airlineLogo, airlineLogoFallback } from './wt-airlines.js';
import { emptyPeople, loadPeople, travelersRead, handleTravelersClick, acceptFromUrl } from './wt-travelers.js';

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
    (p.html
      ? '<div class="pv-value">' + p.html + '</div>'
      : '<p class="pv-value' + (p.value ? '' : ' is-empty') + '">' +
        esc(p.value || 'Not provided') + '</p>') +
    '</div>').join('') + '</div>';
}

function emptyNote(text) { return '<p class="pv-empty">' + esc(text) + '</p>'; }

// ── Hidden until asked ──────────────────────────────────────────────
// Passport, ID, Known Traveller and Redress numbers show as **** with an eye
// to reveal them, read or edit. A profile gets opened on shared screens and
// in screenshots; an ID number has no business being legible by default.
const EYE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3.2"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.2A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.2 13.2 0 0 1-3.1 3.9M6.6 6.6C3.7 8.4 1.5 12 1.5 12s3.5 7 10.5 7a10.4 10.4 0 0 0 4.2-.9"/><path d="M9.5 9.9a3.2 3.2 0 0 0 4.6 4.5"/></svg>';
const MASK = '****';

/** A read-view value that starts hidden. `prefix` stays visible ("Passport · "). */
function secretHtml(value, prefix) {
  if (!value) return null;
  return '<span class="pv-secret">' + (prefix ? esc(prefix) : '') +
    '<span class="pv-secret-val" data-secret="' + esc(value) + '">' + MASK + '</span>' +
    '<button type="button" class="pv-secret-btn" data-reveal aria-label="Show number">' + EYE + '</button></span>';
}

/** An edit field that starts masked, with the same eye. Masked by CSS rather
 *  than type="password", so no browser offers to save an ID as a login. */
function secretInput(inputHtml) {
  return '<span class="secret-field">' + inputHtml +
    '<button type="button" class="pv-secret-btn" data-reveal aria-label="Show number">' + EYE + '</button></span>';
}

/** Flips one hidden value, read view or edit field. */
function toggleSecret(btn) {
  const wrap = btn.closest('.pv-secret, .secret-field');
  if (!wrap) return false;
  const input = wrap.querySelector('input');
  const val = wrap.querySelector('[data-secret]');
  const showing = input ? !input.classList.contains('is-masked') : val.textContent !== MASK;
  if (input) input.classList.toggle('is-masked', showing);
  else val.textContent = showing ? MASK : val.dataset.secret;
  btn.innerHTML = showing ? EYE : EYE_OFF;
  btn.setAttribute('aria-label', showing ? 'Show number' : 'Hide number');
  return true;
}

// ── Field builders ──────────────────────────────────────────────────

function textField(name, label, o) {
  const opt = o || {};
  const input = '<input id="f-' + name + '" data-f="' + name + '" type="' + (opt.type || 'text') + '"' +
    (opt.secret ? ' class="is-masked" autocomplete="off" spellcheck="false"'
      : (opt.autocomplete ? ' autocomplete="' + opt.autocomplete + '"' : '')) +
    (opt.placeholder ? ' placeholder="' + esc(opt.placeholder) + '"' : '') +
    (opt.disabled ? ' disabled' : '') +
    (opt.maxlength ? ' maxlength="' + opt.maxlength + '"' : '') +
    ' value="' + esc(opt.value || '') + '" />';
  return '<div class="field"' + (opt.id ? ' id="' + opt.id + '"' : '') + '><label for="f-' + name + '">' + esc(label) +
    (opt.hint ? ' <span class="hint">' + esc(opt.hint) + '</span>' : '') + '</label>' +
    (opt.secret ? secretInput(input) : input) + '</div>';
}

function selectField(name, label, options, o) {
  const opt = o || {};
  const blank = opt.blank === undefined ? 'No preference' : opt.blank;
  return '<div class="field"' + (opt.id ? ' id="' + opt.id + '"' : '') + '><label for="f-' + name + '">' + esc(label) +
    (opt.hint ? ' <span class="hint">' + esc(opt.hint) + '</span>' : '') + '</label>' +
    '<select id="f-' + name + '" data-f="' + name + '">' +
    (blank === false ? '' : '<option value="">' + esc(blank) + '</option>') +
    options.map((op) => '<option value="' + esc(op.value) + '"' +
      (opt.value === op.value ? ' selected' : '') + '>' + esc(op.label) + '</option>').join('') +
    '</select></div>';
}

const countryOptions = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));

/** State / province: a list for the US and Canada (stored as the code), free
 *  text elsewhere, labelled the way that country says it. Same as the app. */
function regionField(country, value) {
  const list = subdivisionsFor(country);
  const label = subdivisionLabel(country);
  return list
    ? selectField('ad_region', label, list.map((x) => ({ value: x.code, label: x.name + ' (' + x.code + ')' })),
        { value: stateCode(value, country), blank: 'Select a ' + label.toLowerCase(), id: 'ad-region-wrap' })
    : textField('ad_region', label, { value, id: 'ad-region-wrap', autocomplete: 'address-level1' });
}

/** The flight_prefs the page loaded with, parked on the form so a save can
 *  merge into it rather than replace it. */
function p0FlightPrefs(scope) {
  try { return JSON.parse(scope.dataset.fp || '{}'); } catch (_e) { return {}; }
}
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

/** Programme codes with a bundled wordmark. World of Hyatt has no artwork yet
 *  and shows its monogram, exactly as in the app. */
const HOTEL_PROGRAM_LOGOS = [
  'marriott_bonvoy', 'hilton_honors', 'ihg_one_rewards', 'wyndham_rewards',
  'choice_privileges', 'accor_live_limitless', 'best_western_rewards', 'radisson_rewards',
];

function initialsOf(name) {
  return String(name).trim().split(/\s+/).slice(0, 2)
    .map((w) => (w[0] || '').toUpperCase()).join('');
}

/** The mark beside a saved membership — the app's ProgramMark, in HTML.
 *  Airlines resolve to a real logo off the same CDN the app uses. Hotel
 *  PROGRAMMES have no CDN, so the eight bundled wordmarks are served from
 *  /assets/img/hotel-programs/; anything without artwork falls back to the
 *  same curated monogram the app shows.
 *
 *  Wordmarks, not icons, so the hotel slot is wide and short and the artwork
 *  is contained in it rather than squared off. */
function loyaltyMark(lp) {
  if (lp.type !== 'hotel') {
    const code = String(lp.code || '').trim().toUpperCase();
    if (IATA_AIRLINE_CODE.test(code)) {
      return '<span class="loy-mark loy-mark-air"><img src="' + esc(airlineLogo(code)) +
        '" alt="" loading="lazy" data-fallback="' + esc(airlineLogoFallback(code)) + '"' +
        ' onerror="this.onerror=null;this.src=this.dataset.fallback" /></span>';
    }
    return '<span class="loy-mark loy-mono">' + esc(code.slice(0, 3)) + '</span>';
  }
  if (HOTEL_PROGRAM_LOGOS.indexOf(lp.code) >= 0) {
    return '<span class="loy-mark loy-mark-hotel"><img src="/assets/img/hotel-programs/' +
      esc(lp.code) + '.png" alt="" loading="lazy" /></span>';
  }
  const hit = HOTEL_LOYALTY.find((h) => h.code === lp.code);
  const mono = (hit && hit.monogram) || initialsOf(lp.programName || '');
  return '<span class="loy-mark loy-mono">' + esc(mono) + '</span>';
}

/** A saved membership, read-only: mark, then programme and number. */
function loyaltyReadRow(lp) {
  return '<li class="loy-saved">' + loyaltyMark(lp) +
    '<span class="loy-saved-text">' +
      '<span class="loy-saved-name">' + esc(describeLoyalty(lp)) + '</span>' +
      '<span class="loy-saved-num">' + esc(lp.accountNumber || 'No membership number yet') + '</span>' +
    '</span></li>';
}

/** Read view for the two rewards groups, shown under the Preferences grid. */
function rewardsRead(p) {
  const list = readLoyaltyPrograms({ loyalty_programs: p.loyalty_programs });
  const group = (label, rows, empty) =>
    '<h3 class="pv-sub-head">' + esc(label) + '</h3>' +
    (rows.length
      ? '<ul class="loy-saved-list">' + rows.map(loyaltyReadRow).join('') + '</ul>'
      : emptyNote(empty));
  return group('Flight Rewards', list.filter((lp) => lp.type !== 'hotel'), 'No frequent flyer programs saved.') +
         group('Hotel Rewards',  list.filter((lp) => lp.type === 'hotel'), 'No hotel programs saved.');
}

/** One editable membership. The TYPE is the group it sits in, not a dropdown
 *  on the row — same as the app, where answering "which airlines am I in?"
 *  should not mean reading every row's type select. */
function loyaltyRow(lp) {
  const isHotel = lp.type === 'hotel';
  const codeField = isHotel
    ? '<div class="field"><label>Program</label><select data-f="code"><option value=""></option>' +
        HOTEL_LOYALTY.map((h) => '<option value="' + esc(h.code) + '"' +
          (h.code === lp.code ? ' selected' : '') + '>' + esc(h.name) + '</option>').join('') +
      '</select></div>' +
      '<div class="field"><label>Program name <span class="hint">(if "other")</span></label>' +
        '<input data-f="programName" type="text" value="' + esc(lp.programName || '') + '" /></div>'
    : '<div class="field"><label>Airline</label>' +
        '<input data-f="code" type="text" value="' + esc(lp.code || '') + '" ' +
        'placeholder="Name or 2-letter code, e.g. AA" list="loy-airlines" /></div>';
  return '<div class="loy-row" data-loy data-type="' + (isHotel ? 'hotel' : 'airline') + '" ' +
    'data-id="' + esc(lp.id || uid()) + '">' + codeField +
    '<div class="field"><label>Member number</label>' +
      '<input data-f="accountNumber" type="text" value="' + esc(lp.accountNumber || '') + '" /></div>' +
    '<button type="button" class="btn btn-ghost btn-xs" data-remove-loy>Remove</button>' +
    '</div>';
}

/** Two headed groups, each with its own Add — the app's LoyaltyEditor. */
function loyaltyEditor(programs) {
  const group = (label, type, rows) =>
    '<div class="loy-group">' +
      '<div class="loy-group-head"><h3 class="pv-sub-head">' + esc(label) + '</h3>' +
        '<button type="button" class="pv-link-btn" data-add-loy="' + type + '">+ Add</button></div>' +
      '<div class="loy-list" data-loy-list="' + type + '">' + rows.map(loyaltyRow).join('') + '</div>' +
    '</div>';
  return '<div class="loy-groups">' +
      group('Flight Rewards', 'airline', programs.filter((lp) => lp.type !== 'hotel')) +
      group('Hotel Rewards',  'hotel',   programs.filter((lp) => lp.type === 'hotel')) +
    '</div>' +
    '<datalist id="loy-airlines">' +
      AIRLINES.map((a) => '<option value="' + esc(a.code) + '">' + esc(a.name) + '</option>').join('') +
    '</datalist>';
}

/** Every row across BOTH groups. `scope` is the form, not one list: the type
 *  comes from the group a row sits in now, so there is no per-row select to
 *  read it off. */
function readLoyaltyEditor(scope) {
  if (!scope) return [];
  return [...scope.querySelectorAll('[data-loy]')].map((rowEl) => {
    const v = readScope(rowEl);
    const isHotel = rowEl.dataset.type === 'hotel';
    return {
      id: rowEl.dataset.id,
      type: isHotel ? 'hotel' : 'airline',
      // Airlines: resolve what was typed to a real IATA code where we can. The
      // field is free text on purpose, but everything downstream matches a
      // flight's two-character carrier code, so "United" saved verbatim would
      // silently never match. Same resolver the app's editor runs on blur.
      code: isHotel ? (v.code || '').toLowerCase() : resolveAirlineCode(v.code || ''),
      programName: v.programName || undefined,
      accountNumber: v.accountNumber || '',
    };
  }).filter((lp) => lp.code && lp.accountNumber);
}

/** A real IATA airline code: two characters, letters or a digit. */
const IATA_AIRLINE_CODE = /^[A-Z0-9]{2}$/;

/** Typed text -> a real IATA code where it is unambiguous, else left alone. */
function resolveAirlineCode(typed) {
  const v = String(typed).trim().toUpperCase();
  if (!v || AIRLINES.some((a) => a.code === v)) return v;
  const hits = AIRLINES.filter((a) => a.name.toUpperCase().indexOf(v) >= 0);
  return hits.length === 1 ? hits[0].code : v;
}

// ── Saved travellers ────────────────────────────────────────────────

/** The people this account books for. The account holder is NOT one of them:
 *  the app derives their traveller record from this same profile (see
 *  src/utils/selfTraveller.ts), so storing a second copy here would start
 *  drifting the first time either was edited. */
function travellerCard(t, open) {
  const name = [t.given_name, t.family_name].filter(Boolean).join(' ') || 'New traveler';
  // Never the document number here: the summary is always on screen.
  const sub = [t.document_number ? labelOf(DOC_TYPES, t.document_type || 'passport') + ' on file' : '', fmtDate(t.born_on)]
    .filter(Boolean).join(' · ');
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
      row('<div class="field"><label>Document number</label>' + secretInput('<input data-f="document_number" type="text" class="is-masked" autocomplete="off" spellcheck="false" value="' + esc(t.document_number || '') + '" />') + '</div>' +
          '<div class="field"><label>Expiration Date</label><input data-f="document_expiry" type="date" value="' + esc(t.document_expiry || '') + '" /></div>') +
      row('<div class="field"><label>Issuing country</label><select data-f="document_issuing_country">' + countryOpts(t.document_issuing_country) + '</select></div>' +
          '<div class="field"><label>Known Traveller number <span class="hint">(9 characters)</span></label>' +
          secretInput('<input data-f="known_traveller_number" type="text" maxlength="9" class="is-masked" autocomplete="off" value="' + esc(t.known_traveller_number || '') + '" />') + '</div>') +
      row('<div class="field"><label>Redress number <span class="hint">(optional)</span></label>' +
          secretInput('<input data-f="redress_number" type="text" class="is-masked" autocomplete="off" value="' + esc(t.redress_number || '') + '" />') + '</div>' +
          '<div class="field"><label>Photo URL <span class="hint">(optional)</span></label>' +
          '<input data-f="profile_photo" type="url" value="' + esc(t.profile_photo || '') + '" /></div>') +
      '<h3 class="trav-sub-head">Loyalty programs</h3>' +
      loyaltyEditor(readLoyaltyPrograms(t)) +
      '<p class="trav-actions"><button type="button" class="btn btn-ghost btn-xs" data-remove-trav>Remove this traveler</button></p>' +
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
    const lps = readLoyaltyEditor(card);
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

  // The app's My Profile, section for section and in its order: Basic
  // Information, Contact Information, Emergency Contact, Travel Document,
  // Airport Security. Labels and hints are the app's.
  basic: {
    title: 'Basic Information',
    read: (p) => readGrid([
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
      row(textField('first_name', 'First name', { value: p.first_name, autocomplete: 'given-name', placeholder: 'Given name' }) +
          textField('middle_name', 'Middle name', { value: p.middle_name, placeholder: 'Optional',
            hint: '(airlines want the name exactly as it appears on your passport)' })) +
      row(textField('last_name', 'Last name', { value: p.last_name, autocomplete: 'family-name', placeholder: 'Family name' }) +
          textField('date_of_birth', 'Date of birth', { value: p.date_of_birth, type: 'date' })) +
      row(selectField('gender', 'Gender', GENDERS, { value: p.gender, blank: 'Select' }) +
          textField('profile_photo', 'Profile photo URL', { value: p.profile_photo, type: 'url', placeholder: 'https://…' })),
    validate: (v) => (!String(v.first_name || '').trim() ? 'First name is required.'
      : !String(v.last_name || '').trim() ? 'Last name is required.' : null),
    collect: (v) => ({
      first_name: String(v.first_name || '').trim(),
      last_name: String(v.last_name || '').trim(),
      middle_name: orNull(v.middle_name),
      date_of_birth: orNull(v.date_of_birth),
      gender: v.gender || null,
      profile_photo: orNull(v.profile_photo),
    }),
  },

  contact: {
    title: 'Contact Information',
    read: (p, user) => readGrid([
      { label: 'Phone', value: p.phone },
      { label: 'Email', value: user.email },
      // Line 1 / Line 2 / City, ST, Zip / Country (outside the US): the one
      // way an address is written anywhere (wt-address.js).
      { label: 'Address', wide: true, html: addressHtml(p.address, (c) => COUNTRY_NAME[c]) || null },
    ]),
    edit: (p) => {
      const ad = p.address || {};
      return row(textField('phone', 'Phone', { value: p.phone, type: 'tel', autocomplete: 'tel', placeholder: '(415) 555-2671' }) +
                 textField('email_ro', 'Email', { value: p.__email, type: 'email', disabled: true,
                   hint: '(the email you sign in with; change it in Account & Security)' })) +
        '<h3 class="pv-sub-head">Address</h3>' +
        textField('ad_line1', 'Address', { value: ad.line1, placeholder: 'Street address', autocomplete: 'address-line1' }) +
        textField('ad_line2', 'Address line 2', { value: ad.line2, placeholder: 'Apartment, suite, unit', autocomplete: 'address-line2' }) +
        row(textField('ad_city', 'City', { value: ad.city, autocomplete: 'address-level2' }) +
            selectField('ad_country', 'Country', countryOptions, { value: ad.country || 'US', blank: false })) +
        row(regionField(ad.country, ad.region) +
            textField('ad_postalCode', 'Postal code', { value: ad.postalCode, autocomplete: 'postal-code' }));
    },
    collect: (v) => ({
      phone: orNull(v.phone),
      // A country on its own is not an address; the picker always has one.
      address: (v.ad_line1 || v.ad_city || v.ad_postalCode) ? objOrNull({
        line1: v.ad_line1, line2: v.ad_line2, city: v.ad_city,
        region: stateCode(v.ad_region, v.ad_country) || '',
        postalCode: String(v.ad_postalCode || '').trim().toUpperCase(),
        country: v.ad_country,
      }) : null,
    }),
  },

  emergency: {
    title: 'Emergency Contact',
    blurb: 'Who we would reach if something went wrong on a trip',
    read: (p) => {
      const ec = p.emergency_contact || {};
      return readGrid([
        { label: 'Name', value: ec.name },
        { label: 'Relationship', value: ec.relationship },
        { label: 'Phone', value: ec.phone },
        { label: 'Email', value: ec.email },
      ]);
    },
    edit: (p) => {
      const ec = p.emergency_contact || {};
      return row(textField('ec_name', 'Name', { value: ec.name }) +
                 textField('ec_relationship', 'Relationship', { value: ec.relationship, placeholder: 'Partner, parent, friend' })) +
        row(textField('ec_phone', 'Phone', { value: ec.phone, type: 'tel' }) +
            textField('ec_email', 'Email', { value: ec.email, type: 'email', placeholder: 'Optional' }));
    },
    collect: (v) => ({
      // Nothing to call without a name or a number, same rule as the app.
      emergency_contact: (String(v.ec_name || '').trim() || String(v.ec_phone || '').trim())
        ? objOrNull({ name: v.ec_name, relationship: v.ec_relationship, phone: v.ec_phone, email: v.ec_email })
        : null,
    }),
  },

  document: {
    title: 'Travel Document',
    blurb: 'Auto-fills when you book a flight for yourself. Fill it in fully or leave it empty.',
    read: (p) => {
      const td = p.travel_document || {};
      return readGrid([
        { label: 'Document type', value: td.number ? labelOf(DOC_TYPES, td.type) : '' },
        { label: 'Document number', html: secretHtml(td.number) },
        { label: 'Issuing country', value: COUNTRY_NAME[td.issuingCountry] || td.issuingCountry },
        { label: 'Expiration date', value: fmtDate(td.expiry) },
      ]);
    },
    edit: (p) => {
      const td = p.travel_document || {};
      return row(selectField('td_type', 'Document type', DOC_TYPES, { value: td.type || 'passport', blank: false }) +
                 textField('td_number', 'Document number', { value: td.number, placeholder: 'e.g. A12345678', secret: true })) +
        row(selectField('td_issuingCountry', 'Issuing country', countryOptions, { value: td.issuingCountry, blank: 'Select a country' }) +
            textField('td_expiry', 'Expiration date', { value: td.expiry, type: 'date' }));
    },
    // All or nothing, with the app's own messages: half a document passes for
    // filled in and then fails at the airline.
    validate: (v) => {
      const any = v.td_number || v.td_issuingCountry || v.td_expiry;
      if (!any) return null;
      if (!v.td_number) return 'Add the document number, or clear the whole document.';
      if (!v.td_issuingCountry) return 'Issuing country is required.';
      if (!v.td_expiry) return 'Expiration date is required.';
      return null;
    },
    collect: (v) => ({
      travel_document: v.td_number
        ? { type: v.td_type || 'passport', number: String(v.td_number).trim().toUpperCase(),
            issuingCountry: v.td_issuingCountry || '', expiry: v.td_expiry || '' }
        : null,
    }),
  },

  airport: {
    title: 'Airport Security',
    blurb: 'Optional. Speeds up airport security.',
    read: (p) => readGrid([
      { label: 'Known Traveller Number', html: secretHtml(p.known_traveller_number) },
      { label: 'Redress number', html: secretHtml(p.redress_number) },
    ]),
    edit: (p) =>
      row(textField('known_traveller_number', 'Known Traveller Number', {
            value: p.known_traveller_number, placeholder: 'TSA PreCheck / Global Entry', hint: '(9 letters or digits)',
            maxlength: 9, secret: true }) +
          textField('redress_number', 'Redress number', { value: p.redress_number, placeholder: 'DHS TRIP number', secret: true })),
    validate: (v) => (v.known_traveller_number && !/^[A-Za-z0-9]{9}$/.test(v.known_traveller_number)
      ? 'A Known Traveller Number is exactly 9 letters or digits.' : null),
    collect: (v) => ({
      known_traveller_number: v.known_traveller_number ? String(v.known_traveller_number).trim().toUpperCase() : null,
      redress_number: orNull(v.redress_number),
    }),
  },

  // The app's Preferences screen, column for column: home airport, preferred
  // airlines, budget flexibility, and Travel Rewards — which moved here out of
  // the profile form, because frequent flyer numbers belong with the airlines
  // they bias rather than under passports and addresses.
  // The app's Preferences screen, in its order: Home Airport, Preferred
  // Airlines, Preferred Hotel Brands, Travel Rewards, How Far You'll Stretch.
  flight: {
    title: 'Preferences',
    blurb: 'When set, these prioritize your results. Override anytime in the search form.',
    read: (p) => {
      const fp = p.flight_prefs || {};
      const airlines = Array.isArray(fp.preferredAirlines) ? fp.preferredAirlines : [];
      const chains = Array.isArray(fp.preferredHotelChains) ? fp.preferredHotelChains : [];
      return readGrid([
        { label: 'Home Airport', value: fp.nearestAirport },
        { label: 'How far you\'ll stretch', value: labelOf(BUDGET_FLEX, fp.budgetFlexibility) },
        { label: 'Preferred Airlines', wide: true, value: airlines.map((c) => AIRLINE_NAMES[c] || c).join(', ') },
        { label: 'Preferred Hotel Brands', wide: true,
          value: chains.map((slug) => (HOTEL_CHAINS.find((c) => c.slug === slug) || {}).name || slug).join(', ') },
      ]) + rewardsRead(p);
    },
    edit: (p) => {
      const fp = p.flight_prefs || {};
      const chosen = new Set(Array.isArray(fp.preferredHotelChains) ? fp.preferredHotelChains : []);
      return '<h3 class="pv-sub-head">Home Airport</h3>' +
        textField('fp_nearestAirport', 'Home airport', {
          value: fp.nearestAirport, hint: '(auto-filled as the Starting Point on every search)', placeholder: 'e.g. JFK' }) +
        '<h3 class="pv-sub-head">Preferred Airlines</h3>' +
        textField('fp_preferredAirlines', 'Airlines', {
          value: Array.isArray(fp.preferredAirlines) ? fp.preferredAirlines.join(', ') : '',
          hint: '(2-letter codes, comma-separated; prioritized in search results)', placeholder: 'e.g. AA, DL, B6' }) +
        '<h3 class="pv-sub-head">Preferred Hotel Brands</h3>' +
        '<p class="tv-note">Badged in hotel results so you can spot them.</p>' +
        '<div class="vibe-chips" data-chains>' + HOTEL_CHAINS.map((c) =>
          '<button type="button" class="vibe-chip" data-chain="' + esc(c.slug) + '" aria-pressed="' +
          (chosen.has(c.slug) ? 'true' : 'false') + '">' + esc(c.name) + '</button>').join('') + '</div>' +
        loyaltyEditor(readLoyaltyPrograms({ loyalty_programs: p.loyalty_programs })) +
        '<h3 class="pv-sub-head">How Far You\'ll Stretch</h3>' +
        selectField('fp_budgetFlexibility', 'Budget flexibility', BUDGET_FLEX, {
          value: fp.budgetFlexibility, blank: false,
          hint: '(expands search beyond your set budget by this percentage)' });
    },
    collect: (v, scope) => {
      const airlines = v.fp_preferredAirlines
        ? v.fp_preferredAirlines.split(',').map((x) => resolveAirlineCode(x.trim())).filter(Boolean)
        : [];
      const chains = [...scope.querySelectorAll('[data-chain][aria-pressed="true"]')].map((c) => c.dataset.chain);
      // Merged over what is there, never rebuilt: flight_prefs carries keys
      // this form does not edit, and rebuilding it used to wipe them.
      const fp = Object.assign({}, p0FlightPrefs(scope), {
        nearestAirport: orNull(v.fp_nearestAirport) || undefined,
        preferredAirlines: airlines,
        preferredHotelChains: chains,
        budgetFlexibility: v.fp_budgetFlexibility || 'none',
      });
      Object.keys(fp).forEach((k) => fp[k] === undefined && delete fp[k]);
      return { flight_prefs: fp, loyalty_programs: readLoyaltyEditor(scope) };
    },
  },

  // The app keeps all five parts on ONE screen behind its "My Profile" tile,
  // so the website does too. The parts stay separate
  // definitions above — this composes them, and one Save writes the union of
  // their columns.
  profile: {
    title: 'My Profile',
    read: (p, user) => PROFILE_PARTS.map((k) =>
      '<h3 class="pv-sub-head">' + esc(SECTIONS[k].title) + '</h3>' + SECTIONS[k].read(p, user)).join(''),
    edit: (p) => PROFILE_PARTS.map((k, i) =>
      (i ? '<h3 class="pv-sub-head">' + esc(SECTIONS[k].title) + '</h3>' : '') + SECTIONS[k].edit(p)).join(''),
    validate: (v) => {
      for (const k of PROFILE_PARTS) {
        const complaint = SECTIONS[k].validate && SECTIONS[k].validate(v);
        if (complaint) return complaint;
      }
      return null;
    },
    collect: (v, scope) => Object.assign({}, ...PROFILE_PARTS.map((k) => SECTIONS[k].collect(v, scope))),
  },

  // Friends merged into Saved Travelers, the same as the app. The read view
  // (wt-travelers.js) is the whole list: you, the travelers you created and
  // the ones you invited, plus invites in flight. Edit covers the created ones,
  // the only ones whose details live in this account.
  travellers: {
    title: 'Saved Travelers',
    blurb: 'Everyone you book for. Travelers you create keep their details here. ' +
      'Travelers you invite keep theirs in their own account.',
    read: (p) => travelersRead(p),
    edit: (p) => {
      const list = Array.isArray(p.saved_passengers) ? p.saved_passengers : [];
      return '<p class="tv-note">Edit the travelers you created. Invited travelers keep their details in their own account.</p>' +
        '<div class="trav-list" data-trav-list>' + list.map((t) => travellerCard(t, false)).join('') + '</div>' +
        '<button type="button" class="pv-link-btn" data-add-trav>+ Add Traveler</button>';
    },
    collect: (v, scope) => ({ saved_passengers: readTravellers(scope.querySelector('[data-trav-list]')) }),
  },

  saved: {
    title: 'Saved destinations',
    blurb: 'The places you hearted in the app. Save one there and it shows up here.',
    // Read-only apart from removing: hearting a destination happens where you
    // are looking at it, which is in the app.
    read: (p) => {
      const list = p.__saved || [];
      if (!list.length) return emptyNote('Nothing saved yet. Heart a destination in the app and it will appear here.');
      return '<div class="sd-grid">' + list.map((d) => {
        const rec = d.destination || {};
        const photo = (rec.images && rec.images[0] && rec.images[0].url) || rec.image || '';
        const city = rec.cityName || rec.name || d.code;
        const place = [rec.gatewayCity && rec.gatewayCity !== city ? rec.gatewayCity : '', rec.countryName]
          .filter(Boolean).join(', ');
        return '<article class="sd-card">' +
          '<div class="sd-photo">' +
            (photo
              ? '<img src="' + esc(photo) + '" alt="" loading="lazy" />'
              : '<span class="sd-photo-empty">' + ico('map-point') + '</span>') +
            '<button type="button" class="sd-remove" data-unsave="' + esc(d.code) + '" ' +
            'aria-label="Remove ' + esc(city) + '">&times;</button>' +
          '</div>' +
          '<div class="sd-body">' +
            '<h3 class="sd-city">' + esc(city) + '</h3>' +
            (place ? '<p class="sd-place">' + esc(place) + '</p>' : '') +
          '</div>' +
        '</article>';
      }).join('') + '</div>';
    },
  },

  comms: {
    title: 'Notifications',
    read: (p) => readGrid([
      { label: 'Marketing emails', value: p.marketing_opt_in ? 'On' : 'Off' },
      { label: 'Push notifications', value: 'Set on each phone in the WhereTo app' },
    ]) + '<p class="tv-note">Booking confirmations and trip essentials still get sent by email either way.</p>',
    edit: (p) => '<label class="check"><input data-f="marketing_opt_in" type="checkbox"' +
      (p.marketing_opt_in ? ' checked' : '') + ' />' +
      '<span><strong>Marketing emails</strong><br />Deals, price drops, and trip inspiration</span></label>',
    collect: (v) => ({ marketing_opt_in: !!v.marketing_opt_in }),
  },

  // Account & Security and Help & Support: the app's two ACCOUNT rows. No
  // columns of their own, so read-only with actions.
  security: {
    title: 'Account & Security',
    read: () =>
      '<h3 class="pv-sub-head">Login &amp; Security</h3>' +
      '<div class="acct-actions">' +
        '<button type="button" class="ph-row" data-sec-reset><span class="ph-row-body"><span class="ph-row-title">Change Password</span>' +
          '<span class="ph-row-sub">Reset your password by email</span></span></button>' +
        '<div class="ph-row is-dim"><span class="ph-row-body"><span class="ph-row-title">Two-Factor Authentication</span>' +
          '<span class="ph-row-sub">Coming soon</span></span></div>' +
        '<div class="ph-row is-dim"><span class="ph-row-body"><span class="ph-row-title">Active Sessions</span>' +
          '<span class="ph-row-sub">Coming soon</span></span></div>' +
      '</div>' +
      '<h3 class="pv-sub-head">Danger Zone</h3>' +
      '<button type="button" class="ph-row ph-row--danger" data-sec-delete><span class="ph-row-body">' +
        '<span class="ph-row-title">Delete Account</span><span class="ph-row-sub">Permanently remove your account</span></span></button>',
  },

  help: {
    title: 'Help & Support',
    read: () =>
      '<a class="ph-row" href="/account/bookings/"><span class="ph-row-body"><span class="ph-row-title">Help with a booking</span>' +
        '<span class="ph-row-sub">Open the booking, then choose Get help</span></span></a>' +
      '<a class="ph-row" href="/contact/"><span class="ph-row-body"><span class="ph-row-title">Contact Support</span>' +
        '<span class="ph-row-sub">Send us a message</span></span></a>' +
      '<a class="ph-row" href="/faq/"><span class="ph-row-body"><span class="ph-row-title">FAQ</span>' +
        '<span class="ph-row-sub">Answers to common questions</span></span></a>',
  },
};

/** The four the app shows together on its own Profile screen. */
// Loyalty used to be the fourth part. It lives on Preferences now, with the
// airlines and hotel brands it biases, rather than under passports and
// addresses — same move the app made.
const PROFILE_PARTS = ['basic', 'contact', 'emergency', 'document', 'airport'];

// ── The menu ────────────────────────────────────────────────────────
// The same list the app's profile screen shows, in the same order, because
// two navs for one account is two things to keep true. Rows the app has but
// the website has no page for — Booking in Progress, Wander as a Group,
// Account & Security, Help & Support — are left out rather than shown as
// dead ends. Partner and Admin are website-only and appear for the accounts
// they belong to.
//
// Rows either open a section (key) or leave for another page (href).
const MENU = [
  {
    label: 'My travel',
    rows: [
      { key: 'saved', icon: 'heart', title: 'Saved Destinations',
        sub: (p) => {
          const n = (p.__saved || []).length;
          return n ? plural(n, 'destination') : 'None saved yet';
        } },
    ],
  },
  {
    label: 'Settings',
    rows: [
      { key: 'flight', icon: 'tuning', title: 'Preferences', sub: (p) => prefsSubtitle(p) },
      { key: 'comms', icon: 'bell', title: 'Notifications', sub: () => '' },
    ],
  },
  {
    label: 'Account',
    rows: [
      { key: 'security', icon: 'lock-keyhole', title: 'Account & Security', sub: () => '' },
      { key: 'help', icon: 'info-circle', title: 'Help & Support', sub: () => '' },
    ],
  },
];

/** The app's prefsSubtitle (ProfileKit.tsx), word for word. */
function prefsSubtitle(p) {
  const fp = p.flight_prefs || {};
  const rewards = readLoyaltyPrograms({ loyalty_programs: p.loyalty_programs })
    .filter((lp) => lp.code && lp.accountNumber).length;
  const airlines = Array.isArray(fp.preferredAirlines) ? fp.preferredAirlines.length : 0;
  const chains = Array.isArray(fp.preferredHotelChains) ? fp.preferredHotelChains.length : 0;
  const code = fp.nearestAirport ? ((String(fp.nearestAirport).match(/\(([A-Z]{3})\)/) || [])[1] || fp.nearestAirport) : '';
  if (!airlines && !chains && !code && !fp.budgetFlexibility) return rewards ? plural(rewards, 'rewards program') : 'Not configured';
  const bits = [
    airlines ? plural(airlines, 'airline') : '',
    chains ? plural(chains, 'hotel brand') : '',
    code,
    rewards ? plural(rewards, 'rewards program') : '',
  ].filter(Boolean);
  return bits.length ? bits.join(' · ') : 'Configured';
}

// Shown only to the accounts they belong to.
const ACCOUNT_ROWS = [
  { href: '/partner-dashboard/', icon: 'wallet', title: 'Partner Dashboard',
    sub: () => 'Your referrals, bookings and commissions', gate: 'affiliate' },
  { href: '/admin-dashboard/', icon: 'lock-keyhole', title: 'Admin Dashboard',
    sub: () => 'Every internal tool', gate: 'admin' },
];

// Named the way the app's own Policy group is, down to the wording on the
// two documents — these are the signed Privacy Statement and Terms of
// Service, not generically-titled pages.
const POLICY_ROWS = [
  { href: '/legal/privacy/', icon: 'shield-check', title: 'Privacy Statement', sub: () => '' },
  { href: '/legal/terms/', icon: 'document-text', title: 'Terms of Service', sub: () => '' },
  { href: '/about/', icon: 'info-circle', title: 'About WhereTo', sub: () => '' },
];

/** Every section a row or tile can open, so a ?section= value can be checked.
 *  The four parts of `profile` are not navigable on their own — the app keeps
 *  them on one screen and so does this. */
const SECTION_KEYS = ['profile', 'travellers', 'saved', 'flight', 'comms', 'security', 'help'];

/** "Mary's", "James'", or "My" with no first name: the app's possessive(). */
function possessive(first) {
  const n = String(first || '').trim();
  if (!n) return 'My';
  return /s$/i.test(n) ? n + "'" : n + "'s";
}

function plural(n, word) { return n + ' ' + word + (Number(n) === 1 ? '' : 's'); }

// ── Public entry point ──────────────────────────────────────────────

const PROFILE_COLS =
  'first_name,last_name,middle_name,profile_photo,phone,marketing_opt_in,date_of_birth,gender,' +
  'address,travel_document,emergency_contact,known_traveller_number,redress_number,' +
  'loyalty_programs,flight_prefs,saved_passengers';

export async function initProfileForm(supabase, user, opts = {}) {
  const alertId = opts.alertId || 'wt-alert';
  const mount = document.getElementById(opts.mountId || 'wt-profile-body');
  // The partner portal embeds the editor inside its own page and has its own
  // nav, so it gets every section stacked with no hub around them.
  const hub = opts.rail !== false;
  const logoutId = opts.logoutId || 'wt-logout';
  if (!mount) return;

  maybeOptOutInternal(user.email);

  const [{ data, error }, savedRes] = await Promise.all([
    supabase.from('profiles').select(PROFILE_COLS).eq('id', user.id).single(),
    // Written by the app on every heart tap (saved_destinations, owner-only
    // RLS). A failure here must not take the whole profile down with it.
    supabase.from('saved_destinations').select('code, destination, created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false })
      .then((r) => r, (e) => ({ data: null, error: e })),
  ]);
  if (error) showAlert(alertId, 'error', 'Could not load your profile. ' + error.message);
  if (savedRes && savedRes.error) console.error('[profile] saved_destinations fetch failed:', savedRes.error.message);

  // The working copy. Each section's save merges its own columns back in, so
  // the read views stay true without re-fetching the row.
  const p = Object.assign({}, data || {});
  p.__email = user.email;
  p.__saved = (savedRes && savedRes.data) || [];
  p.__people = emptyPeople();

  // null = the hub. On a phone the hub and a section are never both on screen;
  // on a wide screen the menu stays beside whatever is open.
  let active = null;
  // Wide screens keep the menu on show whatever is open, so landing on an
  // empty panel is just half a blank page — My Profile opens by default
  // there. On a phone the hub IS the page, so it stays the landing view.
  const WIDE = window.matchMedia('(min-width: 900px)');
  const landing = () => (WIDE.matches ? 'profile' : null);
  const editing = new Set();
  const gates = { affiliate: false, admin: false };

  // ── Hero ──
  /** One photo per saved place, so the header reads as "where you are thinking
   *  of going" rather than as a gallery of one destination — the same rule the
   *  app's ProfileHero follows. No saved places is a flat azure wash, never a
   *  stock photo of somewhere they never picked. */
  function heroPhotos() {
    const out = [], seen = new Set();
    for (const d of p.__saved || []) {
      const rec = d.destination || {};
      const url = (rec.images && rec.images[0] && rec.images[0].url) || rec.image;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    }
    return out.slice(0, 6);
  }

  function heroHtml() {
    const photos = heroPhotos();
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
    return '<div class="ph-head">' +
      '<div class="ph-hero' + (photos.length ? ' has-photo' : '') + '">' +
      (photos.length
        ? '<div class="ph-hero-photos">' + photos.map((u, i) =>
            '<img src="' + esc(u) + '" alt="" class="ph-hero-img' + (i === 0 ? ' is-on' : '') + '" ' +
            'loading="' + (i === 0 ? 'eager' : 'lazy') + '" />').join('') + '</div>'
        : '') +
      // The avatar opens Basic Information, which is where the photo is set —
      // the app opens a picker here, and the web equivalent is that field.
      '<button type="button" class="ph-avatar-ring" data-open="profile" aria-label="Open your profile">' +
        '<span class="ph-avatar">' +
          (p.profile_photo
            ? '<img src="' + esc(p.profile_photo) + '" alt="" />'
            : esc(initials(p.first_name, p.last_name))) +
        '</span>' +
        '<span class="ph-avatar-badge">' + ico('camera') + '</span>' +
      '</button>' +
      '</div>' +
      '<div class="ph-name-block"><p class="ph-eyebrow">Profile</p>' +
      '<h1 class="ph-name">' + esc(name || 'Your profile') + '</h1></div>' +
    '</div>';
  }

  // ── Menu ──
  function menuRow(r) {
    const sub = r.sub ? r.sub(p) : '';
    const inner =
      '<span class="ph-row-icon">' + ico(r.icon) + '</span>' +
      '<span class="ph-row-body"><span class="ph-row-title">' + esc(r.title) + '</span>' +
      (sub ? '<span class="ph-row-sub">' + esc(sub) + '</span>' : '') + '</span>' +
      '<span class="ph-row-chev">' + ico('alt-arrow-right') + '</span>';
    if (r.href) return '<a class="ph-row" href="' + esc(r.href) + '">' + inner + '</a>';
    return '<button type="button" class="ph-row' + (r.key === active ? ' is-active' : '') + '" ' +
      'data-open="' + r.key + '"' + (r.key === active ? ' aria-current="true"' : '') + '>' + inner + '</button>';
  }

  function menuGroup(label, rows) {
    if (!rows.length) return '';
    return '<section class="ph-group"><h2 class="ph-group-label">' + esc(label) + '</h2>' +
      rows.map(menuRow).join('') + '</section>';
  }

  function menuHtml() {
    const accountRows = ACCOUNT_ROWS.filter((r) => gates[r.gate]);
    // The two tiles open sections like any row, so on a wide screen — where
    // the menu stays beside what is open — they carry the same active mark.
    // `pending` strokes the tile amber with a count, as the app's does for
    // invites waiting on you.
    const tile = (key, icon, label, pending) =>
      '<button type="button" class="ph-tile' + (key === active ? ' is-active' : '') + (pending ? ' is-pending' : '') + '" ' +
      'data-open="' + key + '"' + (key === active ? ' aria-current="true"' : '') + '>' +
        (pending ? '<span class="ph-tile-badge">' + pending + '</span>' : '') +
        '<span class="ph-tile-icon">' + ico(icon) + '</span>' +
        '<span class="ph-tile-label">' + label + '</span></button>';
    // A partner or admin comes here to get to their dashboard far more often
    // than to edit their date of birth, so those go first and solid — the
    // only filled surfaces on the page, which is what makes them findable
    // without reading. Everyone else sees the tiles at the top as before,
    // since the stack renders nothing when it is empty.
    const wideTile = (href, icon, label, solid) =>
      '<a class="ph-wide-tile' + (solid ? ' ph-wide-tile--solid' : '') + '" href="' + esc(href) + '">' +
        '<span class="ph-wide-tile-label">' + esc(label) + '</span>' +
        '<span class="ph-wide-tile-icon">' + ico(icon) + '</span></a>';

    return (accountRows.length
        ? '<div class="ph-wide-stack">' +
            accountRows.map((r) => wideTile(r.href, r.icon, r.title, true)).join('') +
          '</div>'
        : '') +
      '<div class="ph-tiles">' +
        tile('profile', 'user-circle', esc(possessive(p.first_name)) + '<br />Profile') +
        tile('travellers', 'users-group-rounded', 'Saved<br />Travelers',
          (p.__people && p.__people.incoming.length) || 0) +
      '</div>' +
      wideTile('/account/bookings/', 'route', possessive(p.first_name) + ' Trips', false) +
      MENU.map((g) => menuGroup(g.label, g.rows)).join('') +
      menuGroup('Policy', POLICY_ROWS) +
      '<button type="button" class="ph-logout" data-logout>' + ico('logout-2') + ' Log Out</button>';
  }

  // ── Section ──
  function sectionHtml(key) {
    const s = SECTIONS[key];
    const isEditing = editing.has(key);
    return '<section class="pv-sec" data-sec="' + key + '">' +
      '<div class="pv-sec-head">' +
        '<div><h2 class="pv-sec-title">' + esc(s.title) + '</h2>' +
        (s.blurb ? '<p class="pv-sec-blurb">' + esc(s.blurb) + '</p>' : '') + '</div>' +
        (isEditing || !s.edit ? '' : '<button type="button" class="pv-edit" data-edit="' + key + '">Edit</button>') +
      '</div>' +
      (isEditing
        ? '<form class="pv-form" data-form="' + key + '"' +
          (key === 'flight' ? ' data-fp="' + esc(JSON.stringify(p.flight_prefs || {})) + '"' : '') +
          ' novalidate>' + s.edit(p) +
          '<div class="pv-actions">' +
            '<button type="submit" class="btn btn-primary">Save</button>' +
            '<button type="button" class="btn btn-ghost" data-cancel="' + key + '">Cancel</button>' +
          '</div></form>'
        : '<div class="pv-read">' + s.read(p, user) + '</div>') +
      '</section>';
  }

  /** The back arrow that turns a section into its own page on a phone. It is
   *  in the markup on every width — the wide layout hides it, since there the
   *  menu never left. */
  function sectionPage(key) {
    return '<div class="ph-section-page">' +
      '<button type="button" class="ph-back" data-back>' + ico('alt-arrow-left') + ' Profile</button>' +
      sectionHtml(key) + '</div>';
  }

  function paint() {
    // The partner portal has its own account pages, so only the editable parts.
    if (!hub) { mount.innerHTML = SECTION_KEYS.filter((k) => k !== 'security' && k !== 'help').map(sectionHtml).join(''); return; }
    mount.className = 'ph' + (active ? ' is-section' : ' is-hub');
    mount.innerHTML =
      heroHtml() +
      '<div class="ph-cols">' +
        '<nav class="ph-menu">' + menuHtml() + '</nav>' +
        '<div class="ph-panel">' + (active ? sectionPage(active) : '') + '</div>' +
      '</div>';
  }

  function repaintSection(key) {
    const el = mount.querySelector('[data-sec="' + key + '"]');
    if (!el) { paint(); return; }
    el.outerHTML = sectionHtml(key);
  }

  /** Menu subtitles quote the values, so they go stale the moment one is
   *  saved. Repaint just the menu rather than the whole page — repainting the
   *  page would throw away the section the reader is looking at. */
  function repaintMenu() {
    const nav = mount.querySelector('.ph-menu');
    if (nav) nav.innerHTML = menuHtml();
    const head = mount.querySelector('.ph-head');
    if (head) head.outerHTML = heroHtml();
  }

  function go(key, push) {
    active = key;
    editing.clear();
    hideAlert(alertId);
    paint();
    if (push !== false) {
      const url = new URL(window.location.href);
      if (key) url.searchParams.set('section', key);
      else url.searchParams.delete('section');
      history.pushState({ section: key }, '', url);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Deep link straight to a section (and the app's own links can do the same).
  const initial = new URLSearchParams(window.location.search).get('section');
  if (hub) active = (initial && SECTION_KEYS.includes(initial)) ? initial : landing();
  paint();

  // Which of the two dashboards this account can see. Both are own-row reads
  // under RLS; the rows appear once the answers arrive.
  if (hub) {
    Promise.all([
      supabase.from('affiliates').select('id').eq('user_id', user.id).maybeSingle().then((r) => r, () => ({})),
      supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle().then((r) => r, () => ({})),
    ]).then(([aff, adm]) => {
      gates.affiliate = !!(aff && aff.data);
      gates.admin = !!(adm && adm.data);
      if (gates.affiliate || gates.admin) repaintMenu();
    });
  }

  window.addEventListener('popstate', () => {
    if (!hub) return;
    const want = new URLSearchParams(window.location.search).get('section');
    // Back out of a section on a wide screen lands on the default rather than
    // an empty panel — the same place a fresh load puts you.
    go(SECTION_KEYS.includes(want) ? want : landing(), false);
  });

  // Crossing the breakpoint re-decides the landing view: widening opens the
  // default instead of showing an empty panel, narrowing returns to the hub.
  // A section named in the URL is an explicit choice and survives both.
  if (hub) {
    WIDE.addEventListener('change', () => {
      const named = new URLSearchParams(window.location.search).get('section');
      if (named && SECTION_KEYS.includes(named)) return;
      active = landing();
      editing.clear();
      paint();
    });
  }

  /** Appends an empty traveller card, open and scrolled to. */
  function addBlankTraveller() {
    const list = mount.querySelector('[data-trav-list]');
    if (!list) return;
    list.insertAdjacentHTML('beforeend', travellerCard({ id: uid(), title: 'mr' }, true));
    list.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ── Saved Travelers: connections and invites load after the page paints ──
  (async () => {
    // An invite opened on a computer lands here as ?invite=TOKEN.
    await acceptFromUrl(supabase, (type, msg) => showAlert(alertId, type, msg));
    try { p.__people = await loadPeople(supabase, user); }
    catch (err) { console.error('[profile] saved travelers load failed:', err); return; }
    repaintSection('travellers');
    if (hub) repaintMenu();
  })();

  // ── Clicks: navigation, per-section edit, and the repeatable rows ──
  mount.addEventListener('click', (e) => {
    if (handleTravelersClick(e, {
      supabase, user, p,
      repaint: () => { repaintSection('travellers'); if (hub) repaintMenu(); },
      alert: (type, msg) => { if (msg) showAlert(alertId, type, msg); },
    })) return;
    const reveal = e.target.closest('[data-reveal]');
    if (reveal && toggleSecret(reveal)) return;
    const chainChip = e.target.closest('[data-chain]');
    if (chainChip) {
      chainChip.setAttribute('aria-pressed', chainChip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      return;
    }
    if (e.target.closest('[data-sec-reset]')) { sendReset(); return; }
    if (e.target.closest('[data-sec-delete]')) { deleteAccount(); return; }
    const open = e.target.closest('[data-open]');
    if (open) { go(open.dataset.open); return; }
    if (e.target.closest('[data-back]')) { go(null); return; }
    if (e.target.closest('[data-logout]')) { doLogout(); return; }

    const edit = e.target.closest('[data-edit]');
    if (edit) { editing.add(edit.dataset.edit); hideAlert(alertId); repaintSection(edit.dataset.edit); return; }

    const cancel = e.target.closest('[data-cancel]');
    if (cancel) { editing.delete(cancel.dataset.cancel); hideAlert(alertId); repaintSection(cancel.dataset.cancel); return; }

    const addLoy = e.target.closest('[data-add-loy]');
    if (addLoy) {
      // The button sits in its group's head; the list is that group's own.
      // A traveller card still has a single unlabelled list, so fall back to
      // the sibling list there.
      const type = addLoy.dataset.addLoy || 'airline';
      const group = addLoy.closest('.loy-group');
      const list = group
        ? group.querySelector('[data-loy-list]')
        : addLoy.previousElementSibling;
      if (list) list.insertAdjacentHTML('beforeend', loyaltyRow({ id: uid(), type }));
      return;
    }
    const rmLoy = e.target.closest('[data-remove-loy]');
    if (rmLoy) { rmLoy.closest('[data-loy]').remove(); return; }

    // Add from the READ view: open the editor first, then drop the new card in.
    if (e.target.closest('[data-add-trav-new]')) {
      editing.add('travellers');
      hideAlert(alertId);
      repaintSection('travellers');
      addBlankTraveller();
      return;
    }
    if (e.target.closest('[data-add-trav]')) { addBlankTraveller(); return; }
    const rmTrav = e.target.closest('[data-remove-trav]');
    if (rmTrav) { rmTrav.closest('[data-trav]').remove(); return; }

    const unsave = e.target.closest('[data-unsave]');
    if (unsave) {
      const code = unsave.dataset.unsave;
      unsave.disabled = true;
      supabase.from('saved_destinations').delete()
        .eq('user_id', user.id).eq('code', code)
        .then(({ error: delErr }) => {
          if (delErr) {
            unsave.disabled = false;
            showAlert(alertId, 'error', 'Could not remove that destination: ' + delErr.message);
            return;
          }
          p.__saved = p.__saved.filter((d) => d.code !== code);
          repaintSection('saved');
          repaintMenu();
        });
      return;
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
    if (nameEl) nameEl.textContent = [v.given_name, v.family_name].filter(Boolean).join(' ') || 'New traveler';
  });

  // A new country means a new kind of region: a list for the US and Canada,
  // free text elsewhere. The old value is cleared, as the app does: "NY"
  // means nothing once the country is Canada.
  mount.addEventListener('change', (e) => {
    if (!e.target.dataset || e.target.dataset.f !== 'ad_country') return;
    const wrap = mount.querySelector('#ad-region-wrap');
    if (wrap) wrap.outerHTML = regionField(e.target.value, '');
  });

  // ── Account & Security actions ──
  async function sendReset() {
    if (!window.confirm("We'll email a password reset link to " + user.email + '.')) return;
    const { error: rErr } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin + '/account/reset/',
    });
    if (rErr) showAlert(alertId, 'error', 'Could not send the link: ' + rErr.message);
    else showAlert(alertId, 'success', 'Check your email for a link to reset your password.');
  }

  /** Same two steps as the app: what goes and what stays (from the server's
   *  own count), then a plain "are you sure". */
  async function deleteAccount() {
    const cfg = window.WT_SUPABASE || {};
    const { data: sess } = await supabase.auth.getSession();
    const call = (body) => fetch(cfg.url + '/functions/v1/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey,
        Authorization: 'Bearer ' + (sess && sess.session ? sess.session.access_token : '') },
      body: JSON.stringify(body),
    }).then((r) => r.json().catch(() => ({})));

    const preview = await call({ action: 'preview' });
    if (!preview.ok) { showAlert(alertId, 'error', preview.message || 'Could not reach the server. Try again in a moment.'); return; }
    const lines = ['This permanently deletes your sign-in, profile, passport and contact details, saved travelers and your connections to them, saved destinations and your place in group trips.'];
    if (preview.upcomingBookings > 0) {
      lines.push('Your ' + preview.upcomingBookings + ' upcoming ' + (preview.upcomingBookings === 1 ? 'booking is' : 'bookings are') +
        " NOT cancelled, but you won't see " + (preview.upcomingBookings === 1 ? 'it' : 'them') + ' here anymore. Keep your confirmation emails.');
    }
    if (preview.organizing > 0) lines.push('Group trips you organize pass to another member, or are deleted if no one else has joined.');
    lines.push('We keep booking records for tax and accounting, as the Privacy Statement explains.');
    if (!window.confirm('Delete your account?\n\n' + lines.join('\n\n'))) return;
    if (!window.confirm("Are you sure? This can't be undone.")) return;

    const res = await call({ action: 'delete', confirm: 'DELETE' });
    if (!res.ok) { showAlert(alertId, 'error', res.message || 'We could not delete your account. Try again in a moment.'); return; }
    await supabase.auth.signOut();
    window.location.href = '/';
  }

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
    if (hub) repaintMenu(); // subtitles, the hero name and the avatar all quote these
    showAlert(alertId, 'success', s.title + ' saved.');
  });

  // ── Logout ──
  async function doLogout() {
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
  }
  const out = document.getElementById(logoutId);
  if (out) out.addEventListener('click', doLogout);
}
