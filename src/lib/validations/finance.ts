import { z } from "zod";

// ── Account Schemas ──

export const accountSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(256),
  accountType: z.enum([
    "ASSET_RECEIVABLE", "ASSET_CASH", "ASSET_CURRENT", "ASSET_NON_CURRENT",
    "ASSET_PREPAYMENTS", "ASSET_FIXED", "LIABILITY_PAYABLE", "LIABILITY_CREDIT_CARD",
    "LIABILITY_CURRENT", "LIABILITY_NON_CURRENT", "EQUITY", "EQUITY_UNAFFECTED",
    "INCOME", "INCOME_OTHER", "EXPENSE", "EXPENSE_DEPRECIATION",
    "EXPENSE_DIRECT_COST", "OFF_BALANCE",
  ]),
  reconcile: z.boolean().default(false),
  deprecated: z.boolean().default(false),
  groupId: z.string().nullish(),
  currencyId: z.string().nullish(),
  tagIds: z.array(z.string()).default([]),
});

export const accountGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  codePrefixStart: z.string().min(1),
  codePrefixEnd: z.string().min(1),
  parentId: z.string().nullish(),
});

// ── Journal Schemas ──

export const journalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(5),
  type: z.enum(["SALE", "PURCHASE", "CASH", "BANK", "CREDIT_CARD", "GENERAL"]),
  defaultAccountId: z.string().nullish(),
  suspenseAccountId: z.string().nullish(),
  profitAccountId: z.string().nullish(),
  lossAccountId: z.string().nullish(),
  currencyId: z.string().nullish(),
  sequencePrefix: z.string().nullish(),
});

// ── Tax Schemas ──

export const taxRepartitionLineSchema = z.object({
  factorPercent: z.number().min(0).max(100).default(100),
  accountId: z.string().nullish(),
  useInTaxClosing: z.boolean().default(true),
  documentType: z.enum(["INVOICE", "REFUND"]).default("INVOICE"),
  sequence: z.number().int().default(10),
});

export const taxSchema = z.object({
  name: z.string().min(1, "Name is required"),
  typeTaxUse: z.enum(["SALE", "PURCHASE", "NONE"]).default("SALE"),
  amountType: z.enum(["PERCENT", "FIXED", "GROUP", "DIVISION"]).default("PERCENT"),
  amount: z.number(), // the rate or fixed amount
  priceInclude: z.boolean().default(false),
  includeBaseAmount: z.boolean().default(false),
  taxGroupId: z.string().nullish(),
  taxScope: z.enum(["SERVICE", "PRODUCT"]).nullish(),
  isActive: z.boolean().default(true),
  sequence: z.number().int().default(10),
  repartitionLines: z.array(taxRepartitionLineSchema).default([]),
});

export const taxGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sequence: z.number().int().default(10),
});

// ── Payment Term Schemas ──

export const paymentTermLineSchema = z.object({
  valueType: z.enum(["BALANCE", "PERCENT", "FIXED"]).default("BALANCE"),
  valueAmount: z.number().default(0),
  nbDays: z.number().int().min(0).default(0),
  delayType: z.enum([
    "DAYS_AFTER",
    "DAYS_AFTER_END_OF_MONTH",
    "DAYS_AFTER_END_OF_NEXT_MONTH",
  ]).default("DAYS_AFTER"),
  sequence: z.number().int().default(10),
});

export const paymentTermSchema = z.object({
  name: z.string().min(1, "Name is required"),
  note: z.string().nullish(),
  earlyDiscount: z.boolean().default(false),
  discountPercent: z.number().min(0).max(100).nullish(),
  discountDays: z.number().int().min(0).nullish(),
  lines: z.array(paymentTermLineSchema).min(1, "At least one line is required"),
});

// ── Move Schemas ──

export const moveLineItemSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  partnerId: z.string().nullish(),
  name: z.string().nullish(),
  displayType: z.enum(["PRODUCT", "TAX", "ROUNDING", "PAYMENT_TERM", "LINE_SECTION", "LINE_NOTE"]).default("PRODUCT"),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  quantity: z.number().default(1),
  priceUnit: z.number().default(0),
  discount: z.number().min(0).max(100).default(0),
  taxIds: z.array(z.string()).default([]),
  dateMaturity: z.coerce.date().nullish(),
  sequence: z.number().int().default(10),
});

export const moveCreateSchema = z.object({
  moveType: z.enum(["ENTRY", "OUT_INVOICE", "OUT_REFUND", "IN_INVOICE", "IN_REFUND"]),
  date: z.coerce.date(),
  journalId: z.string().min(1, "Journal is required"),
  partnerId: z.string().nullish(),
  currencyId: z.string().min(1, "Currency is required"),
  ref: z.string().nullish(),
  narration: z.string().nullish(),
  invoiceDate: z.coerce.date().nullish(),
  invoiceDateDue: z.coerce.date().nullish(),
  paymentTermId: z.string().nullish(),
  fiscalPositionId: z.string().nullish(),
  lineItems: z.array(moveLineItemSchema).min(1, "At least one line item is required"),
});

