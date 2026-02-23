import Decimal from "decimal.js";

import { computeTaxes, type TaxDetail } from "./tax-computation";
import { computePaymentTermDueDates } from "./payment-term-calculator";

// ── Types ──

export interface LineInput {
  accountId: string;
  partnerId?: string | null;
  name?: string | null;
  displayType: string;
  debit: number;
  credit: number;
  quantity: number;
  priceUnit: number;
  discount: number;
  taxIds: string[];
  dateMaturity?: Date | null;
  sequence: number;
}

export interface TaxInput {
  id: string;
  name: string;
  amountType: string;
  amount: Decimal | number;
  priceInclude: boolean;
  includeBaseAmount: boolean;
  taxGroupId: string | null;
  sequence: number;
}

export interface TaxWithRepartition extends TaxInput {
  repartitionLines: {
    factorPercent: Decimal | number;
    accountId: string | null;
    documentType: string;
  }[];
}

export interface PaymentTermLineInput {
  valueType: string;
  valueAmount: number | Decimal;
  nbDays: number;
  delayType: string;
  sequence: number;
}

export interface ComputedLine {
  accountId: string;
  partnerId?: string | null;
  name?: string | null;
  displayType: string;
  debit: Decimal;
  credit: Decimal;
  balance: Decimal;
  amountCurrency: Decimal;
  quantity: Decimal;
  priceUnit: Decimal;
  discount: Decimal;
  taxLineId?: string | null;
  taxIds: string[];
  dateMaturity?: Date | null;
  sequence: number;
}

export interface MoveTotals {
  amountUntaxed: Decimal;
  amountTax: Decimal;
  amountTotal: Decimal;
}

// ── Core Functions ──

/**
 * Sum PRODUCT lines → amountUntaxed, TAX lines → amountTax, compute total.
 */
export function computeMoveTotals(lines: ComputedLine[]): MoveTotals {
  let amountUntaxed = new Decimal(0);
  let amountTax = new Decimal(0);

  for (const line of lines) {
    if (line.displayType === "PRODUCT") {
      amountUntaxed = amountUntaxed.plus(line.credit.minus(line.debit).abs());
    } else if (line.displayType === "TAX") {
      amountTax = amountTax.plus(line.credit.minus(line.debit).abs());
    }
  }

  return {
    amountUntaxed: amountUntaxed.toDecimalPlaces(4),
    amountTax: amountTax.toDecimalPlaces(4),
    amountTotal: amountUntaxed.plus(amountTax).toDecimalPlaces(4),
  };
}

/**
 * Validate that sum(debit) === sum(credit) for double-entry balance.
 */
export function validateBalance(lines: ComputedLine[]): void {
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  for (const line of lines) {
    totalDebit = totalDebit.plus(line.debit);
    totalCredit = totalCredit.plus(line.credit);
  }

  const diff = totalDebit.minus(totalCredit).abs();
  if (diff.greaterThan(new Decimal("0.01"))) {
    throw new Error(
      `Journal entry is unbalanced: debit=${totalDebit.toFixed(4)}, credit=${totalCredit.toFixed(4)}, difference=${diff.toFixed(4)}`,
    );
  }
}

/**
 * From product lines, generate the full set of journal items for an invoice:
 * - Product lines with correct debit/credit direction
 * - Tax lines computed via computeTaxes() with accounts from repartition lines
 * - Payment term line(s) (receivable/payable) with dateMaturity
 */
