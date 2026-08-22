// ───────────────────────────────────────────────────────────────────
//  wt-booking-kit.js — the shared pieces of the traveller's bookings
//  pages: data loading, the hotel/flight pairing rules, formatting, and
//  the small render primitives both the list and the detail view use.
//
//  Everything here is a port of the app's own logic so the two surfaces
//  agree about what a booking IS:
//    src/store/bookingsStore.ts  → fetchBookings / buildBookingList
//    src/utils/edgeApi.ts        → callEdge
//    src/utils/useDestinationImages.ts → loadDestinationImages
//  Reads go straight through the anon key + RLS (each of the three order
//  tables has an owner-only SELECT policy), so nothing here needs a
//  server or a service-role key.
// ───────────────────────────────────────────────────────────────────

const cfg = window.WT_SUPABASE || {};

// ── Fetch ───────────────────────────────────────────────────────────

// The same column lists the app selects — anything added to a booking row
// has to be named in both places to reach either surface.
const ORDER_COLS =
  'id, duffel_order_id, booking_reference, origin, destination, departing_at, arriving_at, ' +
  'total_amount, total_currency, status, passenger_count, duffel_payload, created_at';
const HOTEL_COLS =
  'id, liteapi_booking_id, booking_reference, hotel_id, hotel_name, hotel_photo, city, country, ' +
  'check_in, check_out, nights, guests, rooms, room_name, board_type, refundable, mapped_room_id, ' +
  'cancellation_deadline, status, payment_status, total_amount, total_currency, checkin_instructions, ' +
  'liteapi_payload, trip_id, created_at';
const FLIGHT_COLS =
  'id, liteapi_booking_id, booking_reference, airline_pnr, origin, destination, depart_date, ' +
  'return_date, passengers, cabin_class, fare_brand, total_amount, total_currency, status, ' +
  'payment_status, liteapi_payload, live_mode, trip_id, created_at';

/** All three order tables for one user, in parallel. A single table failing
 *  is survivable (its section just comes back empty) — only all three failing
 *  is an error worth showing, same rule the app's store applies. */
