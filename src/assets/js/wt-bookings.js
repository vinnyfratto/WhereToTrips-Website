// ───────────────────────────────────────────────────────────────────
//  wt-bookings.js — the traveller's bookings on the website.
//  A port of the app's app/bookings/index.tsx list, plus the routing
//  between it and the detail view (wt-booking-detail.js). One page:
//  /account/bookings/ is the list, /account/bookings/?id=<order id> is
//  one booking. Both are rendered client-side from the same loaded data,
//  so moving between them costs nothing.
//
//  Called by wt-auth.js when a page renders data-wt-page="bookings".
// ───────────────────────────────────────────────────────────────────

import {
  fetchBookings, fetchTravellerRoster, buildBookingList, loadDestinationImages, destLookup,
  esc, money, fmtDateOnly, statusColor, looksLikePlaceName, stayLine, plural,
  carousel, startCarousels, statusLine, getFlightAirline,
} from './wt-booking-kit.js';
import { airlineName, airlineLogo, airlineLogoFallback } from './wt-airlines.js';
import { renderDetail } from './wt-booking-detail.js';

function ico(name) {
  const el = document.querySelector('#bk-icons [data-ico="' + name + '"]');
  return el ? el.innerHTML : '';
}

// ── Card pieces ─────────────────────────────────────────────────────

/** Reference and price, the two facts a booking list exists to show. The
 *  reference is never truncated — one you can only half-read is worse than
 *  one that wraps. */
function cardFooter(refLabel, refValue, amount, currency, meta) {
  return '<div class="bk-card-footer">' +
    '<div class="bk-card-footer-left">' +
      '<p class="bk-ref-label">' + esc(refLabel) + '</p>' +
      '<p class="bk-ref-value">' + esc(refValue) + '</p>' +
    '</div>' +
    '<div class="bk-card-footer-right">' +
      '<p class="bk-amount">' + esc(money(amount, currency)) + '</p>' +
      (meta ? '<p class="bk-card-meta">' + esc(meta) + '</p>' : '') +
    '</div></div>';
}

function photoBlock(images, badge) {
  const inner = images && images.length
    ? carousel(images, '', '')
    : '<span class="bk-photo-empty">' + ico('buildings') + '</span>';
  return '<div class="bk-photo">' + inner +
    (badge ? '<span class="bk-trip-badge">' + ico('plane') + ico('buildings') + '</span>' : '') +
    '</div>';
}

/** The airline's own mark, big enough to be what you recognise the card by —
 *  the flight equivalent of the hotel's photo. */
function airlineMark(code, name) {
  const label = name || airlineName(code) || code || 'Flight';
  const mark = code
    ? '<img class="bk-airline-logo" src="' + esc(airlineLogo(code)) + '" alt="" ' +
      'data-fallback="' + esc(airlineLogoFallback(code)) + '" />'
    : '<span class="bk-airline-logo bk-airline-logo--empty">' + ico('plane') + '</span>';
  return '<div class="bk-airline-row">' + mark +
    '<span class="bk-airline-name">' + esc(label) + '</span></div>';
}

function flightRoute(from, to) {
  return '<div class="bk-route">' +
    '<span class="bk-iata">' + esc(from) + '</span>' +
    '<span class="bk-route-line"><span class="bk-route-rule"></span>' +
      '<span class="bk-route-plane">' + ico('plane') + '</span>' +
      '<span class="bk-route-rule"></span></span>' +
    '<span class="bk-iata">' + esc(to) + '</span></div>';
}

function card(href, inner) {
  return '<a class="bk-card" href="' + esc(href) + '" data-bk-open>' + inner + '</a>';
}

// ── Cards ───────────────────────────────────────────────────────────

function hotelCard(order, destMap) {
  // The destination's own gallery rather than the specific hotel's photo —
  // the list should read as "here's the place", not "here's the building".
  const look = destLookup(destMap, null, order.city);
  const place = [order.city, order.country].filter(looksLikePlaceName).join(', ');
  return card('/account/bookings/?id=' + encodeURIComponent(order.id),
    photoBlock(look.images, false) +
    '<div class="bk-card-body">' +
      statusLine(order.status) +
      '<h2 class="bk-card-title">' + esc(order.hotel_name || 'Hotel') + '</h2>' +
      (place ? '<p class="bk-card-sub">' + esc(place) + '</p>' : '') +
      '<p class="bk-card-when">' + esc(stayLine(order.check_in, order.check_out, order.nights)) + '</p>' +
      cardFooter('CONFIRMATION', order.booking_reference || '——', order.total_amount, order.total_currency,
        order.rooms ? plural(order.rooms, 'room') : null) +
    '</div>');
}

