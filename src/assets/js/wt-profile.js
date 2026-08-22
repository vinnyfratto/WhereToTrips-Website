// ───────────────────────────────────────────────────────────────────
//  wt-profile.js — the shared profile editor.
//  initProfileForm(supabase, user, opts) renders the whole form into an
//  empty <form>, loads the profile into it, and wires Save + Logout. Used
//  by both /account/profile/ (wt-auth.js) and /partner-dashboard/settings/
//  (wt-partner-settings.js) so there is ONE editor and ONE client.
//
//  The form is BUILT here rather than written into each page's template:
//  it now covers every profile column the app writes, and keeping two
//  templates in step by hand was not going to survive.
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
  COUNTRIES, GENDERS, TITLES, DOC_TYPES, SEAT_CLASSES, STOP_PREFS, BUDGET_FLEX,
  HOTEL_LOYALTY, BASE_VIBES, BASE_VIBE_CAP,
} from './wt-profile-data.js';

// ── Small helpers ───────────────────────────────────────────────────

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function showAlert(id, type, msg) {
  const el = document.getElementById(id); if (!el) return;
  el.className = 'alert show alert-' + type; el.textContent = msg;
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
/** Drops empty keys so an untouched jsonb block is stored as null, not as an
 *  object full of empty strings. */
function objOrNull(obj) {
  const out = {};
  for (const k of Object.keys(obj)) if (obj[k]) out[k] = obj[k];
  return Object.keys(out).length ? out : null;
}
function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
}

// ── Field builders ──────────────────────────────────────────────────

function textField(name, label, o) {
  const opt = o || {};
  return '<div class="field' + (opt.rowItem ? '' : '') + '">' +
    '<label for="f-' + name + '">' + esc(label) +
    (opt.hint ? ' <span class="hint">' + esc(opt.hint) + '</span>' : '') + '</label>' +
    '<input id="f-' + name + '" data-f="' + name + '" type="' + (opt.type || 'text') + '"' +
    (opt.autocomplete ? ' autocomplete="' + opt.autocomplete + '"' : '') +
    (opt.placeholder ? ' placeholder="' + esc(opt.placeholder) + '"' : '') +
    (opt.disabled ? ' disabled' : '') +
    (opt.maxlength ? ' maxlength="' + opt.maxlength + '"' : '') + ' /></div>';
}

function selectField(name, label, options, o) {
  const opt = o || {};
  const blank = opt.blank === undefined ? 'No preference' : opt.blank;
  return '<div class="field"><label for="f-' + name + '">' + esc(label) +
    (opt.hint ? ' <span class="hint">' + esc(opt.hint) + '</span>' : '') + '</label>' +
    '<select id="f-' + name + '" data-f="' + name + '">' +
    (blank === false ? '' : '<option value="">' + esc(blank) + '</option>') +
    options.map((op) => '<option value="' + esc(op.value) + '">' + esc(op.label) + '</option>').join('') +
    '</select></div>';
}

const countryOptions = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));

function row(inner) { return '<div class="field-row">' + inner + '</div>'; }

function sectionBlock(title, inner, cls) {
  return '<section class="acct-sec' + (cls ? ' ' + cls : '') + '">' +
    '<h2 class="acct-section-title">' + esc(title) + '</h2>' + inner + '</section>';
}

// ── Reading a scope back out of the DOM ─────────────────────────────

/** Every data-f input inside `scope` that is not inside a nested list row. */
function readScope(scope, skipSelector) {
  const out = {};
  scope.querySelectorAll('[data-f]').forEach((el) => {
    if (skipSelector && el.closest(skipSelector) && el.closest(skipSelector) !== scope) return;
    out[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value.trim();
  });
  return out;
}

function fill(scope, values) {
  if (!values) return;
  scope.querySelectorAll('[data-f]').forEach((el) => {
    const v = values[el.dataset.f];
    if (v == null) return;
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v;
  });
}

// ── Loyalty programs (used by the profile and by each saved traveller) ──

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
    '<button type="button" class="btn-xs btn btn-ghost" data-remove-loy>Remove</button>' +
    '</div>';
}