export function computeInvoiceLines(
  productLines: LineInput[],
  taxes: TaxWithRepartition[],
  moveType: string,
  receivableAccountId: string,
  paymentTermLines: PaymentTermLineInput[] | null,
  invoiceDate: Date,
  partnerId?: string | null,
): ComputedLine[] {
  const isOutbound = moveType === "OUT_INVOICE" || moveType === "OUT_REFUND";
  const isRefund = moveType === "OUT_REFUND" || moveType === "IN_REFUND";
  const docType = isRefund ? "REFUND" : "INVOICE";

  const result: ComputedLine[] = [];
  let seq = 10;

  let totalUntaxed = new Decimal(0);
  const taxAccumulator: Map<string, { taxDetail: TaxDetail; tax: TaxWithRepartition }> = new Map();

  // 1. Process product lines
  for (const line of productLines) {
    if (line.displayType !== "PRODUCT") {
      // Pass through section/note lines as-is
      result.push({
        accountId: line.accountId,
        partnerId: line.partnerId,
        name: line.name,
        displayType: line.displayType,
        debit: new Decimal(0),
        credit: new Decimal(0),
        balance: new Decimal(0),
        amountCurrency: new Decimal(0),
        quantity: new Decimal(line.quantity),
        priceUnit: new Decimal(0),
        discount: new Decimal(0),
        taxIds: [],
        sequence: seq,
      });
      seq += 10;
      continue;
    }

    const qty = new Decimal(line.quantity);
    const price = new Decimal(line.priceUnit);
    const disc = new Decimal(line.discount);
    const discountedPrice = price.times(new Decimal(1).minus(disc.div(100)));
    const subtotal = qty.times(discountedPrice).toDecimalPlaces(4);

    // Determine debit/credit based on move type
    let debit: Decimal;
    let credit: Decimal;

    if (isOutbound) {
      // OUT_INVOICE: credit revenue, OUT_REFUND: debit revenue
      debit = isRefund ? subtotal : new Decimal(0);
      credit = isRefund ? new Decimal(0) : subtotal;
    } else {
      // IN_INVOICE: debit expense, IN_REFUND: credit expense
      debit = isRefund ? new Decimal(0) : subtotal;
      credit = isRefund ? subtotal : new Decimal(0);
    }

    result.push({
      accountId: line.accountId,
      partnerId: line.partnerId ?? partnerId,
      name: line.name,
      displayType: "PRODUCT",
      debit: debit.toDecimalPlaces(4),
      credit: credit.toDecimalPlaces(4),
      balance: debit.minus(credit).toDecimalPlaces(4),
      amountCurrency: subtotal.toDecimalPlaces(4),
      quantity: qty,
      priceUnit: price,
      discount: disc,
      taxIds: line.taxIds,
      sequence: seq,
    });
    seq += 10;

    totalUntaxed = totalUntaxed.plus(subtotal);

    // Compute taxes for this line
    if (line.taxIds.length > 0) {
      const lineTaxes = taxes.filter((t) => line.taxIds.includes(t.id));
      if (lineTaxes.length > 0) {
        const taxResult = computeTaxes(discountedPrice, lineTaxes, line.quantity);
        for (const td of taxResult.taxes) {
          const existing = taxAccumulator.get(td.taxId);
          if (existing) {
            existing.taxDetail = {
              ...existing.taxDetail,
              amount: existing.taxDetail.amount.plus(td.amount),
              base: existing.taxDetail.base.plus(td.base),
            };
          } else {
            const fullTax = taxes.find((t) => t.id === td.taxId);
            if (fullTax) {
              taxAccumulator.set(td.taxId, { taxDetail: { ...td }, tax: fullTax });
            }
          }
        }
      }
    }
  }

  // 2. Generate tax lines
  let totalTax = new Decimal(0);
  for (const [taxId, { taxDetail, tax }] of taxAccumulator) {
    const repartLine = tax.repartitionLines.find((r) => r.documentType === docType);
    const taxAccountId = repartLine?.accountId;
    if (!taxAccountId) continue;

    const taxAmount = taxDetail.amount.toDecimalPlaces(4);
    totalTax = totalTax.plus(taxAmount);

    let debit: Decimal;
    let credit: Decimal;

    if (isOutbound) {
      debit = isRefund ? taxAmount : new Decimal(0);
      credit = isRefund ? new Decimal(0) : taxAmount;
    } else {
      debit = isRefund ? new Decimal(0) : taxAmount;
      credit = isRefund ? taxAmount : new Decimal(0);
    }

    result.push({
      accountId: taxAccountId,
      partnerId,
      name: taxDetail.taxName,
      displayType: "TAX",
      debit: debit.toDecimalPlaces(4),
      credit: credit.toDecimalPlaces(4),
      balance: debit.minus(credit).toDecimalPlaces(4),
      amountCurrency: taxAmount,
      quantity: new Decimal(1),
      priceUnit: taxAmount,
      discount: new Decimal(0),
      taxLineId: taxId,
      taxIds: [],
      sequence: seq,
    });
    seq += 10;
  }

  // 3. Generate payment term / receivable / payable line(s)
  const totalAmount = totalUntaxed.plus(totalTax);

  if (paymentTermLines && paymentTermLines.length > 0) {
    const installments = computePaymentTermDueDates(totalAmount, invoiceDate, paymentTermLines);

    for (const inst of installments) {
      let debit: Decimal;
      let credit: Decimal;

      if (isOutbound) {
        // Receivable: debit for invoice, credit for refund
        debit = isRefund ? new Decimal(0) : inst.amount;
        credit = isRefund ? inst.amount : new Decimal(0);
      } else {
        // Payable: credit for bill, debit for refund
        debit = isRefund ? inst.amount : new Decimal(0);
        credit = isRefund ? new Decimal(0) : inst.amount;
      }

      result.push({
        accountId: receivableAccountId,
        partnerId,
        name: inst.label,
        displayType: "PAYMENT_TERM",
        debit: debit.toDecimalPlaces(4),
        credit: credit.toDecimalPlaces(4),
        balance: debit.minus(credit).toDecimalPlaces(4),
        amountCurrency: inst.amount.toDecimalPlaces(4),
        quantity: new Decimal(1),
        priceUnit: inst.amount.toDecimalPlaces(4),
        discount: new Decimal(0),
        taxIds: [],
        dateMaturity: inst.dueDate,
        sequence: seq,
      });
      seq += 10;
    }
  } else {
    // No payment terms — single receivable/payable line
    let debit: Decimal;
    let credit: Decimal;

    if (isOutbound) {
      debit = isRefund ? new Decimal(0) : totalAmount;
      credit = isRefund ? totalAmount : new Decimal(0);
    } else {
      debit = isRefund ? totalAmount : new Decimal(0);
      credit = isRefund ? new Decimal(0) : totalAmount;
    }

    result.push({
      accountId: receivableAccountId,
      partnerId,
      name: null,
      displayType: "PAYMENT_TERM",
      debit: debit.toDecimalPlaces(4),
      credit: credit.toDecimalPlaces(4),
      balance: debit.minus(credit).toDecimalPlaces(4),
      amountCurrency: totalAmount.toDecimalPlaces(4),
      quantity: new Decimal(1),
      priceUnit: totalAmount.toDecimalPlaces(4),
      discount: new Decimal(0),
      taxIds: [],
      dateMaturity: invoiceDate,
      sequence: seq,
    });
  }

  return result;
}

