import type { PrismaClient } from "@prisma/client";

/**
 * CRM Booking Engine — business logic for excursion bookings.
 * Extracted from inline router logic for maintainability.
 */

/** Valid status transitions for CRM bookings */
export const CRM_BOOKING_TRANSITIONS: Record<string, Record<string, string>> = {
  DRAFT: { confirm: "CONFIRMED", cancel: "CANCELLED" },
  CONFIRMED: { complete: "COMPLETED", cancel: "CANCELLED" },
  CANCELLED: { reopen: "DRAFT" },
  COMPLETED: {},
  NO_SHOW: {},
};

/**
 * Validate a status transition and return the new status.
 * Throws if the transition is not allowed.
 */
export function validateTransition(currentStatus: string, action: string): string {
  const allowed = CRM_BOOKING_TRANSITIONS[currentStatus];
  if (!allowed || !allowed[action]) {
    throw new Error(`Cannot ${action} a ${currentStatus} booking`);
  }
  return allowed[action];
}

/**
 * Recalculate a customer's lifetime value based on confirmed/completed bookings.
 */
export async function recalcCustomerLifetimeValue(
  db: PrismaClient,
  customerId: string | null,
): Promise<void> {
  if (!customerId) return;
  const agg = await db.crmBooking.aggregate({
    where: { customerId, status: { in: ["CONFIRMED", "COMPLETED"] } },
    _sum: { totalSelling: true },
  });
  await db.crmCustomer.update({
    where: { id: customerId },
    data: { lifetimeValue: agg._sum.totalSelling ?? 0 },
  });
}

/**
 * Calculate total cost and selling price for a booking based on its items.
 */
export function calculateBookingTotals(
  items: Array<{ totalCost: number; totalPrice: number }>,
): { totalCost: number; totalSelling: number; margin: number } {
  const totalCost = items.reduce((sum, item) => sum + Number(item.totalCost), 0);
  const totalSelling = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  return {
    totalCost,
    totalSelling,
    margin: totalSelling - totalCost,
  };
}

/**
 * Generate the next booking code using the Sequence model.
 */
export async function generateBookingCode(
  db: PrismaClient,
  companyId: string,
): Promise<string> {
  const seq = await db.sequence.upsert({
    where: { companyId_code: { companyId, code: "crm_booking" } },
    create: {
      companyId,
      code: "crm_booking",
      prefix: "BK",
      separator: "-",
      padding: 5,
      nextNumber: 2,
    },
    update: { nextNumber: { increment: 1 } },
  });
  const num = seq.nextNumber - 1;
  return `${seq.prefix}${seq.separator}${String(num).padStart(seq.padding, "0")}`;
}
