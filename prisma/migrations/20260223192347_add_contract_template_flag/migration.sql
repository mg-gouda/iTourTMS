-- AlterTable
ALTER TABLE "ct_contract" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ct_contract_companyId_isTemplate_idx" ON "ct_contract"("companyId", "isTemplate");
