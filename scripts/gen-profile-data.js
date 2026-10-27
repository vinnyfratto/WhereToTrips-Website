/* Run:  node scripts/gen-profile-data.js
   Generates the website's wt-profile-data.js from the app's own data files,
   so the country table, airlines, hotel programs and chains, and the US/Canada
   region lists are never retyped by hand. It writes the WHOLE file: anything
   added to wt-profile-data.js by hand is lost on the next run, so a new list
   goes in here. (Until 2026-10-27 the hotel chains and region lists were pasted
   in by hand, and a run would have deleted them.) */
const fs = require('fs');

// The app repo sits alongside this one on the maintainer's machine; override
// with APP_DATA_DIR if it lives somewhere else.
const APP = process.env.APP_DATA_DIR || 'D:/_Apps/_Flights/Wander_App/src/data';

function arrayLiteral(src, marker) {
  const start = src.indexOf(marker);
  if (start < 0) throw new Error('marker not found: ' + marker);
  // The FIRST '[' after the marker can belong to the type annotation
  // ("COUNTRIES: Country[] = ["), so anchor on the assignment instead.
  const open = src.indexOf('[', src.indexOf('=', start));
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (!depth) break; }
  }
  return src.slice(open, i + 1);
}

const countriesSrc = fs.readFileSync(APP + '/countries.ts', 'utf8');
const COUNTRIES = eval(arrayLiteral(countriesSrc, 'export const COUNTRIES'));

const loyaltySrc = fs.readFileSync(APP + '/hotelLoyaltyPrograms.ts', 'utf8');
const HOTEL = eval(arrayLiteral(loyaltySrc, 'export const HOTEL_LOYALTY_PROGRAMS'))
  // matchKeywords are app-side only. monogram comes along because the website
  // shows the same saved-membership row, and falls back to the same mark when
  // a program has no bundled wordmark.
  .map((p) => ({ code: p.code, name: p.name, monogram: p.monogram || '' }));

const airlinesSrc = fs.readFileSync(APP + '/airlines.ts', 'utf8');
const AIRLINES = eval(arrayLiteral(airlinesSrc, 'export const AIRLINES: Airline[]'));

// The website's Preferences picker saves flight_prefs.preferredHotelChains as
// these slugs, the same as the app. Brand names are trimmed: one app entry
// carries a stray trailing space ("MGallery "), which only matters to the app's
// exact match against LiteAPI's catalog.
const chainsSrc = fs.readFileSync(APP + '/hotelChains.ts', 'utf8');
const CHAINS = eval(arrayLiteral(chainsSrc, 'export const HOTEL_CHAIN_GROUPS'))
  .map((g) => ({ slug: g.slug, name: g.name, brands: g.brands.map((b) => b.trim()) }));

// Read from the app rather than typed here: these labels were once retyped and
// drifted ("Stick to my budget" here, "None" in the app).
const profileKitSrc = fs.readFileSync(APP + '/../components/profile/ProfileKit.tsx', 'utf8');
const BUDGET_FLEX = eval(arrayLiteral(profileKitSrc, 'export const BUDGET_FLEX_OPTIONS'))
  .map((o) => ({ value: o.value, label: o.label }));

const regionsSrc = fs.readFileSync(APP + '/subdivisions.ts', 'utf8');
const US_STATES = eval(arrayLiteral(regionsSrc, 'export const US_STATES'));
const CA_PROVINCES = eval(arrayLiteral(regionsSrc, 'export const CA_PROVINCES'));

const json = (v) => JSON.stringify(v, null, 2).replace(/\n/g, '\n');

const out = `// ───────────────────────────────────────────────────────────────────
//  wt-profile-data.js — the option lists the profile form offers.
//
//  GENERATED from the app's own data files so the two never drift:
//    src/data/countries.ts            → COUNTRIES
//    src/data/hotelLoyaltyPrograms.ts → HOTEL_LOYALTY (codes + names; the
//                                       matchKeywords are app-side only)
//    src/data/airlines.ts             → AIRLINES
//    src/data/hotelChains.ts          → HOTEL_CHAINS
//    src/data/subdivisions.ts         → US_STATES + CA_PROVINCES
//    src/components/profile/ProfileKit.tsx → BUDGET_FLEX (its labels)
//  Regenerate rather than hand-editing when any of those change, with
//  node scripts/gen-profile-data.js. It writes this whole file.
// ───────────────────────────────────────────────────────────────────

/** ISO 3166-1 alpha-2 + international dialing code. */
export const COUNTRIES = ${json(COUNTRIES)};

export const COUNTRY_NAME = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));

/** Male and Female only, because that is what we can actually ticket — the
 *  app's src/data/genders.ts explains the wider four-marker standard and why
 *  offering it would produce a form that disagrees with the ticket. */
export const GENDERS = [
  { value: 'f', label: 'Female' },
  { value: 'm', label: 'Male' },
];

export const TITLES = [
  { value: 'mr', label: 'Mr' },
  { value: 'ms', label: 'Ms' },
  { value: 'mrs', label: 'Mrs' },
  { value: 'miss', label: 'Miss' },
  { value: 'dr', label: 'Dr' },
];

export const DOC_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'identity_card', label: 'ID Card' },
];

// SEAT_CLASSES and STOP_PREFS lived here. Both left FlightPreferences in the
// app: stop count could only ever agree with the flight picker, which already
// prefers fewer stops, and seat class never changed which flights came back.

export const BUDGET_FLEX = [
  // The app's labels (ProfileKit.tsx BUDGET_FLEX_OPTIONS), so both say the same.
${BUDGET_FLEX.map((o) => `  { value: '${o.value}', label: '${o.label}' },`).join('\n')}
];

export const AIRLINES = ${json(AIRLINES)};

export const HOTEL_LOYALTY = ${json(HOTEL)};

// ── Hotel brand groups (copied from the app's src/data/hotelChains.ts) ──
// The app's Preferences picker saves flight_prefs.preferredHotelChains as these
// slugs. Brands are kept so typing "Sheraton" finds Marriott, as in the app.
export const HOTEL_CHAINS = ${JSON.stringify(CHAINS)};

// ── States and provinces (copied from the app's src/data/subdivisions.ts) ──
// Only the US and Canada are fixed lists; everywhere else the field is free text.
export const US_STATES = ${JSON.stringify(US_STATES)};
export const CA_PROVINCES = ${JSON.stringify(CA_PROVINCES)};

/** The list to pick from, or null when the region is free text. No country counts as US. */
export function subdivisionsFor(country) {
  return ({ US: US_STATES, CA: CA_PROVINCES })[(country || 'US').trim().toUpperCase()] || null;
}

/** What that country calls the field. */
export function subdivisionLabel(country) {
  switch ((country || 'US').trim().toUpperCase()) {
    case 'US': return 'State';
    case 'CA': return 'Province';
    case 'GB': return 'County';
    case 'AU': return 'State / Territory';
    default:   return 'State / Region';
  }
}
`;

fs.writeFileSync(require('path').join(__dirname, '../src/assets/js/wt-profile-data.js'), out);
console.log('wrote wt-profile-data.js —', COUNTRIES.length, 'countries,', HOTEL.length, 'hotel programs,',
  AIRLINES.length, 'airlines,', CHAINS.length, 'hotel chains,', US_STATES.length, 'US states,',
  CA_PROVINCES.length, 'Canadian provinces');
