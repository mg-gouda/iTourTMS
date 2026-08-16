/**
 * A stay is at least one night, so departure can never be the arrival day or
 * earlier. Feeding this to a date input's `min` greys out the impossible days
 * in the picker instead of letting an agent choose one and fail on save.
 */
export function minDepartureDate(
  checkIn: string | null | undefined,
  minimumStay = 1,
): string | undefined {
  if (!checkIn) return undefined;
  const arrival = new Date(`${checkIn}T00:00:00Z`);
  if (Number.isNaN(arrival.getTime())) return undefined;
  arrival.setUTCDate(arrival.getUTCDate() + Math.max(1, minimumStay));
  return arrival.toISOString().slice(0, 10);
}

/** Whole nights between two ISO dates. */
export function nightsBetween(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
): number {
  if (!checkIn || !checkOut) return 0;
  const from = new Date(`${checkIn}T00:00:00Z`).getTime();
  const to = new Date(`${checkOut}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

export type MinimumStayRule = {
  nights: number;
  /** Where the rule came from, for the message shown to the agent. */
  source: "season" | "contract" | "default";
  seasonLabel?: string;
};

type SeasonLike = { dateFrom: string | Date; dateTo: string | Date; minimumStay?: number | null };
type ContractLike = { minimumStay?: number | null; seasons?: SeasonLike[] | null } | null | undefined;

/**
 * A season may set its own minimum stay — high season often does — and it wins
 * over the contract's for arrivals inside it.
 */
export function effectiveMinimumStay(
  contract: ContractLike,
  checkIn: string | null | undefined,
): MinimumStayRule {
  if (!contract) return { nights: 1, source: "default" };

  if (checkIn) {
    const arrival = new Date(`${checkIn}T00:00:00Z`).getTime();
    const season = (contract.seasons ?? []).find((s) => {
      const from = new Date(s.dateFrom).getTime();
      const to = new Date(s.dateTo).getTime();
      return arrival >= from && arrival <= to;
    });
    if (season?.minimumStay && season.minimumStay > 1) {
      const label = `${new Date(season.dateFrom).toISOString().slice(0, 10)} → ${new Date(season.dateTo).toISOString().slice(0, 10)}`;
      return { nights: season.minimumStay, source: "season", seasonLabel: label };
    }
  }

  if (contract.minimumStay && contract.minimumStay > 1) {
    return { nights: contract.minimumStay, source: "contract" };
  }
  return { nights: 1, source: "default" };
}

/** True when a departure no longer sits after its arrival. */
export function isDepartureInvalid(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
): boolean {
  if (!checkIn || !checkOut) return false;
  return checkOut <= checkIn; // ISO dates compare correctly as strings
}
