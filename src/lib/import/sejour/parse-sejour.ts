import { PDFParse } from "pdf-parse";
import type {
  SejourAccommodation,
  SejourAllotment,
  SejourCancellation,
  SejourChildPrice,
  SejourCodeDef,
  SejourContract,
  SejourHeader,
  SejourMinStay,
  SejourPeriod,
  SejourRate,
  SejourRelease,
  SejourRemarks,
  SejourSpecialMeal,
  SejourSpecialOffer,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Remove the repeated page header lines (date/time/page/HOTEL CONTRACT INFO/...) */
function stripPageHeaders(text: string): string {
  // Remove page separators like "-- 1 of 5 --"
  let cleaned = text.replace(/\n-- \d+ of \d+ --\n/g, "\n");
  // Remove repeated header blocks on each page
  // Pattern: date line, time line, page line, "HOTEL CONTRACT INFORMATION", season-currency, hotel, city, market, stars
  cleaned = cleaned.replace(
    /\d{2}\/\d{2}\/\d{4}\tDate :\n\d{2}:\d{2}:\d{2}\tTime :\n\d+\tPage : \/ \d+\n(?:HOTEL CONTRACT INFORMATION\n(?:[A-Z]\d+\s*-\s*\w+\n)?(?:[^\n]+\n){0,4})?/g,
    "\n",
  );
  return cleaned;
}

/** Parse dd/mm/yyyy to ISO date string */
function parseDate(dmy: string): string {
  const [d, m, y] = dmy.split("/");
  if (!d || !m || !y) return dmy;
  // Handle 2-digit years
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Section splitter
// ---------------------------------------------------------------------------

const SECTION_MARKERS = [
  "Periods",
  "Allotment",
  "Release Day",
  "Room Buying Rates",
  "Room Buying Prices",
  "Code Definition",
  "Child Buying Prices",
  "Cancellation Rules",
  "Minimum Stay",
  "Hotel Extra Prices",
  "SPECIAL OFFERS",
  "CONTRACT REMARKS",
  "GENERAL REMARKS",
  "CHILD POLICY",
  "Hotel Accommodation Table",
] as const;

function splitSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = text.split("\n");
  let currentSection = "HEADER";
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Check if this line starts a new section
    const marker = SECTION_MARKERS.find(
      (m) =>
        trimmed === m ||
        trimmed.startsWith(m) ||
        trimmed.includes(`${m} (Continue)`) ||
        trimmed.includes(`${m} ( Continue)`),
    );

    if (marker) {
      // Save previous section
      if (currentLines.length > 0) {
        sections[currentSection] = (sections[currentSection] || "") +
          "\n" +
          currentLines.join("\n");
      }
      // Merge continuation sections
      const normalizedMarker =
        marker === "Room Buying Prices" ? "Room Buying Rates" : marker;
      if (
        trimmed.includes("Continue") &&
        sections[normalizedMarker]
      ) {
        currentSection = normalizedMarker;
        currentLines = [];
      } else {
        currentSection = normalizedMarker;
        currentLines = [];
      }
    } else {
      currentLines.push(line);
    }
  }

  // Save last section
  if (currentLines.length > 0) {
    sections[currentSection] = (sections[currentSection] || "") +
      "\n" +
      currentLines.join("\n");
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Header parser
// ---------------------------------------------------------------------------

function parseHeader(text: string): SejourHeader {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Find the key lines:
  // "HOTEL CONTRACT INFORMATION" -> next line is "S26 - EUR" -> hotel name -> city -> market -> "X STARS"
  let seasonCode = "";
  let currency = "";
  let hotelName = "";
  let city = "";
  let market = "";
  let stars = "4";

  // Look for season-currency line like "S26 - EUR" or "W26 - EUR"
  const seasonLine = lines.find((l) => /^[A-Z]\d+\s*-\s*\w+$/.test(l));
  if (seasonLine) {
    const [s, c] = seasonLine.split("-").map((s) => s.trim());
    seasonCode = s;
    currency = c;
  }

  // Stars line
  const starsLine = lines.find((l) => /^\d\s*STARS?$/i.test(l));
  if (starsLine) {
    stars = starsLine.match(/(\d)/)?.[1] || "4";
  }

  // Hotel name, city, market are between season line and stars line
  const seasonIdx = seasonLine ? lines.indexOf(seasonLine) : -1;
  const starsIdx = starsLine ? lines.indexOf(starsLine) : -1;

  if (seasonIdx >= 0 && starsIdx > seasonIdx) {
    const between = lines.slice(seasonIdx + 1, starsIdx);
    if (between.length >= 1) hotelName = between[0];
    if (between.length >= 2) city = between[1];
    if (between.length >= 3) market = between[2];
  }

  // Fallback: find "HOTEL CONTRACT INFORMATION" and parse from there
  if (!hotelName) {
    const hciIdx = lines.findIndex((l) =>
      l.includes("HOTEL CONTRACT INFORMATION"),
    );
    if (hciIdx >= 0) {
      // Next lines after header: seasonCode-currency, hotelName, city, market, stars
      for (let i = hciIdx + 1; i < Math.min(hciIdx + 8, lines.length); i++) {
        const l = lines[i];
        if (!seasonCode && /^[A-Z]\d+/.test(l)) {
          const m = l.match(/^([A-Z]\d+)\s*[-–]\s*(\w+)/);
          if (m) { seasonCode = m[1]; currency = m[2]; }
          continue;
        }
        if (!hotelName && l.length > 3 && !/^[A-Z]\d+\s*-/.test(l) && !/^\d\s*STAR/i.test(l)) {
          hotelName = l;
          continue;
        }
        if (hotelName && !city && l.length > 1 && !/^\d\s*STAR/i.test(l)) {
          city = l;
          continue;
        }
        if (city && !market && l.length > 1 && !/^\d\s*STAR/i.test(l)) {
          market = l;
          continue;
        }
        if (/^\d\s*STAR/i.test(l)) {
          stars = l.match(/(\d)/)?.[1] || stars;
          break;
        }
      }
    }
  }

  // Fallback: extract currency from Season Info line (e.g. "S26 01/05/2026 31/10/2026 EUR")
  if (!currency) {
    const seasonInfoLine = lines.find((l) =>
      /[A-Z]\d+\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+\w{3}/.test(l),
    );
    if (seasonInfoLine) {
      const m = seasonInfoLine.match(/(\w{3})\s*$/);
      if (m) currency = m[1];
    }
  }

  return { hotelName, city, market, stars, seasonCode, currency };
}

// ---------------------------------------------------------------------------
// Period parser
// ---------------------------------------------------------------------------

function parsePeriods(text: string): SejourPeriod[] {
  const periods: SejourPeriod[] = [];
  const seen = new Set<string>();

  // Pattern: dd/mm/yyyy dd/mm/yyyy [tab] LETTER Stay.
  const regex =
    /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\w)\s+Stay/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const key = `${match[1]}-${match[2]}-${match[3]}`;
    if (!seen.has(key)) {
      seen.add(key);
      periods.push({
        letter: match[3],
        dateFrom: match[1],
        dateTo: match[2],
      });
    }
  }

  return periods;
}

