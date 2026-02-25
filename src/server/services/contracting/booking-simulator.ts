/**
 * Booking simulator: season resolution, night breakdown, allotment checking.
 * Extracted from rate-verification router for reuse.
 */

export interface SeasonRecord {
  id: string;
  name: string;
  code: string;
  dateFrom: Date;
  dateTo: Date;
  releaseDays: number | null;
}

export interface NightBreakdown {
  date: string;
  seasonId: string | null;
  seasonName: string;
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
      seasonName: matchingSeason?.name ?? "No Season",
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
            `Season "${season.name}" has a ${season.releaseDays}-day release; booking deadline was ${releaseDeadline.toISOString().slice(0, 10)}`,
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
  season: { id: string; name: string } | null;
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
          `No allotment available for ${roomTypeName} in ${season.name}`,
        );
      }
    }
  }
  return warnings;
}
