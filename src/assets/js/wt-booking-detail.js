// ───────────────────────────────────────────────────────────────────
//  wt-booking-detail.js — one booking, in full.
//  A port of the app's app/bookings/[id].tsx: the page paints from the
//  stored order row immediately, then overlays whatever the live LiteAPI
//  retrieve comes back with (status, hotel confirmation code, airline PNR)
//  and, for hotels, the property's own content (photos, address, facilities).
//
//  Three shapes, same as the app:
//    hotel   — a stay on its own
//    flight  — a flight on its own
//    trip    — a hotel and a flight staged together (shared trip_id). Still
//              two separate LiteAPI charges; this is only a display layer.
// ───────────────────────────────────────────────────────────────────

import {
  callEdge, esc, money, fmtDateOnly, fmtDateTime, shortDate, titleCase, statusColor,
  destLookup, carousel, startCarousels, kvRow, infoRow, section, plural, getFlightAirline,
} from './wt-booking-kit.js';
import { airlineName, airlineCheckin } from './wt-airlines.js';

// Solar icons are rendered into a hidden sprite by the page template
// (bookings.njk) using the same Eleventy shortcode the rest of the site uses,
// so these are the real icons rather than hand-drawn stand-ins.
function ico(name) {
  const el = document.querySelector('#bk-icons [data-ico="' + name + '"]');
  return el ? el.innerHTML : '';
}

const BOARD_LABELS = {
  RO: 'Room only', BB: 'Breakfast included', HB: 'Half board', FB: 'Full board', AI: 'All inclusive',
};

// ── Hero ────────────────────────────────────────────────────────────

function hero(images, fallbackIcon, extraClass) {
  const cls = 'bk-hero' + (extraClass ? ' ' + extraClass : '');
  if (images && images.length) {
    return '<div class="' + cls + '">' + carousel(images, 'bk-hero-carousel', '', true) + '</div>';
  }
  return '<div class="' + cls + ' bk-hero--empty"><span class="bk-hero-icon">' + ico(fallbackIcon) + '</span></div>';
}

function heroIdentity(overline, name, meta) {
  return '<div class="bk-hero-info">' +
    (overline ? '<p class="bk-hero-overline">' + esc(overline) + '</p>' : '') +
    '<h1 class="bk-hero-name">' + esc(name) + '</h1>' +
    (meta ? '<p class="bk-hero-meta">' + esc(meta) + '</p>' : '') +
    '</div>';
}

function confirmBlock(label, code, status, total, currency, rightLabel, rightValue) {
  const c = statusColor(status);
  const s = String(status || '').toUpperCase().replace(/_/g, ' ');
  return '<div class="bk-confirm">' +
      '<div><p class="bk-stat-label">' + esc(label) + '</p>' +
      '<p class="bk-confirm-code">' + esc(code) + '</p></div>' +
      (s ? '<span class="bk-status-pill" style="background:' + c + '">' + esc(s) + '</span>' : '') +
    '</div>' +
    '<div class="bk-total">' +
      '<div><p class="bk-stat-label">TOTAL PAID</p>' +
      '<p class="bk-total-value">' + esc(money(total, currency)) + '</p></div>' +
      (rightValue != null
        ? '<div class="bk-total-right"><p class="bk-stat-label">' + esc(rightLabel) + '</p>' +
          '<p class="bk-total-meta">' + esc(rightValue) + '</p></div>'
        : '') +
    '</div>';
}

// ── Hotel ───────────────────────────────────────────────────────────

/** Itemised room rate — LiteAPI's book response carries the real split at
 *  bookedRooms[0].rate.retailRate: `total` is what was actually charged, and
 *  taxesAndFees[] splits into `included` (already in that total) and NOT
 *  included (payable at the property, never charged by us — kept on its own
 *  line so it is never mistaken for part of what was already paid). */
function hotelPriceBreakdown(order) {
  const payload = order.liteapi_payload || {};
  const booked = payload.bookedRooms && payload.bookedRooms[0];
  const room = booked && booked.rate && booked.rate.retailRate;
  if (!room || !room.total || room.total.amount == null) return null;
  const fees = Array.isArray(room.taxesAndFees) ? room.taxesAndFees : [];
  const taxesFees = fees.filter((f) => f.included).reduce((sum, f) => sum + (f.amount || 0), 0);
  const dueAtProperty = fees.filter((f) => !f.included).reduce((sum, f) => sum + (f.amount || 0), 0);
  return {
    roomRate: room.total.amount - taxesFees,
    taxesFees,
    dueAtProperty,
    currency: room.total.currency || order.total_currency || 'USD',
  };
}

function amenityIcon(name) {
  const s = String(name || '').toLowerCase();
  if (/wi-?fi|internet/.test(s)) return 'wi-fi-router-round';
  if (/pool|swim/.test(s)) return 'swimming';
  if (/gym|fitness/.test(s)) return 'dumbbell';
  if (/restaurant|breakfast|dining|kitchen/.test(s)) return 'chef-hat';
  if (/bar|lounge/.test(s)) return 'wineglass';
  if (/air.?condition|heating|climate/.test(s)) return 'snowflake';
  if (/laundry|washing|dry clean/.test(s)) return 'washing-machine';
  if (/tv|television/.test(s)) return 'tv';
  if (/spa|sauna|massage|bath/.test(s)) return 'bath';
  if (/accessib|wheelchair|disabled/.test(s)) return 'accessibility';
  if (/terrace|garden|beach|balcony|sun/.test(s)) return 'sun';
  if (/safe|security/.test(s)) return 'safe-square';
  return 'check-circle';
}