export const moveUpdateSchema = moveCreateSchema.partial().extend({
  lineItems: z.array(moveLineItemSchema).min(1, "At least one line item is required").optional(),
});

// ── Fiscal Position Schemas ──

export const fiscalPositionTaxMapSchema = z.object({
  taxSrcId: z.string().min(1, "Source tax is required"),
  taxDestId: z.string().min(1, "Destination tax is required"),
});

export const fiscalPositionAccountMapSchema = z.object({
  accountSrcId: z.string().min(1, "Source account is required"),
  accountDestId: z.string().min(1, "Destination account is required"),
});

export const fiscalPositionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  autoApply: z.boolean().default(false),
  countryId: z.string().nullish(),
  vatRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
  taxMaps: z.array(fiscalPositionTaxMapSchema).default([]),
  accountMaps: z.array(fiscalPositionAccountMapSchema).default([]),
});

// ── Payment Schemas ──

export const paymentCreateSchema = z.object({
  paymentType: z.enum(["INBOUND", "OUTBOUND"]),
  partnerId: z.string().nullish(),
  amount: z.number().positive("Amount must be positive"),
  currencyId: z.string().min(1, "Currency is required"),
  date: z.coerce.date(),
  journalId: z.string().min(1, "Journal is required"),
  ref: z.string().nullish(),
  invoiceMoveIds: z.array(z.string()).default([]),
});

export const registerPaymentSchema = z.object({
  invoiceMoveId: z.string().min(1, "Invoice is required"),
  amount: z.number().positive("Amount must be positive"),
  date: z.coerce.date(),
  journalId: z.string().min(1, "Journal is required"),
  ref: z.string().nullish(),
});

// ── Bank Statement Schemas ──

export const bankStatementLineSchema = z.object({
  date: z.coerce.date(),
  name: z.string().min(1, "Description is required"),
  ref: z.string().nullish(),
  partnerId: z.string().nullish(),
  amount: z.number({ error: "Amount is required" }),
  sequence: z.number().int().default(10),
});

export const bankStatementCreateSchema = z.object({
  journalId: z.string().min(1, "Journal is required"),
  date: z.coerce.date(),
  dateFrom: z.coerce.date().nullish(),
  dateTo: z.coerce.date().nullish(),
  balanceStart: z.number().default(0),
  balanceEnd: z.number().default(0),
  lines: z.array(bankStatementLineSchema).min(1, "At least one line is required"),
});

export const bankStatementUpdateSchema = bankStatementCreateSchema.partial().extend({
  lines: z.array(bankStatementLineSchema).min(1, "At least one line is required").optional(),
});

export const bankStatementImportSchema = z.object({
  journalId: z.string().min(1, "Journal is required"),
  date: z.coerce.date(),
  balanceStart: z.number().default(0),
  csvContent: z.string().min(1, "CSV content is required"),
});

// ── Reconciliation Schemas ──

export const reconcileSchema = z.object({
  bankStatementLineIds: z.array(z.string()).min(1, "Select at least one statement line"),
  moveLineIds: z.array(z.string()).min(1, "Select at least one journal item"),
  writeOffAmount: z.number().default(0),
  writeOffAccountId: z.string().nullish(),
});

export const unreconcileSchema = z.object({
  bankStatementLineIds: z.array(z.string()).min(1, "Select at least one statement line"),
});

// ── Batch Payment Schemas ──

export const batchPaymentCreateSchema = z.object({
  journalId: z.string().min(1, "Journal is required"),
  date: z.coerce.date(),
  paymentType: z.enum(["INBOUND", "OUTBOUND"]),
  invoiceMoveIds: z.array(z.string()).min(1, "Select at least one invoice"),
});

// ── Currency Rate Schemas ──

export const currencyRateUpsertSchema = z.object({
  currencyId: z.string().min(1, "Currency is required"),
  date: z.coerce.date(),
  rate: z.number().positive("Rate must be positive"),
});

// ── Fiscal Year & Period Schemas ──

export const fiscalYearCreateSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    code: z.string().min(1, "Code is required").max(10),
    dateFrom: z.coerce.date(),
    dateTo: z.coerce.date(),
    includePeriod13: z.boolean().default(false),
  })
  .refine((data) => data.dateTo > data.dateFrom, {
    message: "End date must be after start date",
    path: ["dateTo"],
  });

export const fiscalYearCloseSchema = z.object({
  fiscalYearId: z.string().min(1, "Fiscal year is required"),
  retainedEarningsAccountId: z.string().min(1, "Retained earnings account is required"),
  journalId: z.string().min(1, "Closing journal is required"),
  closingDate: z.coerce.date().optional(),
});

export const fiscalPeriodLockSchema = z.object({
  periodId: z.string().min(1, "Period is required"),
});

export const fiscalPeriodUnlockSchema = z.object({
  periodId: z.string().min(1, "Period is required"),
});
