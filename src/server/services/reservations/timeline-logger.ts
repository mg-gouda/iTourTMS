import type { PrismaClient } from "@prisma/client";

/**
 * Append an entry to a booking's activity timeline.
 * This is an append-only audit log — entries are never modified or deleted.
 */
export async function logBookingAction(
  db: PrismaClient,
  bookingId: string,
  action: string,
  details: string | null,
  userId: string | null,
): Promise<void> {
  await db.bookingTimeline.create({
    data: {
      bookingId,
      action,
      details,
      userId,
    },
  });
}