/** Street (from the property's own content record) plus the city/country
 *  stamped on the order at booking time — never lat/lng, which is what the
 *  property's `address` field alone leaves out. Skips the city/country
 *  suffix when the street already names the city, so it never doubles up. */
function fullHotelAddress(order, content) {
  const street = content && content.address;
  const cityCountry = [order.city, order.country].filter(Boolean).join(', ');
  const cityLower = String(order.city || '').toLowerCase();
  if (street && cityLower && street.toLowerCase().includes(cityLower)) return street;
  return [street, cityCountry].filter(Boolean).join(', ') || street || cityCountry || null;
}

/** A named-place query, never a bare coordinate pair — Google Maps' embed
 *  labels the pin with whatever text is searched, so leading with the hotel's
 *  own name (not lat/lng) is what keeps the pin from reading as a lat/lng pair. */
function hotelMapEmbedSrc(name, address) {
  const query = [name, address].filter(Boolean).join(', ');
  return 'https://www.google.com/maps?q=' + encodeURIComponent(query) + '&z=15&output=embed';
}

function hotelSections(order, live, content, opts) {
  const o = opts || {};
  const status = (live && live.status) || order.status;
  const confirmationCode = (live && live.hotelConfirmationCode) || order.booking_reference || '——';
  const ci = (live && live.checkinInstructions) || {};
  const instructions = ci.instructions || order.checkin_instructions;
  const idRequired = ci.idRequired;
  const propertyPhone = (ci.propertyContact && ci.propertyContact.phone) || (content && content.phone);
  const propertyEmail = (ci.propertyContact && ci.propertyContact.email) || (content && content.email);

  // Real room photo ONLY — never a substituted gallery shot standing in for
  // the room. mapped_room_id is null for older bookings and for hotels LiteAPI
  // has not mapped, and those render as a plain row instead of a fake image.
  const roomPhoto = (() => {
    if (!content || !order.mapped_room_id) return null;
    const room = content.rooms.find((r) => r.id === String(order.mapped_room_id));
    return (room && room.photos && room.photos[0]) || null;
  })();

  let html = '';

  // Contact — right below the identity block, one big tappable line each,
  // with a map alongside naming the property (never its bare coordinates).
  const fullAddress = fullHotelAddress(order, content);
  const contact = [];
  if (fullAddress) {
    const mapsQuery = [order.hotel_name, fullAddress].filter(Boolean).join(', ');
    contact.push('<a class="bk-contact" href="https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(mapsQuery) + '" target="_blank" rel="noopener">' +
      '<span class="bk-contact-icon">' + ico('map-point') + '</span>' + esc(fullAddress) + '</a>');
  }
  if (propertyPhone) {
    contact.push('<a class="bk-contact" href="tel:' + esc(String(propertyPhone).replace(/\s+/g, '')) + '">' +
      '<span class="bk-contact-icon">' + ico('phone') + '</span>' + esc(propertyPhone) + '</a>');
  }
  if (propertyEmail) {
    contact.push('<a class="bk-contact" href="mailto:' + esc(propertyEmail) + '">' +
      '<span class="bk-contact-icon">' + ico('letter') + '</span>' + esc(propertyEmail) + '</a>');
  }
  const contactHtml = contact.length ? '<div class="bk-contact-block">' + contact.join('') + '</div>' : '';
  const mapHtml = fullAddress
    ? '<div class="bk-map-embed"><iframe src="' + esc(hotelMapEmbedSrc(order.hotel_name, fullAddress)) +
      '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen ' +
      'title="' + esc(order.hotel_name || 'Hotel location') + '"></iframe></div>'
    : '';
  if (contactHtml || mapHtml) {
    html += '<div class="bk-contact-map-row">' + contactHtml + mapHtml + '</div><hr class="bk-divider" />';
  }

  // Stay — one fact per row, with the property's own times when known.
  let stay = '';
  stay += infoRow(ico('calendar'), 'Check-in  ·  ' + (fmtDateOnly(order.check_in) || '—'),
    content && content.checkInStart ? 'From ' + content.checkInStart : null);
  stay += infoRow(ico('calendar-mark'), 'Check-out  ·  ' + (fmtDateOnly(order.check_out) || '—'),
    content && content.checkOutTime ? 'By ' + content.checkOutTime : null);
  if (order.nights) stay += infoRow(ico('moon'), plural(order.nights, 'night'), null);
  if (order.guests) {
    stay += infoRow(ico('user'), plural(order.guests, 'guest'),
      (order.rooms || 1) > 1 ? plural(order.rooms, 'room') : null);
  }
  html += section('Your stay', stay);
  html += '<hr class="bk-divider" />';

  html += confirmBlock('HOTEL CONFIRMATION CODE', confirmationCode, status,
    order.total_amount, order.total_currency, null, null);

  const pb = hotelPriceBreakdown(order);
  if (pb) {
    html += '<div class="bk-kv-block">' +
      kvRow('Room rate', money(pb.roomRate, pb.currency)) +
      kvRow('Taxes & fees', money(pb.taxesFees, pb.currency)) +
      (pb.dueAtProperty > 0 ? kvRow('Due at property', money(pb.dueAtProperty, pb.currency)) : '') +
      '</div>';
  }
  html += '<hr class="bk-divider" />';

  // Room
  let room = '';
  if (roomPhoto) room += '<img class="bk-room-photo" src="' + esc(roomPhoto) + '" alt="" loading="lazy" />';
  room += infoRow(ico('bed'), order.room_name || 'Room', null);
  if (order.board_type) {
    room += infoRow(ico('chef-hat'), BOARD_LABELS[order.board_type] || order.board_type, null);
  }
  if (order.refundable != null) {
    room += infoRow(
      ico(order.refundable ? 'shield-check' : 'calendar-mark'),
      order.refundable ? 'Free cancellation' : 'Non-refundable',
      order.refundable
        ? (order.cancellation_deadline ? 'Cancel free until ' + fmtDateOnly(order.cancellation_deadline) : null)
        : 'This rate cannot be refunded.');
  }
  html += section('Your room', room);

  // Amenities — the property's own facilities list, first 8 then expand.
  const facilities = (content && content.facilities) || [];
  if (facilities.length) {
    const shown = facilities.slice(0, 8).map((f) =>
      '<span class="bk-amenity"><span class="bk-amenity-icon">' + ico(amenityIcon(f)) + '</span>' + esc(f) + '</span>').join('');
    const rest = facilities.slice(8).map((f) =>
      '<span class="bk-amenity"><span class="bk-amenity-icon">' + ico(amenityIcon(f)) + '</span>' + esc(f) + '</span>').join('');
    html += '<hr class="bk-divider" />' + section('Amenities',
      '<div class="bk-amenities">' + shown +
      (rest ? '<span class="bk-amenity-rest" hidden>' + rest + '</span>' : '') + '</div>' +
      (rest ? '<button type="button" class="bk-link-btn" data-bk-amenities>Show all ' + facilities.length + '</button>' : ''));
  }

  // Check-in info — contact already lives up top.
  if (instructions || idRequired) {
    let info = '';
    if (instructions) info += infoRow(ico('info-circle'), 'At the property', instructions);
    if (idRequired) info += infoRow(ico('user-id'), 'Photo ID required at check-in', null);
    html += '<hr class="bk-divider" />' + section('Check-in info', info);
  }

  // Booking record
  let record = '';
  if (order.booking_reference && order.booking_reference !== confirmationCode) {
    record += kvRow('Booking reference', order.booking_reference);
  }
  record += kvRow('Payment', titleCase(order.payment_status) || '—');
  record += kvRow('Booked on', fmtDateTime(order.created_at).date || '—');
  html += '<hr class="bk-divider" />' + section('Booking', '<div class="bk-kv-block">' + record + '</div>');

  if (o.includeDisclaimer !== false) {
    html += '<hr class="bk-divider" /><p class="bk-disclaimer">Rates, taxes and fees were confirmed ' +
      'when this booking was made. The property sets its own check-in requirements and may ask for a ' +
      'deposit, an incidentals hold, or a local city tax at the desk. The cancellation terms shown above ' +
      'are the ones attached to this rate. Photos come from the property and may not match the exact room ' +
      'assigned. All times shown are local to the property.</p>';
  }
  return html;
}