// ---------------------------------------------------------------------------
// Allotment parser
// ---------------------------------------------------------------------------

function parseAllotments(
  fullText: string,
  periodLetters: string[],
): SejourAllotment[] {
  const allotments: SejourAllotment[] = [];

  // Room allotment lines appear as:
  // "DOUBLE ROOM STANDARD ROOM 4 4" (room name + type name + numbers per period)
  // They do NOT contain price patterns, board codes, tab chars or "Person"
  const lines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Skip lines that look like rate lines (contain tab, "Person", price)
    if (line.includes("\t") || line.includes("Person") || line.includes(".")) {
      continue;
    }
    // Match: room+type name followed by space-separated integers only
    const numMatch = line.match(
      /^((?:DOUBLE|SINGLE|TRIPLE|QUADRUPLE)\s+ROOM\s+.+?)\s+(\d+(?:\s+\d+)+)$/,
    );
    if (!numMatch) continue;

    const namePart = numMatch[1].trim();
    const nums = numMatch[2].split(/\s+/).map(Number);

    const words = namePart.split(/\s+/);
    const roomName = words.slice(0, 2).join(" ");
    const typeName = words.slice(2).join(" ");

    const roomCode =
      roomName === "DOUBLE ROOM"
        ? "DBL"
        : roomName === "SINGLE ROOM"
          ? "SGL"
          : roomName === "TRIPLE ROOM"
            ? "TPL"
            : roomName === "QUADRUPLE ROOM"
              ? "QUA"
              : roomName.slice(0, 3).toUpperCase();

    const allocations: Record<string, number> = {};
    for (let i = 0; i < nums.length && i < periodLetters.length; i++) {
      allocations[periodLetters[i]] = nums[i];
    }

    allotments.push({ roomCode, roomName, typeName, allocations });
  }

  return allotments;
}

