-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RecurringState" AS ENUM ('ACTIVE', 'PAUSED', 'DONE');

-- CreateEnum
CREATE TYPE "BudgetState" AS ENUM ('DRAFT', 'APPROVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "fin_recurring_entry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "partnerId" TEXT,
    "currencyId" TEXT NOT NULL,
    "ref" TEXT,
    "frequency" "RecurringFrequency" NOT NULL DEFAULT 'MONTHLY',
    "state" "RecurringState" NOT NULL DEFAULT 'ACTIVE',
    "nextRunDate" DATE NOT NULL,
    "endDate" DATE,
    "lastRunDate" DATE,
    "totalGenerated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_recurring_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_recurring_entry_line" (
    "id" TEXT NOT NULL,
    "recurringEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "partnerId" TEXT,
    "name" TEXT,
    "debit" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "sequence" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "fin_recurring_entry_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_budget" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "state" "BudgetState" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_budget_line" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount01" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amount02" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amount03" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amount04" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amount05" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amount06" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amount07" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amount08" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amount09" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amount10" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amount11" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amount12" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "annualAmount" DECIMAL(12,4) NOT NULL DEFAULT 0,

    CONSTRAINT "fin_budget_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fin_recurring_entry_companyId_idx" ON "fin_recurring_entry"("companyId");

-- CreateIndex
CREATE INDEX "fin_recurring_entry_companyId_state_idx" ON "fin_recurring_entry"("companyId", "state");

-- CreateIndex
CREATE INDEX "fin_recurring_entry_nextRunDate_idx" ON "fin_recurring_entry"("nextRunDate");

-- CreateIndex
CREATE INDEX "fin_recurring_entry_line_recurringEntryId_idx" ON "fin_recurring_entry_line"("recurringEntryId");

-- CreateIndex
CREATE INDEX "fin_budget_companyId_idx" ON "fin_budget"("companyId");

-- CreateIndex
CREATE INDEX "fin_budget_companyId_fiscalYearId_idx" ON "fin_budget"("companyId", "fiscalYearId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_budget_name_companyId_key" ON "fin_budget"("name", "companyId");

-- CreateIndex
CREATE INDEX "fin_budget_line_budgetId_idx" ON "fin_budget_line"("budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_budget_line_budgetId_accountId_key" ON "fin_budget_line"("budgetId", "accountId");

-- AddForeignKey
ALTER TABLE "fin_recurring_entry" ADD CONSTRAINT "fin_recurring_entry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_recurring_entry" ADD CONSTRAINT "fin_recurring_entry_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_recurring_entry" ADD CONSTRAINT "fin_recurring_entry_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_recurring_entry_line" ADD CONSTRAINT "fin_recurring_entry_line_recurringEntryId_fkey" FOREIGN KEY ("recurringEntryId") REFERENCES "fin_recurring_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_recurring_entry_line" ADD CONSTRAINT "fin_recurring_entry_line_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "fin_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_budget" ADD CONSTRAINT "fin_budget_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_budget" ADD CONSTRAINT "fin_budget_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "fin_fiscal_year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_budget_line" ADD CONSTRAINT "fin_budget_line_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "fin_budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_budget_line" ADD CONSTRAINT "fin_budget_line_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "fin_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