// ── Flight ──────────────────────────────────────────────────────────

/** Base/tax split for a flight order — same field the "Booking" record in
 *  flightSections reads. Returns null for older bookings made before this
 *  was captured, so callers fall back to the single total. */
function flightPriceBreakdown(order) {
  const payload = order.liteapi_payload || {};
  const journey = payload.journey || (payload.raw && payload.raw.journey) || {};
  const orderPrice = (payload.order && payload.order.price)
    || (payload.raw && payload.raw.order && payload.raw.order.price)
    || (journey.pricing && journey.pricing.display);
  if (!orderPrice || orderPrice.base == null) return null;
  return {
    base: orderPrice.base,
    taxes: orderPrice.taxes,
    currency: orderPrice.currency || order.total_currency || 'USD',
  };
}

function minutesLabel(mins) {
  if (!isFinite(mins) || mins <= 0) return '';
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return h ? h + 'h' + (m ? ' ' + m + 'm' : '') : m + 'm';
}

function gapMinutes(a, b) {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return isFinite(ms) ? ms / 60000 : 0;
}

/** Outbound/return legs from the stored journey. Split on the payload's own
 *  `direction` when it changes; if a payload does not carry it, a 20h+ gap
 *  between segments is the destination stay, not a layover. */
function liteSegmentGroups(order) {
  const p = order.liteapi_payload || {};
  const segs = (p.journey && Array.isArray(p.journey.segments) && p.journey.segments)
    || (p.raw && p.raw.journey && Array.isArray(p.raw.journey.segments) && p.raw.journey.segments)
    || [];
  const groups = [];
  for (const s of segs) {
    const g = groups[groups.length - 1];
    const prev = g && g[g.length - 1];
    const newDirection = !!prev && (prev.direction || '') !== (s.direction || '');
    const longGap = !!prev && gapMinutes(prev.arrivalTime, s.departureTime) > 20 * 60;
    if (!g || newDirection || longGap) groups.push([s]);
    else g.push(s);
  }
  return groups;
}

/** The booked passenger record has no stable id linking back to a saved
 *  traveller — only a name. Matched here by normalised given+family name
 *  against the account's roster. A booking made for someone not saved falls
 *  back to initials — never a wrong photo. */
function litePassengers(order, roster) {
  const p = order.liteapi_payload || {};
  const pax = (Array.isArray(p.passengers) && p.passengers)
    || (p.raw && Array.isArray(p.raw.passengers) && p.raw.passengers) || [];
  const typeLabel = { ADT: 'Adult', CHD: 'Child', INF: 'Infant' };
  const norm = (s) => String(s || '').trim().toLowerCase();
  return pax.map((x) => {
    const given = String(x.firstName || ''), family = String(x.lastName || '');
    const match = roster.find((r) => norm(r.given_name) === norm(given) && norm(r.family_name) === norm(family));
    return {
      name: titleCase([given, family].filter(Boolean).join(' ')),
      type: typeLabel[x.type] || '',
      photo: match && match.profile_photo,
    };
  }).filter((x) => x.name);
}

