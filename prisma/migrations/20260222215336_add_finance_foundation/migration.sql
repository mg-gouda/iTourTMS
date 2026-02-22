-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET_RECEIVABLE', 'ASSET_CASH', 'ASSET_CURRENT', 'ASSET_NON_CURRENT', 'ASSET_PREPAYMENTS', 'ASSET_FIXED', 'LIABILITY_PAYABLE', 'LIABILITY_CREDIT_CARD', 'LIABILITY_CURRENT', 'LIABILITY_NON_CURRENT', 'EQUITY', 'EQUITY_UNAFFECTED', 'INCOME', 'INCOME_OTHER', 'EXPENSE', 'EXPENSE_DEPRECIATION', 'EXPENSE_DIRECT_COST', 'OFF_BALANCE');

-- CreateEnum
CREATE TYPE "JournalType" AS ENUM ('SALE', 'PURCHASE', 'CASH', 'BANK', 'CREDIT_CARD', 'GENERAL');

-- CreateEnum
CREATE TYPE "TaxUse" AS ENUM ('SALE', 'PURCHASE', 'NONE');

-- CreateEnum
CREATE TYPE "TaxAmountType" AS ENUM ('PERCENT', 'FIXED', 'GROUP', 'DIVISION');

-- CreateEnum
CREATE TYPE "TaxScope" AS ENUM ('SERVICE', 'PRODUCT');

-- CreateEnum
CREATE TYPE "TaxDocType" AS ENUM ('INVOICE', 'REFUND');

