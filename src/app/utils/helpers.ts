import { SelectOption } from "src/lib/engine/types";
const countries = [
    {"name": "Afghanistan", "code": "AF"},
    // {"name": "Albania", "code": "AL"},
    // {"name": "Algeria", "code": "DZ"},
    // {"name": "Andorra", "code": "AD"},
    // {"name": "Angola", "code": "AO"},
    // {"name": "Antigua and Barbuda", "code": "AG"},
    // {"name": "Argentina", "code": "AR"},
    // {"name": "Armenia", "code": "AM"},
    // {"name": "Australia", "code": "AU"},
    // {"name": "Austria", "code": "AT"},
    // {"name": "Azerbaijan", "code": "AZ"},

    // {"name": "Bahamas", "code": "BS"},
    // {"name": "Bahrain", "code": "BH"},
    // {"name": "Bangladesh", "code": "BD"},
    // {"name": "Barbados", "code": "BB"},
    // {"name": "Belarus", "code": "BY"},
    // {"name": "Belgium", "code": "BE"},
    // {"name": "Belize", "code": "BZ"},
    // {"name": "Benin", "code": "BJ"},
    // {"name": "Bhutan", "code": "BT"},
    // {"name": "Bolivia", "code": "BO"},
    // {"name": "Bosnia and Herzegovina", "code": "BA"},
    // {"name": "Botswana", "code": "BW"},
    // {"name": "Brazil", "code": "BR"},
    // {"name": "Brunei", "code": "BN"}, //* After 406, old value Brunei Darussalam*
    // {"name": "Bulgaria", "code": "BG"},
    // {"name": "Burkina Faso", "code": "BF"},
    // {"name": "Burundi", "code": "BI"},

    // {"name": "Cambodia", "code": "KH"},
    // {"name": "Cameroon", "code": "CM"},
    // {"name": "Canada", "code": "CA"},
    // {"name": "Cape Verde", "code": "CV"},
    // {"name": "Central African Republic", "code": "CF"},
    // {"name": "Chad", "code": "TD"},
    // {"name": "Chile", "code": "CL"},
    // {"name": "China", "code": "CN"},
    // {"name": "Colombia", "code": "CO"},
    // {"name": "Comoros", "code": "KM"},
    // {"name": "Congo, The Democratic Republic of the", "code": "CD"},
    // {"name": "Congo, Republic of the", "code": "CG"},  //* After 406, old value Congo
    // {"name": "Costa Rica", "code": "CR"},
    // {"name": "Croatia", "code": "HR"},
    // {"name": "Cuba", "code": "CU"},
    // {"name": "Cyprus", "code": "CY"},
    // {"name": "Czech Republic", "code": "CZ"},
    // {"name": "Denmark", "code": "DK"},
    // {"name": "Djibouti", "code": "DJ"},
    // {"name": "Dominica", "code": "DM"},
    // {"name": "Dominican Republic", "code": "DO"},
    // {"name": "East Timor", "code": "TL"}, // After 406, old value Timor-leste
    // {"name": "Ecuador", "code": "EC"},
    // {"name": "Egypt", "code": "EG"},
    // {"name": "El Salvador", "code": "SV"},
    // {"name": "Equatorial Guinea", "code": "GQ"},
    // {"name": "Eritrea", "code": "ER"},
    // {"name": "Estonia", "code": "EE"},
    // {"name": "Eswatini", "code": "SZ"}, // After 406, old value Swaziland
    // {"name": "Ethiopia", "code": "ET"},
    // {"name": "Fiji", "code": "FJ"},
    // {"name": "Finland", "code": "FI"},
    // {"name": "France", "code": "FR"},

    // {"name": "Gabon", "code": "GA"},
    // {"name": "Gambia", "code": "GM"},
    // {"name": "Georgia", "code": "GE"},
    // {"name": "Germany", "code": "DE"},
    // {"name": "Ghana", "code": "GH"},
    // {"name": "Greece", "code": "GR"},
    // {"name": "Grenada", "code": "GD"},
    // {"name": "Guatemala", "code": "GT"},
    // {"name": "Guinea", "code": "GN"},
    // {"name": "Guinea-Bissau", "code": "GW"},
    // {"name": "Guyana", "code": "GY"},

    // {"name": "Haiti", "code": "HT"},
    // {"name": "Honduras", "code": "HN"},
    // {"name": "Hong Kong", "code": "HK"},
    // {"name": "Hungary", "code": "HU"},

    // {"name": "Iceland", "code": "IS"},
    // {"name": "India", "code": "IN"},
    // {"name": "Indonesia", "code": "ID"},
    // {"name": "Iran", "code": "IR"}, // After 406, old value Iran, Islamic Republic Of
    // {"name": "Iraq", "code": "IQ"},
    // {"name": "Ireland", "code": "IE"},
    // {"name": "Israel", "code": "IL"},
    // {"name": "Italy", "code": "IT"},
    // {"name": "Ivory Coast", "code": "CI"}, // After 406, old value Cote D'Ivoire

    // {"name": "Jamaica", "code": "JM"},
    // {"name": "Japan", "code": "JP"},
    // {"name": "Jordan", "code": "JO"},

    // {"name": "Kazakhstan", "code": "KZ"},
    // {"name": "Kenya", "code": "KE"},
    // {"name": "Kiribati", "code": "KI"},
    // {"name": "Kosovo", "code": "XK"}, // New 406 *
    // {"name": "Kuwait", "code": "KW"},
    // {"name": "Kyrgyzstan", "code": "KG"},
    // {"name": "Laos", "code": "LA"}, // After 406,  old value Lao People'S Democratic Republic*
    // {"name": "Latvia", "code": "LV"},
    // {"name": "Lebanon", "code": "LB"},
    // {"name": "Lesotho", "code": "LS"},
    // {"name": "Liberia", "code": "LR"},
    // {"name": "Libya", "code": "LY"},  // After 406, Old value  Libyan Arab Jamahiriya*
    // {"name": "Liechtenstein", "code": "LI"},
    // {"name": "Lithuania", "code": "LT"},
    // {"name": "Luxembourg", "code": "LU"},

    // {"name": "Madagascar", "code": "MG"},
    // {"name": "Malawi", "code": "MW"},
    // {"name": "Malaysia", "code": "MY"},
    // {"name": "Maldives", "code": "MV"},
    // {"name": "Mali", "code": "ML"},
    // {"name": "Malta", "code": "MT"},
    // {"name": "Marshall Islands", "code": "MH"},
    // {"name": "Mauritania", "code": "MR"},
    // {"name": "Mauritius", "code": "MU"},
    // {"name": "Mexico", "code": "MX"},
    // {"name": "Micronesia, Federated States of", "code": "FM"},
    // {"name": "Moldova", "code": "MD"}, // After 406, old value Moldova, Republic of"
    // {"name": "Monaco", "code": "MC"},
    // {"name": "Mongolia", "code": "MN"},
    // {"name": "Montenegro", "code": "ME"}, // New 406
    // {"name": "Morocco", "code": "MA"},
    // {"name": "Mozambique", "code": "MZ"},
    // {"name": "Myanmar", "code": "MM"},

    // {"name": "Namibia", "code": "NA"},
    // {"name": "Nauru", "code": "NR"},
    // {"name": "Nepal", "code": "NP"},
    // {"name": "Netherlands", "code": "NL"},
    // {"name": "New Zealand", "code": "NZ"},
    // {"name": "Nicaragua", "code": "NI"},
    // {"name": "Niger", "code": "NE"},
    // {"name": "Nigeria", "code": "NG"},
    // {"name": "North Korea", "code": "KP"},
    // {"name": "North Macedonia", "code": "MK"}, // New 406
    // {"name": "Norway", "code": "NO"},

    // {"name": "Oman", "code": "OM"},

    // {"name": "Pakistan", "code": "PK"},
    // {"name": "Palau", "code": "PW"},
    // {"name": "Panama", "code": "PA"},
    // {"name": "Papua New Guinea", "code": "PG"},
    // {"name": "Paraguay", "code": "PY"},
    // {"name": "Peru", "code": "PE"},
    // {"name": "Philippines", "code": "PH"},
    // {"name": "Poland", "code": "PL"},
    // {"name": "Portugal", "code": "PT"},

    // {"name": "Qatar", "code": "QA"},
    // {"name": "Romania", "code": "RO"},
    // {"name": "Russia", "code": "RU"}, // After 406, old value Russian Federation *
    // {"name": "Rwanda", "code": "RW"},

    // {"name": "Saint Kitts and Nevis", "code": "KN"},
    // {"name": "Saint Lucia", "code": "LC"},
    // {"name": "Saint Vincent and the Grenadines", "code": "VC"},
    // {"name": "Samoa", "code": "WS"},
    // {"name": "San Marino", "code": "SM"},
    // {"name": "Sao Tome and Principe", "code": "ST"},
    // {"name": "Saudi Arabia", "code": "SA"},
    // {"name": "Senegal", "code": "SN"},
    // {"name": "Serbia", "code": "RS"}, // New 406 *
    // {"name": "Seychelles", "code": "SC"},
    // {"name": "Sierra Leone", "code": "SL"},
    // {"name": "Singapore", "code": "SG"},
    // {"name": "Slovakia", "code": "SK"},
    // {"name": "Slovenia", "code": "SI"},
    // {"name": "Solomon Islands", "code": "SB"},
    // {"name": "Somalia", "code": "SO"},
    // {"name": "South Africa", "code": "ZA"},
    // {"name": "South Korea", "code": "KR"},
    // {"name": "South Sudan", "code": "SS"},
    // {"name": "Spain", "code": "ES"},
    // {"name": "Sri Lanka", "code": "LK"},
    // {"name": "Sudan", "code": "SD"},
    // {"name": "Suriname", "code": "SR"},
    // {"name": "Sweden", "code": "SE"},
    // {"name": "Switzerland", "code": "CH"},
    // {"name": "Syria", "code": "SY"}, // After 406, old value is Syrian Arab Republic *
    // {"name": "Taiwan", "code": "TW"}, // After 406, Old value is Taiwan, Province of China*

    // {"name": "Tajikistan", "code": "TJ"},
    // {"name": "Tanzania", "code": "TZ"}, // After 406, old value Tanzania, United Republic of *
    // {"name": "Thailand", "code": "TH"},
    // {"name": "Togo", "code": "TG"},
    // {"name": "Tonga", "code": "TO"},
    // {"name": "Trinidad and Tobago", "code": "TT"},
    // {"name": "Tunisia", "code": "TN"},
    // {"name": "Turkey", "code": "TR"},
    // {"name": "Turkmenistan", "code": "TM"},
    // {"name": "Tuvalu", "code": "TV"},
    // {"name": "Uganda", "code": "UG"},
    // {"name": "Ukraine", "code": "UA"},
    // {"name": "United Arab Emirates", "code": "AE"},
    // {"name": "United Kingdom", "code": "GB"},
    // {"name": "United States", "code": "US"},
    // {"name": "Uruguay", "code": "UY"},
    // {"name": "Uzbekistan", "code": "UZ"},
    // {"name": "Vanuatu", "code": "VU"},
    // {"name": "Venezuela", "code": "VE"},
    // {"name": "Vietnam", "code": "VN"},

    // {"name": "Yemen", "code": "YE"},
    // {"name": "Zambia", "code": "ZM"},

    // {"name": "Zimbabwe", "code": "ZW"}
];

