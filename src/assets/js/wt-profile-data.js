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
    "name": "Marriott Bonvoy"
  },
  {
    "code": "hilton_honors",
    "name": "Hilton Honors"
  },
  {
    "code": "world_of_hyatt",
    "name": "World of Hyatt"
  },
  {
    "code": "ihg_one_rewards",
    "name": "IHG One Rewards"
  },
  {
    "code": "wyndham_rewards",
    "name": "Wyndham Rewards"
  },
  {
    "code": "choice_privileges",
    "name": "Choice Privileges"
  },
  {
    "code": "accor_live_limitless",
    "name": "Accor Live Limitless"
  },
  {
    "code": "best_western_rewards",
    "name": "Best Western Rewards"
  },
  {
    "code": "radisson_rewards",
    "name": "Radisson Rewards"
  },
  {
    "code": "other",
    "name": "Other"
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
