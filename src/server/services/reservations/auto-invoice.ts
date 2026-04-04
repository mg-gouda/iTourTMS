import type { PrismaClient } from "@prisma/client";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";
import { logger } from "@/lib/logger";

/**
 * Creates a pro-forma invoice (OUT_INVOICE Move) when a booking is confirmed.
 * Skips if no receivable account or journal is configured.
 */
export async function createBookingInvoice(
  db: PrismaClient,
  companyId: string,
  bookingId: string,
  userId: string,
): Promise<string | null> {
  try {
    const booking = await db.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        tourOperator: { select: { id: true, name: true } },
        hotel: { select: { name: true } },
      },
    });

    // Find sales journal
    const salesJournal = await db.journal.findFirst({
      where: { companyId, type: "SALE" },
      select: { id: true },
    });
    if (!salesJournal) {
      logger.warn({ companyId }, "Auto-invoice skipped: no sales journal configured");
      return null;
    }

    // Find receivable account
    const receivableAccount = await db.finAccount.findFirst({
      where: { companyId, accountType: "ASSET_RECEIVABLE" },
      select: { id: true },
    });
    if (!receivableAccount) {
      logger.warn({ companyId }, "Auto-invoice skipped: no receivable account configured");
      return null;
    }

    // Find income account
    const incomeAccount = await db.finAccount.findFirst({
      where: { companyId, accountType: "INCOME" },
      select: { id: true },
    });
    if (!incomeAccount) {
      logger.warn({ companyId }, "Auto-invoice skipped: no income account configured");
      return null;
    }

    const moveName = await generateSequenceNumber(db, companyId, "out_invoice")
      .catch(() => `INV-${Date.now()}`);

    // TourOperator is not a Partner — invoices are unlinked to partner for now
    const partnerId: string | null = null;
    const amount = Number(booking.sellingTotal);

    const move = await db.move.create({
      data: {
        companyId,
        name: moveName,
        moveType: "OUT_INVOICE",
        state: "POSTED",
        date: new Date(),
        journalId: salesJournal.id,
        partnerId,
        currencyId: booking.currencyId,
        companyCurrencyId: booking.currencyId,
        ref: `Booking ${booking.code} — ${booking.hotel.name}`,
        narration: `Pro-forma invoice for booking ${booking.code}. Guest: ${booking.leadGuestName ?? "N/A"}. Stay: ${booking.checkIn.toISOString().slice(0, 10)} to ${booking.checkOut.toISOString().slice(0, 10)}.`,
        amountUntaxed: amount,
        amountTax: 0,
        amountTotal: amount,
        amountResidual: amount,
        postedAt: new Date(),
        lineItems: {
          create: [
            // Debit: Accounts Receivable
            {
              name: `Booking ${booking.code}`,
              accountId: receivableAccount.id,
              partnerId,
              currencyId: booking.currencyId,
              debit: amount,
              credit: 0,
              amountCurrency: amount,
            },
            // Credit: Income
            {
              name: `Accommodation — ${booking.hotel.name}`,
              accountId: incomeAccount.id,
              partnerId,
              currencyId: booking.currencyId,
              debit: 0,
              credit: amount,
              amountCurrency: amount,
            },
          ],
        },
      },
    });

    logger.info({ bookingId, moveId: move.id, moveName }, "Auto-invoice created for booking");
    return move.id;
  } catch (err) {
    logger.error({ err, bookingId }, "Failed to create auto-invoice for booking");
    return null;
  }
}
