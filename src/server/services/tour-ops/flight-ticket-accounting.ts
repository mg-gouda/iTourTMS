import Decimal from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import type { OpsFlightTxType } from "@prisma/client";

interface FareLine {
  passengerLabel?: string | null;
  classCode?: string | null;
  totalCost: number;
  sellingPrice: number;
}

interface TicketData {
  id: string;
  companyId: string;
  transactionType: OpsFlightTxType;
  vendorId?: string | null;
  customerPartnerId?: string | null;
  issueDate?: Date | null;
  clientName?: string | null;
  ticketNumber?: string | null;
  changeFees?: number | null;
  priceDifference?: number | null;
  cancellationFees?: number | null;
  voidFee?: number | null;
  fareLines: FareLine[];
}

async function getJournalAndCurrency(companyId: string, journalType: "SALE" | "PURCHASE", db: PrismaClient) {
  const [journal, company] = await Promise.all([
    db.journal.findFirst({ where: { companyId, type: journalType } }),
    db.company.findFirst({ where: { id: companyId }, select: { baseCurrencyId: true } }),
  ]);
  if (!journal) throw new Error(`No active ${journalType} journal found for company`);
  if (!company?.baseCurrencyId) throw new Error("Company has no base currency");
  return { journal, currencyId: company.baseCurrencyId };
}

async function getPartnerAccounts(
  partnerId: string | undefined | null,
  type: "receivable" | "payable",
  companyId: string,
  db: PrismaClient,
) {
  const accountType = type === "receivable" ? "ASSET_RECEIVABLE" : "LIABILITY_PAYABLE";
  if (partnerId) {
    const partner = await db.partner.findFirst({
      where: { id: partnerId },
      select: { accountReceivableId: true, accountPayableId: true },
    });
    const specificId = type === "receivable" ? partner?.accountReceivableId : partner?.accountPayableId;
    if (specificId) return specificId;
  }
  const fallback = await db.finAccount.findFirst({
    where: { companyId, accountType, deprecated: false },
    orderBy: { code: "asc" },
  });
  if (!fallback) throw new Error(`No ${accountType} account found`);
  return fallback.id;
}

async function getIncomeExpenseAccount(type: "INCOME" | "EXPENSE", companyId: string, db: PrismaClient) {
  const account = await db.finAccount.findFirst({
    where: { companyId, accountType: type, deprecated: false },
    orderBy: { code: "asc" },
  });
  if (!account) throw new Error(`No ${type} account found`);
  return account.id;
}

// ── Vendor Bill (IN_INVOICE or IN_REFUND) ─────────────────────────────────

