/**
 * Map Sejour board plan codes to iTourTMS MealCode enum values.
 * Keys are codes found in Sejour PDFs, values are Prisma MealCode enum values.
 */
export const BOARD_CODE_MAP: Record<string, string> = {
  AI: "AI",
  HAL: "AI",
  SAL: "AI", // Soft All Inclusive treated as AI
  ULT: "UAI",
  UAI: "UAI",
  BB: "BB",
  HB: "HB",
  FB: "FB",
  RO: "RO",
  SC: "SC",
  PRAI: "PRAI",
};

/**
 * Map star rating string to Prisma StarRating enum.
 */
export const STAR_RATING_MAP: Record<string, string> = {
  "1": "ONE",
  "2": "TWO",
  "3": "THREE",
  "4": "FOUR",
  "5": "FIVE",
  "5D": "FIVE_DELUXE",
};

/**
 * Map Sejour city code (from folder path) to ISO country code.
 * Extend as needed for new destinations.
 */
export const CITY_COUNTRY_MAP: Record<string, string> = {
  HRG: "EG",
  HURGHADA: "EG",
  SSH: "EG",
  "SHARM EL SHEIKH": "EG",
  RMF: "EG",
  MARSA: "EG",
  "MARSA ALAM": "EG",
  CAIRO: "EG",
  LUXOR: "EG",
  ASWAN: "EG",
  "EL GOUNA": "EG",
  "SOMA BAY": "EG",
  ANTALYA: "TR",
  BODRUM: "TR",
  ISTANBUL: "TR",
  MARMARIS: "TR",
};

/**
 * Currency info for auto-creation of missing currencies.
 * Keys are ISO 4217 codes.
 */
export const CURRENCY_INFO: Record<
  string,
  { name: string; symbol: string; decimals: number }
> = {
  EUR: { name: "Euro", symbol: "€", decimals: 2 },
  USD: { name: "US Dollar", symbol: "$", decimals: 2 },
  GBP: { name: "British Pound", symbol: "£", decimals: 2 },
  EGP: { name: "Egyptian Pound", symbol: "E£", decimals: 2 },
  TRY: { name: "Turkish Lira", symbol: "₺", decimals: 2 },
  CHF: { name: "Swiss Franc", symbol: "CHF", decimals: 2 },
  SAR: { name: "Saudi Riyal", symbol: "﷼", decimals: 2 },
  AED: { name: "UAE Dirham", symbol: "د.إ", decimals: 2 },
};

/**
 * Country info for auto-creation of missing countries.
 * Keys are ISO 3166-1 alpha-2 codes.
 */
export const COUNTRY_INFO: Record<
  string,
  { name: string; code3?: string; phone?: string; continent?: string }
> = {
  EG: { name: "Egypt", code3: "EGY", phone: "+20", continent: "Africa" },
  TR: { name: "Turkey", code3: "TUR", phone: "+90", continent: "Asia" },
  GB: { name: "United Kingdom", code3: "GBR", phone: "+44", continent: "Europe" },
  DE: { name: "Germany", code3: "DEU", phone: "+49", continent: "Europe" },
  FR: { name: "France", code3: "FRA", phone: "+33", continent: "Europe" },
  IT: { name: "Italy", code3: "ITA", phone: "+39", continent: "Europe" },
  ES: { name: "Spain", code3: "ESP", phone: "+34", continent: "Europe" },
  US: { name: "United States", code3: "USA", phone: "+1", continent: "North America" },
  SA: { name: "Saudi Arabia", code3: "SAU", phone: "+966", continent: "Asia" },
  AE: { name: "United Arab Emirates", code3: "ARE", phone: "+971", continent: "Asia" },
  CH: { name: "Switzerland", code3: "CHE", phone: "+41", continent: "Europe" },
};

/**
 * Default occupancy settings by Sejour room code.
 */
export const ROOM_OCCUPANCY_DEFAULTS: Record<
  string,
  { minAdults: number; standardAdults: number; maxAdults: number }
> = {
  SGL: { minAdults: 1, standardAdults: 1, maxAdults: 1 },
  DBL: { minAdults: 1, standardAdults: 2, maxAdults: 2 },
  TPL: { minAdults: 1, standardAdults: 3, maxAdults: 3 },
  QUA: { minAdults: 1, standardAdults: 4, maxAdults: 4 },
};
