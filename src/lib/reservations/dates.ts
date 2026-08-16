/**
 * A stay is at least one night, so departure can never be the arrival day or
 * earlier. Feeding this to a date input's `min` greys out the impossible days
 * in the picker instead of letting an agent choose one and fail on save.
 */
export function minDepartureDate(checkIn: string | null | undefined): string | undefined {
  if (!checkIn) return undefined;
  const arrival = new Date(`${checkIn}T00:00:00Z`);
  if (Number.isNaN(arrival.getTime())) return undefined;
  arrival.setUTCDate(arrival.getUTCDate() + 1);
  return arrival.toISOString().slice(0, 10);
}

/** True when a departure no longer sits after its arrival. */
export function isDepartureInvalid(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
): boolean {
  if (!checkIn || !checkOut) return false;
  return checkOut <= checkIn; // ISO dates compare correctly as strings
}
