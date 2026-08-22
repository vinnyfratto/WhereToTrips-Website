/* Run:  node scripts/gen-profile-data.js
   Generates the website's wt-profile-data.js from the app's own data files,
   so the country table and hotel-loyalty list are never retyped by hand. */
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
  .map((p) => ({ code: p.code, name: p.name })); // matchKeywords are app-side only

const airlinesSrc = fs.readFileSync(APP + '/airlines.ts', 'utf8');
const AIRLINES = eval(arrayLiteral(airlinesSrc, 'export const AIRLINES: Airline[]'));

// baseVibes.ts resolves photos through another module — only the key/label
// pairs matter here, so they are read out of its RAW table.
const vibesSrc = fs.readFileSync(APP + '/baseVibes.ts', 'utf8');
const VIBES = eval(arrayLiteral(vibesSrc, 'const RAW:')).map((v) => ({ key: v.key, label: v.label }));
const CAP = Number(/BASE_VIBE_CAP = (\d+)/.exec(vibesSrc)[1]);

const json = (v) => JSON.stringify(v, null, 2).replace(/\n/g, '\n');

const out = `// ───────────────────────────────────────────────────────────────────
//  wt-profile-data.js — the option lists the profile form offers.
//
//  GENERATED from the app's own data files so the two never drift:
//    src/data/countries.ts            → COUNTRIES
//    src/data/hotelLoyaltyPrograms.ts → HOTEL_LOYALTY (codes + names; the
//                                       matchKeywords are app-side only)
//    src/data/airlines.ts             → AIRLINES
//    src/data/baseVibes.ts            → BASE_VIBES + BASE_VIBE_CAP
//  Regenerate rather than hand-editing when any of those change.
// ───────────────────────────────────────────────────────────────────

/** ISO 3166-1 alpha-2 + international dialling code. */
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

export const SEAT_CLASSES = [
  { value: 'economy', label: 'Economy' },
  { value: 'economy_plus', label: 'Economy Plus' },
  { value: 'premium_economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' },
];

export const STOP_PREFS = [
  { value: 'nonstop', label: 'Nonstop only' },
  { value: '1_layover', label: 'Up to 1 layover' },
  { value: '2_layovers', label: 'Up to 2 layovers' },
];

export const BUDGET_FLEX = [
  { value: 'none', label: 'Stick to my budget' },
  { value: '2pct', label: 'Up to 2% over' },
  { value: '5pct', label: 'Up to 5% over' },
  { value: '10pct', label: 'Up to 10% over' },
];

export const AIRLINES = ${json(AIRLINES)};

export const HOTEL_LOYALTY = ${json(HOTEL)};

/** The traveller's core travel personality, captured in the app's account
 *  walkthrough and stored on profiles.base_vibes. */
export const BASE_VIBES = ${json(VIBES)};

export const BASE_VIBE_CAP = ${CAP};
`;

fs.writeFileSync(require('path').join(__dirname, '../src/assets/js/wt-profile-data.js'), out);
console.log('wrote wt-profile-data.js —', COUNTRIES.length, 'countries,', HOTEL.length, 'hotel programs,',
  AIRLINES.length, 'airlines,', VIBES.length, 'base vibes (cap ' + CAP + ')');
