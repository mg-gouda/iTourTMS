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
