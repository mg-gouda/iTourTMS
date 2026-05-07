import type { PrismaClient } from "@prisma/client";
import type { Decimal } from "decimal.js";
import { generateSequenceNumber } from "@/server/services/finance/sequence-generator";

/**
 * Recalculates and updates the payment status on a booking
 * based on total payments recorded vs selling total.
 */
export async function updateBookingPaymentStatus(
  db: PrismaClient,
  bookingId: string,
): Promise<void> {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: { sellingTotal: true },
  });

  const payments = await db.bookingPayment.findMany({
    where: { bookingId },
    select: { amount: true, isRefund: true },
  });

  let totalPaid = 0;
  for (const p of payments) {
    const amt = Number(p.amount);
    totalPaid += p.isRefund ? -amt : amt;
  }

  const sellingTotal = Number(booking.sellingTotal);
  const balanceDue = Math.max(0, Math.round((sellingTotal - totalPaid) * 100) / 100);

  let paymentStatus: "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED";
  if (totalPaid <= 0 && payments.some((p) => p.isRefund)) {
    paymentStatus = "REFUNDED";
  } else if (totalPaid <= 0) {
    paymentStatus = "UNPAID";
  } else if (totalPaid >= sellingTotal) {
    paymentStatus = "PAID";
  } else {
    paymentStatus = "PARTIAL";
  }

  await db.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus,
      totalPaid: Math.round(totalPaid * 100) / 100,
      balanceDue,
    },
  });
}

/**
 * Creates a finance Move (invoice) and Payment linked to a booking payment.
 * Returns the created finMoveId and finPaymentId.
 */
export async function createFinanceRecords(
  db: PrismaClient,
  companyId: string,
  bookingPayment: {
    id: string;
    bookingId: string;
    amount: Decimal;
    currencyId: string;
    method: string;
    paidAt: Date;
    isRefund: boolean;
  },
  journalId: string,
  partnerId: string | null,
  userId: string,
): Promise<{ finMoveId: string; finPaymentId: string }> {
  // Determine move type: selling invoice (OUT_INVOICE) or refund (OUT_REFUND)
  const moveType = bookingPayment.isRefund ? "OUT_REFUND" : "OUT_INVOICE";
  const seqCode = moveType === "OUT_INVOICE" ? "out_invoice" : "out_refund";

  // Generate sequence number
  const moveName = await generateSequenceNumber(db, companyId, seqCode);

  // Find receivable account for move line
  const receivableAccount = await db.finAccount.findFirst({
    where: { companyId, accountType: "ASSET_RECEIVABLE" },
    select: { id: true },
  });

  if (!receivableAccount) {
    throw new Error("No receivable account configured. Please set up chart of accounts.");
  }

  // Create the Move (journal entry)
  const move = await db.move.create({
    data: {
      companyId,
      name: moveName,
      moveType,
      state: "POSTED",
      journalId,
      partnerId,
      currencyId: bookingPayment.currencyId,
      companyCurrencyId: bookingPayment.currencyId,
      date: bookingPayment.paidAt,
      ref: `Booking payment: ${bookingPayment.bookingId}`,
      lineItems: {
        create: [
          {
            name: `Booking Payment`,
            accountId: receivableAccount.id,
            partnerId,
            currencyId: bookingPayment.currencyId,
            debit: bookingPayment.isRefund ? Number(bookingPayment.amount) : 0,
            credit: bookingPayment.isRefund ? 0 : Number(bookingPayment.amount),
            amountCurrency: Number(bookingPayment.amount),
          },
        ],
      },
    },
  });

  // Create the Payment record
  const paymentName = await generateSequenceNumber(
    db,
    companyId,
    bookingPayment.isRefund ? "out_refund" : "inbound_payment",
  ).catch(() => `PAY-${Date.now()}`);

  const payment = await db.payment.create({
    data: {
      companyId,
      name: paymentName,
      paymentType: "INBOUND",
      amount: Number(bookingPayment.amount),
      currencyId: bookingPayment.currencyId,
      journalId,
      partnerId,
      date: bookingPayment.paidAt,
      moveId: move.id,
      state: "POSTED",
    },
  });

  // Link back to booking payment
  await db.bookingPayment.update({
    where: { id: bookingPayment.id },
    data: {
      finMoveId: move.id,
      finPaymentId: payment.id,
    },
  });

  return { finMoveId: move.id, finPaymentId: payment.id };
}

/**
 * Creates a Finance IN_REFUND move (vendor refund) representing money
 * the hotel owes us after a penalty-free cancellation with cash payment.
 * Links the move back to the HotelCreditNote record.
 */
export async function createHotelCreditFinanceRecord(
  db: PrismaClient,
  companyId: string,
  creditNote: {
    id: string;
    hotelId: string;
    amount: number;
    currencyId: string;
    code: string;
    sourceBookingCode?: string | null;
  },
): Promise<{ finMoveId: string }> {
  // Auto-select Purchase journal, fall back to General
  const journal = await db.journal.findFirst({
    where: { companyId, type: "PURCHASE" },
    select: { id: true },
  }) ?? await db.journal.findFirst({
    where: { companyId, type: "GENERAL" },
    select: { id: true },
  });

  if (!journal) {
    throw new Error("No Purchase or General journal found. Please set up journals in Finance configuration.");
  }

  const moveName = await generateSequenceNumber(db, companyId, "in_refund").catch(
    () => `HCN-${Date.now()}`,
  );

  const hotel = await db.hotel.findUniqueOrThrow({
    where: { id: creditNote.hotelId },
    select: { name: true },
  });

  const payableAccount = await db.finAccount.findFirst({
    where: { companyId, accountType: "LIABILITY_PAYABLE" },
    select: { id: true },
  });

  if (!payableAccount) {
    throw new Error("No payable account configured. Please set up chart of accounts.");
  }

  const narration = creditNote.sourceBookingCode
    ? `Hotel credit note ${creditNote.code} — cancelled booking ${creditNote.sourceBookingCode}`
    : `Hotel credit note ${creditNote.code} — ${hotel.name}`;

  const move = await db.move.create({
    data: {
      companyId,
      name: moveName,
      moveType: "IN_REFUND",
      state: "POSTED",
      journalId: journal.id,
      currencyId: creditNote.currencyId,
      companyCurrencyId: creditNote.currencyId,
      date: new Date(),
      ref: creditNote.code,
      narration,
      lineItems: {
        create: [
          {
            name: narration,
            accountId: payableAccount.id,
            currencyId: creditNote.currencyId,
            debit: 0,
            credit: creditNote.amount,
            amountCurrency: creditNote.amount,
          },
        ],
      },
    },
  });

  await db.hotelCreditNote.update({
    where: { id: creditNote.id },
    data: { finMoveId: move.id },
  });

  return { finMoveId: move.id };
}
