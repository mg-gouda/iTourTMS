/**
 * Payment Engine Service
 *
 * Builds journal entry lines for payments, computes exchange differences,
 * and manages move payment state updates from reconciliation records.
 */

import Decimal from "decimal.js";
import type { PrismaClient } from "@prisma/client";

import type { ComputedLine } from "./move-engine";

// ── Types ──

export interface PaymentInput {
  paymentType: "INBOUND" | "OUTBOUND";
  amount: Decimal;
  partnerId?: string | null;
  currencyId: string;
}

// ── Core Functions ──

/**
 * Build journal entry lines for a payment.
 *
 * INBOUND (customer payment): debit bank/cash, credit receivable
 * OUTBOUND (vendor payment): debit payable, credit bank/cash
 */
export function buildPaymentMoveLines(
  payment: PaymentInput,
  receivableAccountId: string,
  bankAccountId: string,
): ComputedLine[] {
  const amount = payment.amount.toDecimalPlaces(4);
  const isInbound = payment.paymentType === "INBOUND";

  const bankLine: ComputedLine = {
    accountId: bankAccountId,
    partnerId: payment.partnerId,
    name: isInbound ? "Customer Payment" : "Vendor Payment",
    displayType: "PRODUCT",
    debit: isInbound ? amount : new Decimal(0),
    credit: isInbound ? new Decimal(0) : amount,
    balance: isInbound ? amount : amount.neg(),
    amountCurrency: amount,
    quantity: new Decimal(1),
    priceUnit: amount,
    discount: new Decimal(0),
    taxIds: [],
    sequence: 10,
  };

  const counterpartLine: ComputedLine = {
    accountId: receivableAccountId,
    partnerId: payment.partnerId,
    name: isInbound ? "Customer Payment" : "Vendor Payment",
    displayType: "PAYMENT_TERM",
    debit: isInbound ? new Decimal(0) : amount,
    credit: isInbound ? amount : new Decimal(0),
    balance: isInbound ? amount.neg() : amount,
    amountCurrency: amount,
    quantity: new Decimal(1),
    priceUnit: amount,
    discount: new Decimal(0),
    taxIds: [],
    sequence: 20,
  };

  return [bankLine, counterpartLine];
}

/**
 * Compute the exchange rate difference between an invoice amount
 * and a payment amount, both expressed in company currency.
 *
 * Positive = exchange gain, Negative = exchange loss.
 */
export function computeExchangeDifference(
  invoiceAmountCompany: Decimal | number,
  paymentAmountCompany: Decimal | number,
): Decimal {
  const invoiceAmt = new Decimal(invoiceAmountCompany);
  const paymentAmt = new Decimal(paymentAmountCompany);
  return paymentAmt.minus(invoiceAmt).toDecimalPlaces(4);
}

/**
 * Build journal entry lines for an exchange gain/loss auto-entry.
 *
 * If difference > 0 (gain): debit receivable, credit gain account
 * If difference < 0 (loss): debit loss account, credit receivable
 */
export function buildExchangeMoveLines(
  difference: Decimal,
  gainAccountId: string,
  lossAccountId: string,
  receivableAccountId: string,
  partnerId?: string | null,
): ComputedLine[] {
  const absDiff = difference.abs().toDecimalPlaces(4);
  const isGain = difference.greaterThan(0);

  const receivableLine: ComputedLine = {
    accountId: receivableAccountId,
    partnerId,
    name: isGain ? "Exchange Rate Gain" : "Exchange Rate Loss",
    displayType: "PRODUCT",
    debit: isGain ? absDiff : new Decimal(0),
    credit: isGain ? new Decimal(0) : absDiff,
    balance: isGain ? absDiff : absDiff.neg(),
    amountCurrency: new Decimal(0), // FX entries have 0 in transaction currency
    quantity: new Decimal(1),
    priceUnit: absDiff,
    discount: new Decimal(0),
    taxIds: [],
    sequence: 10,
  };

  const fxLine: ComputedLine = {
    accountId: isGain ? gainAccountId : lossAccountId,
    partnerId,
    name: isGain ? "Exchange Rate Gain" : "Exchange Rate Loss",
    displayType: "PRODUCT",
    debit: isGain ? new Decimal(0) : absDiff,
    credit: isGain ? absDiff : new Decimal(0),
    balance: isGain ? absDiff.neg() : absDiff,
    amountCurrency: new Decimal(0),
    quantity: new Decimal(1),
    priceUnit: absDiff,
    discount: new Decimal(0),
    taxIds: [],
    sequence: 20,
  };

  return [receivableLine, fxLine];
}

/**
 * Recalculate the payment state and residual amount for a move
 * based on its PartialReconcile records.
 *
 * Looks at all PAYMENT_TERM lines and checks how much has been reconciled.
 */
export async function updateMovePaymentState(
  db: PrismaClient,
  moveId: string,
): Promise<void> {
  const move = await db.move.findUniqueOrThrow({
    where: { id: moveId },
    select: {
      id: true,
      amountTotal: true,
      moveType: true,
      lineItems: {
        where: { displayType: "PAYMENT_TERM" },
        select: {
          id: true,
          debit: true,
          credit: true,
          debitReconciles: { select: { amount: true } },
          creditReconciles: { select: { amount: true } },
        },
      },
    },
  });

  const amountTotal = new Decimal(move.amountTotal.toString());

  // Sum all reconciled amounts across payment term lines
  let totalReconciled = new Decimal(0);
  for (const line of move.lineItems) {
    for (const rec of line.debitReconciles) {
      totalReconciled = totalReconciled.plus(new Decimal(rec.amount.toString()));
    }
    for (const rec of line.creditReconciles) {
      totalReconciled = totalReconciled.plus(new Decimal(rec.amount.toString()));
    }
  }

  const amountResidual = amountTotal.minus(totalReconciled).toDecimalPlaces(4);
  const isZero = amountResidual.abs().lessThanOrEqualTo(new Decimal("0.01"));

  let paymentState: "NOT_PAID" | "PARTIAL" | "PAID";
  if (isZero) {
    paymentState = "PAID";
  } else if (totalReconciled.greaterThan(0)) {
    paymentState = "PARTIAL";
  } else {
    paymentState = "NOT_PAID";
  }

  await db.move.update({
    where: { id: moveId },
    data: {
      amountResidual: amountResidual.lessThan(0) ? new Decimal(0) : amountResidual,
      paymentState,
    },
  });
}