function travellerRow(pax) {
  const initials = pax.name.trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const avatar = pax.photo
    ? '<img class="bk-traveller-photo" src="' + esc(pax.photo) + '" alt="" />'
    : '<span class="bk-traveller-avatar">' + esc(initials || '?') + '</span>';
  return '<div class="bk-info">' + avatar +
    '<span class="bk-info-text"><span class="bk-info-title">' + esc(pax.name) + '</span>' +
    (pax.type ? '<span class="bk-info-body">' + esc(pax.type) + '</span>' : '') + '</span></div>';
}

function segmentRow(seg, next) {
  const dep = seg.departureTime ? fmtDateTime(seg.departureTime) : null;
  const arr = seg.arrivalTime ? fmtDateTime(seg.arrivalTime) : null;
  const layover = next ? minutesLabel(gapMinutes(seg.arrivalTime, next.departureTime)) : '';
  const carrier = (seg.carrier && (seg.carrier.marketingName || seg.carrier.marketingCode)) || 'Flight';
  const num = seg.flight && seg.flight.marketingNumber;

  return '<div class="bk-seg">' +
    '<div class="bk-seg-carrier"><span class="bk-seg-carrier-name">' + esc(carrier) + '</span>' +
      (num ? '<span class="bk-seg-flightnum">' + esc(num) + '</span>' : '') + '</div>' +
    '<div class="bk-seg-leg">' +
      '<div class="bk-seg-end">' +
        '<p class="bk-seg-time">' + esc((dep && dep.time) || '—') + '</p>' +
        '<p class="bk-seg-iata">' + esc(seg.originCode || '') + '</p>' +
        '<p class="bk-seg-city">' + esc(seg.originName || '') + '</p>' +
      '</div>' +
      '<div class="bk-seg-bar"><span class="bk-seg-rule"></span>' +
        (seg.duration && seg.duration.minutes
          ? '<span class="bk-seg-dur">' + esc(minutesLabel(seg.duration.minutes)) + '</span>' : '') +
        '<span class="bk-seg-rule"></span></div>' +
      '<div class="bk-seg-end bk-seg-end--right">' +
        '<p class="bk-seg-time">' + esc((arr && arr.time) || '—') + '</p>' +
        '<p class="bk-seg-iata">' + esc(seg.destinationCode || '') + '</p>' +
        '<p class="bk-seg-city">' + esc(seg.destinationName || '') + '</p>' +
      '</div>' +
    '</div>' +
    (next
      ? '<div class="bk-layover"><span class="bk-layover-rule"></span><span class="bk-layover-text">LAYOVER IN ' +
        esc(seg.destinationCode || '—') + (layover ? ' · ' + esc(layover.toUpperCase()) : '') +
        '</span><span class="bk-layover-rule"></span></div>'
      : '') +
    '</div>';
}

function sliceBlock(label, segments) {
  const first = segments[0], last = segments[segments.length - 1];
  const depDate = first && first.departureTime ? fmtDateTime(first.departureTime).date : '';
  return '<div class="bk-slice">' +
    '<div class="bk-slice-head">' +
      '<span class="bk-slice-label">' + esc(label) + '</span>' +
      '<span class="bk-slice-route">' + esc((first && first.originCode) || '—') + ' → ' +
        esc((last && last.destinationCode) || '—') + '</span>' +
      (depDate ? '<span class="bk-slice-date">' + esc(depDate) + '</span>' : '') +
    '</div>' +
    segments.map((seg, i) => segmentRow(seg, segments[i + 1])).join('') +
    '</div>';
}

