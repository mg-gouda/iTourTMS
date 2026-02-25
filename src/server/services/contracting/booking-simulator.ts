/**
 * Booking simulator: season resolution, night breakdown, allotment checking,
 * and unified stay simulation with per-night rate calculation.
 */

import { formatSeasonLabel } from "@/lib/utils";
import { calculateRate, type RateContractData, type RateBreakdown } from "./rate-calculator";
import { checkStopSales, type StopSaleRecord } from "./stop-sale-checker";

export interface SeasonRecord {
  id: string;
  dateFrom: Date;
  dateTo: Date;
  releaseDays: number | null;
}

export interface NightBreakdown {
  date: string;
  seasonId: string | null;
  seasonLabel: string;
}

/**
 * Build a per-night breakdown mapping each night to a season.
 */
export function buildNightBreakdown(
  checkIn: Date,
  nights: number,
  seasons: SeasonRecord[],
): { breakdown: NightBreakdown[]; warnings: string[] } {
  const warnings: string[] = [];
  const breakdown: NightBreakdown[] = [];

  for (let i = 0; i < nights; i++) {
    const nightDate = new Date(checkIn);
    nightDate.setDate(nightDate.getDate() + i);
    const dateStr = nightDate.toISOString().slice(0, 10);

    const matchingSeason = seasons.find((s) => {
      const from = s.dateFrom.toISOString().slice(0, 10);
      const to = s.dateTo.toISOString().slice(0, 10);
      return dateStr >= from && dateStr <= to;
    });

    breakdown.push({
      date: dateStr,
      seasonId: matchingSeason?.id ?? null,
      seasonLabel: matchingSeason
        ? formatSeasonLabel(matchingSeason.dateFrom, matchingSeason.dateTo)
        : "No Season",
    });

    if (!matchingSeason) {
      warnings.push(`Night ${dateStr} has no matching season`);
    }
  }

  return { breakdown, warnings };
}

/**
 * Check release-day warnings per season.
 */
export function checkReleaseDays(
  seasons: SeasonRecord[],
  nightBreakdown: NightBreakdown[],
  bookingDate: Date,
): string[] {
  const warnings: string[] = [];
  for (const season of seasons) {
    if (season.releaseDays) {
      const seasonFrom = season.dateFrom.toISOString().slice(0, 10);
      const releaseDeadline = new Date(seasonFrom);
      releaseDeadline.setDate(releaseDeadline.getDate() - season.releaseDays);
      if (bookingDate > releaseDeadline) {
        const hasNightsInSeason = nightBreakdown.some(
          (n) => n.seasonId === season.id,
        );
        if (hasNightsInSeason) {
          warnings.push(
            `Season "${formatSeasonLabel(season.dateFrom, season.dateTo)}" has a ${season.releaseDays}-day release; booking deadline was ${releaseDeadline.toISOString().slice(0, 10)}`,
          );
        }
      }
    }
  }
  return warnings;
}

export interface AllotmentRecord {
  seasonId: string | null;
  roomTypeId: string;
  freeSale: boolean;
  totalRooms: number;
  soldRooms: number;
  season: { id: string; dateFrom: Date; dateTo: Date } | null;
  roomType: { id: string; name: string } | null;
}

/**
 * Check allotment availability for a room type across seasons.
 */
export function checkAllotmentAvailability(
  allotments: AllotmentRecord[],
  seasons: SeasonRecord[],
  roomTypeId: string,
  roomTypeName: string,
): string[] {
  const warnings: string[] = [];
  for (const season of seasons) {
    const allotment = allotments.find(
      (a) => a.seasonId === season.id && a.roomTypeId === roomTypeId,
    );
    if (allotment && !allotment.freeSale) {
      const available = allotment.totalRooms - allotment.soldRooms;
      if (available <= 0) {
        warnings.push(
          `No allotment available for ${roomTypeName} in ${formatSeasonLabel(season.dateFrom, season.dateTo)}`,
        );
      }
    }
  }
  return warnings;
}

// ── Unified Stay Simulation ──

export interface NightlyRate {
  date: string;
  seasonId: string | null;
  seasonLabel: string;
  rate: number;
  breakdown: RateBreakdown;
}

export interface StayRateRow {
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  mealBasisId: string;
  mealBasisName: string;
  mealCode: string;
  nightlyRates: NightlyRate[];
  totalRate: number;
  avgPerNight: number;
  totalAfterOffers: number;
}

export interface StaySimulationResult {
  nightBreakdown: NightBreakdown[];
  rateMatrix: StayRateRow[];
  warnings: string[];
}

/**
 * Simulate a full stay: per-night season mapping, rate calculation via
 * the standard rate calculator, and booking-level warning checks.
 *
 * This replaces the simplified inline calculation that was previously in
 * the rate-verification router with the full calculateRate() pipeline
 * (base rates + all supplement types + child charges + offers).
 */