// ---------------------------------------------------------------------------
// Release day parser
// ---------------------------------------------------------------------------

function parseReleases(text: string): SejourRelease[] {
  const releases: SejourRelease[] = [];
  // Pattern: "7 01/05/2026 30/06/2026 ..."
  const regex = /(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    releases.push({
      days: parseInt(match[1]),
      dateFrom: match[2],
      dateTo: match[3],
    });
  }
  return releases;
}

// ---------------------------------------------------------------------------
// Rate parser
// ---------------------------------------------------------------------------

/** Known board codes in Sejour PDFs */
const KNOWN_BOARDS = new Set([
  "AI", "SAL", "HAL", "ULT", "UAI", "BB", "HB", "FB", "RO", "SC", "PRAI",
]);

function parseRates(text: string): SejourRate[] {
  const rates: SejourRate[] = [];
  const lines = text.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    // Rate line must end with: \tROOMCODE TYPECODE -
    // And contain: PRICE - Person
    if (!line.includes("Person") || !line.includes("\t")) continue;

    // Extract the tail: "DBL STD -" or "SGL PRPV -"
    const tailMatch = line.match(
      /^(.+?)\s+-\s+Person\t(\w+)\s+(\w+)\s+-$/,
    );
    if (!tailMatch) continue;

    const beforePerson = tailMatch[1];
    const roomCode = tailMatch[2];
    const typeCode = tailMatch[3];

    // beforePerson is like: "DOUBLE ROOM STANDARD ROOM AI A 60.00"
    // or joined: "DOUBLE ROOM SUPERIOR ROOM BEACH FRONTAI A 113.00"
    // We need to extract: name, board, period, price from the end
    const priceMatch = beforePerson.match(
      /^(.+?)\s+([A-Z])\s+(\d+(?:\.\d+)?)$/,
    );
    if (!priceMatch) continue;

    const nameAndBoard = priceMatch[1];
    const period = priceMatch[2];
    const price = parseFloat(priceMatch[3]);

    // Try to split name and board. Board is at the end, possibly joined.
    let board = "";
    let fullName = "";

    // First try: space-separated board code
    const spaceSplit = nameAndBoard.match(/^(.+)\s+([A-Z]{2,3})$/);
    if (spaceSplit && KNOWN_BOARDS.has(spaceSplit[2])) {
      fullName = spaceSplit[1];
      board = spaceSplit[2];
    } else {
      // Try: board code joined to the end of the name (e.g. "BEACH FRONTAI")
      for (const b of KNOWN_BOARDS) {
        if (nameAndBoard.endsWith(b)) {
          fullName = nameAndBoard.slice(0, -b.length);
          board = b;
          break;
        }
      }
      // Fallback: just take last 2-3 chars as board
      if (!board) {
        const fallback = nameAndBoard.match(/^(.+?)([A-Z]{2,3})$/);
        if (fallback) {
          fullName = fallback[1];
          board = fallback[2];
        } else {
          continue;
        }
      }
    }

    fullName = fullName.trim();
    const words = fullName.split(/\s+/);
    const roomName = words.slice(0, 2).join(" ");
    const typeName = words.slice(2).join(" ");

    rates.push({
      roomName,
      typeName,
      roomCode,
      typeCode,
      board,
      period,
      price,
      perPerson: true,
    });
  }

  return rates;
}

