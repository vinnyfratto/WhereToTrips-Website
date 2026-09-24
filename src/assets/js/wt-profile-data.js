// ───────────────────────────────────────────────────────────────────
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
export const COUNTRIES = [
  {
    "code": "AF",
    "name": "Afghanistan",
    "dial": "93"
  },
  {
    "code": "AL",
    "name": "Albania",
    "dial": "355"
  },
  {
    "code": "DZ",
    "name": "Algeria",
    "dial": "213"
  },
  {
    "code": "AD",
    "name": "Andorra",
    "dial": "376"
  },
  {
    "code": "AO",
    "name": "Angola",
    "dial": "244"
  },
  {
    "code": "AG",
    "name": "Antigua and Barbuda",
    "dial": "1268"
  },
  {
    "code": "AR",
    "name": "Argentina",
    "dial": "54"
  },
  {
    "code": "AM",
    "name": "Armenia",
    "dial": "374"
  },
  {
    "code": "AW",
    "name": "Aruba",
    "dial": "297"
  },
  {
    "code": "AU",
    "name": "Australia",
    "dial": "61"
  },
  {
    "code": "AT",
    "name": "Austria",
    "dial": "43"
  },
  {
    "code": "AZ",
    "name": "Azerbaijan",
    "dial": "994"
  },
  {
    "code": "BS",
    "name": "Bahamas",
    "dial": "1242"
  },
  {
    "code": "BH",
    "name": "Bahrain",
    "dial": "973"
  },
  {
    "code": "BD",
    "name": "Bangladesh",
    "dial": "880"
  },
  {
    "code": "BB",
    "name": "Barbados",
    "dial": "1246"
  },
  {
    "code": "BY",
    "name": "Belarus",
    "dial": "375"
  },
  {
    "code": "BE",
    "name": "Belgium",
    "dial": "32"
  },
  {
    "code": "BZ",
    "name": "Belize",
    "dial": "501"
  },
  {
    "code": "BJ",
    "name": "Benin",
    "dial": "229"
  },
  {
    "code": "BM",
    "name": "Bermuda",
    "dial": "1441"
  },
  {
    "code": "BT",
    "name": "Bhutan",
    "dial": "975"
  },
  {
    "code": "BO",
    "name": "Bolivia",
    "dial": "591"
  },
  {
    "code": "BA",
    "name": "Bosnia and Herzegovina",
    "dial": "387"
  },
  {
    "code": "BW",
    "name": "Botswana",
    "dial": "267"
  },
  {
    "code": "BR",
    "name": "Brazil",
    "dial": "55"
  },
  {
    "code": "BN",
    "name": "Brunei",
    "dial": "673"
  },
  {
    "code": "BG",
    "name": "Bulgaria",
    "dial": "359"
  },
  {
    "code": "BF",
    "name": "Burkina Faso",
    "dial": "226"
  },
  {
    "code": "BI",
    "name": "Burundi",
    "dial": "257"
  },
  {
    "code": "KH",
    "name": "Cambodia",
    "dial": "855"
  },
  {
    "code": "CM",
    "name": "Cameroon",
    "dial": "237"
  },
  {
    "code": "CA",
    "name": "Canada",
    "dial": "1"
  },
  {
    "code": "CV",
    "name": "Cape Verde",
    "dial": "238"
  },
  {
    "code": "KY",
    "name": "Cayman Islands",
    "dial": "1345"
  },
  {
    "code": "CF",
    "name": "Central African Republic",
    "dial": "236"
  },
  {
    "code": "TD",
    "name": "Chad",
    "dial": "235"
  },
  {
    "code": "CL",
    "name": "Chile",
    "dial": "56"
  },
  {
    "code": "CN",
    "name": "China",
    "dial": "86"
  },
  {
    "code": "CO",
    "name": "Colombia",
    "dial": "57"
  },
  {
    "code": "KM",
    "name": "Comoros",
    "dial": "269"
  },
  {
    "code": "CG",
    "name": "Congo",
    "dial": "242"
  },
  {
    "code": "CD",
    "name": "Congo (DRC)",
    "dial": "243"
  },
  {
    "code": "CR",
    "name": "Costa Rica",
    "dial": "506"
  },
  {
    "code": "CI",
    "name": "Côte d'Ivoire",
    "dial": "225"
  },
  {
    "code": "HR",
    "name": "Croatia",
    "dial": "385"
  },
  {
    "code": "CU",
    "name": "Cuba",
    "dial": "53"
  },
  {
    "code": "CW",
    "name": "Curaçao",
    "dial": "599"
  },
  {
    "code": "CY",
    "name": "Cyprus",
    "dial": "357"
  },
  {
    "code": "CZ",
    "name": "Czechia",
    "dial": "420"
  },
  {
    "code": "DK",
    "name": "Denmark",
    "dial": "45"
  },
  {
    "code": "DJ",
    "name": "Djibouti",
    "dial": "253"
  },
  {
    "code": "DM",
    "name": "Dominica",
    "dial": "1767"
  },
  {
    "code": "DO",
    "name": "Dominican Republic",
    "dial": "1809"
  },
  {
    "code": "EC",
    "name": "Ecuador",
    "dial": "593"
  },
  {
    "code": "EG",
    "name": "Egypt",
    "dial": "20"
  },
  {
    "code": "SV",
    "name": "El Salvador",
    "dial": "503"
  },
  {
    "code": "GQ",
    "name": "Equatorial Guinea",
    "dial": "240"
  },
  {
    "code": "ER",
    "name": "Eritrea",
    "dial": "291"
  },
  {
    "code": "EE",
    "name": "Estonia",
    "dial": "372"
  },
  {
    "code": "SZ",
    "name": "Eswatini",
    "dial": "268"
  },
  {
    "code": "ET",
    "name": "Ethiopia",
    "dial": "251"
  },
  {
    "code": "FJ",
    "name": "Fiji",
    "dial": "679"
  },
  {
    "code": "FI",
    "name": "Finland",
    "dial": "358"
  },
  {
    "code": "FR",
    "name": "France",
    "dial": "33"
  },
  {
    "code": "PF",
    "name": "French Polynesia",
    "dial": "689"
  },
  {
    "code": "GA",
    "name": "Gabon",
    "dial": "241"
  },
  {
    "code": "GM",
    "name": "Gambia",
    "dial": "220"
  },
  {
    "code": "GE",
    "name": "Georgia",
    "dial": "995"
  },
  {
    "code": "DE",
    "name": "Germany",
    "dial": "49"
  },
  {
    "code": "GH",
    "name": "Ghana",
    "dial": "233"
  },
  {
    "code": "GI",
    "name": "Gibraltar",
    "dial": "350"
  },
  {
    "code": "GR",
    "name": "Greece",
    "dial": "30"
  },
  {
    "code": "GL",
    "name": "Greenland",
    "dial": "299"
  },
  {
    "code": "GD",
    "name": "Grenada",
    "dial": "1473"
  },
  {
    "code": "GU",
    "name": "Guam",
    "dial": "1671"
  },
  {
    "code": "GT",
    "name": "Guatemala",
    "dial": "502"
  },
  {
    "code": "GN",
    "name": "Guinea",
    "dial": "224"
  },
  {
    "code": "GW",
    "name": "Guinea-Bissau",
    "dial": "245"
  },
  {
    "code": "GY",
    "name": "Guyana",
    "dial": "592"
  },
  {
    "code": "HT",
    "name": "Haiti",
    "dial": "509"
  },
  {
    "code": "HN",
    "name": "Honduras",
    "dial": "504"
  },
  {
    "code": "HK",
    "name": "Hong Kong",
    "dial": "852"
  },
  {
    "code": "HU",
    "name": "Hungary",
    "dial": "36"
  },
  {
    "code": "IS",
    "name": "Iceland",
    "dial": "354"
  },
  {
    "code": "IN",
    "name": "India",
    "dial": "91"
  },
  {
    "code": "ID",
    "name": "Indonesia",
    "dial": "62"
  },
  {
    "code": "IR",
    "name": "Iran",
    "dial": "98"
  },
  {
    "code": "IQ",
    "name": "Iraq",
    "dial": "964"
  },
  {
    "code": "IE",
    "name": "Ireland",
    "dial": "353"
  },
  {
    "code": "IL",
    "name": "Israel",
    "dial": "972"
  },
  {
    "code": "IT",
    "name": "Italy",
    "dial": "39"
  },
  {
    "code": "JM",
    "name": "Jamaica",
    "dial": "1876"
  },
  {
    "code": "JP",
    "name": "Japan",
    "dial": "81"
  },
  {
    "code": "JO",
    "name": "Jordan",
    "dial": "962"
  },
  {
    "code": "KZ",
    "name": "Kazakhstan",
    "dial": "7"
  },
  {
    "code": "KE",
    "name": "Kenya",
    "dial": "254"
  },
  {
    "code": "KI",
    "name": "Kiribati",
    "dial": "686"
  },
  {
    "code": "KW",
    "name": "Kuwait",
    "dial": "965"
  },
  {
    "code": "KG",
    "name": "Kyrgyzstan",
    "dial": "996"
  },
  {
    "code": "LA",
    "name": "Laos",
    "dial": "856"
  },
  {
    "code": "LV",
    "name": "Latvia",
    "dial": "371"
  },
  {
    "code": "LB",
    "name": "Lebanon",
    "dial": "961"
  },
  {
    "code": "LS",
    "name": "Lesotho",
    "dial": "266"
  },
  {
    "code": "LR",
    "name": "Liberia",
    "dial": "231"
  },
  {
    "code": "LY",
    "name": "Libya",
    "dial": "218"
  },
  {
    "code": "LI",
    "name": "Liechtenstein",
    "dial": "423"
  },
  {
    "code": "LT",
    "name": "Lithuania",
    "dial": "370"
  },
  {
    "code": "LU",
    "name": "Luxembourg",
    "dial": "352"
  },
  {
    "code": "MO",
    "name": "Macao",
    "dial": "853"
  },
  {
    "code": "MG",
    "name": "Madagascar",
    "dial": "261"
  },
  {
    "code": "MW",
    "name": "Malawi",
    "dial": "265"
  },
  {
    "code": "MY",
    "name": "Malaysia",
    "dial": "60"
  },
  {
    "code": "MV",
    "name": "Maldives",
    "dial": "960"
  },
  {
    "code": "ML",
    "name": "Mali",
    "dial": "223"
  },
  {
    "code": "MT",
    "name": "Malta",
    "dial": "356"
  },
  {
    "code": "MH",
    "name": "Marshall Islands",
    "dial": "692"
  },
  {
    "code": "MR",
    "name": "Mauritania",
    "dial": "222"
  },
  {
    "code": "MU",
    "name": "Mauritius",
    "dial": "230"
  },
  {
    "code": "MX",
    "name": "Mexico",
    "dial": "52"
  },
  {
    "code": "FM",
    "name": "Micronesia",
    "dial": "691"
  },
  {
    "code": "MD",
    "name": "Moldova",
    "dial": "373"
  },
  {
    "code": "MC",
    "name": "Monaco",
    "dial": "377"
  },
  {
    "code": "MN",
    "name": "Mongolia",
    "dial": "976"
  },
  {
    "code": "ME",
    "name": "Montenegro",
    "dial": "382"
  },
  {
    "code": "MA",
    "name": "Morocco",
    "dial": "212"
  },
  {
    "code": "MZ",
    "name": "Mozambique",
    "dial": "258"
  },
  {
    "code": "MM",
    "name": "Myanmar",
    "dial": "95"
  },
  {
    "code": "NA",
    "name": "Namibia",
    "dial": "264"
  },
  {
    "code": "NP",
    "name": "Nepal",
    "dial": "977"
  },
  {
    "code": "NL",
    "name": "Netherlands",
    "dial": "31"
  },
  {
    "code": "NC",
    "name": "New Caledonia",
    "dial": "687"
  },
  {
    "code": "NZ",
    "name": "New Zealand",
    "dial": "64"
  },
  {
    "code": "NI",
    "name": "Nicaragua",
    "dial": "505"
  },
  {
    "code": "NE",
    "name": "Niger",
    "dial": "227"
  },
  {
    "code": "NG",
    "name": "Nigeria",
    "dial": "234"
  },
  {
    "code": "MK",
    "name": "North Macedonia",
    "dial": "389"
  },
  {
    "code": "NO",
    "name": "Norway",
    "dial": "47"
  },
  {
    "code": "OM",
    "name": "Oman",
    "dial": "968"
  },
  {
    "code": "PK",
    "name": "Pakistan",
    "dial": "92"
  },
  {
    "code": "PW",
    "name": "Palau",
    "dial": "680"
  },
  {
    "code": "PS",
    "name": "Palestine",
    "dial": "970"
  },
  {
    "code": "PA",
    "name": "Panama",
    "dial": "507"
  },
  {
    "code": "PG",
    "name": "Papua New Guinea",
    "dial": "675"
  },
  {
    "code": "PY",
    "name": "Paraguay",
    "dial": "595"
  },
  {
    "code": "PE",
    "name": "Peru",
    "dial": "51"
  },
  {
    "code": "PH",
    "name": "Philippines",
    "dial": "63"
  },
  {
    "code": "PL",
    "name": "Poland",
    "dial": "48"
  },
  {
    "code": "PT",
    "name": "Portugal",
    "dial": "351"
  },
  {
    "code": "PR",
    "name": "Puerto Rico",
    "dial": "1787"
  },
  {
    "code": "QA",
    "name": "Qatar",
    "dial": "974"
  },
  {
    "code": "RO",
    "name": "Romania",
    "dial": "40"
  },
  {
    "code": "RU",
    "name": "Russia",
    "dial": "7"
  },
  {
    "code": "RW",
    "name": "Rwanda",
    "dial": "250"
  },
  {
    "code": "WS",
    "name": "Samoa",
    "dial": "685"
  },
  {
    "code": "SM",
    "name": "San Marino",
    "dial": "378"
  },
  {
    "code": "SA",
    "name": "Saudi Arabia",
    "dial": "966"
  },
  {
    "code": "SN",
    "name": "Senegal",
    "dial": "221"
  },
  {
    "code": "RS",
    "name": "Serbia",
    "dial": "381"
  },
  {
    "code": "SC",
    "name": "Seychelles",
    "dial": "248"
  },
  {
    "code": "SL",
    "name": "Sierra Leone",
    "dial": "232"
  },
  {
    "code": "SG",
    "name": "Singapore",
    "dial": "65"
  },
  {
    "code": "SK",
    "name": "Slovakia",
    "dial": "421"
  },
  {
    "code": "SI",
    "name": "Slovenia",
    "dial": "386"
  },
  {
    "code": "SB",
    "name": "Solomon Islands",
    "dial": "677"
  },
  {
    "code": "SO",
    "name": "Somalia",
    "dial": "252"
  },
  {
    "code": "ZA",
    "name": "South Africa",
    "dial": "27"
  },
  {
    "code": "KR",
    "name": "South Korea",
    "dial": "82"
  },
  {
    "code": "SS",
    "name": "South Sudan",
    "dial": "211"
  },
  {
    "code": "ES",
    "name": "Spain",
    "dial": "34"
  },
  {
    "code": "LK",
    "name": "Sri Lanka",
    "dial": "94"
  },
  {
    "code": "KN",
    "name": "St Kitts and Nevis",
    "dial": "1869"
  },
  {
    "code": "LC",
    "name": "St Lucia",
    "dial": "1758"
  },
  {
    "code": "VC",
    "name": "St Vincent and the Grenadines",
    "dial": "1784"
  },
  {
    "code": "SD",
    "name": "Sudan",
    "dial": "249"
  },
  {
    "code": "SR",
    "name": "Suriname",
    "dial": "597"
  },
  {
    "code": "SE",
    "name": "Sweden",
    "dial": "46"
  },
  {
    "code": "CH",
    "name": "Switzerland",
    "dial": "41"
  },
  {
    "code": "SY",
    "name": "Syria",
    "dial": "963"
  },
  {
    "code": "TW",
    "name": "Taiwan",
    "dial": "886"
  },
  {
    "code": "TJ",
    "name": "Tajikistan",
    "dial": "992"
  },
  {
    "code": "TZ",
    "name": "Tanzania",
    "dial": "255"
  },
  {
    "code": "TH",
    "name": "Thailand",
    "dial": "66"
  },
  {
    "code": "TL",
    "name": "Timor-Leste",
    "dial": "670"
  },
  {
    "code": "TG",
    "name": "Togo",
    "dial": "228"
  },
  {
    "code": "TO",
    "name": "Tonga",
    "dial": "676"
  },
  {
    "code": "TT",
    "name": "Trinidad and Tobago",
    "dial": "1868"
  },
  {
    "code": "TN",
    "name": "Tunisia",
    "dial": "216"
  },
  {
    "code": "TR",
    "name": "Türkiye",
    "dial": "90"
  },
  {
    "code": "TM",
    "name": "Turkmenistan",
    "dial": "993"
  },
  {
    "code": "TV",
    "name": "Tuvalu",
    "dial": "688"
  },
  {
    "code": "UG",
    "name": "Uganda",
    "dial": "256"
  },
  {
    "code": "UA",
    "name": "Ukraine",
    "dial": "380"
  },
  {
    "code": "AE",
    "name": "United Arab Emirates",
    "dial": "971"
  },
  {
    "code": "GB",
    "name": "United Kingdom",
    "dial": "44"
  },
  {
    "code": "US",
    "name": "United States",
    "dial": "1"
  },
  {
    "code": "UY",
    "name": "Uruguay",
    "dial": "598"
  },
  {
    "code": "UZ",
    "name": "Uzbekistan",
    "dial": "998"
  },
  {
    "code": "VU",
    "name": "Vanuatu",
    "dial": "678"
  },
  {
    "code": "VA",
    "name": "Vatican City",
    "dial": "379"
  },
  {
    "code": "VE",
    "name": "Venezuela",
    "dial": "58"
  },
  {
    "code": "VN",
    "name": "Vietnam",
    "dial": "84"
  },
  {
    "code": "VG",
    "name": "Virgin Islands (British)",
    "dial": "1284"
  },
  {
    "code": "VI",
    "name": "Virgin Islands (US)",
    "dial": "1340"
  },
  {
    "code": "YE",
    "name": "Yemen",
    "dial": "967"
  },
  {
    "code": "ZM",
    "name": "Zambia",
    "dial": "260"
  },
  {
    "code": "ZW",
    "name": "Zimbabwe",
    "dial": "263"
  }
];

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
  { value: 'none', label: 'None' },
  { value: '2pct', label: '±2%' },
  { value: '5pct', label: '±5%' },
  { value: '10pct', label: '±10%' },
];

