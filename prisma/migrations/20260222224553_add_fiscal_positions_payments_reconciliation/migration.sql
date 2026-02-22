-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('INBOUND', 'OUTBOUND');

-- AlterTable
ALTER TABLE "fin_move" ADD COLUMN     "fiscalPositionId" TEXT;

-- CreateTable
CREATE TABLE "fin_fiscal_position" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "autoApply" BOOLEAN NOT NULL DEFAULT false,
    "countryId" TEXT,
    "vatRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_fiscal_position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_fiscal_position_tax_map" (
    "id" TEXT NOT NULL,
    "fiscalPositionId" TEXT NOT NULL,
    "taxSrcId" TEXT NOT NULL,
    "taxDestId" TEXT NOT NULL,

    CONSTRAINT "fin_fiscal_position_tax_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_fiscal_position_account_map" (
    "id" TEXT NOT NULL,
    "fiscalPositionId" TEXT NOT NULL,
    "accountSrcId" TEXT NOT NULL,
    "accountDestId" TEXT NOT NULL,

    CONSTRAINT "fin_fiscal_position_account_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_payment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT,
    "paymentType" "PaymentType" NOT NULL,
    "partnerId" TEXT,
    "amount" DECIMAL(12,4) NOT NULL,
    "currencyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "journalId" TEXT NOT NULL,
    "moveId" TEXT,
    "ref" TEXT,
    "state" "MoveState" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_partial_reconcile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "debitMoveLineId" TEXT NOT NULL,
    "creditMoveLineId" TEXT NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "exchangeMoveId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_partial_reconcile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PaymentInvoices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PaymentInvoices_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "fin_fiscal_position_companyId_idx" ON "fin_fiscal_position"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_fiscal_position_name_companyId_key" ON "fin_fiscal_position"("name", "companyId");

-- CreateIndex
CREATE INDEX "fin_fiscal_position_tax_map_fiscalPositionId_idx" ON "fin_fiscal_position_tax_map"("fiscalPositionId");

-- CreateIndex
CREATE INDEX "fin_fiscal_position_account_map_fiscalPositionId_idx" ON "fin_fiscal_position_account_map"("fiscalPositionId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_payment_moveId_key" ON "fin_payment"("moveId");

-- CreateIndex
CREATE INDEX "fin_payment_companyId_idx" ON "fin_payment"("companyId");

-- CreateIndex
CREATE INDEX "fin_payment_companyId_state_idx" ON "fin_payment"("companyId", "state");

-- CreateIndex
CREATE INDEX "fin_payment_partnerId_idx" ON "fin_payment"("partnerId");

-- CreateIndex
CREATE INDEX "fin_partial_reconcile_companyId_idx" ON "fin_partial_reconcile"("companyId");

-- CreateIndex
CREATE INDEX "fin_partial_reconcile_debitMoveLineId_idx" ON "fin_partial_reconcile"("debitMoveLineId");

-- CreateIndex
CREATE INDEX "fin_partial_reconcile_creditMoveLineId_idx" ON "fin_partial_reconcile"("creditMoveLineId");

-- CreateIndex
CREATE INDEX "_PaymentInvoices_B_index" ON "_PaymentInvoices"("B");

-- AddForeignKey
ALTER TABLE "fin_move" ADD CONSTRAINT "fin_move_fiscalPositionId_fkey" FOREIGN KEY ("fiscalPositionId") REFERENCES "fin_fiscal_position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fiscal_position" ADD CONSTRAINT "fin_fiscal_position_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fiscal_position" ADD CONSTRAINT "fin_fiscal_position_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fiscal_position_tax_map" ADD CONSTRAINT "fin_fiscal_position_tax_map_fiscalPositionId_fkey" FOREIGN KEY ("fiscalPositionId") REFERENCES "fin_fiscal_position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fiscal_position_tax_map" ADD CONSTRAINT "fin_fiscal_position_tax_map_taxSrcId_fkey" FOREIGN KEY ("taxSrcId") REFERENCES "Tax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fiscal_position_tax_map" ADD CONSTRAINT "fin_fiscal_position_tax_map_taxDestId_fkey" FOREIGN KEY ("taxDestId") REFERENCES "Tax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fiscal_position_account_map" ADD CONSTRAINT "fin_fiscal_position_account_map_fiscalPositionId_fkey" FOREIGN KEY ("fiscalPositionId") REFERENCES "fin_fiscal_position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fiscal_position_account_map" ADD CONSTRAINT "fin_fiscal_position_account_map_accountSrcId_fkey" FOREIGN KEY ("accountSrcId") REFERENCES "fin_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fiscal_position_account_map" ADD CONSTRAINT "fin_fiscal_position_account_map_accountDestId_fkey" FOREIGN KEY ("accountDestId") REFERENCES "fin_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment" ADD CONSTRAINT "fin_payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment" ADD CONSTRAINT "fin_payment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment" ADD CONSTRAINT "fin_payment_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment" ADD CONSTRAINT "fin_payment_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment" ADD CONSTRAINT "fin_payment_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_partial_reconcile" ADD CONSTRAINT "fin_partial_reconcile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_partial_reconcile" ADD CONSTRAINT "fin_partial_reconcile_debitMoveLineId_fkey" FOREIGN KEY ("debitMoveLineId") REFERENCES "fin_move_line_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_partial_reconcile" ADD CONSTRAINT "fin_partial_reconcile_creditMoveLineId_fkey" FOREIGN KEY ("creditMoveLineId") REFERENCES "fin_move_line_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_partial_reconcile" ADD CONSTRAINT "fin_partial_reconcile_exchangeMoveId_fkey" FOREIGN KEY ("exchangeMoveId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PaymentInvoices" ADD CONSTRAINT "_PaymentInvoices_A_fkey" FOREIGN KEY ("A") REFERENCES "fin_move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PaymentInvoices" ADD CONSTRAINT "_PaymentInvoices_B_fkey" FOREIGN KEY ("B") REFERENCES "fin_payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
