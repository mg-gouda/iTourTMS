/**
 * Guest names are captured as first and last name, but bookings taken before
 * the split — and anything imported — only carry a single `name`. Everything
 * that reads a guest goes through here so both shapes behave the same.
 */

export type GuestNameEntry = {
  title?: string;
  /** Legacy single field, still written so older readers keep working. */
  name?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  roomIndex?: number;
  type?: string;
};

export type SplitName = { firstName: string; lastName: string };

/** Splits a legacy "MOHAMED GOUDA" or "GOUDA/MOHAMED" into its two parts. */
export function splitLegacyName(full: string | null | undefined): SplitName {
  const value = (full ?? "").trim();
  if (!value) return { firstName: "", lastName: "" };

  // Airline style puts the family name first
  if (value.includes("/")) {
    const [last, ...rest] = value.split("/");
    return { firstName: rest.join(" ").trim(), lastName: (last ?? "").trim() };
  }

  const parts = value.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! };
}

export function guestParts(guest: GuestNameEntry | null | undefined): SplitName {
  if (!guest) return { firstName: "", lastName: "" };
  if (guest.firstName || guest.lastName) {
    return { firstName: guest.firstName ?? "", lastName: guest.lastName ?? "" };
  }
  return splitLegacyName(guest.name);
}

/** Full name for internal screens and documents. */
export function guestFullName(guest: GuestNameEntry | null | undefined): string {
  const { firstName, lastName } = guestParts(guest);
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

/**
 * What the hotel is told.
 *
 * Normally the hotel only needs the first name. After a rebooking it gets the
 * family name instead, so the reservation reads as a fresh booking rather than
 * matching the one it already holds.
 */
export function guestNameForHotel(
  guest: GuestNameEntry | null | undefined,
  opts: { rebooked?: boolean } = {},
): string {
  const { firstName, lastName } = guestParts(guest);
  const preferred = opts.rebooked ? lastName : firstName;
  // Fall back to the other half rather than showing the hotel a blank line
  return (preferred || lastName || firstName || "").trim();
}