export const AIRLINES = [
  {
    "code": "AA",
    "name": "American Airlines"
  },
  {
    "code": "DL",
    "name": "Delta Air Lines"
  },
  {
    "code": "UA",
    "name": "United Airlines"
  },
  {
    "code": "WN",
    "name": "Southwest Airlines"
  },
  {
    "code": "B6",
    "name": "JetBlue Airways"
  },
  {
    "code": "AS",
    "name": "Alaska Airlines"
  },
  {
    "code": "NK",
    "name": "Spirit Airlines"
  },
  {
    "code": "F9",
    "name": "Frontier Airlines"
  },
  {
    "code": "HA",
    "name": "Hawaiian Airlines"
  },
  {
    "code": "AC",
    "name": "Air Canada"
  },
  {
    "code": "WS",
    "name": "WestJet"
  },
  {
    "code": "BA",
    "name": "British Airways"
  },
  {
    "code": "LH",
    "name": "Lufthansa"
  },
  {
    "code": "AF",
    "name": "Air France"
  },
  {
    "code": "KL",
    "name": "KLM"
  },
  {
    "code": "IB",
    "name": "Iberia"
  },
  {
    "code": "AZ",
    "name": "ITA Airways"
  },
  {
    "code": "LX",
    "name": "SWISS"
  },
  {
    "code": "OS",
    "name": "Austrian Airlines"
  },
  {
    "code": "SK",
    "name": "SAS"
  },
  {
    "code": "FI",
    "name": "Icelandair"
  },
  {
    "code": "TP",
    "name": "TAP Air Portugal"
  },
  {
    "code": "FR",
    "name": "Ryanair"
  },
  {
    "code": "U2",
    "name": "easyJet"
  },
  {
    "code": "VY",
    "name": "Vueling"
  },
  {
    "code": "W6",
    "name": "Wizz Air"
  },
  {
    "code": "PC",
    "name": "Pegasus Airlines"
  },
  {
    "code": "TK",
    "name": "Turkish Airlines"
  },
  {
    "code": "EK",
    "name": "Emirates"
  },
  {
    "code": "QR",
    "name": "Qatar Airways"
  },
  {
    "code": "EY",
    "name": "Etihad Airways"
  },
  {
    "code": "SQ",
    "name": "Singapore Airlines"
  },
  {
    "code": "CX",
    "name": "Cathay Pacific"
  },
  {
    "code": "JL",
    "name": "Japan Airlines"
  },
  {
    "code": "NH",
    "name": "All Nippon Airways"
  },
  {
    "code": "KE",
    "name": "Korean Air"
  },
  {
    "code": "OZ",
    "name": "Asiana Airlines"
  },
  {
    "code": "CI",
    "name": "China Airlines"
  },
  {
    "code": "MH",
    "name": "Malaysia Airlines"
  },
  {
    "code": "TG",
    "name": "Thai Airways"
  },
  {
    "code": "VN",
    "name": "Vietnam Airlines"
  },
  {
    "code": "GA",
    "name": "Garuda Indonesia"
  },
  {
    "code": "AI",
    "name": "Air India"
  },
  {
    "code": "QF",
    "name": "Qantas"
  },
  {
    "code": "NZ",
    "name": "Air New Zealand"
  },
  {
    "code": "AM",
    "name": "Aeroméxico"
  },
  {
    "code": "LA",
    "name": "LATAM Airlines"
  },
  {
    "code": "G3",
    "name": "GOL Airlines"
  }
];