async function createVendorMove(ticket: TicketData, db: PrismaClient) {
  if (!ticket.vendorId) return null;

  const { ISSUE, REISSUE, REVALIDATE, VOID } = { ISSUE: "ISSUE", REISSUE: "REISSUE", REVALIDATE: "REVALIDATE", VOID: "VOID" };
  const txType = ticket.transactionType;

  // For VOID: only create if there's a voidFee from vendor
  if (txType === "VOID" && !ticket.voidFee) return null;

  const isRefund = txType === "REFUND";
  const moveType = isRefund ? "IN_REFUND" : "IN_INVOICE";

  const { journal, currencyId } = await getJournalAndCurrency(ticket.companyId, "PURCHASE", db);
  const payableAccId = await getPartnerAccounts(ticket.vendorId, "payable", ticket.companyId, db);
  const expenseAccId = await getIncomeExpenseAccount("EXPENSE", ticket.companyId, db);

  const date = ticket.issueDate ?? new Date();

  const productLines: { name: string; amount: Decimal }[] = [];

  if (txType === "VOID") {
    productLines.push({ name: "Void/Cancellation Fee", amount: new Decimal(ticket.voidFee!) });
  } else {
    for (const fl of ticket.fareLines) {
      const label = [fl.passengerLabel, fl.classCode].filter(Boolean).join(" / ") || "Ticket";
      productLines.push({ name: `Flight Ticket — ${label}`, amount: new Decimal(fl.totalCost) });
    }
    if ((txType === REISSUE || txType === REVALIDATE) && ticket.changeFees) {
      productLines.push({ name: "Change Fees", amount: new Decimal(ticket.changeFees) });
    }
    if ((txType === REISSUE || txType === REVALIDATE) && ticket.priceDifference) {
      productLines.push({ name: "Price Difference", amount: new Decimal(ticket.priceDifference) });
    }
    if (isRefund && ticket.cancellationFees) {
      // Deduct cancellation fees vendor keeps from the credit note
      productLines.push({ name: "Cancellation Fees", amount: new Decimal(-ticket.cancellationFees) });
    }
  }

  const gross = productLines.reduce((s, l) => s.plus(l.amount), new Decimal(0)).abs();
  const netLines = productLines.map((l, i) => ({
    name: l.name,
    accountId: expenseAccId,
    sequence: (i + 1) * 10,
    debit: isRefund ? 0 : l.amount.toDecimalPlaces(4).toNumber(),
    credit: isRefund ? l.amount.abs().toDecimalPlaces(4).toNumber() : 0,
    balance: isRefund
      ? l.amount.abs().negated().toDecimalPlaces(4).toNumber()
      : l.amount.toDecimalPlaces(4).toNumber(),
    quantity: 1,
    priceUnit: l.amount.abs().toDecimalPlaces(4).toNumber(),
  }));

  // Payable / receivable counter line
  const counterLine = {
    name: `${isRefund ? "Vendor Credit" : "Vendor Bill"} — ${ticket.clientName ?? ticket.ticketNumber ?? ""}`.trim(),
    accountId: payableAccId,
    sequence: 9999,
    debit: isRefund ? gross.toDecimalPlaces(4).toNumber() : 0,
    credit: isRefund ? 0 : gross.toDecimalPlaces(4).toNumber(),
    balance: isRefund ? gross.toDecimalPlaces(4).toNumber() : gross.negated().toDecimalPlaces(4).toNumber(),
    quantity: 1,
    priceUnit: gross.toDecimalPlaces(4).toNumber(),
  };

  const move = await db.move.create({
    data: {
      companyId: ticket.companyId,
      moveType: moveType as any,
      date,
      journalId: journal.id,
      partnerId: ticket.vendorId,
      currencyId,
      companyCurrencyId: currencyId,
      amountUntaxed: gross.toDecimalPlaces(4).toNumber(),
      amountTotal: gross.toDecimalPlaces(4).toNumber(),
      amountResidual: gross.toDecimalPlaces(4).toNumber(),
      ref: ticket.ticketNumber ?? undefined,
      lineItems: {
        create: [...netLines, counterLine].map((l) => ({
          accountId: l.accountId,
          name: l.name,
          debit: l.debit,
          credit: l.credit,
          balance: l.balance,
          quantity: l.quantity,
          priceUnit: l.priceUnit,
          sequence: l.sequence,
        })),
      },
    },
  });

  return move.id;
}

// ── Customer Invoice (OUT_INVOICE or OUT_REFUND) ──────────────────────────