// ---------------------------------------------------------------------------
// Code definition parser
// ---------------------------------------------------------------------------

function parseCodeDefinitions(text: string): {
  rooms: SejourCodeDef[];
  roomTypes: SejourCodeDef[];
  boardPlans: SejourCodeDef[];
} {
  const rooms: SejourCodeDef[] = [];
  const roomTypes: SejourCodeDef[] = [];
  const boardPlans: SejourCodeDef[] = [];

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // After the header line "Rooms ROOM TYPES BOARD PLANS",
  // the three columns are interleaved. Due to PDF text extraction,
  // each definition appears as "CODE NAME" on its own line.
  // We need to figure out which column each belongs to.
  // Room codes: DBL, SGL, TPL, QUA (short, 3 letters)
  // Room type codes: longer codes like STD, PRPV, FAMPV, SUCUR, etc.
  // Board codes: AI, BB, HB, FB, RO, SC, UAI, SAL, etc.

  const knownRoomCodes = new Set([
    "DBL",
    "SGL",
    "TPL",
    "QUA",
    "TWN",
    "SUI",
    "JRS",
    "JSUI",
  ]);
  const knownBoardCodes = new Set([
    "AI",
    "BB",
    "HB",
    "FB",
    "RO",
    "SC",
    "UAI",
    "HAL",
    "SAL",
    "ULT",
    "PRAI",
  ]);

  let pastHeader = false;
  for (const line of lines) {
    if (line.includes("Rooms") && line.includes("ROOM TYPES")) {
      pastHeader = true;
      continue;
    }
    if (!pastHeader) continue;

    // Pattern: CODE followed by NAME
    const match = line.match(/^([A-Z]{2,10})\s+(.+)$/);
    if (!match) continue;

    const code = match[1];
    const name = match[2].trim();

    if (knownRoomCodes.has(code)) {
      rooms.push({ code, name });
    } else if (knownBoardCodes.has(code)) {
      boardPlans.push({ code, name });
    } else {
      roomTypes.push({ code, name });
    }
  }

  return { rooms, roomTypes, boardPlans };
}

// ---------------------------------------------------------------------------
// Child price parser
// ---------------------------------------------------------------------------

/** Parse a single child price line and push entries into the current child price entry */
function parseChildPriceLine(line: string, entry: SejourChildPrice): void {
  // "0 - Free 12, 99" -> free (0%)
  if (line.includes("Free")) {
    const ageMatch = line.match(/0\s*-\s*Free[\t\s]+(\d+)/);
    if (ageMatch) {
      entry.children.push({
        position: entry.children.length + 1,
        ageFrom: 0,
        ageTo: parseInt(ageMatch[1]),
        percentage: 0,
      });
    }
    return;
  }

  // "0 - % 12, 99" -> age 0-12, 99% (full price)
  // "0 - % % 12, 0 - 5, 99 99" -> multi-column child data
  // "0 - % %50 12, 6 - 12, 99 99" -> child with 50% reduction
  if (!line.match(/\d+\s*-\s*/) && !line.match(/%/)) return;

  // Extract all "age_from - age_to, percentage" patterns
  // Pattern: "0 - % 12, 99" means ageFrom=0, ageTo=12, pct=99
  // The tab-separated format puts the ageTo after the tab: "0 - %\t12, 99"
  const firstMatch = line.match(/0\s*-\s*%[\t\s]+(\d+),\s*(\d+)/);
  if (firstMatch) {
    entry.children.push({
      position: entry.children.length + 1,
      ageFrom: 0,
      ageTo: parseInt(firstMatch[1]),
      percentage: parseInt(firstMatch[2]),
    });
  }

  // Extract explicit age ranges: "6 - 12, 99 99" or "0 - 5, 99 99"
  const ageRanges = line.matchAll(/(\d+)\s*-\s*(\d+),[\t\s]+(\d+)\s+(\d+)/g);
  for (const m of ageRanges) {
    const ageFrom = parseInt(m[1]);
    const ageTo = parseInt(m[2]);
    const pct = parseInt(m[4]); // second number is the percentage
    // Avoid duplicating the first match
    if (ageFrom === 0 && firstMatch) continue;
    entry.children.push({
      position: entry.children.length + 1,
      ageFrom,
      ageTo,
      percentage: pct,
    });
  }

  // Extract "%50" style entries with age range
  const pctMatch = line.match(/%(\d+)/);
  if (pctMatch && !firstMatch) {
    const ageRange = line.match(/(\d+)\s*-\s*(\d+),/);
    if (ageRange) {
      entry.children.push({
        position: entry.children.length + 1,
        ageFrom: parseInt(ageRange[1]),
        ageTo: parseInt(ageRange[2]),
        percentage: parseInt(pctMatch[1]),
      });
    }
  }
}

