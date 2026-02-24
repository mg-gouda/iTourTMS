-- DropIndex
DROP INDEX "ct_child_policy_hotelId_category_key";

-- DropIndex
DROP INDEX "ct_contract_child_policy_contractId_category_key";

-- DropIndex
DROP INDEX "ct_contract_season_contractId_code_key";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "googlePlacesApiKey" TEXT;

-- CreateTable
CREATE TABLE "ct_market" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "countryIds" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_market" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ct_contract_market_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ct_market_companyId_idx" ON "ct_market"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_market_companyId_code_key" ON "ct_market"("companyId", "code");

-- CreateIndex
CREATE INDEX "ct_contract_market_contractId_idx" ON "ct_contract_market"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_contract_market_contractId_marketId_key" ON "ct_contract_market"("contractId", "marketId");

-- CreateIndex
CREATE INDEX "ct_child_policy_hotelId_category_idx" ON "ct_child_policy"("hotelId", "category");

-- CreateIndex
CREATE INDEX "ct_contract_child_policy_contractId_category_idx" ON "ct_contract_child_policy"("contractId", "category");

-- CreateIndex
CREATE INDEX "ct_contract_season_contractId_code_idx" ON "ct_contract_season"("contractId", "code");

-- AddForeignKey
ALTER TABLE "ct_market" ADD CONSTRAINT "ct_market_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_market" ADD CONSTRAINT "ct_contract_market_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_market" ADD CONSTRAINT "ct_contract_market_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "ct_market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
