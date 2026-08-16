/**
 * Adult count implied by a room occupancy, resolved against the room type's
 * own configuration rather than assumed from the label.
 *
 * A hotel's "family" room may seat two adults or four, and some contracts cap
 * a triple at two adults plus a child, so the room type's occupancy table wins
 * where it exists and the label is only the starting guess.
 */

export type RoomOccupancyValue = "SINGLE" | "DOUBLE" | "TRIPLE" | "FAMILY";

export type RoomTypeOccupancyConfig = {
  minAdults?: number | null;
  standardAdults?: number | null;
  maxAdults?: number | null;
  maxOccupancy?: number | null;
  occupancyTable?: { adults: number; children: number; isDefault?: boolean }[];
};

/** What each label means before the room's own configuration is applied. */
const NOMINAL_ADULTS: Record<RoomOccupancyValue, number> = {
  SINGLE: 1,
  DOUBLE: 2,
  TRIPLE: 3,
  FAMILY: 4,
};

export function adultsForOccupancy(
  occupancy: RoomOccupancyValue,
  roomType: RoomTypeOccupancyConfig | null | undefined,
): number {
  // Family rooms vary the most, so prefer what the room type says is standard
  const nominal =
    occupancy === "FAMILY"
      ? (roomType?.standardAdults ?? NOMINAL_ADULTS.FAMILY)
      : NOMINAL_ADULTS[occupancy];

  const table = roomType?.occupancyTable ?? [];
  if (table.length > 0) {
    // Exact match first, then the closest configured setup
    const exact = table.find((row) => row.adults === nominal);
    if (exact) return exact.adults;

    const closest = [...table].sort(
      (a, b) => Math.abs(a.adults - nominal) - Math.abs(b.adults - nominal),
    )[0];
    if (closest) return closest.adults;
  }

  const min = roomType?.minAdults ?? 1;
  const max = roomType?.maxAdults ?? undefined;
  const clamped = Math.max(min, nominal);
  return max && max > 0 ? Math.min(clamped, max) : clamped;
}
