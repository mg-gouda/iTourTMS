/**
 * Occupancy forecast by booking pace.
 *
 * From past bookings we learn what share of a stay's room-nights is usually
 * already on the books L days before arrival (the pickup curve). A future
 * date with `otb` rooms booked and L days to go is then expected to finish
 * at otb / curve[L]. No history → no pickup assumed.
 */

const DAY = 86_400_000;

export const daysBetween = (from: Date, to: Date) => Math.round((Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) - Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())) / DAY);

/** curve[L] = share of room-nights booked at least L days before arrival; curve[0] = 1. */
export function pickupCurve(history: { leadDays: number; roomNights: number }[], maxLead = 365): number[] {
  const total = history.reduce((s, h) => s + h.roomNights, 0);
  if (!total) return [];
  const atLead = new Array<number>(maxLead + 2).fill(0);
  for (const h of history) atLead[Math.min(Math.max(h.leadDays, 0), maxLead + 1)] += h.roomNights;
  // Suffix sums: booked with lead ≥ L.
  const curve = new Array<number>(maxLead + 1);
  let acc = atLead[maxLead + 1];
  for (let l = maxLead; l >= 0; l--) {
    acc += atLead[l];
    curve[l] = acc / total;
  }
  return curve;
}

/** Below this share the curve is too thin to divide by; we trust the books instead. */
const MIN_SHARE = 0.15;

export function forecastFinal(otb: number, leadDays: number, curve: number[]): number {
  if (!curve.length || leadDays <= 0) return otb;
  const share = curve[Math.min(leadDays, curve.length - 1)];
  return share >= MIN_SHARE ? otb / share : otb;
}

/** Rooms per stay date from bookings: each night in [checkIn, checkOut) inside the window. */
export function roomsByDate(
  bookings: { checkIn: Date; checkOut: Date; rooms: number }[],
  from: Date,
  days: number,
): number[] {
  const out = new Array<number>(days).fill(0);
  for (const b of bookings) {
    const start = Math.max(0, daysBetween(from, b.checkIn));
    const end = Math.min(days, daysBetween(from, b.checkOut));
    for (let d = start; d < end; d++) out[d] += b.rooms;
  }
  return out;
}
