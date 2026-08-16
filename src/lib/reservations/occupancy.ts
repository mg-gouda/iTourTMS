/**
 * Adult count implied by a room occupancy.
 *
 * SGL, DBL and TPL say the adult count outright — a triple is three adults,
 * whatever a room type's imported defaults claim. Family is the open one: how
 * many adults a family room sleeps varies by hotel, so that comes from the
 * room's own configuration.
 */

export type RoomOccupancyValue = "SINGLE" | "DOUBLE" | "TRIPLE" | "FAMILY";

export type RoomTypeOccupancyConfig = {
  minAdults?: number | null;
  standardAdults?: number | null;
  maxAdults?: number | null;
  maxOccupancy?: number | null;
  occupancyTable?: { adults: number; children: number; isDefault?: boolean }[];
};

/** Adults named by the label itself. Family is configuration-driven instead. */
const LABEL_ADULTS: Record<Exclude<RoomOccupancyValue, "FAMILY">, number> = {
  SINGLE: 1,
  DOUBLE: 2,
  TRIPLE: 3,
};

/**
 * The adults a family room is set up for: the widest configured setup wins,
 * then the room's declared maximum, then its standard.
 */
function familyAdults(roomType: RoomTypeOccupancyConfig | null | undefined): number {
  const table = roomType?.occupancyTable ?? [];
  if (table.length > 0) {
    const widest = [...table].sort(
      (a, b) => b.adults + b.children - (a.adults + a.children) || b.adults - a.adults,
    )[0];
    if (widest?.adults) return widest.adults;
  }
  return roomType?.maxAdults ?? roomType?.standardAdults ?? 4;
}

export function adultsForOccupancy(
  occupancy: RoomOccupancyValue,
  roomType: RoomTypeOccupancyConfig | null | undefined,
): number {
  const adults = occupancy === "FAMILY" ? familyAdults(roomType) : LABEL_ADULTS[occupancy];

  // Never drop below the room's own minimum; the label's count is never
  // reduced to fit an imported maximum, since the agent picked it deliberately.
  const min = roomType?.minAdults ?? 1;
  return Math.max(min, adults);
}
