// ───────────────────────────────────────────────────────────────────
//  wt-airlines.js — carrier names, marks and check-in landing pages.
//  Ported from the app's src/data/airlines.ts + src/data/airlineCheckin.ts
//  so the website's booking pages name a carrier and link its check-in
//  exactly the way the app does. Keep the two in step when either moves.
// ───────────────────────────────────────────────────────────────────

/** IATA code → carrier name, for the same 48-airline set the app carries. */
export const AIRLINE_NAMES = {
  AA: 'American Airlines', DL: 'Delta Air Lines', UA: 'United Airlines',
  WN: 'Southwest Airlines', B6: 'JetBlue Airways', AS: 'Alaska Airlines',
  NK: 'Spirit Airlines', F9: 'Frontier Airlines', HA: 'Hawaiian Airlines',
  AC: 'Air Canada', WS: 'WestJet',
  BA: 'British Airways', LH: 'Lufthansa', AF: 'Air France', KL: 'KLM',
  IB: 'Iberia', AZ: 'ITA Airways', LX: 'SWISS', OS: 'Austrian Airlines',
  SK: 'SAS', FI: 'Icelandair', TP: 'TAP Air Portugal', FR: 'Ryanair',
  U2: 'easyJet', VY: 'Vueling', W6: 'Wizz Air', PC: 'Pegasus Airlines',
  TK: 'Turkish Airlines',
  EK: 'Emirates', QR: 'Qatar Airways', EY: 'Etihad Airways',
  SQ: 'Singapore Airlines', CX: 'Cathay Pacific', JL: 'Japan Airlines',
  NH: 'All Nippon Airways', KE: 'Korean Air', OZ: 'Asiana Airlines',
  CI: 'China Airlines', MH: 'Malaysia Airlines', TG: 'Thai Airways',
  VN: 'Vietnam Airlines', GA: 'Garuda Indonesia', AI: 'Air India',
  QF: 'Qantas', NZ: 'Air New Zealand',
  AM: 'Aeroméxico', LA: 'LATAM Airlines', G3: 'GOL Airlines',
};