export const HOTEL_LOYALTY = [
  {
    "code": "marriott_bonvoy",
    "name": "Marriott Bonvoy",
    "monogram": "MB"
  },
  {
    "code": "hilton_honors",
    "name": "Hilton Honors",
    "monogram": "HH"
  },
  {
    "code": "world_of_hyatt",
    "name": "World of Hyatt",
    "monogram": "WH"
  },
  {
    "code": "ihg_one_rewards",
    "name": "IHG One Rewards",
    "monogram": "IHG"
  },
  {
    "code": "wyndham_rewards",
    "name": "Wyndham Rewards",
    "monogram": "WR"
  },
  {
    "code": "choice_privileges",
    "name": "Choice Privileges",
    "monogram": "CP"
  },
  {
    "code": "accor_live_limitless",
    "name": "Accor Live Limitless",
    "monogram": "ALL"
  },
  {
    "code": "best_western_rewards",
    "name": "Best Western Rewards",
    "monogram": "BW"
  },
  {
    "code": "radisson_rewards",
    "name": "Radisson Rewards",
    "monogram": "RR"
  },
  {
    "code": "other",
    "name": "Other",
    "monogram": ""
  }
];

/** The traveller's core travel personality, captured in the app's account
 *  walkthrough and stored on profiles.base_vibes. */