function flightSections(order, live, roster, opts) {
  const o = opts || {};
  const status = (live && live.status) || order.status;
  const airlinePnr = (live && live.airlinePnr) || order.airline_pnr;
  const airline = getFlightAirline(order);
  const carrierName = airline.name || airlineName(airline.code);
  const checkin = airlineCheckin(airline.code);

  const payload = order.liteapi_payload || {};
  const journey = payload.journey || (payload.raw && payload.raw.journey) || {};
  const terms = journey.terms;
  const services = (Array.isArray(payload.bookedServices) && payload.bookedServices)
    || (payload.raw && Array.isArray(payload.raw.bookedServices) && payload.raw.bookedServices) || [];
  const pricing = payload.pricing || (payload.raw && payload.raw.pricing);
  const contact = payload.contact || (payload.raw && payload.raw.contact);
  // The base/tax split lives on order.price and is repeated on
  // journey.pricing.display. Older bookings made before this was read fall
  // back to the single "Fare" line below.
  const orderPrice = (payload.order && payload.order.price)
    || (payload.raw && payload.raw.order && payload.raw.order.price)
    || (journey.pricing && journey.pricing.display);
  const bookingFees = journey.pricing && journey.pricing.display && journey.pricing.display.fees;

  let html = '<hr class="bk-divider" />';

  html += confirmBlock('BOOKING REFERENCE', order.booking_reference || '——', status,
    order.total_amount, order.total_currency, 'TRAVELLERS', order.passengers == null ? '—' : order.passengers);
  html += '<hr class="bk-divider" />';

  // Itinerary — the stored journey's real legs when the payload has them,
  // the flat depart/return strip when it does not.
  const groups = liteSegmentGroups(order);
  const sliceLabel = (i) => (i === 0 ? 'OUTBOUND' : i === 1 ? 'RETURN' : 'LEG ' + (i + 1));
  let itinerary;
  if (groups.length) {
    itinerary = groups.map((segs, i) => sliceBlock(sliceLabel(i), segs)).join('');
  } else {
    itinerary = '<div class="bk-strip">' +
      '<div class="bk-strip-col"><p class="bk-stat-label">DEPART</p>' +
      '<p class="bk-stat-value">' + esc(fmtDateOnly(order.depart_date) || '—') + '</p></div>' +
      (order.return_date
        ? '<div class="bk-strip-div"></div><div class="bk-strip-col"><p class="bk-stat-label">RETURN</p>' +
          '<p class="bk-stat-value">' + esc(fmtDateOnly(order.return_date)) + '</p></div>'
        : '') +
      '</div>';
  }
  html += section('Itinerary', itinerary);
  html += '<hr class="bk-divider" />';

  // Fare — brand, cabin, and the ticket's own rules.
  let fare = infoRow(ico('ticket'),
    order.fare_brand ? titleCase(order.fare_brand) : (titleCase(order.cabin_class) || 'Fare'),
    order.fare_brand && order.cabin_class ? titleCase(order.cabin_class) : null);
  if (terms && typeof terms.refundable === 'boolean') {
    fare += infoRow(ico(terms.refundable ? 'shield-check' : 'forbidden-circle'),
      terms.refundable ? 'Refundable ticket' : 'Non-refundable ticket', null);
  }
  if (terms && typeof terms.changeable === 'boolean') {
    fare += infoRow(ico('calendar-mark'),
      terms.changeable ? 'Changes allowed' : 'No changes allowed',
      terms.changeable && terms.hasChangeFee ? 'A change fee applies.' : null);
  }
  html += section('Fare', fare);

  const paxList = litePassengers(order, roster);
  if (paxList.length) {
    html += '<hr class="bk-divider" />' + section('Travellers', paxList.map(travellerRow).join(''));
  }

  if (services.length) {
    const rows = services.map((s) => kvRow(
      (s.name || titleCase(s.category) || 'Service') + (Number(s.quantity) > 1 ? ' × ' + s.quantity : ''),
      money(s.pricing && s.pricing.display && s.pricing.display.amount,
        (s.pricing && s.pricing.display && s.pricing.display.currency) || order.total_currency) || '—',
    )).join('');
    html += '<hr class="bk-divider" />' + section('Extras', '<div class="bk-kv-block">' + rows + '</div>');
  }

  // Booking record — PNR, price breakdown, payment, contact.
  let record = kvRow('Airline PNR', airlinePnr || 'Not yet issued');
  if (orderPrice && orderPrice.base != null) {
    const cur = orderPrice.currency || order.total_currency;
    record += kvRow('Base fare', money(orderPrice.base, cur));
    record += kvRow('Taxes & fees', money(orderPrice.taxes, cur));
    if (Number(bookingFees) > 0) record += kvRow('Booking fees', money(bookingFees, cur));
  } else if (pricing && pricing.subtotal != null) {
    record += kvRow('Fare', money(pricing.subtotal, pricing.currency || order.total_currency));
  }
  if (pricing && Number(pricing.seatsAmount) > 0) {
    record += kvRow('Seats', money(pricing.seatsAmount, pricing.currency || order.total_currency));
  }
  if (pricing && Number(pricing.baggageAmount) > 0) {
    record += kvRow('Bags', money(pricing.baggageAmount, pricing.currency || order.total_currency));
  }
  if (pricing && pricing.totalAmount != null) {
    record += kvRow('Total paid', money(pricing.totalAmount, pricing.currency || order.total_currency), true);
  }
  record += kvRow('Payment', titleCase(order.payment_status) || '—');
  record += kvRow('Booked on', fmtDateTime(order.created_at).date || '—');
  if (contact && contact.email) record += kvRow('Contact email', contact.email);
  if (contact && contact.phoneNumber) {
    record += kvRow('Contact phone',
      (contact.phoneCountryCode ? '+' + contact.phoneCountryCode + ' ' : '') + contact.phoneNumber);
  }
  html += '<hr class="bk-divider" />' + section('Booking', '<div class="bk-kv-block">' + record + '</div>');

  // Check in — flat text plus the one real CTA.
  let checkinHtml;
  if (!order.live_mode) {
    checkinHtml = '<p class="bk-body">This is a sandbox test booking — ' +
      esc(carrierName || 'the airline') + ' is not a real carrier, so there is no real check-in for it. ' +
      'Once WhereTo is live, this section shows a direct link to the traveller’s actual airline.</p>';
  } else if (checkin) {
    checkinHtml = '<p class="bk-body">Check in directly with ' + esc(checkin.name) +
      ' using the airline PNR above and ' +
      (order.passengers === 1 ? 'the traveller’s' : 'the lead traveller’s') + ' last name.</p>' +
      '<a class="btn btn-primary bk-checkin-btn" href="' + esc(checkin.url) + '" target="_blank" rel="noopener">' +
      'Check in with ' + esc(checkin.name) + '</a>';
  } else {
    checkinHtml = '<p class="bk-body">' + (airlinePnr
      ? 'Check in directly through ' + esc(carrierName || 'the operating airline') +
        '’s website or app using PNR ' + esc(airlinePnr) + '.'
      : 'Once ticketed, check in directly through ' + esc(carrierName || 'the operating airline') +
        '’s website or app using the airline PNR above.') + '</p>';
  }
  html += '<hr class="bk-divider" />' + section('Check in', checkinHtml);

  if (o.includeDisclaimer !== false) {
    html += '<hr class="bk-divider" /><p class="bk-disclaimer">Fares, taxes and fees were confirmed when ' +
      'this booking was made. The airline controls schedules, aircraft, gates and seat assignments, and ' +
      'these can change after ticketing. Baggage allowances and change rules are set by the fare shown ' +
      'above. All times shown are local to each airport. Check in with the airline and confirm your ' +
      'departure time before every flight.</p>';
  }
  return html;
}

