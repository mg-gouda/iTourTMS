/** Parsed header from Sejour PDF first page */
export interface SejourHeader {
  hotelName: string;
  city: string;
  market: string;
  stars: string; // "3", "4", "5"
  seasonCode: string; // "S26"
  currency: string; // "EUR", "USD"
}

/** A season/period parsed from the Periods section */
export interface SejourPeriod {
  letter: string; // "A", "B", "C", ...
  dateFrom: string; // dd/mm/yyyy
  dateTo: string;
}

/** Allotment per room+type combo per period */
export interface SejourAllotment {
  roomCode: string; // "DBL"
  roomName: string; // "DOUBLE ROOM"
  typeName: string; // "STANDARD ROOM"
  /** Rooms allocated per period letter, e.g. { A: 5, B: 5 } */
  allocations: Record<string, number>;
}

/** Release day rule */
export interface SejourRelease {
  days: number;
  dateFrom: string;
  dateTo: string;
}

/** A single buying rate line */
export interface SejourRate {
  roomName: string; // full room name, e.g. "DOUBLE ROOM"
  typeName: string; // full type name, e.g. "STANDARD ROOM"
  roomCode: string; // "DBL", "SGL", "TPL"
  typeCode: string; // "STD", "PRPV", etc.
  board: string; // "AI", "SAL", "HB", etc.
  period: string; // "A", "B"
  price: number;
  perPerson: boolean;
}

/** Code definition mapping (short code -> full name) */
export interface SejourCodeDef {
  code: string;
  name: string;
}

/** Child buying price entry */
export interface SejourChildPrice {
  adults: number;
  roomCode: string;
  typeCode: string;
  board: string;
  children: {
    position: number; // 1st child, 2nd child, etc.
    ageFrom: number;
    ageTo: number;
    percentage: number; // 0 = free, 50 = 50%, 99 = full price
  }[];
}

/** Cancellation rule */
export interface SejourCancellation {
  dateFrom: string;
  dateTo: string;
  day1: number;
  day2: number;
  nights: number;
  percentage: number;
  description: string;
}

/** Minimum stay rule */
export interface SejourMinStay {
  days: number;
  dateFrom: string;
  dateTo: string;
}

/** Special offer / EBD */
export interface SejourSpecialOffer {
  name: string;
  type: string; // "Early Booking"
  percentage: number;
  stayFrom?: string;
  stayTo?: string;
  bookBy?: string;
  combinable: boolean;
}

/** Special meal / gala dinner (Hotel Extra Prices) */
export interface SejourSpecialMeal {
  dateFrom: string; // dd/mm/yy or dd/mm/yyyy
  dateTo: string;
  adultPrice: number;
  childPrice: number | null;
  occasion: string; // "CHRISTMAS GALA DINNER", "NEW YEAR GALA DINNER"
  mandatory: boolean;
  bookByDate?: string; // early application date
}

/** Accommodation table entry */
export interface SejourAccommodation {
  roomCode: string; // "DBL", "SGL", "TPL"
  roomName: string;
  typeCode: string;
  typeName: string;
  minAdults: number;
  maxAdults: number;
  maxChildren: number;
  maxPax: number;
}

/** Contract remarks */
export interface SejourRemarks {
  contractRemarks: string;
  generalRemarks: string;
}

/** Full parsed Sejour contract */
export interface SejourContract {
  header: SejourHeader;
  periods: SejourPeriod[];
  allotments: SejourAllotment[];
  releases: SejourRelease[];
  rates: SejourRate[];
  codeDefinitions: {
    rooms: SejourCodeDef[];
    roomTypes: SejourCodeDef[];
    boardPlans: SejourCodeDef[];
  };
  childPrices: SejourChildPrice[];
  cancellations: SejourCancellation[];
  minimumStay: SejourMinStay[];
  specialOffers: SejourSpecialOffer[];
  specialMeals: SejourSpecialMeal[];
  accommodations: SejourAccommodation[];
  remarks: SejourRemarks;
  warnings: string[];
}
