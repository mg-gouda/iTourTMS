-- AlterTable
ALTER TABLE "ct_contract" ADD COLUMN     "parentContractId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "ct_contract_parentContractId_idx" ON "ct_contract"("parentContractId");

-- AddForeignKey
ALTER TABLE "ct_contract" ADD CONSTRAINT "ct_contract_parentContractId_fkey" FOREIGN KEY ("parentContractId") REFERENCES "ct_contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