function flightCard(order) {
  const airline = getFlightAirline(order);
  const dates = fmtDateOnly(order.depart_date) +
    (order.return_date ? ' – ' + fmtDateOnly(order.return_date) : '');
  return card('/account/bookings/?id=' + encodeURIComponent(order.id),
    '<div class="bk-card-body">' +
      statusLine(order.status) +
      airlineMark(airline.code, airline.name) +
      flightRoute(order.origin || '—', order.destination || '—') +
      '<p class="bk-card-when">' + esc(dates + (order.cabin_class ? ' · ' + order.cabin_class : '')) + '</p>' +
      cardFooter('BOOKING REF', order.airline_pnr || order.booking_reference || '——',
        order.total_amount, order.total_currency,
        order.passengers ? plural(order.passengers, 'traveller') : null) +
    '</div>');
}

function tripCard(hotel, flight, destMap) {
  const look = destLookup(destMap, flight.destination, hotel.city);
  const airline = getFlightAirline(flight);
  const place = [hotel.city, hotel.country].filter(looksLikePlaceName).join(', ');
  const total = (parseFloat(hotel.total_amount || '0') || 0) + (parseFloat(flight.total_amount || '0') || 0);
  const currency = hotel.total_currency || flight.total_currency;

  // Combined status: only reads BOOKED when both legs actually are. While
  // either is still a placeholder the pair is not fully secured, which the
  // traveller should know at a glance rather than see one confident word
  // covering both.
  const bothBooked = String(hotel.status || '').toLowerCase() !== 'pending'
    && String(flight.status || '').toLowerCase() !== 'pending';
  const label = bothBooked ? 'BOOKED' : 'FLIGHT + HOTEL';
  const color = bothBooked ? statusColor('confirmed') : '#B0653C';

  const logo = airline.code
    ? '<img class="bk-trip-logo" src="' + esc(airlineLogo(airline.code)) + '" alt="" ' +
      'data-fallback="' + esc(airlineLogoFallback(airline.code)) + '" />'
    : '<span class="bk-trip-logo bk-trip-logo--empty">' + ico('plane') + '</span>';

  // The flight's id is the link target, matching the app — the detail view
  // finds its trip_id from there and renders the combined page.
  return card('/account/bookings/?id=' + encodeURIComponent(flight.id),
    photoBlock(look.images, true) +
    '<div class="bk-card-body">' +
      '<p class="bk-status"><span class="bk-status-dot" style="background:' + color + '"></span>' +
        '<span style="color:' + color + '">' + esc(label) + '</span></p>' +
      '<h2 class="bk-card-title">' + esc(hotel.hotel_name || 'Hotel') + '</h2>' +
      (place ? '<p class="bk-card-sub">' + esc(place) + '</p>' : '') +
      '<p class="bk-card-when">' + esc(stayLine(hotel.check_in, hotel.check_out, hotel.nights)) + '</p>' +
      '<p class="bk-trip-flight">' + logo + '<span>' +
        esc((airline.name || airlineName(airline.code) || airline.code || 'Flight') + ' · ' +
          (flight.origin || '—') + ' → ' + (flight.destination || '—')) + '</span></p>' +
      cardFooter('TOTAL FOR TRIP',
        (hotel.booking_reference || '——') + '  /  ' + (flight.airline_pnr || flight.booking_reference || '——'),
        total, currency, null) +
    '</div>');
}

function duffelCard(order) {
  return card('/account/bookings/?id=' + encodeURIComponent(order.id),
    '<div class="bk-card-body">' +
      statusLine(order.status) +
      flightRoute(order.origin || '—', order.destination || '—') +
      '<p class="bk-card-when">' + esc(fmtDateOnly(order.departing_at)) + '</p>' +
      cardFooter('BOOKING REF', order.booking_reference || '——', order.total_amount, order.total_currency,
        order.passenger_count ? plural(order.passenger_count, 'traveller') : null) +
    '</div>');
}

// ── List ────────────────────────────────────────────────────────────

function renderList(ctx) {
  const { items, destMap, mount } = ctx;
  ctx.token = (ctx.token || 0) + 1; // cancels any in-flight detail repaint

  if (ctx.error) {
    mount.innerHTML = '<div class="bk-empty"><span class="bk-empty-icon">' + ico('danger-triangle') + '</span>' +
      '<h1>Couldn’t load bookings</h1><p>' + esc(ctx.error) + '</p></div>';
    return;
  }
  if (!items.length) {
    mount.innerHTML = '<div class="bk-empty"><span class="bk-empty-icon">' + ico('plane') + '</span>' +
      '<h1>No bookings yet</h1><p>When you book a flight or a hotel through WhereTo, it will appear here.</p>' +
      '<a class="btn btn-primary" href="/app/">Get the app</a></div>';
    return;
  }

  const cards = items.map((item) => {
    if (item.kind === 'trip')   return tripCard(item.hotel, item.flight, destMap);
    if (item.kind === 'hotel')  return hotelCard(item.data, destMap);
    if (item.kind === 'flight') return flightCard(item.data);
    return duffelCard(item.data);
  }).join('');

  mount.innerHTML =
    '<div class="bk-list-head">' +
      '<div><p class="eyebrow">Your account</p><h1>My Bookings</h1></div>' +
      '<a class="btn btn-ghost" href="/account/profile/">Profile</a>' +
    '</div>' +
    '<p class="bk-count">' + esc(plural(items.length, 'booking')) + '</p>' +
    '<div class="bk-list">' + cards + '</div>';

  startCarousels(mount);
}

