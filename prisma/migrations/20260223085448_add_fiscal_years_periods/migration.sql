-- CreateEnum
CREATE TYPE "FiscalYearState" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "FiscalPeriodState" AS ENUM ('OPEN', 'LOCKED', 'CLOSED');

-- CreateTable
CREATE TABLE "fin_fiscal_year" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "state" "FiscalYearState" NOT NULL DEFAULT 'OPEN',
    "closingMoveId" TEXT,
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_fiscal_year_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_fiscal_period" (
    "id" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "state" "FiscalPeriodState" NOT NULL DEFAULT 'OPEN',
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_fiscal_period_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fin_fiscal_year_closingMoveId_key" ON "fin_fiscal_year"("closingMoveId");

-- CreateIndex
CREATE INDEX "fin_fiscal_year_companyId_idx" ON "fin_fiscal_year"("companyId");

-- CreateIndex
CREATE INDEX "fin_fiscal_year_companyId_state_idx" ON "fin_fiscal_year"("companyId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "fin_fiscal_year_companyId_code_key" ON "fin_fiscal_year"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "fin_fiscal_year_companyId_dateFrom_key" ON "fin_fiscal_year"("companyId", "dateFrom");

-- CreateIndex
CREATE INDEX "fin_fiscal_period_fiscalYearId_idx" ON "fin_fiscal_period"("fiscalYearId");

-- CreateIndex
CREATE INDEX "fin_fiscal_period_fiscalYearId_state_idx" ON "fin_fiscal_period"("fiscalYearId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "fin_fiscal_period_fiscalYearId_number_key" ON "fin_fiscal_period"("fiscalYearId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "fin_fiscal_period_fiscalYearId_code_key" ON "fin_fiscal_period"("fiscalYearId", "code");

-- AddForeignKey
ALTER TABLE "fin_fiscal_year" ADD CONSTRAINT "fin_fiscal_year_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fiscal_year" ADD CONSTRAINT "fin_fiscal_year_closingMoveId_fkey" FOREIGN KEY ("closingMoveId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fiscal_year" ADD CONSTRAINT "fin_fiscal_year_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fiscal_period" ADD CONSTRAINT "fin_fiscal_period_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "fin_fiscal_year"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fiscal_period" ADD CONSTRAINT "fin_fiscal_period_lockedBy_fkey" FOREIGN KEY ("lockedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
