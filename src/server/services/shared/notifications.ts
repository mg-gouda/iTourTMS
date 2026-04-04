import type { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

interface CreateNotificationInput {
  companyId: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  bookingId?: string;
}

/**
 * Creates an in-app notification for a user.
 */
export async function createNotification(
  db: PrismaClient,
  input: CreateNotificationInput,
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        companyId: input.companyId,
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        bookingId: input.bookingId ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, input }, "Failed to create notification");
  }
}

/**
 * Notify all users in a company with a specific role.
 */
export async function notifyRole(
  db: PrismaClient,
  companyId: string,
  roleName: string,
  notification: Omit<CreateNotificationInput, "companyId" | "recipientId">,
): Promise<void> {
  try {
    const usersWithRole = await db.userRole.findMany({
      where: {
        role: { companyId, name: roleName },
      },
      select: { userId: true },
    });

    for (const ur of usersWithRole) {
      await createNotification(db, {
        companyId,
        recipientId: ur.userId,
        ...notification,
      });
    }
  } catch (err) {
    logger.error({ err, roleName }, "Failed to notify role");
  }
}

/**
 * Notify the booking creator about a status change.
 */
export async function notifyBookingStatusChange(
  db: PrismaClient,
  companyId: string,
  bookingId: string,
  bookingCode: string,
  newStatus: string,
  actorId: string,
): Promise<void> {
  // Find the booking creator
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { createdById: true },
  });

  if (!booking?.createdById || booking.createdById === actorId) return;

  await createNotification(db, {
    companyId,
    recipientId: booking.createdById,
    type: "BOOKING_STATUS_CHANGE",
    title: `Booking ${bookingCode} — ${newStatus}`,
    message: `Booking ${bookingCode} has been updated to ${newStatus}.`,
    link: `/reservations/bookings/${bookingId}`,
    bookingId,
  });
}