const languages = [
  {"code": "ar", "name": "Arabic", "nativeName": "العربية"},
  {"code": "bg", "name": "Bulgarian", "nativeName": "Български език"},
  {"code": "zh", "name": "Chinese", "nativeName": "中文 (Zhōngwén), 汉语, 漢語"},
  {"code": "hr", "name": "Croatian", "nativeName": "hrvatski"},
  {"code": "cs", "name": "Czech", "nativeName": "Česky, čeština"},
  {"code": "da", "name": "Danish", "nativeName": "Dansk"},
  {"code": "nl", "name": "Dutch", "nativeName": "Nederlands, Vlaams"},
  {"code": "en", "name": "English", "nativeName": "English"},
  {"code": "en-gb", "name": "English (UK)", "nativeName": "English"},
  {"code": "et", "name": "Estonian", "nativeName": "Eesti, eesti keel"},
  {"code": "fi", "name": "Finnish", "nativeName": "Suomi, suomen kieli"},
  {"code": "fr", "name": "French", "nativeName": "Français"},
  {"code": "ka", "name": "Georgian", "nativeName": "ქართული"},
  {"code": "de", "name": "German", "nativeName": "Deutsch"},
  {"code": "el", "name": "Greek, Modern", "nativeName": "Ελληνικά"},
  {"code": "he", "name": "Hebrew (modern)", "nativeName": "עברית"},
  {"code": "hi", "name": "Hindi", "nativeName": "हिन्दी, हिंदी"},
  {"code": "hu", "name": "Hungarian", "nativeName": "Magyar"},
  {"code": "id", "name": "Indonesian", "nativeName": "Bahasa Indonesia"},
  {"code": "is", "name": "Icelandic", "nativeName": "Islenska"},
  {"code": "it", "name": "Italian", "nativeName": "Italiano"},
  {"code": "ja", "name": "Japanese", "nativeName": "日本語 (にほんご／にっぽんご)"},
  {"code": "ko", "name": "Korean", "nativeName": "한국어 (韓國語), 조선말 (朝鮮語)"},
  {"code": "lt", "name": "Lithuanian", "nativeName": "Lietuvių kalba"},
  {"code": "lv", "name": "Latvian", "nativeName": "Latviešu valoda"},
  {"code": "mk", "name": "Macedonian", "nativeName": "Македонски јазик"},
  {"code": "no", "name": "Norwegian", "nativeName": "Norsk"},
  {"code": "pa", "name": "Panjabi, Punjabi", "nativeName": "ਪੰਜਾਬੀ, پنجابی‎"},
  {"code": "pl", "name": "Polish", "nativeName": "Polski"},
  {"code": "pt", "name": "Portuguese", "nativeName": "Português"},
  {"code": "pt-br", "name": "Portuguese (Brasil)", "nativeName": "Português (Brasil)"},
  {"code": "ro", "name": "Romanian", "nativeName": "Română"},
  {"code": "ru", "name": "Russian", "nativeName": "Русский язык"},
  {"code": "sr", "name": "Serbian", "nativeName": "Српски језик"},
  {"code": "sk", "name": "Slovak", "nativeName": "Slovenčina"},
  {"code": "sl", "name": "Slovenian", "nativeName": "Slovenščina"},
  {"code": "es", "name": "Spanish", "nativeName": "Español"},
  {"code": "es-419", "name": "Spanish (Latin-American)", "nativeName": "Español (latinoamericano)"},
  {"code": "sv", "name": "Swedish", "nativeName": "Svenska"},
  {"code": "th", "name": "Thai", "nativeName": "ไทย"},
  {"code": "tr", "name": "Turkish", "nativeName": "Türkçe"},
  {"code": "uk", "name": "Ukrainian", "nativeName": "Українська"},
  {"code": "vi", "name": "Vietnamese", "nativeName": "Tiếng Việt"}
];

export function getLeafletLanguages(): SelectOption[] {
  return languages.sort(a => a.code === 'en' ? -1 : 1).map(language =>
    ({text: language.name, value: language.code, disabled: false, selected: language.code === "en"})
  );
}



type DocumentType = 'leaflet' | 'prescribingInfo' | 'SMPC';

const DocumentsTypes: {[key in DocumentType]: key} = {
  leaflet: 'leaflet',
  prescribingInfo: 'prescribingInfo',
  SMPC: 'SMPC'
} as const;

export function getDocumentTypes(type: 'product' | 'batch' = 'product'): SelectOption[] {
  return Object.values(DocumentsTypes).map(doc =>
    ({text: doc.toLowerCase(), value: doc, disabled: doc === DocumentsTypes.SMPC, selected: doc === DocumentsTypes.leaflet})
  ).filter(doc => {
    if (type === 'batch')
      return doc.value !== DocumentsTypes.prescribingInfo;
    return doc;
  });
}

export function getMarkets(): SelectOption[] {
  return countries.map(country =>
    ({text: country.name, value: country.code, disabled: false, selected: country.code === "US"})
  );
}

