-- CreateTable
CREATE TABLE "ct_contract_cancellation_policy" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "chargeType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "chargeValue" DECIMAL(12,4) NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_cancellation_policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ct_contract_cancellation_policy_contractId_idx" ON "ct_contract_cancellation_policy"("contractId");

-- AddForeignKey
ALTER TABLE "ct_contract_cancellation_policy" ADD CONSTRAINT "ct_contract_cancellation_policy_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