// ── Live data ───────────────────────────────────────────────────────

/** Fresh status / confirmation code / PNR. The stored row is only a snapshot
 *  taken at booking time, and this on-view call is also what refreshes it
 *  server-side — there is no hotel-side webhook for most transitions. */
function fetchHotelLive(supabase, bookingId) {
  if (!bookingId) return Promise.resolve(null);
  return callEdge(supabase, 'liteapi-book', { action: 'retrieve', bookingId })
    .then((d) => (d && !d.error ? d : null))
    .catch((e) => { console.error('[bookings] hotel retrieve failed:', e); return null; });
}

function fetchFlightLive(supabase, bookingId) {
  if (!bookingId) return Promise.resolve(null);
  return callEdge(supabase, 'liteapi-flights', { action: 'retrieve', bookingId })
    .then((d) => (d && !d.error ? d : null))
    .catch((e) => { console.error('[bookings] flight retrieve failed:', e); return null; });
}

/** Booking-retrieve never carries photos — the property's real gallery,
 *  address and facilities live on the separate content endpoint, keyed by
 *  hotel_id. Same field mapping the app's provider uses. */
function fetchHotelContent(supabase, hotelId) {
  if (!hotelId) return Promise.resolve(null);
  return callEdge(supabase, 'liteapi-data', { action: 'hotel', hotelId })
    .then((json) => {
      const d = (json && json.data) || {};
      const images = (d.hotelImages || []).map((img) => img.urlHd || img.url).filter(Boolean);
      const rooms = (Array.isArray(d.rooms) ? d.rooms : []).map((r) => ({
        id: String(r.id),
        photos: Array.isArray(r.photos)
          ? r.photos.slice().sort((a, b) => (b.mainPhoto ? 1 : 0) - (a.mainPhoto ? 1 : 0)).map((p) => p.url).filter(Boolean)
          : [],
      }));
      // hotelFacilities is string[], facilities is {facilityId,name}[] — the
      // same both-spellings tolerance the app's provider applies.
      const facilities = Array.isArray(d.hotelFacilities) && d.hotelFacilities.length
        ? d.hotelFacilities
        : (d.facilities || []).map((f) => f.name).filter(Boolean);
      const times = d.checkinCheckoutTimes || {};
      return {
        images, rooms, facilities,
        address: d.address || null,
        latitude: d.location && typeof d.location.latitude === 'number' ? d.location.latitude : null,
        longitude: d.location && typeof d.location.longitude === 'number' ? d.location.longitude : null,
        phone: d.phone || null,
        email: d.email || null,
        checkInStart: times.checkin_start || times.checkinStart || times.checkin || null,
        checkOutTime: times.checkout || times.checkOut || null,
      };
    })
    .catch((e) => { console.error('[bookings] hotel content fetch failed:', e); return null; });
}

// ── Page ────────────────────────────────────────────────────────────

function backLink() {
  return '<a class="bk-back" href="/account/bookings/" data-bk-back>' + ico('alt-arrow-right') +
    ' Back to bookings</a>';
}

/** A leg's subtotal — bold, starts a new group in the price breakdown. */
function kvGroupRow(label, value) {
  if (value == null || value === '') return '';
  return '<div class="bk-kv bk-kv-group"><span class="bk-kv-label">' + esc(label) + '</span>' +
    '<span class="bk-kv-value is-group">' + esc(value) + '</span></div>';
}

/** One line item under a group row — indented, quieter than the subtotal
 *  it belongs to. */
function kvSubRow(label, value) {
  if (value == null || value === '') return '';
  return '<div class="bk-kv bk-kv-sub"><span class="bk-kv-label">' + esc(label) + '</span>' +
    '<span class="bk-kv-value">' + esc(value) + '</span></div>';
}

/** Trip-as-a-whole summary shown above the flight/hotel breakdowns: dates,
 *  total package price, and a one-line pointer to each leg — the detailed
 *  confirmation codes, fares and room facts live in the sections below. */
