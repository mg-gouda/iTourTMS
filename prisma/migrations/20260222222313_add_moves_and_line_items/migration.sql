-- CreateEnum
CREATE TYPE "MoveType" AS ENUM ('ENTRY', 'OUT_INVOICE', 'OUT_REFUND', 'IN_INVOICE', 'IN_REFUND');

-- CreateEnum
CREATE TYPE "MoveState" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('NOT_PAID', 'IN_PAYMENT', 'PAID', 'PARTIAL', 'REVERSED');

-- CreateEnum
CREATE TYPE "DisplayType" AS ENUM ('PRODUCT', 'TAX', 'ROUNDING', 'PAYMENT_TERM', 'LINE_SECTION', 'LINE_NOTE');

-- CreateTable
CREATE TABLE "fin_move" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT,
    "moveType" "MoveType" NOT NULL DEFAULT 'ENTRY',
    "state" "MoveState" NOT NULL DEFAULT 'DRAFT',
    "paymentState" "PaymentState" NOT NULL DEFAULT 'NOT_PAID',
    "date" DATE NOT NULL,
    "journalId" TEXT NOT NULL,
    "partnerId" TEXT,
    "currencyId" TEXT NOT NULL,
    "companyCurrencyId" TEXT NOT NULL,
    "invoiceDate" DATE,
    "invoiceDateDue" DATE,
    "paymentTermId" TEXT,
    "amountUntaxed" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amountTax" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amountTotal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amountResidual" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "ref" TEXT,
    "narration" TEXT,
    "reversedEntryId" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_move_line_item" (
    "id" TEXT NOT NULL,
    "moveId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "partnerId" TEXT,
    "name" TEXT,
    "displayType" "DisplayType" NOT NULL DEFAULT 'PRODUCT',
    "debit" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "amountCurrency" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "currencyId" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "priceUnit" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxLineId" TEXT,
    "dateMaturity" DATE,
    "sequence" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_move_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MoveLineItemTaxes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MoveLineItemTaxes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "fin_move_companyId_idx" ON "fin_move"("companyId");

-- CreateIndex
CREATE INDEX "fin_move_companyId_moveType_idx" ON "fin_move"("companyId", "moveType");

-- CreateIndex
CREATE INDEX "fin_move_companyId_state_idx" ON "fin_move"("companyId", "state");

-- CreateIndex
CREATE INDEX "fin_move_partnerId_idx" ON "fin_move"("partnerId");

-- CreateIndex
CREATE INDEX "fin_move_journalId_idx" ON "fin_move"("journalId");

-- CreateIndex
CREATE INDEX "fin_move_date_idx" ON "fin_move"("date");

-- CreateIndex
CREATE INDEX "fin_move_line_item_moveId_idx" ON "fin_move_line_item"("moveId");

-- CreateIndex
CREATE INDEX "fin_move_line_item_accountId_idx" ON "fin_move_line_item"("accountId");

-- CreateIndex
CREATE INDEX "fin_move_line_item_displayType_idx" ON "fin_move_line_item"("displayType");

-- CreateIndex
CREATE INDEX "_MoveLineItemTaxes_B_index" ON "_MoveLineItemTaxes"("B");

-- AddForeignKey
ALTER TABLE "fin_move" ADD CONSTRAINT "fin_move_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_move" ADD CONSTRAINT "fin_move_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_move" ADD CONSTRAINT "fin_move_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_move" ADD CONSTRAINT "fin_move_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_move" ADD CONSTRAINT "fin_move_companyCurrencyId_fkey" FOREIGN KEY ("companyCurrencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_move" ADD CONSTRAINT "fin_move_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "PaymentTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_move" ADD CONSTRAINT "fin_move_reversedEntryId_fkey" FOREIGN KEY ("reversedEntryId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_move_line_item" ADD CONSTRAINT "fin_move_line_item_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "fin_move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_move_line_item" ADD CONSTRAINT "fin_move_line_item_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "fin_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_move_line_item" ADD CONSTRAINT "fin_move_line_item_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_move_line_item" ADD CONSTRAINT "fin_move_line_item_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_move_line_item" ADD CONSTRAINT "fin_move_line_item_taxLineId_fkey" FOREIGN KEY ("taxLineId") REFERENCES "Tax"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MoveLineItemTaxes" ADD CONSTRAINT "_MoveLineItemTaxes_A_fkey" FOREIGN KEY ("A") REFERENCES "fin_move_line_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MoveLineItemTaxes" ADD CONSTRAINT "_MoveLineItemTaxes_B_fkey" FOREIGN KEY ("B") REFERENCES "Tax"("id") ON DELETE CASCADE ON UPDATE CASCADE;
