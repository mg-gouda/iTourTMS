/**
 * Fiscal Position Service
 *
 * Remaps taxes and accounts based on fiscal position rules.
 * Used at invoice creation time to substitute taxes/accounts per jurisdiction.
 */

interface TaxMap {
  taxSrcId: string;
  taxDestId: string;
}

interface AccountMap {
  accountSrcId: string;
  accountDestId: string;
}

interface FiscalPositionData {
  taxMaps: TaxMap[];
  accountMaps: AccountMap[];
}

interface FiscalPositionResult {
  mappedTaxIds: string[];
  mappedAccountId: string;
}

/**
 * Apply fiscal position remapping to a set of tax IDs and an account ID.
 *
 * For each tax in taxIds, if a taxMap entry exists (taxSrcId → taxDestId),
 * the source tax is replaced with the destination tax.
 * Similarly, if an accountMap entry exists for the accountId, it's replaced.
 */
export function applyFiscalPosition(
  fiscalPosition: FiscalPositionData,
  taxIds: string[],
  accountId: string,
): FiscalPositionResult {
  // Remap taxes
  const mappedTaxIds = taxIds.map((taxId) => {
    const mapping = fiscalPosition.taxMaps.find((m) => m.taxSrcId === taxId);
    return mapping ? mapping.taxDestId : taxId;
  });

  // Remap account
  const accountMapping = fiscalPosition.accountMaps.find(
    (m) => m.accountSrcId === accountId,
  );
  const mappedAccountId = accountMapping
    ? accountMapping.accountDestId
    : accountId;

  return { mappedTaxIds, mappedAccountId };
}