function tripSummary(hotel, flight, live, content) {
  const currency = hotel.total_currency || flight.total_currency || 'USD';
  const totalPaid = (Number(hotel.total_amount) || 0) + (Number(flight.total_amount) || 0);

  const dates = hotel.check_in && hotel.check_out
    ? fmtDateOnly(hotel.check_in) + ' – ' + fmtDateOnly(hotel.check_out)
    : (flight.depart_date
      ? (flight.return_date ? fmtDateOnly(flight.depart_date) + ' – ' + fmtDateOnly(flight.return_date) : fmtDateOnly(flight.depart_date))
      : '—');

  const airline = getFlightAirline(flight);
  const carrierName = airline.name || airlineName(airline.code) || 'Flight';
  const firstSeg = liteSegmentGroups(flight)[0];
  const flightNum = firstSeg && firstSeg[0].flight && firstSeg[0].flight.marketingNumber;
  const airportLine = [flight.origin, flight.destination].filter(Boolean).join(' → ');

  const ci = (live.hotel && live.hotel.checkinInstructions) || {};
  const hotelAddress = fullHotelAddress(hotel, content);
  const hotelPhone = (ci.propertyContact && ci.propertyContact.phone) || (content && content.phone) || null;

  const hpb = hotelPriceBreakdown(hotel);
  const fpb = flightPriceBreakdown(flight);
  const roomRate = hpb ? hpb.roomRate : Number(hotel.total_amount) || 0;
  const roomCurrency = hpb ? hpb.currency : hotel.total_currency;
  const perNight = hotel.nights ? roomRate / hotel.nights : null;

  let priceRows = '';
  priceRows += kvGroupRow('Total flight cost', money(flight.total_amount, flight.total_currency));
  priceRows += kvSubRow('Flight fare', fpb ? money(fpb.base, fpb.currency) : money(flight.total_amount, flight.total_currency));
  if (fpb && fpb.taxes != null) priceRows += kvSubRow('Flight taxes & fees', money(fpb.taxes, fpb.currency));

  priceRows += kvGroupRow('Total hotel cost', money(hotel.total_amount, hotel.total_currency));
  priceRows += kvSubRow('Hotel rate', money(roomRate, roomCurrency));
  if (perNight != null) priceRows += kvSubRow('Per night rate', money(perNight, roomCurrency));
  if (hpb) priceRows += kvSubRow('Hotel taxes & fees', money(hpb.taxesFees, hpb.currency));
  if (hpb && hpb.dueAtProperty > 0) priceRows += kvSubRow('Due at property', money(hpb.dueAtProperty, hpb.currency));

  priceRows += kvRow('Trip package total', money(totalPaid, currency), true);

  let html = '<div class="bk-summary-card">' +
    '<p class="bk-summary-eyebrow">Trip summary</p>' +
    '<div class="bk-summary-top">' +
      '<div><p class="bk-stat-label">TRIP DATES</p><p class="bk-summary-dates">' + esc(dates) + '</p></div>' +
      '<div class="bk-summary-total"><p class="bk-stat-label">TOTAL PACKAGE PRICE</p>' +
      '<p class="bk-total-value">' + esc(money(totalPaid, currency)) + '</p></div>' +
    '</div>' +
    '<hr class="bk-divider" />' +
    '<div class="bk-summary-legs">' +
      infoRow(ico('buildings'), hotel.hotel_name || 'Hotel',
        [hotelAddress, hotelPhone].filter(Boolean).join('  ·  ') || null) +
      infoRow(ico('plane'), carrierName + (flightNum ? '  ·  Flight ' + flightNum : ''), airportLine || null) +
    '</div>' +
    '<hr class="bk-divider" />' +
    '<div class="bk-kv-block">' + priceRows + '</div>' +
    '<p class="bk-body bk-summary-note">A full breakdown of each — confirmation codes, fare and room ' +
    'details, and check-in info — is below.</p>' +
    '</div>';
  return html;
}

function hotelMeta(order) {
  return [
    order.check_in && order.check_out ? shortDate(order.check_in) + ' – ' + shortDate(order.check_out) : '',
    order.nights ? plural(order.nights, 'night') : '',
    order.guests ? plural(order.guests, 'guest') : '',
  ].filter(Boolean).join(' · ');
}

function flightMeta(order) {
  return [
    order.origin && order.destination ? order.origin + ' → ' + order.destination : '',
    order.depart_date
      ? (order.return_date ? shortDate(order.depart_date) + ' – ' + shortDate(order.return_date) : shortDate(order.depart_date))
      : '',
    order.passengers ? plural(order.passengers, 'traveller') : '',
    titleCase(order.fare_brand || order.cabin_class),
  ].filter(Boolean).join(' · ');
}

/** Renders the detail view for `item` into `mount`, painting from the stored
 *  rows first and re-rendering as each live call lands. */
