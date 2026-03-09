import { db } from "@/server/db";
import Decimal from "decimal.js";

interface CancellationResult {
  penaltyAmount: number;
  penaltyPercent: number;
  chargeType: string;
  chargeValue: number;
  daysBefore: number;
  description: string | null;
  waived: boolean;
}

/**
 * Calculate cancellation penalty for a booking.
 * Looks at ContractCancellationPolicy tiers for the contract,
 * finds which tier applies based on days between now and checkIn,
 * and computes the penalty.
 *
 * ChargeType can be: PERCENTAGE, FIXED, FIRST_NIGHT
 * - PERCENTAGE: chargeValue% of sellingTotal
 * - FIXED: flat chargeValue amount
 * - FIRST_NIGHT: first night's rate (sellingTotal / nights)
 */
export async function calculateCancellationPenalty(
  bookingId: string,
): Promise<CancellationResult> {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: {
      id: true,
      contractId: true,
      checkIn: true,
      nights: true,
      sellingTotal: true,
      buyingTotal: true,
    },
  });

  if (!booking.contractId) {
    return { penaltyAmount: 0, penaltyPercent: 0, chargeType: "NONE", chargeValue: 0, daysBefore: 0, description: "No contract - no penalty policy", waived: false };
  }

  const policies = await db.contractCancellationPolicy.findMany({
    where: { contractId: booking.contractId },
    orderBy: { daysBefore: "desc" },
  });

  if (policies.length === 0) {
    return { penaltyAmount: 0, penaltyPercent: 0, chargeType: "NONE", chargeValue: 0, daysBefore: 0, description: "No cancellation policy defined", waived: false };
  }

  const now = new Date();
  const checkIn = new Date(booking.checkIn);
  const diffMs = checkIn.getTime() - now.getTime();
  const daysBefore = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Find the applicable tier (first policy where daysBefore >= policy.daysBefore)
  const applicablePolicy = policies.find((p) => daysBefore >= p.daysBefore)
    ?? policies[policies.length - 1]; // Fallback to strictest if past all tiers

  const sellingTotal = new Decimal(booking.sellingTotal);
  const nights = booking.nights ?? 1;
  const chargeValue = new Decimal(applicablePolicy.chargeValue);
  let penaltyAmount = new Decimal(0);

  switch (applicablePolicy.chargeType) {
    case "PERCENTAGE":
      penaltyAmount = sellingTotal.mul(chargeValue).div(100);
      break;
    case "FIXED":
      penaltyAmount = chargeValue;
      break;
    case "FIRST_NIGHT":
      penaltyAmount = sellingTotal.div(nights);
      break;
    default:
      penaltyAmount = new Decimal(0);
  }

  return {
    penaltyAmount: penaltyAmount.toDecimalPlaces(4).toNumber(),
    penaltyPercent: applicablePolicy.chargeType === "PERCENTAGE" ? chargeValue.toNumber() : penaltyAmount.div(sellingTotal.isZero() ? 1 : sellingTotal).mul(100).toDecimalPlaces(2).toNumber(),
    chargeType: applicablePolicy.chargeType,
    chargeValue: chargeValue.toNumber(),
    daysBefore,
    description: applicablePolicy.description,
    waived: false,
  };
}