export const BASE_VIBES = [
  {
    "key": "beach",
    "label": "Beaches"
  },
  {
    "key": "city_break",
    "label": "City Life"
  },
  {
    "key": "food_wine",
    "label": "Food & Wine"
  },
  {
    "key": "nature",
    "label": "Nature"
  },
  {
    "key": "mountains",
    "label": "Mountains"
  },
  {
    "key": "adventure",
    "label": "Adventure"
  },
  {
    "key": "culture",
    "label": "Culture & Arts"
  },
  {
    "key": "history",
    "label": "History"
  },
  {
    "key": "nightlife",
    "label": "Nightlife"
  },
  {
    "key": "wildlife",
    "label": "Wildlife"
  },
  {
    "key": "luxury",
    "label": "Luxury"
  },
  {
    "key": "wellness",
    "label": "Wellness & Spa"
  }
];

export const BASE_VIBE_CAP = 4;

// ── Hotel brand groups (copied from the app's src/data/hotelChains.ts) ──
// The app's Preferences picker saves flight_prefs.preferredHotelChains as these
// slugs. Brands are kept so typing "Sheraton" finds Marriott, as in the app.
export const HOTEL_CHAINS = [{"slug":"marriott","name":"Marriott","brands":["Marriott Hotels & Resorts","Renaissance Hotels & Resorts","Courtyard by Marriott","The Ritz-Carlton Company, L.L.C","JW Marriott Hotels & Resorts","Residence Inn","Design Hotels","SpringHill Suites","Fairfield Inn","Autograph Collection","AC Hotels by Marriott","TownePlace Suites by Marriott","Protea Hotels by Marriott","Marriott Vacation Club","Gaylord Hotels","Moxy Hotels","Marriott Executive Apartments","Aloft","Element by Westin","Four Points by Sheraton","Le Meridien Hotels & Resorts","Luxury Collection","Westin","W Hotels","Tribute Portfolio","St. Regis","Sheraton","Sheraton Vacation Club","Westin Vacation Club","Four Points Express","Marriott"]},{"slug":"wyndham","name":"Wyndham","brands":["Ramada","Days Inn","Travelodge by Wyndham","Wyndham Hotels & Resorts","Howard Johnson","Super 8","Wingate by Wyndham","La Quinta Inn and Suites","Baymont Inn & Suites","Hawthorn Suites","Microtel Inns & Suites","Tryp","Wyndham Garden","Wyndham Grand","AmericInn","Dazzler By Wyndham","Esplendor by Wyndham","La Quinta by Wyndham","Ramada Encore","Vienna House by Wyndham","Wyndham Extra Holidays","Wyndham Vacation Ownership"]},{"slug":"radisson","name":"Radisson","brands":["Park Plaza Hotels & Resorts","art'otel","Country Inn & Suites by Radisson","Park Inn by Radisson","Radisson","Radisson Blu","Radisson Blu Edwardian","Radisson Red","Radisson Collection","Radisson Individuals","ARTOTELGROUP","Prizeotel (Radisson)","Radisson Americas","Park Inn by Radisson Americas","Country Inn & Suites by Radisson Americas","Park Plaza Hotels & Resorts Americas","Radisson Blu Americas","Radisson Individuals Americas","Radisson Red Americas","Radisson Hotel Group","Park Plaza Hotels Chile","Park Plaza Suites"]},{"slug":"hilton","name":"Hilton","brands":["Hilton Hotels & Resorts","Hampton Inn","Conrad Hotels & Resorts","Homewood Suites by Hilton","Embassy Suites Hotels","Doubletree by Hilton","Hilton Garden Inn","Waldorf Astoria Hotels & Resorts","Hilton Grand Vacations","Home2 Suites by Hilton","Curio Collection by Hilton","Canopy by Hilton","Tru by Hilton","Tapestry Collection","LXR Hotels & Resorts","Motto","Signia by Hilton","Tempo by Hilton","Spark by Hilton","Hilton Worldwide"]},{"slug":"accor","name":"Accor","brands":["Sofitel","Novotel","Mercure","Novotel Suites","ibis","Pullman Hotels and Resorts","MGallery","Accor","Adagio Access Aparthotels","ibis Styles","Grand Mercure","ibis Budget","Adagio Aparthotels","Sofitel Legend","Fairmont Hotels & Resorts","Raffles","Swissôtel Hotels & Resorts","Mövenpick"]},{"slug":"hyatt","name":"Hyatt","brands":["Hyatt","Park Hyatt","Andaz","Grand Hyatt","Hyatt Regency","Hyatt Place","Hyatt House","Hyatt Residence Club","Hyatt Centric","Hyatt Zilara","Hyatt Ziva","Unbound Collection by Hyatt","Thompson Hotels","Alila Hotels","Joie De Vivre","Destination by Hyatt","Dream by Hyatt","Hyatt Hotels"]},{"slug":"ihg","name":"IHG (Holiday Inn, Crowne Plaza)","brands":["InterContinental Hotels & Resorts","Crowne Plaza Hotels & Resorts","Holiday Inn Hotels & Resorts","Even Hotels & Resorts","Candlewood Suites","Staybridge Suites","Hotel Indigo","Holiday Inn Express","Six Senses Resorts & Spas","Kimpton Hotels","Avid","Voco","Regent","Atwell Suites","Vignette Collection"]},{"slug":"bestwestern","name":"Best Western","brands":["Best Western","Best Western Plus","Best Western Premier","Executive Residency by Best Western","Vib by Best Western","SureStay Hotel by Best Western","SureStay Plus Hotel by Best Western","SureStay Collection by Best Western","BW Signature Collection by Best Western","Glo by Best Western","Aiden by Best Western","Sure Hotel by Best Western","Sure Hotel Collection by Best Western","Best Western Hotels"]},{"slug":"choice","name":"Choice Hotels","brands":["Comfort Inn","Comfort Suites","Quality Inn","Sleep Inn","Clarion","Cambria Hotels","Econo Lodge","Rodeway Inn","Ascend Collection","Suburban","Quality Hotel","WoodSpring","Comfort","Everhome Suites"]},{"slug":"sonesta","name":"Sonesta","brands":["Royal Sonesta","Sonesta Hotel & Resorts","Sonesta ES Suites","Sonesta Select","Sonesta Simply Suites","Sonesta International","Sonesta Hotels","Sonesta Hotel"]},{"slug":"melia","name":"Meliá","brands":["Meliá Hotels & Resorts","Paradisus Resorts","Innside by Melia","Sol by Meliá","Meliá Collection","Meliá Hotels International","Melia Hotels International"]},{"slug":"minor","name":"Anantara / Avani","brands":["Tivoli Hotels & Resorts","Anantara Hotels & Resorts","Avani Hotels & Resorts","Tivoli Hotels","Avani"]},{"slug":"barcelo","name":"Barceló","brands":["Barceló Hotels & Resorts","Occidental Hotels and Resorts by Barcelo Hotel Gro","Allegro Hotels Resorts by Barcelo Hotel Group","Barcelo"]},{"slug":"extendedstay","name":"Extended Stay America","brands":["Extended Stay America Suites","Extended Stay America Select Suites","Extended Stay America Premier Suites","Extended Stay America"]},{"slug":"millennium","name":"Millennium & Copthorne","brands":["Millennium Hotels","Copthorne Hotels","Grand Millennium Hotels","Millennium"]},{"slug":"nh","name":"NH Hotels","brands":["NH Hotels","nhow","NH Collection"]},{"slug":"ascott","name":"The Ascott (Somerset, Citadines)","brands":["Citadines","Somerset","Ascott The Residence","Ascott"]},{"slug":"amari","name":"Amari / ONYX","brands":["Amari","Amaris","Onyx Hospitality Group"]},{"slug":"iberostar","name":"Iberostar","brands":["Iberostar Hotels & Resorts","Iberostar The Grand Collection","Iberostar"]},{"slug":"premierinn","name":"Premier Inn","brands":["Premier Inn","Premier Inn International"]},{"slug":"shangrila","name":"Shangri-La","brands":["Shangri-La Group","JEN by Shangri-La","Shangri-La Hotels and Resorts"]},{"slug":"apa","name":"APA Hotels","brands":["APA Hotels&Resorts","APA Hotels"]},{"slug":"banyantree","name":"Banyan Tree","brands":["Angsana Hotels & Resorts","Banyan Tree Hotels & Resorts"]},{"slug":"centara","name":"Centara","brands":["Centara Hotels and Resorts","Centara"]},{"slug":"citizenm","name":"citizenM","brands":["CitizenM","CitizenM Hotels"]},{"slug":"drury","name":"Drury","brands":["Drury","Drury Hotels"]},{"slug":"dusit","name":"Dusit","brands":["Dusit Hotels & Resorts","Dusit Hotels"]},{"slug":"fourseasons","name":"Four Seasons","brands":["Four Seasons Hotels and Resorts","Four Seasons"]},{"slug":"kempinski","name":"Kempinski","brands":["Kempinski"]},{"slug":"langham","name":"Langham","brands":["Langham Hotels International","Langham Hotels"]},{"slug":"leonardo","name":"Leonardo Hotels","brands":["Leonardo Hotels","Leonardo Hotels & Resorts"]},{"slug":"loews","name":"Loews","brands":["Loews Hotels","Loews"]},{"slug":"mandarin","name":"Mandarin Oriental","brands":["Mandarin Oriental","Mandarin Oriental Hotel Group"]},{"slug":"maritim","name":"Maritim","brands":["Maritim","Maritim Hotels"]},{"slug":"mgm","name":"MGM Resorts","brands":["MGM Resorts International","MGM"]},{"slug":"motel6","name":"Motel 6 / Studio 6","brands":["Studio 6","Motel 6"]},{"slug":"pestana","name":"Pestana","brands":["Pestana Hotel & Resorts","Pestana Group"]},{"slug":"redroof","name":"Red Roof","brands":["Red Roof Inn","Red Roof PLUS"]},{"slug":"riu","name":"RIU","brands":["RIU Hotels & Resorts","RIU Hotels"]},{"slug":"rosewood","name":"Rosewood","brands":["Rosewood Hotel Group","Rosewood Hotels"]},{"slug":"scandic","name":"Scandic","brands":["Scandic","Scandic Hotels Chain"]},{"slug":"smallluxury","name":"Small Luxury Hotels of the World","brands":["Small Luxury Hotels of the World","Small Luxury Hotels"]},{"slug":"peninsula","name":"The Peninsula","brands":["The Peninsula Hotels","The Peninsula Group"]},{"slug":"aman","name":"Aman","brands":["Aman Resorts"]},{"slug":"apex","name":"Apex Hotels","brands":["Apex Hotels"]},{"slug":"caesars","name":"Caesars Entertainment","brands":["Caesars Entertainment"]},{"slug":"graduatehotels","name":"Graduate Hotels","brands":["Graduate Hotels"]},{"slug":"greatwolf","name":"Great Wolf Lodge","brands":["Great Wolf Lodge"]},{"slug":"hardrock","name":"Hard Rock","brands":["Hard Rock"]},{"slug":"jinjiang","name":"Jin Jiang","brands":["Jin Jiang Hotels"]},{"slug":"jumeirah","name":"Jumeirah","brands":["Jumeirah"]},{"slug":"motelone","name":"Motel One","brands":["Motel One"]},{"slug":"oberoi","name":"Oberoi","brands":["Oberoi Hotels & Resorts"]},{"slug":"okura","name":"Okura / Nikko","brands":["Okura Nikko Hotels"]},{"slug":"omni","name":"Omni","brands":["Omni Hotels"]},{"slug":"preferredhotels","name":"Preferred Hotels & Resorts","brands":["Preferred Hotels & Resorts"]},{"slug":"ruby","name":"Ruby Hotels","brands":["Ruby Hotels"]},{"slug":"steigenberger","name":"Steigenberger","brands":["Steigenberger Hotels & Resorts"]},{"slug":"taj","name":"Taj Hotels","brands":["Taj Hotels, Resorts & Palaces"]},{"slug":"leadinghotels","name":"The Leading Hotels of the World","brands":["The Leading Hotels of the World"]},{"slug":"toyoko","name":"Toyoko Inn","brands":["Toyoko Inn"]},{"slug":"virginhotels","name":"Virgin Hotels","brands":["Virgin Hotels"]}];