function loyaltyEditor(programs) {
  return '<div class="loy-list" data-loy-list>' + programs.map(loyaltyRow).join('') + '</div>' +
    '<button type="button" class="bk-link-btn" data-add-loy>+ Add a program</button>';
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
  const sub = [t.document_number ? 'Doc ' + t.document_number : '', t.born_on].filter(Boolean).join(' · ');
  return '<details class="trav"' + (open ? ' open' : '') + ' data-trav data-id="' + esc(t.id) + '">' +
    '<summary><span class="trav-name">' + esc(name) + '</span>' +
    (sub ? '<span class="trav-sub">' + esc(sub) + '</span>' : '') + '</summary>' +
    '<div class="trav-body">' +
      row(
        '<div class="field"><label>Title</label><select data-f="title">' +
          TITLES.map((o) => '<option value="' + o.value + '"' + (t.title === o.value ? ' selected' : '') + '>' + o.label + '</option>').join('') +
        '</select></div>' +
        '<div class="field"><label>Date of birth</label><input data-f="born_on" type="date" value="' + esc(t.born_on || '') + '" /></div>'
      ) +
      row(
        '<div class="field"><label>First name</label><input data-f="given_name" type="text" value="' + esc(t.given_name || '') + '" /></div>' +
        '<div class="field"><label>Last name</label><input data-f="family_name" type="text" value="' + esc(t.family_name || '') + '" /></div>'
      ) +
      row(
        '<div class="field"><label>Middle name <span class="hint">(if on their ID)</span></label><input data-f="middle_name" type="text" value="' + esc(t.middle_name || '') + '" /></div>' +
        '<div class="field"><label>Gender</label><select data-f="gender">' +
          GENDERS.map((o) => '<option value="' + o.value + '"' + (t.gender === o.value ? ' selected' : '') + '>' + o.label + '</option>').join('') +
        '</select></div>'
      ) +
      row(
        '<div class="field"><label>Email</label><input data-f="email" type="email" value="' + esc(t.email || '') + '" /></div>' +
        '<div class="field"><label>Phone</label><input data-f="phone_number" type="tel" value="' + esc(t.phone_number || '') + '" /></div>'
      ) +
      row(
        '<div class="field"><label>Nationality</label><select data-f="nationality"><option value="">—</option>' +
          COUNTRIES.map((c) => '<option value="' + c.code + '"' + (t.nationality === c.code ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') +
        '</select></div>' +
        '<div class="field"><label>Document</label><select data-f="document_type">' +
          DOC_TYPES.map((o) => '<option value="' + o.value + '"' + (t.document_type === o.value ? ' selected' : '') + '>' + o.label + '</option>').join('') +
        '</select></div>'
      ) +
      row(
        '<div class="field"><label>Document number</label><input data-f="document_number" type="text" value="' + esc(t.document_number || '') + '" /></div>' +
        '<div class="field"><label>Expires</label><input data-f="document_expiry" type="date" value="' + esc(t.document_expiry || '') + '" /></div>'
      ) +
      row(
        '<div class="field"><label>Issuing country</label><select data-f="document_issuing_country"><option value="">—</option>' +
          COUNTRIES.map((c) => '<option value="' + c.code + '"' + (t.document_issuing_country === c.code ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') +
        '</select></div>' +
        '<div class="field"><label>Known Traveller number <span class="hint">(9 characters)</span></label>' +
        '<input data-f="known_traveller_number" type="text" maxlength="9" value="' + esc(t.known_traveller_number || '') + '" /></div>'
      ) +
      row(
        '<div class="field"><label>Redress number <span class="hint">(optional)</span></label>' +
        '<input data-f="redress_number" type="text" value="' + esc(t.redress_number || '') + '" /></div>' +
        '<div class="field"><label>Photo URL <span class="hint">(optional)</span></label>' +
        '<input data-f="profile_photo" type="url" value="' + esc(t.profile_photo || '') + '" /></div>'
      ) +
      '<h3 class="trav-sub-head">Loyalty programs</h3>' +
      loyaltyEditor(readLoyaltyPrograms(t)) +
      '<p class="trav-actions"><button type="button" class="btn btn-ghost btn-xs" data-remove-trav>Remove this traveller</button></p>' +
    '</div></details>';
}

function readTravellers(listEl) {
  if (!listEl) return [];
  return [...listEl.querySelectorAll('[data-trav]')].map((card) => {
    const body = card.querySelector('.trav-body');
    const v = readScope(body, '[data-loy]');
    const t = { id: card.dataset.id };
    // Only the fields the card actually owns — the loyalty rows below live in
    // their own scope and are read separately.
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

// ── Vibes ───────────────────────────────────────────────────────────

function vibeChips(selected) {
  const set = new Set(selected || []);
  return '<p class="acct-sub">The travel personality the app starts your matches from. Pick up to ' +
    BASE_VIBE_CAP + '.</p><div class="vibe-chips" data-vibes>' +
    BASE_VIBES.map((v) => '<button type="button" class="vibe-chip" data-vibe="' + v.key + '" ' +
      'aria-pressed="' + (set.has(v.key) ? 'true' : 'false') + '">' + esc(v.label) + '</button>').join('') +
    '</div>';
}

// ── The form ────────────────────────────────────────────────────────

function buildForm(user) {
  return '<div class="acct-grid">' +

    sectionBlock('Account details',
      row(textField('first_name', 'First name', { autocomplete: 'given-name' }) +
          textField('last_name', 'Last name', { autocomplete: 'family-name' })) +
      row(textField('middle_name', 'Middle name', { hint: '(if on your ID)' }) +
          textField('date_of_birth', 'Date of birth', { type: 'date' })) +
      textField('email', 'Email', { type: 'email', hint: '(managed by your login)', disabled: true }) +
      row(textField('phone', 'Phone', { type: 'tel', hint: '(optional)', autocomplete: 'tel' }) +
          selectField('gender', 'Gender', GENDERS, { blank: '—' })) +
      textField('profile_photo', 'Profile photo URL', { type: 'url', hint: '(optional)', placeholder: 'https://…' }) +
      '<label class="check"><input data-f="marketing_opt_in" type="checkbox" />' +
      '<span>Send me travel ideas and product updates by email.</span></label>') +

    sectionBlock('Flight preferences',
      '<p class="acct-sub">These sync with the WhereTo app to personalise your recommendations.</p>' +
      textField('fp_nearestAirport', 'Nearest airport', { hint: '(name or IATA code)', placeholder: 'e.g. JFK' }) +
      row(selectField('fp_seatClass', 'Seat class', SEAT_CLASSES) +
          selectField('fp_stopCount', 'Stops', STOP_PREFS)) +
      textField('fp_preferredAirlines', 'Preferred airlines', { hint: '(IATA codes, comma-separated)', placeholder: 'e.g. AA, DL, B6' }) +
      selectField('fp_budgetFlexibility', 'Budget flexibility', BUDGET_FLEX)) +

    sectionBlock('Travel document',
      '<p class="acct-sub">Your own passport or ID, so booking for yourself fills in as fast as booking for anyone you have saved.</p>' +
      row(selectField('td_type', 'Document', DOC_TYPES, { blank: '—' }) +
          textField('td_number', 'Document number')) +
      row(selectField('td_issuingCountry', 'Issuing country', countryOptions, { blank: '—' }) +
          textField('td_expiry', 'Expires', { type: 'date' })) +
      row(textField('known_traveller_number', 'Known Traveller number', { hint: '(TSA PreCheck / Global Entry, 9 characters)', maxlength: 9 }) +
          textField('redress_number', 'Redress number', { hint: '(optional)' }))) +

    sectionBlock('Home address',
      '<p class="acct-sub">For your own reference and for billing autofill. Nothing has to parse it, so use whatever shape is right for your country.</p>' +
      textField('ad_line1', 'Address') +
      textField('ad_line2', 'Address line 2', { hint: '(optional)' }) +
      row(textField('ad_city', 'City') + textField('ad_region', 'State / province')) +
      row(textField('ad_postalCode', 'Postal code') +
          selectField('ad_country', 'Country', countryOptions, { blank: '—' }))) +

    sectionBlock('Emergency contact',
      '<p class="acct-sub">Who to call if something goes wrong on a trip.</p>' +
      row(textField('ec_name', 'Name') + textField('ec_relationship', 'Relationship', { hint: '(optional)' })) +
      row(textField('ec_phone', 'Phone', { type: 'tel' }) +
          textField('ec_email', 'Email', { type: 'email', hint: '(optional)' }))) +

    sectionBlock('Loyalty programs',
      '<p class="acct-sub">Airline and hotel membership numbers, passed through when a booking supports them.</p>' +
      '<div data-profile-loyalty></div>') +

    sectionBlock('My vibes', '<div data-vibe-mount></div>', 'acct-sec--wide') +

    sectionBlock('Saved travellers',
      '<p class="acct-sub">The people you book for. You are already one of them — your own details come ' +
      'from this profile, so there is nothing to add for yourself.</p>' +
      '<div class="trav-list" data-trav-list></div>' +
      '<button type="button" class="bk-link-btn" data-add-trav>+ Add a traveller</button>',
      'acct-sec--wide') +

    '</div>' +

    '<datalist id="loy-hotel-programs">' +
      HOTEL_LOYALTY.map((p) => '<option value="' + esc(p.code) + '">' + esc(p.name) + '</option>').join('') +
    '</datalist>' +

    '<div class="acct-save"><button type="submit" class="btn btn-primary">Save changes</button></div>';
}

// ── Public entry point ──────────────────────────────────────────────

const PROFILE_COLS =
  'first_name,last_name,middle_name,profile_photo,phone,marketing_opt_in,date_of_birth,gender,' +
  'address,travel_document,emergency_contact,known_traveller_number,redress_number,' +
  'loyalty_programs,base_vibes,flight_prefs,saved_passengers';

export async function initProfileForm(supabase, user, opts = {}) {
  const alertId = opts.alertId || 'wt-alert';
  const formId = opts.formId || 'wt-profile-form';
  const logoutId = opts.logoutId || 'wt-logout';

  const form = document.getElementById(formId);
  if (!form) return;

  maybeOptOutInternal(user.email);

  const { data: profile, error } = await supabase
    .from('profiles').select(PROFILE_COLS).eq('id', user.id).single();
  if (error) showAlert(alertId, 'error', 'Could not load your profile. ' + error.message);

  const p = profile || {};
  form.innerHTML = buildForm(user);

  // ── Populate ──
  const fp = p.flight_prefs || {};
  const ad = p.address || {};
  const td = p.travel_document || {};
  const ec = p.emergency_contact || {};
  fill(form, {
    first_name: p.first_name, last_name: p.last_name, middle_name: p.middle_name,
    email: user.email, phone: p.phone, profile_photo: p.profile_photo,
    date_of_birth: p.date_of_birth, gender: p.gender,
    marketing_opt_in: p.marketing_opt_in,
    fp_nearestAirport: fp.nearestAirport, fp_seatClass: fp.seatClass,
    fp_stopCount: fp.stopCount, fp_budgetFlexibility: fp.budgetFlexibility,
    fp_preferredAirlines: Array.isArray(fp.preferredAirlines) ? fp.preferredAirlines.join(', ') : '',
    td_type: td.type, td_number: td.number, td_issuingCountry: td.issuingCountry, td_expiry: td.expiry,
    known_traveller_number: p.known_traveller_number, redress_number: p.redress_number,
    ad_line1: ad.line1, ad_line2: ad.line2, ad_city: ad.city, ad_region: ad.region,
    ad_postalCode: ad.postalCode, ad_country: ad.country,
    ec_name: ec.name, ec_relationship: ec.relationship, ec_phone: ec.phone, ec_email: ec.email,
  });

  form.querySelector('[data-profile-loyalty]').innerHTML =
    loyaltyEditor(readLoyaltyPrograms({ loyalty_programs: p.loyalty_programs }));
  form.querySelector('[data-vibe-mount]').innerHTML = vibeChips(p.base_vibes);

  const travList = form.querySelector('[data-trav-list]');
  const travellers = Array.isArray(p.saved_passengers) ? p.saved_passengers : [];
  travList.innerHTML = travellers.map((t) => travellerCard(t, false)).join('');

  // ── Repeatable-list wiring ──
  form.addEventListener('click', (e) => {
    const addLoy = e.target.closest('[data-add-loy]');
    if (addLoy) {
      const list = addLoy.previousElementSibling;
      list.insertAdjacentHTML('beforeend', loyaltyRow({ id: uid(), type: 'airline' }));
      return;
    }
    const rmLoy = e.target.closest('[data-remove-loy]');
    if (rmLoy) { rmLoy.closest('[data-loy]').remove(); return; }

    if (e.target.closest('[data-add-trav]')) {
      travList.insertAdjacentHTML('beforeend', travellerCard({ id: uid(), title: 'mr' }, true));
      travList.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    const rmTrav = e.target.closest('[data-remove-trav]');
    if (rmTrav) { rmTrav.closest('[data-trav]').remove(); return; }

    const chip = e.target.closest('[data-vibe]');
    if (chip) {
      const on = chip.getAttribute('aria-pressed') === 'true';
      const chosen = form.querySelectorAll('[data-vibe][aria-pressed="true"]').length;
      if (!on && chosen >= BASE_VIBE_CAP) {
        showAlert(alertId, 'info', 'Pick up to ' + BASE_VIBE_CAP + ' vibes — unpick one first.');
        return;
      }
      chip.setAttribute('aria-pressed', on ? 'false' : 'true');
      hideAlert(alertId);
    }
  });

  // A traveller's summary should follow the name as it is typed, so a card
  // collapsed after editing is not still labelled "New traveller".
  form.addEventListener('input', (e) => {
    const f = e.target.dataset && e.target.dataset.f;
    if (f !== 'given_name' && f !== 'family_name') return;
    const card = e.target.closest('[data-trav]');
    if (!card) return;
    const v = readScope(card.querySelector('.trav-body'), '[data-loy]');
    const nameEl = card.querySelector('.trav-name');
    if (nameEl) nameEl.textContent = [v.given_name, v.family_name].filter(Boolean).join(' ') || 'New traveller';
  });

  // ── Save ──
  const btn = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertId);
    const v = readScope(form, '[data-loy], [data-trav]');

    // The only field with a shape the airline actually enforces.
    if (v.known_traveller_number && !/^[A-Za-z0-9]{9}$/.test(v.known_traveller_number)) {
      showAlert(alertId, 'error', 'A Known Traveller number is exactly 9 letters and digits.');
      return;
    }

    const airlines = v.fp_preferredAirlines
      ? v.fp_preferredAirlines.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      : [];
    // No dateFlex: nothing searches nearby dates off a profile preference, so
    // it was a setting that changed nothing (the app dropped it too).
    const flight_prefs = objOrNull({
      nearestAirport: v.fp_nearestAirport,
      seatClass: v.fp_seatClass,
      preferredAirlines: airlines.length ? airlines : '',
      stopCount: v.fp_stopCount,
      budgetFlexibility: v.fp_budgetFlexibility,
    }) || {};

    const base_vibes = [...form.querySelectorAll('[data-vibe][aria-pressed="true"]')]
      .map((c) => c.dataset.vibe);

    const updates = {
      first_name: v.first_name,
      last_name: v.last_name,
      middle_name: orNull(v.middle_name),
      phone: orNull(v.phone),
      profile_photo: orNull(v.profile_photo),
      marketing_opt_in: !!v.marketing_opt_in,
      date_of_birth: orNull(v.date_of_birth),
      gender: v.gender || null,
      known_traveller_number: orNull(v.known_traveller_number),
      redress_number: orNull(v.redress_number),
      flight_prefs,
      base_vibes,
      address: objOrNull({
        line1: v.ad_line1, line2: v.ad_line2, city: v.ad_city,
        region: v.ad_region, postalCode: v.ad_postalCode, country: v.ad_country,
      }),
      emergency_contact: objOrNull({
        name: v.ec_name, relationship: v.ec_relationship, phone: v.ec_phone, email: v.ec_email,
      }),
      // A document is only meaningful whole — a number with no expiry would
      // fail at the airline anyway, so a partial one is stored as nothing.
      travel_document: (v.td_number && v.td_type)
        ? { type: v.td_type, number: v.td_number, issuingCountry: v.td_issuingCountry || '', expiry: v.td_expiry || '' }
        : null,
      loyalty_programs: readLoyaltyEditor(form.querySelector('[data-profile-loyalty] [data-loy-list]')),
      saved_passengers: readTravellers(travList),
    };

    busy(btn, true, 'Saving…');
    const { error: upErr } = await supabase.from('profiles').update(updates).eq('id', user.id);
    busy(btn, false);
    if (upErr) { showAlert(alertId, 'error', 'Save failed: ' + upErr.message); return; }
    showAlert(alertId, 'success', 'Profile saved.');
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