export async function fetchBookings(supabase, userId) {
  const [duffelRes, hotelRes, flightRes] = await Promise.all([
    supabase.from('orders').select(ORDER_COLS).eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('hotel_orders').select(HOTEL_COLS).eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('flight_orders').select(FLIGHT_COLS).eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  if (duffelRes.error) console.error('[bookings] orders fetch failed:', duffelRes.error.message);
  if (hotelRes.error)  console.error('[bookings] hotel_orders fetch failed:', hotelRes.error.message);
  if (flightRes.error) console.error('[bookings] flight_orders fetch failed:', flightRes.error.message);

  const allFailed = !!(duffelRes.error && hotelRes.error && flightRes.error);
  return {
    orders:       duffelRes.data || [],
    hotelOrders:  hotelRes.data || [],
    flightOrders: flightRes.data || [],
    error: allFailed ? (duffelRes.error && duffelRes.error.message) || 'Failed to load bookings' : null,
  };
}

/** The account holder plus everyone they have saved, for matching a booked
 *  passenger name to a face. Mirrors src/utils/selfTraveller.ts allTravellers —
 *  the holder is derived from the profile, never stored twice. */
export async function fetchTravellerRoster(supabase, user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name,last_name,profile_photo,saved_passengers')
    .eq('id', user.id)
    .single();
  if (error || !data) return [];
  const self = {
    given_name: data.first_name || '',
    family_name: data.last_name || '',
    profile_photo: data.profile_photo || null,
  };
  return [self].concat(Array.isArray(data.saved_passengers) ? data.saved_passengers : []);
}

// ── Pairing (ported from bookingsStore.buildBookingList) ────────────

/** Pair off hotel/flight rows sharing a trip_id BEFORE building single-item
 *  cards for the rest. A trip_id only means "these were staged together",
 *  never "these definitely have a partner" — the other leg may not be booked
 *  yet, or may have been removed from staging before it was — so a trip_id
 *  that cannot find its match still falls through to its own solo card
 *  rather than vanishing. */
export function buildBookingList(orders, hotelOrders, flightOrders) {
  const usedHotelIds = new Set();
  const usedFlightIds = new Set();
  const tripItems = [];

  for (const hotel of hotelOrders) {
    if (!hotel.trip_id) continue;
    const flight = flightOrders.find((f) => f.trip_id === hotel.trip_id && !usedFlightIds.has(f.id));
    if (!flight) continue;
    usedHotelIds.add(hotel.id);
    usedFlightIds.add(flight.id);
    const createdAt = hotel.created_at < flight.created_at ? hotel.created_at : flight.created_at;
    tripItems.push({ kind: 'trip', id: hotel.trip_id, createdAt, hotel, flight });
  }

  const items = []
    .concat(orders.map((data) => ({ kind: 'duffel', id: data.id, createdAt: data.created_at, data })))
    .concat(hotelOrders.filter((h) => !usedHotelIds.has(h.id))
      .map((data) => ({ kind: 'hotel', id: data.id, createdAt: data.created_at, data })))
    .concat(flightOrders.filter((f) => !usedFlightIds.has(f.id))
      .map((data) => ({ kind: 'flight', id: data.id, createdAt: data.created_at, data })))
    .concat(tripItems);

  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ── Edge functions ──────────────────────────────────────────────────

/** POST to a Supabase edge function with the signed-in user's JWT, so the
 *  function can identify the caller. liteapi-book / liteapi-flights both
 *  check that the booking belongs to that caller before answering, and both
 *  already send Access-Control-Allow-Origin: * — no proxy needed. */
export async function callEdge(supabase, name, payload) {
  const { data } = await supabase.auth.getSession();
  const token = (data.session && data.session.access_token) || cfg.anonKey;
  const res = await fetch(cfg.url + '/functions/v1/' + name, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'apikey': cfg.anonKey,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Destination photos ──────────────────────────────────────────────

/** The booked destination's own curated gallery, by airport IATA first
 *  (flights) then by city name (hotel orders carry city/country but no IATA).
 *  Both source tables are public-read, so this is two small queries rather
 *  than the app's whole-pool load. Photos are real or absent — a card with no
 *  match shows its icon placeholder, never a guessed image.
 *
 *  Returns a Map keyed by 'IATA:<code>' and 'CITY:<lowercased city>'. */
export async function loadDestinationImages(supabase, keys) {
  const iatas = [...new Set(keys.map((k) => k.iata).filter(Boolean).map((s) => s.toUpperCase()))];
  const cities = [...new Set(keys.map((k) => k.city).filter(Boolean))];
  if (!iatas.length && !cities.length) return new Map();

  const queries = [];
  if (iatas.length) queries.push(supabase.from('destinations').select('id,city,country,iata,image_url').in('iata', iatas));
  if (cities.length) queries.push(supabase.from('destinations').select('id,city,country,iata,image_url').in('city', cities));

  let rows = [];
  try {
    const results = await Promise.all(queries);
    for (const r of results) if (r.data) rows = rows.concat(r.data);
  } catch (e) {
    console.error('[bookings] destination lookup failed:', e);
    return new Map();
  }
  if (!rows.length) return new Map();

  // Curated galleries live in a separate table, joined on destinations.id.
  let galleries = new Map();
  try {
    const { data } = await supabase
      .from('destination_image_edits')
      .select('dest_id,images')
      .in('dest_id', [...new Set(rows.map((r) => r.id))]);
    for (const g of data || []) {
      const imgs = (g.images || []).filter((im) => im && im.url).map((im) => im.url);
      if (imgs.length) galleries.set(g.dest_id, imgs);
    }
  } catch (e) { /* no galleries — the per-city photo below still works */ }

  const out = new Map();
  for (const row of rows) {
    const images = galleries.get(row.id) || (row.image_url ? [row.image_url] : []);
    const entry = { images, city: row.city, country: row.country };
    if (row.iata) out.set('IATA:' + String(row.iata).toUpperCase(), entry);
    if (row.city) out.set('CITY:' + row.city.toLowerCase(), entry);
  }
  return out;
}

/** IATA first, then city — the same precedence the app's hook uses. */
export function destLookup(map, iata, city) {
  const byIata = iata ? map.get('IATA:' + String(iata).toUpperCase()) : null;
  if (byIata) return byIata;
  const byCity = city ? map.get('CITY:' + city.toLowerCase()) : null;
  return byCity || { images: [], city: null, country: null };
}

// ── Formatting ──────────────────────────────────────────────────────

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function money(amount, currency) {
  const n = parseFloat(String(amount == null ? 0 : amount));
  if (isNaN(n)) return '';
  try {
    return n.toLocaleString('en-US', { style: 'currency', currency: currency || 'USD' });
  } catch (e) {
    // An unknown/blank currency code throws rather than degrading.
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }
}

/** For date-only columns (check_in/check_out/depart_date). Builds the Date
 *  from y/m/d directly instead of new Date(str) so a negative UTC offset
 *  cannot roll the displayed day back by one. */
export function fmtDateOnly(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-').map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Oct 14" — meta-line dates; the full year lives in the sections below. */
export function shortDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Flight timestamps are LOCAL airport time with no offset — parsed textually
// so the browser's own zone cannot shift them (the app learned this the hard
// way in its transactional emails).
export function fmtDateTime(iso) {
  if (!iso) return { date: '', time: '' };
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) {
    const d = new Date(iso);
    if (isNaN(d)) return { date: '', time: '' };
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  }
  const local = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return {
    date: local.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: local.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

export function titleCase(s) {
  if (!s) return '';
  return String(s).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusColor(status) {
  switch (String(status || '').toLowerCase()) {
    case 'confirmed': return '#4A7C59';
    case 'cancelled': return '#B84040';
    default:          return '#C4863A';
  }
}

/** hotel_orders.city and .country are whatever LiteAPI put in them, and for a
 *  large share of rows that is a street address or a bare postcode. Showing
 *  one as the place reads as a bug — "Jeju, 63081" is not somewhere. */
export function looksLikePlaceName(v) {
  if (!v) return false;
  const s = String(v).trim();
  return s.length > 1 && s.length < 40 && !/\d/.test(s);
}

/** "Sep 13 → Sep 20, 2026 · 7 nights", with the year said once. */
export function stayLine(checkIn, checkOut, nights) {
  const a = fmtDateOnly(checkIn);
  const b = fmtDateOnly(checkOut);
  if (!a) return '';
  const range = b ? a.replace(/,\s*\d{4}$/, '') + ' → ' + b : a;
  return nights ? range + ' · ' + nights + ' night' + (nights === 1 ? '' : 's') : range;
}

export function plural(n, word) {
  return n + ' ' + word + (Number(n) === 1 ? '' : 's');
}

/** The marketing carrier is not its own column — flight_orders only stores the
 *  raw LiteAPI book/retrieve response. Segment carrier is the source of truth
 *  for who to check in with; airlineLocators is the fallback. */
export function getFlightAirline(order) {
  const p = order.liteapi_payload || {};
  const seg = (p.journey && p.journey.segments && p.journey.segments[0])
    || (p.raw && p.raw.journey && p.raw.journey.segments && p.raw.journey.segments[0]);
  const locator = (p.airlineLocators && p.airlineLocators[0])
    || (p.raw && p.raw.airlineLocators && p.raw.airlineLocators[0]);
  return {
    code: (seg && seg.carrier && seg.carrier.marketingCode) || (locator && locator.airlineCode) || null,
    name: (seg && seg.carrier && seg.carrier.marketingName) || null,
  };
}

// ── Render primitives ───────────────────────────────────────────────

/** A crossfading photo strip — the app's standard hero/card treatment.
 *  Deliberately no pagination dots (the app's most-repeated design note).
 *  Returns markup; call startCarousels() once the markup is in the DOM. */
export function carousel(images, cls, alt, eager) {
  if (!images || !images.length) return '';
  const shots = images.slice(0, 5);
  // The first layer of an above-the-fold strip (a detail page's hero) loads
  // eagerly — lazy there just delays the one image the page is built around.
  const layers = shots.map((url, i) =>
    '<img src="' + esc(url) + '" alt="' + esc(alt || '') + '" class="bk-carousel-img' +
    (i === 0 ? ' is-on' : '') + '" loading="' + (eager && i === 0 ? 'eager' : 'lazy') + '" />').join('');
  return '<div class="bk-carousel ' + (cls || '') + '" data-bk-carousel>' + layers + '</div>';
}

/** Starts every carousel in `root` that is not already running. Each one gets
 *  its own staggered offset so a page full of them does not pulse in unison. */
export function startCarousels(root) {
  const nodes = (root || document).querySelectorAll('[data-bk-carousel]');
  nodes.forEach((node, index) => {
    if (node.dataset.bkRunning) return;
    const imgs = node.querySelectorAll('.bk-carousel-img');
    if (imgs.length < 2) return;
    node.dataset.bkRunning = '1';
    let i = 0;
    setTimeout(() => {
      setInterval(() => {
        imgs[i].classList.remove('is-on');
        i = (i + 1) % imgs.length;
        imgs[i].classList.add('is-on');
      }, 5200);
    }, index * 900);
  });
}

/** Status dot + word. Nearly every booking is confirmed, so a filled pill on
 *  every card would spend the loudest thing on the screen saying "normal". */
export function statusLine(status) {
  const label = String(status || '').replace(/_/g, ' ').trim();
  if (!label) return '';
  const c = statusColor(status);
  return '<p class="bk-status"><span class="bk-status-dot" style="background:' + c + '"></span>' +
    '<span style="color:' + c + '">' + esc(label.toUpperCase()) + '</span></p>';
}

/** Label-left / value-right line for references, payment lines and totals. */
export function kvRow(label, value, strong) {
  if (value == null || value === '') return '';
  return '<div class="bk-kv"><span class="bk-kv-label">' + esc(label) + '</span>' +
    '<span class="bk-kv-value' + (strong ? ' is-strong' : '') + '">' + esc(value) + '</span></div>';
}

/** One open surface with hairline dividers between rows — never a floating
 *  card per item (the app's "no per-item boxing" rule). */
export function infoRow(icon, title, body) {
  return '<div class="bk-info"><span class="bk-info-icon" aria-hidden="true">' + icon + '</span>' +
    '<span class="bk-info-text"><span class="bk-info-title">' + esc(title) + '</span>' +
    (body ? '<span class="bk-info-body">' + esc(body) + '</span>' : '') + '</span></div>';
}

export function section(title, inner) {
  if (!inner) return '';
  return '<section class="bk-section"><h2 class="bk-section-title">' + esc(title) + '</h2>' + inner + '</section>';
}
