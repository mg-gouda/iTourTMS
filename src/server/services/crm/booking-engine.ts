import { db } from "@/server/db";

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
 *
 * Customers are shared across branches, so this sums every branch's bookings
 * on the unscoped client — a branch-scoped sum would overwrite the total with
 * one branch's share.
 */
export async function recalcCustomerLifetimeValue(customerId: string | null): Promise<void> {
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

