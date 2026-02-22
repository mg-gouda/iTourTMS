import Decimal from "decimal.js";

export interface TaxDetail {
  taxId: string;
  taxName: string;
  taxGroupId: string | null;
  amount: Decimal;
  base: Decimal;
}

export interface TaxComputationResult {
  totalExcluded: Decimal;
  totalIncluded: Decimal;
  totalTax: Decimal;
  taxes: TaxDetail[];
}

interface TaxInput {
  id: string;
  name: string;
  amountType: string;
  amount: Decimal | number;
  priceInclude: boolean;
  includeBaseAmount: boolean;
  taxGroupId: string | null;
  sequence: number;
}

/**
 * Compute taxes on a price.
 *
 * @param price - The unit price (before or after tax depending on priceInclude)
 * @param taxes - Array of tax definitions, sorted by sequence
 * @param quantity - Number of units
 * @param priceInclude - If true, price already includes taxes
 */
export function computeTaxes(
  price: number | Decimal,
  taxes: TaxInput[],
  quantity: number = 1,
  priceInclude?: boolean,
): TaxComputationResult {
  const unitPrice = new Decimal(price);
  const qty = new Decimal(quantity);
  const totalAmount = unitPrice.times(qty);

  // Sort by sequence
  const sortedTaxes = [...taxes].sort((a, b) => a.sequence - b.sequence);

  const taxDetails: TaxDetail[] = [];
  let base = totalAmount;
  let totalTax = new Decimal(0);

  // Determine if we need to extract taxes from price
  const isIncluded = priceInclude ?? sortedTaxes.some((t) => t.priceInclude);

  if (isIncluded) {
    // Extract taxes from the price (price-included mode)
    // First compute the combined factor to extract the base
    let combinedFactor = new Decimal(1);
    for (const tax of sortedTaxes) {
      if (tax.amountType === "PERCENT") {
        combinedFactor = combinedFactor.plus(new Decimal(tax.amount).div(100));
      }
    }

    base = totalAmount.div(combinedFactor);

    // Then compute each tax on the base
    let runningBase = base;
    for (const tax of sortedTaxes) {
      const taxAmount = computeSingleTax(runningBase, tax);
      taxDetails.push({
        taxId: tax.id,
        taxName: tax.name,
        taxGroupId: tax.taxGroupId,
        amount: taxAmount.toDecimalPlaces(2),
        base: runningBase.toDecimalPlaces(2),
      });
      totalTax = totalTax.plus(taxAmount);

      if (tax.includeBaseAmount) {
        runningBase = runningBase.plus(taxAmount);
      }
    }
  } else {
    // Add taxes on top of price (price-excluded mode)
    let runningBase = base;
    for (const tax of sortedTaxes) {
      const taxAmount = computeSingleTax(runningBase, tax);
      taxDetails.push({
        taxId: tax.id,
        taxName: tax.name,
        taxGroupId: tax.taxGroupId,
        amount: taxAmount.toDecimalPlaces(2),
        base: runningBase.toDecimalPlaces(2),
      });
      totalTax = totalTax.plus(taxAmount);

      if (tax.includeBaseAmount) {
        runningBase = runningBase.plus(taxAmount);
      }
    }
  }

  return {
    totalExcluded: base.toDecimalPlaces(2),
    totalIncluded: base.plus(totalTax).toDecimalPlaces(2),
    totalTax: totalTax.toDecimalPlaces(2),
    taxes: taxDetails,
  };
}

function computeSingleTax(base: Decimal, tax: TaxInput): Decimal {
  const rate = new Decimal(tax.amount);

  switch (tax.amountType) {
    case "PERCENT":
      return base.times(rate).div(100);
    case "FIXED":
      return rate;
    case "DIVISION":
      // Division: price / (1 - rate/100) - price
      return base.div(new Decimal(1).minus(rate.div(100))).minus(base);
    default:
      return new Decimal(0);
  }
}