async function createCustomerMove(ticket: TicketData, db: PrismaClient) {
  if (!ticket.customerPartnerId) return null;

  const txType = ticket.transactionType;
  const { REISSUE, REVALIDATE } = { REISSUE: "REISSUE", REVALIDATE: "REVALIDATE" };

  const isRefund = txType === "REFUND";
  const moveType = isRefund ? "OUT_REFUND" : "OUT_INVOICE";

  const { journal, currencyId } = await getJournalAndCurrency(ticket.companyId, "SALE", db);
  const receivableAccId = await getPartnerAccounts(ticket.customerPartnerId, "receivable", ticket.companyId, db);
  const incomeAccId = await getIncomeExpenseAccount("INCOME", ticket.companyId, db);

  const date = ticket.issueDate ?? new Date();

  const productLines: { name: string; amount: Decimal }[] = [];

  if (txType === "VOID") {
    if (!ticket.voidFee) return null;
    productLines.push({ name: "Void Admin Fee", amount: new Decimal(ticket.voidFee) });
  } else {
    for (const fl of ticket.fareLines) {
      const label = [fl.passengerLabel, fl.classCode].filter(Boolean).join(" / ") || "Ticket";
      productLines.push({ name: `Flight Ticket — ${label}`, amount: new Decimal(fl.sellingPrice) });
    }
    if ((txType === REISSUE || txType === REVALIDATE) && ticket.changeFees) {
      productLines.push({ name: "Change Fees", amount: new Decimal(ticket.changeFees) });
    }
    if ((txType === REISSUE || txType === REVALIDATE) && ticket.priceDifference) {
      productLines.push({ name: "Price Difference", amount: new Decimal(ticket.priceDifference) });
    }
    if (isRefund && ticket.cancellationFees) {
      productLines.push({ name: "Cancellation Fees (retained)", amount: new Decimal(-ticket.cancellationFees) });
    }
  }

  const gross = productLines.reduce((s, l) => s.plus(l.amount), new Decimal(0)).abs();
  const netLines = productLines.map((l, i) => ({
    name: l.name,
    accountId: incomeAccId,
    sequence: (i + 1) * 10,
    debit: isRefund ? l.amount.abs().toDecimalPlaces(4).toNumber() : 0,
    credit: isRefund ? 0 : l.amount.toDecimalPlaces(4).toNumber(),
    balance: isRefund
      ? l.amount.abs().negated().toDecimalPlaces(4).toNumber()
      : l.amount.toDecimalPlaces(4).toNumber(),
    quantity: 1,
    priceUnit: l.amount.abs().toDecimalPlaces(4).toNumber(),
  }));

  const counterLine = {
    name: `${isRefund ? "Customer Credit Note" : "Customer Invoice"} — ${ticket.clientName ?? ""}`.trim(),
    accountId: receivableAccId,
    sequence: 9999,
    debit: isRefund ? 0 : gross.toDecimalPlaces(4).toNumber(),
    credit: isRefund ? gross.toDecimalPlaces(4).toNumber() : 0,
    balance: isRefund ? gross.negated().toDecimalPlaces(4).toNumber() : gross.toDecimalPlaces(4).toNumber(),
    quantity: 1,
    priceUnit: gross.toDecimalPlaces(4).toNumber(),
  };

  const move = await db.move.create({
    data: {
      companyId: ticket.companyId,
      moveType: moveType as any,
      date,
      journalId: journal.id,
      partnerId: ticket.customerPartnerId,
      currencyId,
      companyCurrencyId: currencyId,
      amountUntaxed: gross.toDecimalPlaces(4).toNumber(),
      amountTotal: gross.toDecimalPlaces(4).toNumber(),
      amountResidual: gross.toDecimalPlaces(4).toNumber(),
      ref: ticket.ticketNumber ?? undefined,
      lineItems: {
        create: [...netLines, counterLine].map((l) => ({
          accountId: l.accountId,
          name: l.name,
          debit: l.debit,
          credit: l.credit,
          balance: l.balance,
          quantity: l.quantity,
          priceUnit: l.priceUnit,
          sequence: l.sequence,
        })),
      },
    },
  });

  return move.id;
}

export async function createFlightTicketAccountingMoves(ticket: TicketData, db: PrismaClient) {
  if (!ticket.fareLines.length && ticket.transactionType !== "VOID") return;
  const [vendorMoveId, customerMoveId] = await Promise.all([
    createVendorMove(ticket, db).catch(() => null),
    createCustomerMove(ticket, db).catch(() => null),
  ]);
  if (vendorMoveId || customerMoveId) {
    await db.opsFlightTicket.update({
      where: { id: ticket.id },
      data: {
        vendorMoveId: vendorMoveId ?? undefined,
        customerMoveId: customerMoveId ?? undefined,
      },
    });
  }
}
