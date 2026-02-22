import { addDays, endOfMonth, addMonths } from "date-fns";
import Decimal from "decimal.js";

interface PaymentTermLineInput {
  valueType: string; // BALANCE, PERCENT, FIXED
  valueAmount: number | Decimal;
  nbDays: number;
  delayType: string; // DAYS_AFTER, DAYS_AFTER_END_OF_MONTH, DAYS_AFTER_END_OF_NEXT_MONTH
  sequence: number;
}

export interface InstallmentResult {
  dueDate: Date;
  amount: Decimal;
  label: string;
}

/**
 * Compute installment schedule from payment terms.
 *
 * @param totalAmount - Total invoice amount
 * @param invoiceDate - Invoice date
 * @param lines - Payment term lines sorted by sequence
 */
export function computePaymentTermDueDates(
  totalAmount: number | Decimal,
  invoiceDate: Date,
  lines: PaymentTermLineInput[],
): InstallmentResult[] {
  const total = new Decimal(totalAmount);
  const sortedLines = [...lines].sort((a, b) => a.sequence - b.sequence);

  const installments: InstallmentResult[] = [];
  let remaining = total;

  for (let i = 0; i < sortedLines.length; i++) {
    const line = sortedLines[i];
    let amount: Decimal;

    switch (line.valueType) {
      case "PERCENT":
        amount = total.times(new Decimal(line.valueAmount)).div(100);
        break;
      case "FIXED":
        amount = new Decimal(line.valueAmount);
        break;
      case "BALANCE":
      default:
        // Balance: use whatever is remaining
        amount = remaining;
        break;
    }

    // Ensure we don't exceed remaining
    amount = Decimal.min(amount, remaining).toDecimalPlaces(2);
    remaining = remaining.minus(amount);

    const dueDate = computeDueDate(invoiceDate, line.nbDays, line.delayType);

    installments.push({
      dueDate,
      amount,
      label: `Installment ${i + 1}`,
    });
  }

  return installments;
}

function computeDueDate(invoiceDate: Date, nbDays: number, delayType: string): Date {
  switch (delayType) {
    case "DAYS_AFTER_END_OF_MONTH": {
      const monthEnd = endOfMonth(invoiceDate);
      return addDays(monthEnd, nbDays);
    }
    case "DAYS_AFTER_END_OF_NEXT_MONTH": {
      const nextMonthEnd = endOfMonth(addMonths(invoiceDate, 1));
      return addDays(nextMonthEnd, nbDays);
    }
    case "DAYS_AFTER":
    default:
      return addDays(invoiceDate, nbDays);
  }
}