export function renderDetail(ctx, item) {
  const { supabase, destMap, roster, mount } = ctx;
  // Guards a slow response from overwriting a page the traveller has already
  // navigated away from.
  const token = (ctx.token = (ctx.token || 0) + 1);
  const live = { hotel: null, flight: null, content: null };

  function paint() {
    if (ctx.token !== token) return;
    let html = backLink();

    if (item.kind === 'hotel' || item.kind === 'trip') {
      const hotel = item.kind === 'trip' ? item.hotel : item.data;
      const flight = item.kind === 'trip' ? item.flight : null;
      const look = destLookup(destMap, flight && flight.destination, hotel.city);
      // Hero photos, most specific first: the property's own gallery, the
      // photo stamped at booking time, then the destination's curated gallery.
      const images = (live.content && live.content.images && live.content.images.length)
        ? live.content.images
        : (hotel.hotel_photo ? [hotel.hotel_photo] : look.images);
      // A trip's top hero is about the DESTINATION, not either leg — the
      // property gets its own photo header down in "Your hotel" below.
      // Same fallback order, just destination-first.
      const tripHeroImages = look.images.length ? look.images : images;

      if (item.kind === 'trip') {
        const name = look.city || hotel.city || (flight && flight.destination) || 'Your trip';
        const meta = [
          hotel.check_in && hotel.check_out
            ? shortDate(hotel.check_in) + ' – ' + shortDate(hotel.check_out)
            : (flight && flight.depart_date
              ? (flight.return_date ? shortDate(flight.depart_date) + ' – ' + shortDate(flight.return_date) : shortDate(flight.depart_date))
              : ''),
          hotel.nights ? plural(hotel.nights, 'night') : '',
          flight && flight.passengers ? plural(flight.passengers, 'traveller') : '',
        ].filter(Boolean).join(' · ');

        // Real property photos for the hotel section's own header, distinct
        // from the top hero (which may be showing a destination or flight shot).
        const hotelImages = (live.content && live.content.images && live.content.images.length)
          ? live.content.images
          : (hotel.hotel_photo ? [hotel.hotel_photo] : []);

        html += hero(tripHeroImages, 'buildings') + heroIdentity('FLIGHT + HOTEL', name, meta);
        html += '<div class="bk-body-wrap">';
        html += tripSummary(hotel, flight, live, live.content);
        html += '<hr class="bk-divider" /><h2 class="bk-trip-head">YOUR FLIGHT</h2>';
        html += flightSections(flight, live.flight, roster, { includeDisclaimer: false });
        html += '<hr class="bk-divider" /><h2 class="bk-trip-head">YOUR HOTEL</h2>';
        if (hotelImages.length) html += hero(hotelImages, 'buildings', 'bk-hero--sub');
        html += hotelSections(hotel, live.hotel, live.content, { includeDisclaimer: false });
        html += '<hr class="bk-divider" /><p class="bk-disclaimer">The flight and hotel above were booked ' +
          'together but are charged and confirmed separately — cancelling or changing one does not affect ' +
          'the other. Rates, taxes and fees for both were confirmed at booking. The airline controls flight ' +
          'schedules and seat assignments after ticketing; the property sets its own check-in requirements ' +
          'and may take a deposit or local tax at the desk. All times shown are local to the airport or ' +
          'property they refer to.</p>';
        html += '</div>';
      } else {
        const place = [hotel.city, hotel.country].filter(Boolean).join(', ');
        html += hero(images, 'buildings') +
          heroIdentity(place ? place.toUpperCase() : null, hotel.hotel_name || 'Hotel', hotelMeta(hotel));
        html += '<div class="bk-body-wrap">' + hotelSections(hotel, live.hotel, live.content, {}) + '</div>';
      }
    } else if (item.kind === 'flight') {
      const order = item.data;
      const look = destLookup(destMap, order.destination, null);
      // The destination the trip is ABOUT — a city name whenever the pool can
      // give one, never a bare IATA if it can be helped.
      const name = look.city || order.destination || 'Your trip';
      html += hero(look.images, 'plane') +
        heroIdentity(order.return_date ? 'ROUND TRIP' : 'ONE WAY', name, flightMeta(order));
      html += '<div class="bk-body-wrap">' + flightSections(order, live.flight, roster, {}) + '</div>';
    } else {
      // Legacy Duffel rows — historical only, and never carrying the LiteAPI
      // payloads the sections above read. A plain record of what was booked.
      const order = item.data;
      const payload = order.duffel_payload || {};
      const passengers = payload.passengers || [];
      html += hero([], 'plane') +
        heroIdentity('FLIGHT', (order.origin || '—') + ' → ' + (order.destination || '—'),
          fmtDateTime(order.departing_at).date);
      let body = confirmBlock('BOOKING REFERENCE', order.booking_reference || '——', order.status,
        order.total_amount, order.total_currency, 'PASSENGERS', order.passenger_count == null ? '—' : order.passenger_count);
      if (passengers.length) {
        body += '<hr class="bk-divider" />' + section('Passengers', passengers.map((p) => travellerRow({
          name: titleCase([p.given_name, p.family_name].filter(Boolean).join(' ')),
          type: p.type ? titleCase(p.type) : '',
        })).join(''));
      }
      body += '<hr class="bk-divider" />' + section('Flight', '<div class="bk-kv-block">' +
        kvRow('Departure', [fmtDateTime(order.departing_at).date, fmtDateTime(order.departing_at).time].filter(Boolean).join(' ')) +
        kvRow('Arrival', [fmtDateTime(order.arriving_at).date, fmtDateTime(order.arriving_at).time].filter(Boolean).join(' ')) +
        kvRow('Booked on', fmtDateTime(order.created_at).date || '—') + '</div>');
      html += '<div class="bk-body-wrap">' + body + '</div>';
    }

    mount.innerHTML = html;
    startCarousels(mount);
    const amenBtn = mount.querySelector('[data-bk-amenities]');
    if (amenBtn) {
      amenBtn.addEventListener('click', () => {
        const rest = mount.querySelector('.bk-amenity-rest');
        if (!rest) return;
        const open = !rest.hidden;
        rest.hidden = open;
        amenBtn.textContent = open ? amenBtn.dataset.showLabel || 'Show all' : 'Show less';
      });
      amenBtn.dataset.showLabel = amenBtn.textContent;
    }
  }

  paint();

  // Live overlays — each re-paints as it lands, so nothing waits on anything.
  const hotel = item.kind === 'trip' ? item.hotel : (item.kind === 'hotel' ? item.data : null);
  const flight = item.kind === 'trip' ? item.flight : (item.kind === 'flight' ? item.data : null);
  if (hotel) {
    fetchHotelLive(supabase, hotel.liteapi_booking_id).then((d) => { live.hotel = d; paint(); });
    fetchHotelContent(supabase, hotel.hotel_id).then((d) => { live.content = d; paint(); });
  }
  if (flight) {
    fetchFlightLive(supabase, flight.liteapi_booking_id).then((d) => { live.flight = d; paint(); });
  }
}
