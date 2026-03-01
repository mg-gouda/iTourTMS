import * as XLSX from "xlsx";

export interface HotelImportRow {
  rowNum: number;
  name: string;
  code: string;
  country: string;
  city: string;
  starRating: string;
  destination?: string;
  address?: string;
  email?: string;
  phone?: string;
  errors: string[];
}

export interface RoomTypeImportRow {
  rowNum: number;
  hotelCode: string;
  name: string;
  code: string;
  maxAdults: number;
  maxChildren: number;
  errors: string[];
}

export interface MealBasisImportRow {
  rowNum: number;
  hotelCode: string;
  name: string;
  mealCode: string;
  errors: string[];
}

export interface HotelImportResult {
  hotels: HotelImportRow[];
  roomTypes: RoomTypeImportRow[];
  mealBases: MealBasisImportRow[];
  hasErrors: boolean;
}

const VALID_STAR_RATINGS = [
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "FIVE_DELUXE",
];

const STAR_RATING_MAP: Record<string, string> = {
  "1": "ONE",
  "2": "TWO",
  "3": "THREE",
  "4": "FOUR",
  "5": "FIVE",
  "5D": "FIVE_DELUXE",
  "5 DELUXE": "FIVE_DELUXE",
  ONE: "ONE",
  TWO: "TWO",
  THREE: "THREE",
  FOUR: "FOUR",
  FIVE: "FIVE",
  FIVE_DELUXE: "FIVE_DELUXE",
};

const VALID_MEAL_CODES = ["RO", "BB", "HB", "FB", "AI", "UAI", "PRAI", "SC"];

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function num(val: unknown, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export function parseHotelExcel(buffer: ArrayBuffer): HotelImportResult {
  const wb = XLSX.read(buffer, { type: "array" });

  // Parse Hotels sheet
  const hotelSheet = wb.Sheets[wb.SheetNames[0]];
  if (!hotelSheet) {
    return { hotels: [], roomTypes: [], mealBases: [], hasErrors: true };
  }

  const hotelRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    hotelSheet,
    { defval: "" },
  );

  const hotels: HotelImportRow[] = hotelRows.map((row, idx) => {
    const errors: string[] = [];
    const name = str(row["Name"] ?? row["name"]);
    const code = str(row["Code"] ?? row["code"]);
    const country = str(row["Country"] ?? row["country"]);
    const city = str(row["City"] ?? row["city"]);
    const starRaw = str(
      row["Star Rating"] ?? row["Stars"] ?? row["starRating"] ?? "",
    ).toUpperCase();
    const starRating = STAR_RATING_MAP[starRaw] ?? starRaw;

    if (!name) errors.push("Name is required");
    if (!code) errors.push("Code is required");
    if (!country) errors.push("Country is required");
    if (!city) errors.push("City is required");
    if (starRating && !VALID_STAR_RATINGS.includes(starRating)) {
      errors.push(`Invalid star rating: "${starRaw}"`);
    }

    return {
      rowNum: idx + 2,
      name,
      code,
      country,
      city,
      starRating: starRating || "THREE",
      destination: str(row["Destination"] ?? row["destination"]),
      address: str(row["Address"] ?? row["address"]),
      email: str(row["Email"] ?? row["email"]),
      phone: str(row["Phone"] ?? row["phone"]),
      errors,
    };
  });

  // Parse Room Types sheet (if exists)
  const roomTypeSheet = wb.Sheets["Room Types"] ?? wb.Sheets["RoomTypes"];
  const roomTypes: RoomTypeImportRow[] = [];
  if (roomTypeSheet) {
    const rtRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      roomTypeSheet,
      { defval: "" },
    );
    for (let i = 0; i < rtRows.length; i++) {
      const row = rtRows[i];
      const errors: string[] = [];
      const hotelCode = str(row["Hotel Code"] ?? row["hotelCode"]);
      const name = str(row["Name"] ?? row["name"]);
      const code = str(row["Code"] ?? row["code"]);
      const maxAdults = num(row["Max Adults"] ?? row["maxAdults"], 2);
      const maxChildren = num(row["Max Children"] ?? row["maxChildren"], 1);

      if (!hotelCode) errors.push("Hotel Code is required");
      if (!name) errors.push("Name is required");
      if (!code) errors.push("Code is required");

      // Verify hotel code exists in hotel sheet
      if (hotelCode && !hotels.some((h) => h.code === hotelCode)) {
        errors.push(`Hotel code "${hotelCode}" not found in Hotels sheet`);
      }

      roomTypes.push({
        rowNum: i + 2,
        hotelCode,
        name,
        code,
        maxAdults,
        maxChildren,
        errors,
      });
    }
  }

  // Parse Meal Bases sheet (if exists)
  const mealSheet = wb.Sheets["Meal Bases"] ?? wb.Sheets["MealBases"];
  const mealBases: MealBasisImportRow[] = [];
  if (mealSheet) {
    const mbRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      mealSheet,
      { defval: "" },
    );
    for (let i = 0; i < mbRows.length; i++) {
      const row = mbRows[i];
      const errors: string[] = [];
      const hotelCode = str(row["Hotel Code"] ?? row["hotelCode"]);
      const name = str(row["Name"] ?? row["name"]);
      const mealCode = str(
        row["Meal Code"] ?? row["mealCode"] ?? "",
      ).toUpperCase();

      if (!hotelCode) errors.push("Hotel Code is required");
      if (!name) errors.push("Name is required");
      if (!mealCode) errors.push("Meal Code is required");
      if (mealCode && !VALID_MEAL_CODES.includes(mealCode)) {
        errors.push(`Invalid meal code: "${mealCode}"`);
      }
      if (hotelCode && !hotels.some((h) => h.code === hotelCode)) {
        errors.push(`Hotel code "${hotelCode}" not found in Hotels sheet`);
      }

      mealBases.push({ rowNum: i + 2, hotelCode, name, mealCode, errors });
    }
  }

  const hasErrors =
    hotels.some((h) => h.errors.length > 0) ||
    roomTypes.some((r) => r.errors.length > 0) ||
    mealBases.some((m) => m.errors.length > 0);

  return { hotels, roomTypes, mealBases, hasErrors };
}
