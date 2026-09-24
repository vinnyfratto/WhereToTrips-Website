/* ═══════════════════════════════════════════════════════════════════
   wt-address.js — the ONE way an address is written on the website.

       Line 1
       Line 2            (only when there is one)
       City, ST, Zip
       Country           (only outside the US)

   The website's copy of the app's src/utils/address.ts. Same rules as the
   app and the emails (supabase/functions/_shared/address.ts) — change
   one, change all three.
═══════════════════════════════════════════════════════════════════ */


const US_STATES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY',
  louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'puerto rico': 'PR', guam: 'GU', 'u.s. virgin islands': 'VI', 'us virgin islands': 'VI',
};

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

export function isUsCountry(country) {
  const c = clean(country).toLowerCase().replace(/\./g, '');
  return !c || c === 'us' || c === 'usa' || c === 'united states' || c === 'united states of america';
}

/** "Texas" → "TX" for a US address; anything else as written. */
export function stateCode(region, country) {
  const r = clean(region);
  if (!r || !isUsCountry(country)) return r;
  if (/^[A-Za-z]{2}$/.test(r)) return r.toUpperCase();
  return US_STATES[r.toLowerCase()] ?? r;
}

/** "City, ST, Zip" — whichever of the three are known. */
export function cityLine(a) {
  return [clean(a.city), stateCode(a.region, a.country), clean(a.postalCode)].filter(Boolean).join(', ');
}

/** The address as the lines it is written on. `countryName` turns a code
 *  into a name for the last line ("IT" → "Italy"); omitted, it is shown as-is. */
export function addressLines(a, countryName) {
  if (!a) return [];
  const lines = [clean(a.line1), clean(a.line2), cityLine(a)].filter(Boolean);
  if (lines.length && !isUsCountry(a.country)) {
    const c = clean(a.country);
    lines.push((countryName && countryName(c)) || c);
  }
  return lines;
}

/** The same lines joined with newlines, for a single <Text>. '' when empty. */
export function formatAddress(a, countryName) {
  return addressLines(a, countryName).join('\n');
}

/** The lines as HTML: escaped, joined with <br>. */
export function addressHtml(a, countryName) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return addressLines(a, countryName).map(esc).join('<br>');
}