// ── Routing ─────────────────────────────────────────────────────────

/** Resolves ?id= to one list item, mirroring the app's detail screen: a
 *  Duffel row by either id, then a hotel, then a flight — and whichever leg
 *  the id lands on, its paired other half is looked up so either card in a
 *  package opens the same combined page. */
function findItem(ctx, id) {
  const { orders, hotelOrders, flightOrders } = ctx;

  const duffel = orders.find((o) => o.duffel_order_id === id || o.id === id);
  if (duffel) return { kind: 'duffel', id: duffel.id, data: duffel };

  const hotel = hotelOrders.find((o) => o.id === id);
  if (hotel) {
    const paired = hotel.trip_id ? flightOrders.find((f) => f.trip_id === hotel.trip_id) : null;
    return paired
      ? { kind: 'trip', id: hotel.trip_id, hotel, flight: paired }
      : { kind: 'hotel', id: hotel.id, data: hotel };
  }

  const flight = flightOrders.find((o) => o.id === id);
  if (flight) {
    const paired = flight.trip_id ? hotelOrders.find((h) => h.trip_id === flight.trip_id) : null;
    return paired
      ? { kind: 'trip', id: flight.trip_id, hotel: paired, flight }
      : { kind: 'flight', id: flight.id, data: flight };
  }
  return null;
}

function route(ctx) {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { renderList(ctx); window.scrollTo(0, 0); return; }

  const item = findItem(ctx, id);
  if (!item) {
    ctx.mount.innerHTML = '<div class="bk-empty"><span class="bk-empty-icon">' + ico('danger-triangle') + '</span>' +
      '<h1>Booking not found</h1><a class="bk-back" href="/account/bookings/" data-bk-back>' +
      ico('alt-arrow-right') + ' Back to bookings</a></div>';
    return;
  }
  renderDetail(ctx, item);
  window.scrollTo(0, 0);
}

// ── Boot ────────────────────────────────────────────────────────────

export async function initBookings(supabase) {
  const mount = document.getElementById('wt-bookings');
  const gate = document.getElementById('wt-gate');
  if (!mount) return;

  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) {
    window.location.href = '/account/login/?next=' + encodeURIComponent('/account/bookings/');
    return;
  }
  const user = sess.session.user;

  const [booked, roster] = await Promise.all([
    fetchBookings(supabase, user.id),
    fetchTravellerRoster(supabase, user).catch(() => []),
  ]);

  const items = buildBookingList(booked.orders, booked.hotelOrders, booked.flightOrders);

  // One batched lookup for every card's destination photos, rather than the
  // app's whole-pool load — both source tables are public-read.
  const keys = items.map((item) => {
    if (item.kind === 'trip')   return { iata: item.flight.destination, city: item.hotel.city };
    if (item.kind === 'hotel')  return { iata: null, city: item.data.city };
    if (item.kind === 'flight') return { iata: item.data.destination, city: null };
    return { iata: item.data.destination, city: null };
  });
  const destMap = await loadDestinationImages(supabase, keys).catch(() => new Map());

  const ctx = {
    supabase, mount, roster, destMap, items, error: booked.error,
    orders: booked.orders, hotelOrders: booked.hotelOrders, flightOrders: booked.flightOrders,
  };

  if (gate) gate.style.display = 'none';
  mount.style.display = 'block';
  route(ctx);

  // Client-side navigation between the list and one booking — the data is
  // already loaded, so a full page load would only be slower.
  mount.addEventListener('click', (e) => {
    const link = e.target.closest('[data-bk-open], [data-bk-back]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    history.pushState({}, '', link.getAttribute('href'));
    route(ctx);
  });
  window.addEventListener('popstate', () => route(ctx));

  // Images that do not load, handled rather than left as broken-image icons.
  //  · airline marks fall from the curated CDN to the padded one, then vanish
  //  · a photo that 404s leaves the strip; a strip that empties becomes the
  //    same icon placeholder a booking with no photos at all gets
  mount.addEventListener('error', (e) => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    if (img.dataset.fallback) {
      img.src = img.dataset.fallback;
      delete img.dataset.fallback;
      return;
    }
    if (img.classList.contains('bk-carousel-img')) {
      const strip = img.parentElement;
      const wasOn = img.classList.contains('is-on');
      img.remove();
      const left = strip.querySelectorAll('.bk-carousel-img');
      if (!left.length) {
        const wrap = strip.parentElement;
        if (wrap && wrap.classList.contains('bk-photo')) {
          strip.outerHTML = '<span class="bk-photo-empty">' + ico('buildings') + '</span>';
        } else if (wrap && wrap.classList.contains('bk-hero')) {
          wrap.classList.add('bk-hero--empty');
          strip.outerHTML = '<span class="bk-hero-icon">' + ico('buildings') + '</span>';
        }
      } else if (wasOn) {
        left[0].classList.add('is-on');
      }
      return;
    }
    img.style.display = 'none';
  }, true);
}