function parseChildPrices(text: string): SejourChildPrice[] {
  const results: SejourChildPrice[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Child price blocks are structured as:
  // "2 DBL PRPV AI" (adults, roomCode, typeCode, board)
  // Then age/percentage lines above or below
  // The format is complex and varies. We'll extract the key blocks.

  let currentEntry: SejourChildPrice | null = null;

  for (const line of lines) {
    // Match the room identification line: "2 DBL PRPV AI" or "A 2 DBL PRPV AI" (with period letter)
    // Also handle it appearing at end of a child price line: "0 - %\t12, 99\tA 3 TPL FAM AI"
    const roomMatch = line.match(
      /(?:^|\t)([A-Z]\s+)?(\d)\s+([A-Z]{2,4})\s+([A-Z]{2,10})\s+([A-Z]{2,4})$/,
    );
    if (roomMatch) {
      // If the room info is at the end of a line, also process the child price part first
      const childPart = line.substring(0, line.indexOf(roomMatch[0])).trim();
      if (childPart && currentEntry) {
        parseChildPriceLine(childPart, currentEntry);
      }

      if (currentEntry && currentEntry.children.length > 0) {
        results.push(currentEntry);
      }
      currentEntry = {
        adults: parseInt(roomMatch[2]),
        roomCode: roomMatch[3],
        typeCode: roomMatch[4],
        board: roomMatch[5],
        children: [],
      };
      continue;
    }

    // Match age/percentage lines
    if (currentEntry) {
      parseChildPriceLine(line, currentEntry);
    }
  }

  if (currentEntry && currentEntry.children.length > 0) {
    results.push(currentEntry);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Cancellation rules parser
// ---------------------------------------------------------------------------

function parseCancellations(text: string): SejourCancellation[] {
  const results: SejourCancellation[] = [];

  // Pattern: "HRG059 ITL S26 01/05/2026 30/06/2026 1 3 1 365 1 Y"
  //   hotel operator season dateFrom dateTo day1 day2 optDay1 optDay2 nights/pct description apply
  const regex =
    /\w+\s+\w+\s+[A-Z]\d+\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(-?\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*(.*?)\s+Y/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    results.push({
      dateFrom: match[1],
      dateTo: match[2],
      day1: parseInt(match[3]),
      day2: parseInt(match[4]),
      nights: parseInt(match[7]),
      percentage: 100, // Always 100% of the booked nights
      description: match[8]?.trim() || "",
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Minimum stay parser
// ---------------------------------------------------------------------------

function parseMinStay(text: string): SejourMinStay[] {
  const results: SejourMinStay[] = [];
  // Pattern: "7 01/05/2026 31/10/2026"
  const regex = /(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    results.push({
      days: parseInt(match[1]),
      dateFrom: match[2],
      dateTo: match[3],
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Special offers parser
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Special meal / gala dinner parser (Hotel Extra Prices)
// ---------------------------------------------------------------------------

function parseSpecialMeals(text: string): SejourSpecialMeal[] {
  const results: SejourSpecialMeal[] = [];
  if (!text) return results;

  const lines = text.split("\n");

  // Format: "24/12/25 24/12/25 Stay in Hotel 60.00 30.00 Person\t6 - 12,99\tCompulsory\tCHRISTMAS GALA DINNER"
  // Or with booking range: "... CHRISTMAS GALA DINNER 01/11/25~24/12/25"
  for (const line of lines) {
    const match = line.match(
      /^(\d{2}\/\d{2}\/\d{2,4})\s+(\d{2}\/\d{2}\/\d{2,4})\s+Stay in Hotel\s+([\d.]+)\s+([\d.]+)\s+Person/,
    );
    if (!match) continue;

    const dateFrom = match[1];
    const dateTo = match[2];
    const adultPrice = parseFloat(match[3]);
    const childPrice = parseFloat(match[4]);

    // Extract mandatory flag
    const mandatory = /Compulsory/i.test(line);

    // Extract occasion name (after "Compulsory" or "Optional" tab)
    const nameMatch = line.match(/(?:Compulsory|Optional)\t(.+?)(?:\s+\d{2}\/|$)/);
    let occasion = nameMatch ? nameMatch[1].trim() : "GALA DINNER";

    // Extract booking date range if present: "01/11/25~24/12/25"
    const bookMatch = line.match(/(\d{2}\/\d{2}\/\d{2,4})~(\d{2}\/\d{2}\/\d{2,4})/);
    const bookByDate = bookMatch ? bookMatch[2] : undefined;

    // Skip early application entries (lower price with booking deadline) — use the standard price
    if (bookMatch) continue;

    results.push({
      dateFrom,
      dateTo,
      adultPrice,
      childPrice: childPrice > 0 ? childPrice : null,
      occasion,
      mandatory,
      bookByDate,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Special offers parser
// ---------------------------------------------------------------------------

function parseSpecialOffers(text: string): SejourSpecialOffer[] {
  const results: SejourSpecialOffer[] = [];

  // Look for EBD type offers
  const isEarlyBooking =
    text.includes("Early Booking") || text.includes("EBD");

  // Extract percentage: "%20" -> 20%
  const pctMatch = text.match(/%(\d+)/);
  const percentage = pctMatch ? parseInt(pctMatch[1]) : 0;

  // Extract description
  const descMatch = text.match(
    /(?:CONTRACT|Description\s*:)\s*([^\n]+(?:EBD|EARLY)[^\n]*)/i,
  );
  const name = descMatch
    ? descMatch[1].trim()
    : isEarlyBooking
      ? "Early Booking Discount"
      : "Special Offer";

  // Extract stay dates: "~ 01/05/26 31/10/26"
  const stayMatch = text.match(
    /~\s*(\d{2}\/\d{2}\/\d{2,4})\s+(\d{2}\/\d{2}\/\d{2,4})/,
  );
  // Extract booking by date: "68 21/11/25"
  const bookByMatch = text.match(
    /\d+\s+(\d{2}\/\d{2}\/\d{2,4})/,
  );

  const combinable = text.includes("Combinable with other special offers");

  if (percentage > 0) {
    results.push({
      name,
      type: isEarlyBooking ? "Early Booking" : "Special Offer",
      percentage,
      stayFrom: stayMatch ? stayMatch[1] : undefined,
      stayTo: stayMatch ? stayMatch[2] : undefined,
      bookBy: bookByMatch ? bookByMatch[1] : undefined,
      combinable,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Contract remarks parser
// ---------------------------------------------------------------------------

function parseRemarks(
  contractSection: string,
  generalSection: string,
): SejourRemarks {
  const cleanSection = (text: string) =>
    text
      .split("\n")
      .map((l) => l.trim())
      .filter(
        (l) =>
          l &&
          !l.includes("HOTEL CONTRACT") &&
          !l.includes("STARS") &&
          !l.match(/^[A-Z]\d+\s*-/) &&
          !l.match(/^\d{2}\/\d{2}\/\d{4}/) &&
          !l.includes("Page :"),
      )
      .join("\n")
      .trim();

  return {
    contractRemarks: cleanSection(contractSection || ""),
    generalRemarks: cleanSection(generalSection || ""),
  };
}

// ---------------------------------------------------------------------------
// Accommodation table parser
// ---------------------------------------------------------------------------

function parseAccommodations(text: string): SejourAccommodation[] {
  const results: SejourAccommodation[] = [];

  // Pattern: "2 2 2 2\tDBL DOUBLE ROOM FAMILY ROOM\tFAM 4"
  // minAdl maxAdl maxChd maxPax\tRoomCode RoomName TypeName\tTypeCode maxPax2
  // OR: "1 1 1 2\tSGL SINGLE ROOM PREMIUM POOL VIEW\tPRPV 3"
  const lines = text.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    const match = line.match(
      /^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\t(\w+)\s+(.+?)\t(\w+)\s+(\d+)$/,
    );
    if (match) {
      const minAdults = parseInt(match[1]);
      const maxAdults = parseInt(match[2]);
      const maxChildren = parseInt(match[3]);
      // match[4] is another count (looks like maxPax variant)
      const roomCode = match[5];
      const fullName = match[6].trim();
      const typeCode = match[7];
      const maxPax = parseInt(match[8]);

      // Split full name: first two words = room name, rest = type name
      const words = fullName.split(/\s+/);
      const roomName = words.slice(0, 2).join(" ");
      const typeName = words.slice(2).join(" ");

      results.push({
        roomCode,
        roomName,
        typeCode,
        typeName,
        minAdults,
        maxAdults,
        maxChildren,
        maxPax,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------

export async function parseSejourPdf(
  data: Buffer | Uint8Array,
): Promise<SejourContract> {
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const parser = new PDFParse({ data: uint8 });
  const result = await parser.getText();
  const rawText: string = typeof result === "string" ? result : result.text;

  const warnings: string[] = [];

  // Strip repeated page headers
  const text = stripPageHeaders(rawText);

  // Split into sections
  const sections = splitSections(text);

  // Parse header from the raw text (before stripping, to capture the first occurrence)
  const header = parseHeader(rawText);
  if (!header.hotelName) {
    warnings.push("Could not extract hotel name from PDF header");
  }

  // Parse periods
  const periods = parsePeriods(sections["Periods"] || "");
  // Deduplicate period letters for allotment column headers
  const uniqueLetters = [...new Set(periods.map((p) => p.letter))];

  // Parse allotments (search full text since allotment data spans sections)
  const allotments = parseAllotments(text, uniqueLetters);

  // Parse releases
  const releases = parseReleases(sections["Release Day"] || "");

  // Parse rates
  const rates = parseRates(sections["Room Buying Rates"] || "");
  if (rates.length === 0) {
    warnings.push("No buying rates found in PDF");
  }

  // Parse code definitions
  const codeDefinitions = parseCodeDefinitions(
    sections["Code Definition"] || "",
  );

  // Parse child prices
  const childPrices = parseChildPrices(
    sections["Child Buying Prices"] || "",
  );

  // Parse cancellations
  const cancellations = parseCancellations(
    sections["Cancellation Rules"] || "",
  );

  // Parse minimum stay
  const minimumStay = parseMinStay(
    sections["Minimum Stay"] || "",
  );

  // Parse special meals (Hotel Extra Prices / gala dinners)
  const specialMeals = parseSpecialMeals(
    sections["Hotel Extra Prices"] || "",
  );

  // Parse special offers
  const specialOffers = parseSpecialOffers(
    sections["SPECIAL OFFERS"] || "",
  );

  // Parse accommodation table
  const accommodations = parseAccommodations(
    sections["Hotel Accommodation Table"] || "",
  );

  // Parse remarks
  const remarks = parseRemarks(
    sections["CONTRACT REMARKS"] || "",
    sections["GENERAL REMARKS"] || "",
  );

  return {
    header,
    periods,
    allotments,
    releases,
    rates,
    codeDefinitions,
    childPrices,
    cancellations,
    minimumStay,
    specialOffers,
    specialMeals,
    accommodations,
    remarks,
    warnings,
  };
}

/** Convert parsed date strings (dd/mm/yyyy) to JavaScript Date objects */
export function toDate(dmy: string): Date {
  const iso = parseDate(dmy);
  return new Date(iso);
}