/**
 * Apply FX conversion to computed lines.
 * Scales debit/credit/balance to base currency using the exchange rate.
 * amountCurrency remains in the transaction (foreign) currency.
 * When rate=1, returns lines unchanged (no-op for same-currency).
 */
export function applyFxToLines(
  lines: ComputedLine[],
  rate: Decimal,
): ComputedLine[] {
  if (rate.equals(1)) return lines;
  return lines.map((line) => ({
    ...line,
    debit: line.debit.times(rate).toDecimalPlaces(4),
    credit: line.credit.times(rate).toDecimalPlaces(4),
    balance: line.debit.times(rate).minus(line.credit.times(rate)).toDecimalPlaces(4),
    // amountCurrency stays in foreign currency — intentionally not scaled
  }));
}

/**
 * Build reversal move data by flipping all debit↔credit.
 */
export function buildReversalLines(
  originalLines: {
    accountId: string;
    partnerId?: string | null;
    name?: string | null;
    displayType: string;
    debit: Decimal | number;
    credit: Decimal | number;
    quantity: Decimal | number;
    priceUnit: Decimal | number;
    discount: Decimal | number;
    taxLineId?: string | null;
    taxIds: string[];
    dateMaturity?: Date | null;
    sequence: number;
  }[],
): ComputedLine[] {
  return originalLines.map((line) => {
    const origDebit = new Decimal(line.debit);
    const origCredit = new Decimal(line.credit);

    return {
      accountId: line.accountId,
      partnerId: line.partnerId,
      name: line.name,
      displayType: line.displayType,
      debit: origCredit, // flip
      credit: origDebit, // flip
      balance: origCredit.minus(origDebit),
      amountCurrency: origCredit.minus(origDebit).abs(),
      quantity: new Decimal(line.quantity),
      priceUnit: new Decimal(line.priceUnit),
      discount: new Decimal(line.discount),
      taxLineId: line.taxLineId,
      taxIds: line.taxIds,
      dateMaturity: line.dateMaturity,
      sequence: line.sequence,
    };
  });
}