// ── States and provinces (copied from the app's src/data/subdivisions.ts) ──
// Only the US and Canada are fixed lists; everywhere else the field is free text.
export const US_STATES = [{"code":"AL","name":"Alabama"},{"code":"AK","name":"Alaska"},{"code":"AZ","name":"Arizona"},{"code":"AR","name":"Arkansas"},{"code":"CA","name":"California"},{"code":"CO","name":"Colorado"},{"code":"CT","name":"Connecticut"},{"code":"DE","name":"Delaware"},{"code":"DC","name":"District of Columbia"},{"code":"FL","name":"Florida"},{"code":"GA","name":"Georgia"},{"code":"HI","name":"Hawaii"},{"code":"ID","name":"Idaho"},{"code":"IL","name":"Illinois"},{"code":"IN","name":"Indiana"},{"code":"IA","name":"Iowa"},{"code":"KS","name":"Kansas"},{"code":"KY","name":"Kentucky"},{"code":"LA","name":"Louisiana"},{"code":"ME","name":"Maine"},{"code":"MD","name":"Maryland"},{"code":"MA","name":"Massachusetts"},{"code":"MI","name":"Michigan"},{"code":"MN","name":"Minnesota"},{"code":"MS","name":"Mississippi"},{"code":"MO","name":"Missouri"},{"code":"MT","name":"Montana"},{"code":"NE","name":"Nebraska"},{"code":"NV","name":"Nevada"},{"code":"NH","name":"New Hampshire"},{"code":"NJ","name":"New Jersey"},{"code":"NM","name":"New Mexico"},{"code":"NY","name":"New York"},{"code":"NC","name":"North Carolina"},{"code":"ND","name":"North Dakota"},{"code":"OH","name":"Ohio"},{"code":"OK","name":"Oklahoma"},{"code":"OR","name":"Oregon"},{"code":"PA","name":"Pennsylvania"},{"code":"RI","name":"Rhode Island"},{"code":"SC","name":"South Carolina"},{"code":"SD","name":"South Dakota"},{"code":"TN","name":"Tennessee"},{"code":"TX","name":"Texas"},{"code":"UT","name":"Utah"},{"code":"VT","name":"Vermont"},{"code":"VA","name":"Virginia"},{"code":"WA","name":"Washington"},{"code":"WV","name":"West Virginia"},{"code":"WI","name":"Wisconsin"},{"code":"WY","name":"Wyoming"},{"code":"AS","name":"American Samoa"},{"code":"GU","name":"Guam"},{"code":"MP","name":"Northern Mariana Islands"},{"code":"PR","name":"Puerto Rico"},{"code":"VI","name":"US Virgin Islands"}];
export const CA_PROVINCES = [{"code":"AB","name":"Alberta"},{"code":"BC","name":"British Columbia"},{"code":"MB","name":"Manitoba"},{"code":"NB","name":"New Brunswick"},{"code":"NL","name":"Newfoundland and Labrador"},{"code":"NT","name":"Northwest Territories"},{"code":"NS","name":"Nova Scotia"},{"code":"NU","name":"Nunavut"},{"code":"ON","name":"Ontario"},{"code":"PE","name":"Prince Edward Island"},{"code":"QC","name":"Quebec"},{"code":"SK","name":"Saskatchewan"},{"code":"YT","name":"Yukon"}];

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
