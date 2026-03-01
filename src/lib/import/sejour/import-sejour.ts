import type { PrismaClient } from "@prisma/client";
import type { SejourContract, SejourRate } from "./types";
import { BOARD_CODE_MAP, CITY_COUNTRY_MAP, COUNTRY_INFO, CURRENCY_INFO, STAR_RATING_MAP } from "./mappings";
import { toDate } from "./parse-sejour";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface ImportSejourResult {
  hotelId: string;
  contractId: string;
  hotelName: string;
  contractCode: string;
  roomTypesCreated: number;
  mealBasesCreated: number;
  seasonsCreated: number;
  ratesCreated: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a hotel code from the name, e.g. "AMC ROYAL HOTEL & SPA" -> "AMCROYALHS" */
function generateHotelCode(name: string): string {
  return name
    .replace(/[^A-Za-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.slice(0, 3).toUpperCase())
    .join("")
    .slice(0, 20);
}

/** Resolve country by city name or ISO code — auto-creates if missing */
async function resolveCountry(
  db: PrismaClient,
  city: string,
): Promise<string> {
  const upper = city.toUpperCase();

  // Check our city->country map first
  const isoCode = CITY_COUNTRY_MAP[upper];
  if (isoCode) {
    const country = await db.country.findFirst({
      where: { code: isoCode },
      select: { id: true },
    });
    if (country) return country.id;

    // Auto-create country from known info
    const info = COUNTRY_INFO[isoCode];
    if (info) {
      const created = await db.country.create({
        data: {
          code: isoCode,
          code3: info.code3,
          name: info.name,
          phone: info.phone,
          continent: info.continent,
        },
        select: { id: true },
      });
      return created.id;
    }

    // Minimal creation with just ISO code
    const created = await db.country.create({
      data: { code: isoCode, name: isoCode },
      select: { id: true },
    });
    return created.id;
  }

  // Fallback: search by country name matching the city
  const byName = await db.country.findFirst({
    where: { name: { contains: city, mode: "insensitive" } },
    select: { id: true },
  });
  if (byName) return byName.id;

  // Last resort: create a placeholder country from city name
  const code = city.slice(0, 2).toUpperCase();
  const existing = await db.country.findFirst({ where: { code }, select: { id: true } });
  if (existing) return existing.id;

  const created = await db.country.create({
    data: { code, name: city },
    select: { id: true },
  });
  return created.id;
}

/** Resolve currency by code — auto-creates if missing */
async function resolveCurrency(
  db: PrismaClient,
  currencyCode: string,
): Promise<string> {
  const code = currencyCode.toUpperCase().trim();
  if (!code) {
    // Default to EUR if no currency extracted
    const eur = await db.currency.findFirst({ where: { code: "EUR" }, select: { id: true } });
    if (eur) return eur.id;
    const created = await db.currency.create({
      data: { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
      select: { id: true },
    });
    return created.id;
  }

  const existing = await db.currency.findFirst({
    where: { code },
    select: { id: true },
  });
  if (existing) return existing.id;

  // Auto-create from known info
  const info = CURRENCY_INFO[code];
  const created = await db.currency.create({
    data: {
      code,
      name: info?.name ?? code,
      symbol: info?.symbol ?? code,
      decimals: info?.decimals ?? 2,
    },
    select: { id: true },
  });
  return created.id;
}

/** Resolve or create destination for a city within company */
async function resolveDestination(
  db: PrismaClient,
  companyId: string,
  cityName: string,
  countryId: string,
): Promise<string> {
  const existing = await db.destination.findFirst({
    where: {
      companyId,
      OR: [
        { name: { equals: cityName, mode: "insensitive" } },
        { code: { equals: cityName.slice(0, 3).toUpperCase(), mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const code = cityName.slice(0, 3).toUpperCase();
  const dest = await db.destination.create({
    data: {
      companyId,
      name: cityName,
      code,
      countryId,
    },
    select: { id: true },
  });
  return dest.id;
}

/**
 * Generate contract code in the format: {HotelAbbr}/{Market}/{Season}/{4-digit serial}
 * e.g. AMCRHS/FREN/S26/0001
 */
async function generateContractCode(
  db: PrismaClient,
  companyId: string,
  hotelCode: string,
  marketCode: string,
  seasonCode: string,
): Promise<string> {
  // Count existing contracts with the same prefix to determine serial
  const prefix = `${hotelCode}/${marketCode}/${seasonCode}/`;
  const existing = await db.contract.findMany({
    where: { companyId, code: { startsWith: prefix } },
    select: { code: true },
    orderBy: { code: "desc" },
    take: 1,
  });

  let serial = 1;
  if (existing.length > 0) {
    const lastCode = existing[0].code;
    const lastSerial = parseInt(lastCode.split("/").pop() ?? "0", 10);
    if (!isNaN(lastSerial)) serial = lastSerial + 1;
  }

  return `${prefix}${String(serial).padStart(4, "0")}`;
}

/** Resolve or create a Market for the company and return its ID and code */
async function resolveMarket(
  db: PrismaClient,
  companyId: string,
  marketName: string,
): Promise<{ id: string; code: string } | null> {
  const name = marketName.trim();
  if (!name) return null;

  const code = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 5);

  const existing = await db.market.findFirst({
    where: {
      companyId,
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        { code: { equals: code, mode: "insensitive" } },
      ],
    },
    select: { id: true, code: true },
  });
  if (existing) return existing;

  const created = await db.market.create({
    data: { companyId, name, code },
    select: { id: true, code: true },
  });
  return created;
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

export async function importSejourContract(
  db: PrismaClient,
  parsed: SejourContract,
  companyId: string,
  userId: string,
): Promise<ImportSejourResult> {
  const { header, periods, rates, codeDefinitions, allotments, releases,
    cancellations, minimumStay, specialOffers, specialMeals, remarks, accommodations, childPrices } = parsed;

  // ---- Resolve/create country ----
  const countryId = await resolveCountry(db, header.city);

  // ---- Resolve/create currency ----
  const currencyId = await resolveCurrency(db, header.currency);

  // ---- Resolve/create destination ----
  const destinationId = await resolveDestination(
    db,
    companyId,
    header.city,
    countryId,
  );

  // ---- Resolve/create market ----
  const market = await resolveMarket(db, companyId, header.market);
  const marketId = market?.id ?? null;
  const marketCode = market?.code ?? "GEN";

  // ---- Upsert hotel ----
  const hotelCode = generateHotelCode(header.hotelName);
  const starRating = (STAR_RATING_MAP[header.stars] || "FOUR") as
    | "ONE"
    | "TWO"
    | "THREE"
    | "FOUR"
    | "FIVE"
    | "FIVE_DELUXE";

  const hotel = await db.hotel.upsert({
    where: { companyId_code: { companyId, code: hotelCode } },
    update: {
      name: header.hotelName,
      starRating,
      city: header.city,
      countryId,
      destinationId,
    },
    create: {
      companyId,
      name: header.hotelName,
      code: hotelCode,
      starRating,
      city: header.city,
      countryId,
      destinationId,
    },
    select: { id: true },
  });

  // ---- Infer board plans from rates if parser returned empty ----
  if (codeDefinitions.boardPlans.length === 0 && rates.length > 0) {
    const boardCodesInRates = new Set(rates.map((r) => r.board));
    const BOARD_NAMES: Record<string, string> = {
      AI: "ALL INCLUSIVE", UAI: "ULTRA ALL INCLUSIVE", PRAI: "PREMIUM ALL INCLUSIVE",
      BB: "BED & BREAKFAST", HB: "HALF BOARD", FB: "FULL BOARD",
      RO: "ROOM ONLY", SC: "SELF CATERING", HAL: "HALF ALL INCLUSIVE",
      SAL: "SOFT ALL INCLUSIVE", ULT: "ULTRA ALL INCLUSIVE",
    };
    for (const code of boardCodesInRates) {
      if (code) {
        codeDefinitions.boardPlans.push({
          code,
          name: BOARD_NAMES[code] || code,
        });
      }
    }
  }

  // ---- Upsert hotel room types (from code definitions) ----
  // Filter out any board codes that accidentally got classified as room types
  const boardCodeSet = new Set([
    ...Object.keys(BOARD_CODE_MAP),
    ...codeDefinitions.boardPlans.map((b) => b.code),
  ]);
  codeDefinitions.roomTypes = codeDefinitions.roomTypes.filter(
    (t) => !boardCodeSet.has(t.code),
  );

  const roomTypeIdByCode = new Map<string, string>();
  let roomTypesCreated = 0;

  for (const typeDef of codeDefinitions.roomTypes) {
    // Use accommodation table data for occupancy if available
    const accomData = accommodations.find((a) => a.typeCode === typeDef.code);

    const rt = await db.hotelRoomType.upsert({
      where: {
        hotelId_code: { hotelId: hotel.id, code: typeDef.code },
      },
      update: {
        name: typeDef.name,
        maxAdults: accomData?.maxAdults ?? 2,
        maxChildren: accomData?.maxChildren ?? 2,
        maxOccupancy: accomData?.maxPax ?? 3,
      },
      create: {
        hotelId: hotel.id,
        name: typeDef.name,
        code: typeDef.code,
        maxAdults: accomData?.maxAdults ?? 2,
        maxChildren: accomData?.maxChildren ?? 2,
        maxOccupancy: accomData?.maxPax ?? 3,
      },
      select: { id: true },
    });
    roomTypeIdByCode.set(typeDef.code, rt.id);
    roomTypesCreated++;
  }

  // ---- Auto-create room types referenced in rates but missing from code definitions ----
  const rateTypeCodes = new Set(rates.map((r) => r.typeCode));
  for (const typeCode of rateTypeCodes) {
    if (roomTypeIdByCode.has(typeCode) || boardCodeSet.has(typeCode)) continue;
    // Derive name from rates (typeName)
    const sampleRate = rates.find((r) => r.typeCode === typeCode);
    const typeName = sampleRate?.typeName || typeCode;
    const accomData = accommodations.find((a) => a.typeCode === typeCode);

    const rt = await db.hotelRoomType.upsert({
      where: { hotelId_code: { hotelId: hotel.id, code: typeCode } },
      update: { name: typeName },
      create: {
        hotelId: hotel.id,
        name: typeName,
        code: typeCode,
        maxAdults: accomData?.maxAdults ?? 2,
        maxChildren: accomData?.maxChildren ?? 2,
        maxOccupancy: accomData?.maxPax ?? 3,
      },
      select: { id: true },
    });
    roomTypeIdByCode.set(typeCode, rt.id);
    roomTypesCreated++;
  }

  // ---- Upsert hotel meal bases ----
  const mealBasisIdByCode = new Map<string, string>();
  let mealBasesCreated = 0;

  for (const boardDef of codeDefinitions.boardPlans) {
    const mealCode = BOARD_CODE_MAP[boardDef.code] || boardDef.code;
    const validMealCodes = ["RO", "BB", "HB", "FB", "AI", "UAI", "PRAI", "SC"];
    if (!validMealCodes.includes(mealCode)) continue;

    const mb = await db.hotelMealBasis.upsert({
      where: {
        hotelId_mealCode: {
          hotelId: hotel.id,
          mealCode: mealCode as "RO" | "BB" | "HB" | "FB" | "AI" | "UAI" | "PRAI" | "SC",
        },
      },
      update: { name: boardDef.name },
      create: {
        hotelId: hotel.id,
        mealCode: mealCode as "RO" | "BB" | "HB" | "FB" | "AI" | "UAI" | "PRAI" | "SC",
        name: boardDef.name,
      },
      select: { id: true, mealCode: true },
    });
    mealBasisIdByCode.set(boardDef.code, mb.id);
    // Also map the normalized code
    mealBasisIdByCode.set(mealCode, mb.id);
    mealBasesCreated++;
  }

  // ---- Upsert hotel-level child policies ----
  if (childPrices.length > 0) {
    // Collect unique age bands across all child price entries
    const hotelAgeBands = new Map<string, { ageFrom: number; ageTo: number; percentage: number }>();
    for (const cp of childPrices) {
      for (const child of cp.children) {
        const key = `${child.ageFrom}-${child.ageTo}`;
        if (!hotelAgeBands.has(key)) {
          hotelAgeBands.set(key, {
            ageFrom: child.ageFrom,
            ageTo: child.ageTo,
            percentage: child.percentage,
          });
        }
      }
    }

    // Check existing hotel child policies to avoid duplicates
    const existingPolicies = await db.childPolicy.findMany({
      where: { hotelId: hotel.id },
      select: { ageFrom: true, ageTo: true },
    });
    const existingKeys = new Set(existingPolicies.map((p) => `${p.ageFrom}-${p.ageTo}`));

    for (const [key, band] of hotelAgeBands) {
      if (existingKeys.has(key)) continue;

      let category: "INFANT" | "CHILD" | "TEEN";
      if (band.ageTo <= 2) {
        category = "INFANT";
      } else if (band.ageTo <= 12) {
        category = "CHILD";
      } else {
        category = "TEEN";
      }

      const isFree = band.percentage === 0;

      await db.childPolicy.create({
        data: {
          hotelId: hotel.id,
          category,
          ageFrom: band.ageFrom,
          ageTo: band.ageTo,
          label: isFree
            ? `Free ${category.toLowerCase()} (${band.ageFrom}-${band.ageTo}y)`
            : `${category.charAt(0) + category.slice(1).toLowerCase()} ${band.ageFrom}-${band.ageTo}y (${band.percentage}%)`,
          freeInSharing: isFree,
          maxFreePerRoom: isFree ? 1 : 0,
          extraBedAllowed: !isFree,
          mealsIncluded: true,
          chargePercentage: band.percentage,
          notes: `${band.percentage}% of adult rate (imported from Sejour)`,
        },
      });
    }
  }

  // ---- Determine base room type (lowest DBL rate) ----
  // Only consider type codes that were actually created as room types
  const dblRates = rates.filter(
    (r) => r.roomCode === "DBL" && roomTypeIdByCode.has(r.typeCode),
  );
  const typeAvgRates = new Map<string, number>();

  for (const r of dblRates) {
    const current = typeAvgRates.get(r.typeCode) || 0;
    const count = dblRates.filter((dr) => dr.typeCode === r.typeCode).length;
    typeAvgRates.set(
      r.typeCode,
      current + r.price / count,
    );
  }

  // Find the type with the lowest average DBL rate
  let baseTypeCode = codeDefinitions.roomTypes[0]?.code || "STD";
  let lowestAvg = Infinity;
  for (const [code, avg] of typeAvgRates) {
    if (avg < lowestAvg) {
      lowestAvg = avg;
      baseTypeCode = code;
    }
  }

  // If base type code still not in roomTypeIdByCode, fall back to first available
  if (!roomTypeIdByCode.has(baseTypeCode) && roomTypeIdByCode.size > 0) {
    baseTypeCode = roomTypeIdByCode.keys().next().value!;
  }

  const baseRoomTypeId = roomTypeIdByCode.get(baseTypeCode);
  if (!baseRoomTypeId) {
    throw new Error(`Base room type "${baseTypeCode}" not found after creation`);
  }

  // ---- Determine base meal basis (first board plan) ----
  const firstBoardCode = codeDefinitions.boardPlans[0]?.code || "AI";
  const baseMealCode = BOARD_CODE_MAP[firstBoardCode] || firstBoardCode;
  const baseMealBasisId = mealBasisIdByCode.get(baseMealCode) || mealBasisIdByCode.get(firstBoardCode);
  if (!baseMealBasisId) {
    throw new Error(
      `Base meal basis not found. Board codes: ${codeDefinitions.boardPlans.map((b) => b.code).join(", ")}`,
    );
  }

  // ---- Compute contract date range ----
  const allDates = periods.map((p) => toDate(p.dateFrom));
  const allEndDates = periods.map((p) => toDate(p.dateTo));
  const validFrom = new Date(
    Math.min(...allDates.map((d) => d.getTime())),
  );
  const validTo = new Date(
    Math.max(...allEndDates.map((d) => d.getTime())),
  );

  // ---- Generate contract code ----
  const contractCode = await generateContractCode(db, companyId, hotelCode, marketCode, header.seasonCode);

  // ---- Determine minimum stay ----
  const minStayDays = minimumStay.length > 0
    ? Math.max(...minimumStay.map((m) => m.days))
    : 1;

  // ---- Create contract ----
  const contract = await db.contract.create({
    data: {
      companyId,
      name: `${header.hotelName} - ${header.seasonCode}`,
      code: contractCode,
      season: header.seasonCode,
      status: "DRAFT",
      hotelId: hotel.id,
      validFrom,
      validTo,
      rateBasis: "PER_PERSON",
      baseCurrencyId: currencyId,
      baseRoomTypeId,
      baseMealBasisId,
      minimumStay: minStayDays,
      internalNotes: [
        remarks.contractRemarks,
        remarks.generalRemarks,
      ]
        .filter(Boolean)
        .join("\n\n"),
      createdById: userId,
    },
    select: { id: true },
  });

  // ---- Assign market to contract ----
  if (marketId) {
    await db.contractMarket.create({
      data: { contractId: contract.id, marketId },
    });
  }

  // ---- Create default occupancy tables for room types ----
  for (const [, rtId] of roomTypeIdByCode) {
    const existingOcc = await db.roomTypeOccupancy.findFirst({
      where: { roomTypeId: rtId },
      select: { id: true },
    });
    if (existingOcc) continue;

    // Find the accommodation data for capacity info
    const typeDef = codeDefinitions.roomTypes.find(
      (t) => roomTypeIdByCode.get(t.code) === rtId,
    );
    const accom = typeDef
      ? accommodations.find((a) => a.typeCode === typeDef.code)
      : null;

    const maxAdults = accom?.maxAdults ?? 2;
    const maxChildren = accom?.maxChildren ?? 2;

    // Generate standard occupancy combos based on capacity
    const combos: { adults: number; children: number; infants: number; extraBeds: number; description: string; isDefault: boolean }[] = [];

    // Base adult combos (1, 2, 3 adults — up to maxAdults)
    for (let a = 1; a <= Math.min(maxAdults, 3); a++) {
      combos.push({ adults: a, children: 0, infants: 0, extraBeds: 0, description: `${a} Adult${a > 1 ? "s" : ""}`, isDefault: a === 2 });
    }

    // Adult + child combos
    for (let a = 1; a <= Math.min(maxAdults, 2); a++) {
      for (let c = 1; c <= maxChildren; c++) {
        if (a + c > (accom?.maxPax ?? 4)) break;
        combos.push({ adults: a, children: c, infants: 0, extraBeds: 0, description: `${a}A + ${c}C`, isDefault: false });
      }
    }

    // Adult + infant combos (2 adults + 1 infant)
    combos.push({ adults: 2, children: 0, infants: 1, extraBeds: 0, description: "2A + 1 Infant", isDefault: false });

    for (let i = 0; i < combos.length; i++) {
      const c = combos[i];
      await db.roomTypeOccupancy.upsert({
        where: {
          roomTypeId_adults_children_infants_extraBeds: {
            roomTypeId: rtId,
            adults: c.adults,
            children: c.children,
            infants: c.infants,
            extraBeds: c.extraBeds,
          },
        },
        update: {},
        create: {
          roomTypeId: rtId,
          adults: c.adults,
          children: c.children,
          infants: c.infants,
          extraBeds: c.extraBeds,
          isDefault: c.isDefault,
          description: c.description,
          sortOrder: i,
        },
      });
    }
  }

  // ---- Create contract seasons ----
  // Deduplicate periods by letter (each letter = one season)
  const uniquePeriods = new Map<
    string,
    { dateFrom: Date; dateTo: Date; letter: string }
  >();
  for (const p of periods) {
    const existing = uniquePeriods.get(p.letter);
    const pFrom = toDate(p.dateFrom);
    const pTo = toDate(p.dateTo);
    if (!existing) {
      uniquePeriods.set(p.letter, { dateFrom: pFrom, dateTo: pTo, letter: p.letter });
    } else {
      // Extend the range
      if (pFrom < existing.dateFrom) existing.dateFrom = pFrom;
      if (pTo > existing.dateTo) existing.dateTo = pTo;
    }
  }

  // But actually each period row is its own season (A may repeat with different dates)
  // Create one ContractSeason per period row
  const seasonIds: Map<string, string[]> = new Map(); // letter -> season IDs

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    // Find release days for this period's date range
    const release = releases.find(
      (r) => r.dateFrom === p.dateFrom && r.dateTo === p.dateTo,
    );

    // Find minimum stay for this period's date range
    const pFromDate = toDate(p.dateFrom);
    const pToDate = toDate(p.dateTo);
    const minStay = minimumStay.find((m) => {
      const mFrom = toDate(m.dateFrom);
      const mTo = toDate(m.dateTo);
      return pFromDate >= mFrom && pToDate <= mTo;
    });

    const season = await db.contractSeason.create({
      data: {
        contractId: contract.id,
        dateFrom: pFromDate,
        dateTo: pToDate,
        sortOrder: i,
        releaseDays: release?.days ?? 7,
        minimumStay: minStay?.days ?? minStayDays,
      },
      select: { id: true },
    });

    const existing = seasonIds.get(p.letter) || [];
    existing.push(season.id);
    seasonIds.set(p.letter, existing);
  }

  const seasonsCreated = periods.length;

  // ---- Create contract room types ----
  for (const [code, rtId] of roomTypeIdByCode) {
    await db.contractRoomType.create({
      data: {
        contractId: contract.id,
        roomTypeId: rtId,
        isBase: code === baseTypeCode,
        sortOrder: code === baseTypeCode ? 0 : 1,
      },
    });
  }

  // ---- Create contract meal bases ----
  const createdMealBasisIds = new Set<string>();
  for (const [, mbId] of mealBasisIdByCode) {
    if (createdMealBasisIds.has(mbId)) continue;
    createdMealBasisIds.add(mbId);
    await db.contractMealBasis.create({
      data: {
        contractId: contract.id,
        mealBasisId: mbId,
        isBase: mbId === baseMealBasisId,
      },
    });
  }

  // ---- Create base rates and supplements ----
  // Base rates: for the base room type's DBL rate per season
  let ratesCreated = 0;

  // Group rates by period letter
  const ratesByPeriod = new Map<string, SejourRate[]>();
  for (const r of rates) {
    const existing = ratesByPeriod.get(r.period) || [];
    existing.push(r);
    ratesByPeriod.set(r.period, existing);
  }

  for (const [letter, periodSeasonIds] of seasonIds) {
    const periodRates = ratesByPeriod.get(letter) || [];

    // Find base rate: DBL + base type + base meal
    const baseRate = periodRates.find(
      (r) =>
        r.roomCode === "DBL" &&
        r.typeCode === baseTypeCode &&
        (BOARD_CODE_MAP[r.board] || r.board) === baseMealCode,
    );

    // Find single and triple rates for the base type
    const sglRate = periodRates.find(
      (r) =>
        r.roomCode === "SGL" &&
        r.typeCode === baseTypeCode &&
        (BOARD_CODE_MAP[r.board] || r.board) === baseMealCode,
    );
    const tplRate = periodRates.find(
      (r) =>
        r.roomCode === "TPL" &&
        r.typeCode === baseTypeCode &&
        (BOARD_CODE_MAP[r.board] || r.board) === baseMealCode,
    );

    for (const seasonId of periodSeasonIds) {
      // Create base rate
      if (baseRate) {
        await db.contractBaseRate.create({
          data: {
            contractId: contract.id,
            seasonId,
            rate: baseRate.price,
            doubleRate: baseRate.price,
            singleRate: sglRate?.price ?? null,
            tripleRate: tplRate?.price ?? null,
          },
        });
        ratesCreated++;
      }

      // ---- Create ROOM_TYPE supplements ----
      // For each non-base room type, the supplement is the difference from base DBL rate
      for (const [typeCode, typeId] of roomTypeIdByCode) {
        if (typeCode === baseTypeCode) continue;

        const typeRate = periodRates.find(
          (r) =>
            r.roomCode === "DBL" &&
            r.typeCode === typeCode &&
            (BOARD_CODE_MAP[r.board] || r.board) === baseMealCode,
        );

        if (typeRate && baseRate) {
          const diff = typeRate.price - baseRate.price;
          await db.contractSupplement.create({
            data: {
              contractId: contract.id,
              seasonId,
              supplementType: "ROOM_TYPE",
              roomTypeId: typeId,
              valueType: "FIXED",
              value: Math.abs(diff),
              isReduction: diff < 0,
              perPerson: true,
              perNight: true,
              label: `${codeDefinitions.roomTypes.find((t) => t.code === typeCode)?.name || typeCode} supplement`,
            },
          });
          ratesCreated++;
        }
      }

      // ---- Create OCCUPANCY supplements ----
      // Single supplement: SGL rate - DBL rate for same type (positive = supplement)
      if (baseRate && sglRate) {
        const sglSup = sglRate.price - baseRate.price;
        if (sglSup !== 0) {
          await db.contractSupplement.create({
            data: {
              contractId: contract.id,
              seasonId,
              supplementType: "OCCUPANCY",
              forAdults: 1,
              valueType: "FIXED",
              value: Math.abs(sglSup),
              isReduction: sglSup < 0,
              perPerson: true,
              perNight: true,
              label: "Single supplement",
            },
          });
        }
      }

      // Triple reduction: TPL rate - DBL rate for same type
      if (baseRate && tplRate) {
        const tplDiff = tplRate.price - baseRate.price;
        if (tplDiff !== 0) {
          await db.contractSupplement.create({
            data: {
              contractId: contract.id,
              seasonId,
              supplementType: "OCCUPANCY",
              forAdults: 3,
              valueType: "FIXED",
              value: Math.abs(tplDiff),
              isReduction: tplDiff < 0,
              perPerson: true,
              perNight: true,
              label: "Triple reduction",
            },
          });
        }
      }

      // ---- Create MEAL supplements ----
      // If there are multiple board plans, the non-base boards get meal supplements
      if (codeDefinitions.boardPlans.length > 1) {
        for (const boardDef of codeDefinitions.boardPlans) {
          const normalizedCode = BOARD_CODE_MAP[boardDef.code] || boardDef.code;
          if (normalizedCode === baseMealCode) continue;

          const mbId = mealBasisIdByCode.get(normalizedCode) || mealBasisIdByCode.get(boardDef.code);
          if (!mbId) continue;

          const boardRate = periodRates.find(
            (r) =>
              r.roomCode === "DBL" &&
              r.typeCode === baseTypeCode &&
              r.board === boardDef.code,
          );

          if (boardRate && baseRate) {
            const diff = boardRate.price - baseRate.price;
            await db.contractSupplement.create({
              data: {
                contractId: contract.id,
                seasonId,
                supplementType: "MEAL",
                mealBasisId: mbId,
                valueType: "FIXED",
                value: Math.abs(diff),
                isReduction: diff < 0,
                perPerson: true,
                perNight: true,
                label: `${boardDef.name} supplement`,
              },
            });
          }
        }
      }
    }
  }

  // ---- Create allotments ----
  for (const allot of allotments) {
    // Find the room type ID by matching allotment type name to code definitions
    const typeDef = codeDefinitions.roomTypes.find(
      (t) => t.name === allot.typeName,
    );
    const typeId = typeDef ? roomTypeIdByCode.get(typeDef.code) : null;
    if (!typeId) continue;

    for (const [letter, count] of Object.entries(allot.allocations)) {
      const periodSeasonIds = seasonIds.get(letter) || [];
      for (const seasonId of periodSeasonIds) {
        await db.contractAllotment.upsert({
          where: {
            contractId_seasonId_roomTypeId: {
              contractId: contract.id,
              seasonId,
              roomTypeId: typeId,
            },
          },
          update: {
            totalRooms: { increment: count },
          },
          create: {
            contractId: contract.id,
            seasonId,
            roomTypeId: typeId,
            basis: "ALLOCATION",
            totalRooms: count,
          },
        });
      }
    }
  }

  // ---- Create cancellation policies ----
  for (let i = 0; i < cancellations.length; i++) {
    const cancel = cancellations[i];
    const isNoShow = cancel.description.toUpperCase().includes("NO SHOW") || cancel.day2 === 0;
    const dateRange = `${cancel.dateFrom} - ${cancel.dateTo}`;

    await db.contractCancellationPolicy.create({
      data: {
        contractId: contract.id,
        daysBefore: cancel.day2,
        chargeType: isNoShow ? "FIRST_NIGHT" : "PERCENTAGE",
        chargeValue: cancel.percentage,
        description: isNoShow
          ? `NO SHOW (${dateRange})`
          : `${cancel.nights} night(s) charge, ${cancel.day1}-${cancel.day2} days before (${dateRange})`,
        sortOrder: i,
      },
    });
  }

  // ---- Create special offers ----
  for (const offer of specialOffers) {
    const offerValidFrom = offer.stayFrom ? toDate(offer.stayFrom) : validFrom;
    const offerValidTo = offer.stayTo ? toDate(offer.stayTo) : validTo;
    const bookByDate = offer.bookBy ? toDate(offer.bookBy) : undefined;

    await db.contractSpecialOffer.create({
      data: {
        contractId: contract.id,
        name: offer.name,
        offerType: "EARLY_BIRD",
        description: `${offer.percentage}% ${offer.type}`,
        validFrom: offerValidFrom,
        validTo: offerValidTo,
        bookByDate,
        discountType: "PERCENTAGE",
        discountValue: offer.percentage,
        combinable: offer.combinable,
        active: true,
      },
    });
  }

  // ---- Create special meals (gala dinners) ----
  if (specialMeals.length > 0) {
    for (const meal of specialMeals) {
      const name = meal.occasion.toUpperCase();
      let occasion: "NYE" | "CHRISTMAS" | "EASTER" | "CUSTOM" = "CUSTOM";
      if (name.includes("NEW YEAR") || name.includes("NYE")) {
        occasion = "NYE";
      } else if (name.includes("CHRISTMAS")) {
        occasion = "CHRISTMAS";
      } else if (name.includes("EASTER")) {
        occasion = "EASTER";
      }

      await db.contractSpecialMeal.create({
        data: {
          contractId: contract.id,
          occasion,
          customName: occasion === "CUSTOM" ? meal.occasion : undefined,
          dateFrom: toDate(meal.dateFrom),
          dateTo: toDate(meal.dateTo),
          mandatory: meal.mandatory,
          adultPrice: meal.adultPrice,
          childPrice: meal.childPrice,
          notes: meal.occasion,
        },
      });
    }
  }

  // ---- Create child policies ----
  // Analyze child prices to determine age bands and create ContractChildPolicy records
  if (childPrices.length > 0) {
    // Collect unique age bands across all child price entries
    const ageBands = new Map<string, { ageFrom: number; ageTo: number; percentage: number; isFree: boolean }>();

    for (const cp of childPrices) {
      for (const child of cp.children) {
        const key = `${child.ageFrom}-${child.ageTo}`;
        if (!ageBands.has(key)) {
          ageBands.set(key, {
            ageFrom: child.ageFrom,
            ageTo: child.ageTo,
            percentage: child.percentage,
            isFree: child.percentage === 0,
          });
        }
      }
    }

    for (const [, band] of ageBands) {
      // Determine category based on age range
      let category: "INFANT" | "CHILD" | "TEEN";
      if (band.ageTo <= 2) {
        category = "INFANT";
      } else if (band.ageTo <= 12) {
        category = "CHILD";
      } else {
        category = "TEEN";
      }

      const isFree = band.isFree || band.percentage === 0;

      await db.contractChildPolicy.create({
        data: {
          contractId: contract.id,
          category,
          ageFrom: band.ageFrom,
          ageTo: band.ageTo,
          label: isFree
            ? `Free ${category.toLowerCase()} (${band.ageFrom}-${band.ageTo}y)`
            : `${category.charAt(0) + category.slice(1).toLowerCase()} ${band.ageFrom}-${band.ageTo}y (${band.percentage}%)`,
          freeInSharing: isFree,
          maxFreePerRoom: isFree ? 1 : 0,
          extraBedAllowed: !isFree,
          mealsIncluded: true,
          chargePercentage: band.percentage,
          notes: `${band.percentage}% of adult rate`,
        },
      });
    }
  }

  return {
    hotelId: hotel.id,
    contractId: contract.id,
    hotelName: header.hotelName,
    contractCode,
    roomTypesCreated,
    mealBasesCreated,
    seasonsCreated,
    ratesCreated,
  };
}