export function simulateStay(
  contract: RateContractData,
  seasons: SeasonRecord[],
  stopSales: StopSaleRecord[],
  allotments: AllotmentRecord[],
  params: {
    checkIn: string;
    checkOut: string;
    adults: number;
    childAges: number[];
    bookingDate: string;
    minimumStay: number | null;
    maximumStay: number | null;
  },
): StaySimulationResult {
  const checkInDate = new Date(params.checkIn);
  const checkOutDate = new Date(params.checkOut);
  const nights = Math.round(
    (checkOutDate.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000),
  );
  const bookingDate = new Date(params.bookingDate);

  const warnings: string[] = [];

  // Check minimum/maximum stay
  if (params.minimumStay && nights < params.minimumStay) {
    warnings.push(
      `Stay of ${nights} nights is below minimum stay of ${params.minimumStay} nights`,
    );
  }
  if (params.maximumStay && nights > params.maximumStay) {
    warnings.push(
      `Stay of ${nights} nights exceeds maximum stay of ${params.maximumStay} nights`,
    );
  }

  // Night-to-season mapping
  const { breakdown: nightBreakdown, warnings: nightWarnings } =
    buildNightBreakdown(checkInDate, nights, seasons);
  warnings.push(...nightWarnings);

  // Release days
  warnings.push(...checkReleaseDays(seasons, nightBreakdown, bookingDate));

  // Stop sales
  warnings.push(...checkStopSales(stopSales, params.checkIn, params.checkOut));

  // Resolve child categories from ages
  const children: { category: string }[] = params.childAges.map((age) => {
    const policy = contract.childPolicies.find(
      (cp) => age >= cp.ageFrom && age <= cp.ageTo,
    );
    return { category: policy?.category ?? (age <= 2 ? "INFANT" : "CHILD") };
  });

  // Build rate matrix: room type × meal basis, with per-night rates
  const rateMatrix: StayRateRow[] = [];

  for (const rt of contract.roomTypes) {
    // Allotment check
    warnings.push(
      ...checkAllotmentAvailability(
        allotments,
        seasons,
        rt.roomTypeId,
        rt.roomType.name,
      ),
    );

    for (const mb of contract.mealBases) {
      const nightlyRates: NightlyRate[] = [];
      let totalRate = 0;

      for (const night of nightBreakdown) {
        if (!night.seasonId) {
          const emptyBreakdown = calculateRate(contract, {
            seasonId: "",
            roomTypeId: rt.roomTypeId,
            mealBasisId: mb.mealBasisId,
            adults: params.adults,
            children,
            extraBed: false,
            nights: 1,
            bookingDate: params.bookingDate,
            checkInDate: night.date,
          });
          nightlyRates.push({
            date: night.date,
            seasonId: null,
            seasonLabel: night.seasonLabel,
            rate: 0,
            breakdown: emptyBreakdown,
          });
          continue;
        }

        const breakdown = calculateRate(contract, {
          seasonId: night.seasonId,
          roomTypeId: rt.roomTypeId,
          mealBasisId: mb.mealBasisId,
          adults: params.adults,
          children,
          extraBed: false,
          nights: 1,
          bookingDate: params.bookingDate,
          checkInDate: night.date,
        });

        const nightRate = breakdown.totalPerNight;
        nightlyRates.push({
          date: night.date,
          seasonId: night.seasonId,
          seasonLabel: night.seasonLabel,
          rate: nightRate,
          breakdown,
        });
        totalRate += nightRate;
      }

      // Compute offer discounts for the full stay using a single calculateRate call
      const primarySeasonId = nightBreakdown.find((n) => n.seasonId)?.seasonId ?? "";
      const fullStayBreakdown = calculateRate(contract, {
        seasonId: primarySeasonId,
        roomTypeId: rt.roomTypeId,
        mealBasisId: mb.mealBasisId,
        adults: params.adults,
        children,
        extraBed: false,
        nights,
        bookingDate: params.bookingDate,
        checkInDate: params.checkIn,
      });

      // Apply the offer discount ratio from the full-stay calculation
      let totalAfterOffers = totalRate;
      if (
        fullStayBreakdown.totalStayBeforeOffers > 0 &&
        fullStayBreakdown.totalStayAfterOffers !== fullStayBreakdown.totalStayBeforeOffers
      ) {
        const discountRatio =
          fullStayBreakdown.totalStayAfterOffers / fullStayBreakdown.totalStayBeforeOffers;
        totalAfterOffers = Math.round(totalRate * discountRatio * 100) / 100;
      }

      rateMatrix.push({
        roomTypeId: rt.roomTypeId,
        roomTypeName: rt.roomType.name,
        roomTypeCode: rt.roomType.code,
        mealBasisId: mb.mealBasisId,
        mealBasisName: mb.mealBasis.name,
        mealCode: mb.mealBasis.mealCode,
        nightlyRates,
        totalRate: Math.round(totalRate * 100) / 100,
        avgPerNight: Math.round((totalRate / (nights || 1)) * 100) / 100,
        totalAfterOffers,
      });
    }
  }

  return { nightBreakdown, rateMatrix, warnings };
}