-- CreateEnum
CREATE TYPE "TermValueType" AS ENUM ('BALANCE', 'PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "DelayType" AS ENUM ('DAYS_AFTER', 'DAYS_AFTER_END_OF_MONTH', 'DAYS_AFTER_END_OF_NEXT_MONTH');

-- CreateTable
CREATE TABLE "AccountGroup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "codePrefixStart" TEXT NOT NULL,
    "codePrefixEnd" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AccountTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_account" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "reconcile" BOOLEAN NOT NULL DEFAULT false,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "groupId" TEXT,
    "currencyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "JournalType" NOT NULL,
    "defaultAccountId" TEXT,
    "suspenseAccountId" TEXT,
    "profitAccountId" TEXT,
    "lossAccountId" TEXT,
    "currencyId" TEXT,
    "sequencePrefix" TEXT,
    "sequenceNextNumber" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxGroup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tax" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typeTaxUse" "TaxUse" NOT NULL DEFAULT 'SALE',
    "amountType" "TaxAmountType" NOT NULL DEFAULT 'PERCENT',
    "amount" DECIMAL(12,4) NOT NULL,
    "priceInclude" BOOLEAN NOT NULL DEFAULT false,
    "includeBaseAmount" BOOLEAN NOT NULL DEFAULT false,
    "taxGroupId" TEXT,
    "taxScope" "TaxScope",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sequence" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRepartitionLine" (
    "id" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "factorPercent" DECIMAL(8,4) NOT NULL DEFAULT 100,
    "accountId" TEXT,
    "useInTaxClosing" BOOLEAN NOT NULL DEFAULT true,
    "documentType" "TaxDocType" NOT NULL DEFAULT 'INVOICE',
    "sequence" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "TaxRepartitionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTerm" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "earlyDiscount" BOOLEAN NOT NULL DEFAULT false,
    "discountPercent" DECIMAL(5,2),
    "discountDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTermLine" (
    "id" TEXT NOT NULL,
    "paymentTermId" TEXT NOT NULL,
    "valueType" "TermValueType" NOT NULL DEFAULT 'BALANCE',
    "valueAmount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "nbDays" INTEGER NOT NULL DEFAULT 0,
    "delayType" "DelayType" NOT NULL DEFAULT 'DAYS_AFTER',
    "sequence" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "PaymentTermLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AccountTagToFinAccount" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AccountTagToFinAccount_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AccountDefaultTaxes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AccountDefaultTaxes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "AccountGroup_companyId_idx" ON "AccountGroup"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountGroup_name_companyId_key" ON "AccountGroup"("name", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountTag_name_key" ON "AccountTag"("name");

-- CreateIndex
CREATE INDEX "fin_account_companyId_idx" ON "fin_account"("companyId");

-- CreateIndex
CREATE INDEX "fin_account_companyId_accountType_idx" ON "fin_account"("companyId", "accountType");

-- CreateIndex
CREATE INDEX "fin_account_code_idx" ON "fin_account"("code");

-- CreateIndex
CREATE UNIQUE INDEX "fin_account_code_companyId_key" ON "fin_account"("code", "companyId");

-- CreateIndex
CREATE INDEX "Journal_companyId_idx" ON "Journal"("companyId");

-- CreateIndex
CREATE INDEX "Journal_companyId_type_idx" ON "Journal"("companyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Journal_code_companyId_key" ON "Journal"("code", "companyId");

-- CreateIndex
CREATE INDEX "TaxGroup_companyId_idx" ON "TaxGroup"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxGroup_name_companyId_key" ON "TaxGroup"("name", "companyId");

-- CreateIndex
CREATE INDEX "Tax_companyId_idx" ON "Tax"("companyId");

-- CreateIndex
CREATE INDEX "Tax_companyId_typeTaxUse_idx" ON "Tax"("companyId", "typeTaxUse");

-- CreateIndex
CREATE INDEX "TaxRepartitionLine_taxId_idx" ON "TaxRepartitionLine"("taxId");

-- CreateIndex
CREATE INDEX "PaymentTerm_companyId_idx" ON "PaymentTerm"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerm_name_companyId_key" ON "PaymentTerm"("name", "companyId");

-- CreateIndex
CREATE INDEX "PaymentTermLine_paymentTermId_idx" ON "PaymentTermLine"("paymentTermId");

-- CreateIndex
CREATE INDEX "_AccountTagToFinAccount_B_index" ON "_AccountTagToFinAccount"("B");

-- CreateIndex
CREATE INDEX "_AccountDefaultTaxes_B_index" ON "_AccountDefaultTaxes"("B");

-- AddForeignKey
ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AccountGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account" ADD CONSTRAINT "fin_account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account" ADD CONSTRAINT "fin_account_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AccountGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account" ADD CONSTRAINT "fin_account_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_defaultAccountId_fkey" FOREIGN KEY ("defaultAccountId") REFERENCES "fin_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_suspenseAccountId_fkey" FOREIGN KEY ("suspenseAccountId") REFERENCES "fin_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_profitAccountId_fkey" FOREIGN KEY ("profitAccountId") REFERENCES "fin_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_lossAccountId_fkey" FOREIGN KEY ("lossAccountId") REFERENCES "fin_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGroup" ADD CONSTRAINT "TaxGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tax" ADD CONSTRAINT "Tax_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tax" ADD CONSTRAINT "Tax_taxGroupId_fkey" FOREIGN KEY ("taxGroupId") REFERENCES "TaxGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRepartitionLine" ADD CONSTRAINT "TaxRepartitionLine_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRepartitionLine" ADD CONSTRAINT "TaxRepartitionLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "fin_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTerm" ADD CONSTRAINT "PaymentTerm_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTermLine" ADD CONSTRAINT "PaymentTermLine_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "PaymentTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccountTagToFinAccount" ADD CONSTRAINT "_AccountTagToFinAccount_A_fkey" FOREIGN KEY ("A") REFERENCES "AccountTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccountTagToFinAccount" ADD CONSTRAINT "_AccountTagToFinAccount_B_fkey" FOREIGN KEY ("B") REFERENCES "fin_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccountDefaultTaxes" ADD CONSTRAINT "_AccountDefaultTaxes_A_fkey" FOREIGN KEY ("A") REFERENCES "fin_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccountDefaultTaxes" ADD CONSTRAINT "_AccountDefaultTaxes_B_fkey" FOREIGN KEY ("B") REFERENCES "Tax"("id") ON DELETE CASCADE ON UPDATE CASCADE;
