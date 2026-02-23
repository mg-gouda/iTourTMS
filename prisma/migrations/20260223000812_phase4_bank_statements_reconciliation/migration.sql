-- CreateEnum
CREATE TYPE "BankStatementState" AS ENUM ('DRAFT', 'VALIDATED');

-- AlterTable
ALTER TABLE "fin_payment" ADD COLUMN     "batchPaymentId" TEXT;

-- CreateTable
CREATE TABLE "fin_bank_statement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT,
    "journalId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dateFrom" DATE,
    "dateTo" DATE,
    "balanceStart" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "balanceEnd" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "balanceEndReal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "state" "BankStatementState" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_bank_statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_bank_statement_line" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 10,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "ref" TEXT,
    "partnerId" TEXT,
    "amount" DECIMAL(12,4) NOT NULL,
    "moveLineId" TEXT,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_bank_statement_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_batch_payment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT,
    "journalId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "state" "MoveState" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "paymentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_batch_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fin_bank_statement_companyId_idx" ON "fin_bank_statement"("companyId");

-- CreateIndex
CREATE INDEX "fin_bank_statement_companyId_journalId_idx" ON "fin_bank_statement"("companyId", "journalId");

-- CreateIndex
CREATE INDEX "fin_bank_statement_date_idx" ON "fin_bank_statement"("date");

-- CreateIndex
CREATE UNIQUE INDEX "fin_bank_statement_line_moveLineId_key" ON "fin_bank_statement_line"("moveLineId");

-- CreateIndex
CREATE INDEX "fin_bank_statement_line_statementId_idx" ON "fin_bank_statement_line"("statementId");

-- CreateIndex
CREATE INDEX "fin_bank_statement_line_isReconciled_idx" ON "fin_bank_statement_line"("isReconciled");

-- CreateIndex
CREATE INDEX "fin_batch_payment_companyId_idx" ON "fin_batch_payment"("companyId");

-- CreateIndex
CREATE INDEX "fin_batch_payment_companyId_state_idx" ON "fin_batch_payment"("companyId", "state");

-- CreateIndex
CREATE INDEX "fin_payment_batchPaymentId_idx" ON "fin_payment"("batchPaymentId");

-- AddForeignKey
ALTER TABLE "fin_payment" ADD CONSTRAINT "fin_payment_batchPaymentId_fkey" FOREIGN KEY ("batchPaymentId") REFERENCES "fin_batch_payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_bank_statement" ADD CONSTRAINT "fin_bank_statement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_bank_statement" ADD CONSTRAINT "fin_bank_statement_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_bank_statement_line" ADD CONSTRAINT "fin_bank_statement_line_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "fin_bank_statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_bank_statement_line" ADD CONSTRAINT "fin_bank_statement_line_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_bank_statement_line" ADD CONSTRAINT "fin_bank_statement_line_moveLineId_fkey" FOREIGN KEY ("moveLineId") REFERENCES "fin_move_line_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_batch_payment" ADD CONSTRAINT "fin_batch_payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_batch_payment" ADD CONSTRAINT "fin_batch_payment_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