// Best-effort "manage my booking / online check-in" entry point per carrier.
// These are each airline's own generic page, not a deep link with the PNR
// filled in — check-in URL params are not standardised, so a guessed
// per-carrier format would silently break. The traveller still needs the
// airline PNR and the lead passenger's last name once they land there.
//
// NOTE: sandbox bookings carry a mock carrier code ("ND" / "Nuitee Air") that
// will never match this table — that is expected, not a bug.
export const AIRLINE_CHECKIN = {
  AA: { name: 'American Airlines',  url: 'https://www.aa.com/reservation/find' },
  DL: { name: 'Delta Air Lines',    url: 'https://www.delta.com/mytrips/' },
  UA: { name: 'United Airlines',    url: 'https://www.united.com/en/us/manageres/mytrips' },
  WN: { name: 'Southwest Airlines', url: 'https://www.southwest.com/air/check-in/index.html' },
  B6: { name: 'JetBlue Airways',    url: 'https://www.jetblue.com/checkin' },
  AS: { name: 'Alaska Airlines',    url: 'https://www.alaskaair.com/planbook/managereservations' },
  NK: { name: 'Spirit Airlines',    url: 'https://www.spirit.com/check-in' },
  F9: { name: 'Frontier Airlines',  url: 'https://www.flyfrontier.com/travel/my-trips/checkin/' },
  HA: { name: 'Hawaiian Airlines',  url: 'https://www.hawaiianairlines.com/check-in' },
  AC: { name: 'Air Canada', url: 'https://www.aircanada.com/checkin' },
  WS: { name: 'WestJet',    url: 'https://www.westjet.com/en-ca/manage-trip/check-in' },
  BA: { name: 'British Airways',   url: 'https://www.britishairways.com/travel/managebooking/execclub/_gf/en_gb' },
  LH: { name: 'Lufthansa',         url: 'https://www.lufthansa.com/us/en/check-in' },
  AF: { name: 'Air France',        url: 'https://www.airfrance.us/US/en/common/transverse/moteurs/homepage_checkin.htm' },
  KL: { name: 'KLM',               url: 'https://www.klm.com/checkin' },
  IB: { name: 'Iberia',            url: 'https://www.iberia.com/us/check-in/' },
  AZ: { name: 'ITA Airways',       url: 'https://www.ita-airways.com/en_us/fly-ita/check-in.html' },
  LX: { name: 'SWISS',             url: 'https://www.swiss.com/us/en/check-in' },
  OS: { name: 'Austrian Airlines', url: 'https://www.austrian.com/checkin' },
  SK: { name: 'SAS',               url: 'https://www.flysas.com/en/check-in/' },
  FI: { name: 'Icelandair',        url: 'https://www.icelandair.com/support/check-in/' },
  TP: { name: 'TAP Air Portugal',  url: 'https://www.flytap.com/en-us/check-in' },
  FR: { name: 'Ryanair',           url: 'https://www.ryanair.com/gb/en/lp/check-in' },
  U2: { name: 'easyJet',           url: 'https://www.easyjet.com/en/check-in' },
  VY: { name: 'Vueling',           url: 'https://www.vueling.com/en/check-in' },
  W6: { name: 'Wizz Air',          url: 'https://wizzair.com/en-gb/information-and-services/check-in' },
  PC: { name: 'Pegasus Airlines',  url: 'https://www.flypgs.com/en/online-check-in' },
  TK: { name: 'Turkish Airlines',  url: 'https://www.turkishairlines.com/en-int/flights/manage-your-trip/online-check-in/' },
  EK: { name: 'Emirates',       url: 'https://www.emirates.com/us/english/manage-booking/online-check-in/' },
  QR: { name: 'Qatar Airways',  url: 'https://www.qatarairways.com/en/manage-booking.html' },
  EY: { name: 'Etihad Airways', url: 'https://www.etihad.com/en-us/manage' },
  SQ: { name: 'Singapore Airlines', url: 'https://www.singaporeair.com/en_UK/us/travel-information/checkin/' },
  CX: { name: 'Cathay Pacific',     url: 'https://www.cathaypacific.com/cx/en_US/manage-booking/online-checkin.html' },
  JL: { name: 'Japan Airlines',     url: 'https://www.jal.co.jp/en/dom/checkin/' },
  NH: { name: 'All Nippon Airways', url: 'https://www.ana.co.jp/en/us/travel-information/checkin/' },
  KE: { name: 'Korean Air',         url: 'https://www.koreanair.com/us/en/booking/check-in' },
  OZ: { name: 'Asiana Airlines',    url: 'https://flyasiana.com/C/US/EN/contents/online-check-in' },
  CI: { name: 'China Airlines',     url: 'https://www.china-airlines.com/us/en/fly/prepare-for-the-flight/check-in' },
  MH: { name: 'Malaysia Airlines',  url: 'https://www.malaysiaairlines.com/us/en/manage-booking/online-checkin.html' },
  TG: { name: 'Thai Airways',       url: 'https://www.thaiairways.com/en/plan_my_trip/check_in/online_check_in.page' },
  VN: { name: 'Vietnam Airlines',   url: 'https://www.vietnamairlines.com/us/en/travel-information/check-in' },
  GA: { name: 'Garuda Indonesia',   url: 'https://www.garuda-indonesia.com/us/en/check-in/index' },
  AI: { name: 'Air India',          url: 'https://www.airindia.com/in/en/manage/web-checkin.html' },
  QF: { name: 'Qantas',          url: 'https://www.qantas.com/us/en/travel-info/check-in.html' },
  NZ: { name: 'Air New Zealand', url: 'https://www.airnewzealand.com/check-in' },
  AM: { name: 'Aeroméxico',     url: 'https://aeromexico.com/en-us/check-in' },
  LA: { name: 'LATAM Airlines', url: 'https://www.latamairlines.com/us/en/experience/check-in' },
  G3: { name: 'GOL Airlines',   url: 'https://www.voegol.com.br/en/checkin' },
};

export function airlineName(code) {
  return code ? (AIRLINE_NAMES[String(code).toUpperCase()] || null) : null;
}

export function airlineCheckin(code) {
  return code ? (AIRLINE_CHECKIN[String(code).toUpperCase()] || null) : null;
}

/** LiteAPI/Nuitee's static CDN — tightly-cropped transparent square marks,
 *  full coverage across the codes above. */
export function airlineLogo(code) {
  return 'https://production.nuitee.flights/static/images/airlines/' + code + '.png';
}

/** Only used when airlineLogo() 404s — a carrier outside the curated list. */
export function airlineLogoFallback(code) {
  return 'https://pics.avs.io/200/200/' + code + '.png';
}
