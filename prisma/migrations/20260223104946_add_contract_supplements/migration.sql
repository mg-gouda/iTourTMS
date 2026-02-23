-- CreateEnum
CREATE TYPE "SupplementType" AS ENUM ('ROOM_TYPE', 'MEAL', 'OCCUPANCY', 'CHILD', 'VIEW', 'EXTRA_BED');

-- CreateEnum
CREATE TYPE "SupplementValueType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "ct_contract_supplement" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "supplementType" "SupplementType" NOT NULL,
    "roomTypeId" TEXT,
    "mealBasisId" TEXT,
    "forAdults" INTEGER,
    "forChildCategory" "ChildAgeCategory",
    "forChildBedding" "ChildBedding",
    "valueType" "SupplementValueType" NOT NULL DEFAULT 'FIXED',
    "value" DECIMAL(12,4) NOT NULL,
    "isReduction" BOOLEAN NOT NULL DEFAULT false,
    "perPerson" BOOLEAN NOT NULL DEFAULT true,
    "perNight" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_supplement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ct_contract_supplement_contractId_idx" ON "ct_contract_supplement"("contractId");

-- CreateIndex
CREATE INDEX "ct_contract_supplement_contractId_supplementType_idx" ON "ct_contract_supplement"("contractId", "supplementType");

-- CreateIndex
CREATE INDEX "ct_contract_supplement_seasonId_idx" ON "ct_contract_supplement"("seasonId");

-- AddForeignKey
ALTER TABLE "ct_contract_supplement" ADD CONSTRAINT "ct_contract_supplement_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_supplement" ADD CONSTRAINT "ct_contract_supplement_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "ct_contract_season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_supplement" ADD CONSTRAINT "ct_contract_supplement_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ct_hotel_room_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_supplement" ADD CONSTRAINT "ct_contract_supplement_mealBasisId_fkey" FOREIGN KEY ("mealBasisId") REFERENCES "ct_hotel_meal_basis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
