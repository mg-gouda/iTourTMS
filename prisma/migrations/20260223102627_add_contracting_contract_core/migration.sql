-- CreateEnum
CREATE TYPE "RateBasis" AS ENUM ('PER_PERSON', 'PER_ROOM');

-- CreateTable
CREATE TABLE "ct_contract" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "hotelId" TEXT NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE NOT NULL,
    "rateBasis" "RateBasis" NOT NULL,
    "baseCurrencyId" TEXT NOT NULL,
    "baseRoomTypeId" TEXT NOT NULL,
    "baseMealBasisId" TEXT NOT NULL,
    "minimumStay" INTEGER NOT NULL DEFAULT 1,
    "maximumStay" INTEGER,
    "terms" TEXT,
    "internalNotes" TEXT,
    "hotelNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "postedById" TEXT,
    "postedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_season" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "releaseDays" INTEGER NOT NULL DEFAULT 21,
    "minimumStay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_room_type" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ct_contract_room_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_meal_basis" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "mealBasisId" TEXT NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ct_contract_meal_basis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_base_rate" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rate" DECIMAL(12,4) NOT NULL,
    "singleRate" DECIMAL(12,4),
    "doubleRate" DECIMAL(12,4),
    "tripleRate" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_base_rate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ct_contract_companyId_idx" ON "ct_contract"("companyId");

-- CreateIndex
CREATE INDEX "ct_contract_hotelId_idx" ON "ct_contract"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_contract_companyId_code_key" ON "ct_contract"("companyId", "code");

-- CreateIndex
CREATE INDEX "ct_contract_season_contractId_idx" ON "ct_contract_season"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_contract_season_contractId_code_key" ON "ct_contract_season"("contractId", "code");

-- CreateIndex
CREATE INDEX "ct_contract_room_type_contractId_idx" ON "ct_contract_room_type"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_contract_room_type_contractId_roomTypeId_key" ON "ct_contract_room_type"("contractId", "roomTypeId");

-- CreateIndex
CREATE INDEX "ct_contract_meal_basis_contractId_idx" ON "ct_contract_meal_basis"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_contract_meal_basis_contractId_mealBasisId_key" ON "ct_contract_meal_basis"("contractId", "mealBasisId");

-- CreateIndex
CREATE INDEX "ct_contract_base_rate_contractId_idx" ON "ct_contract_base_rate"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_contract_base_rate_contractId_seasonId_key" ON "ct_contract_base_rate"("contractId", "seasonId");

-- AddForeignKey
ALTER TABLE "ct_contract" ADD CONSTRAINT "ct_contract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract" ADD CONSTRAINT "ct_contract_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract" ADD CONSTRAINT "ct_contract_baseCurrencyId_fkey" FOREIGN KEY ("baseCurrencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract" ADD CONSTRAINT "ct_contract_baseRoomTypeId_fkey" FOREIGN KEY ("baseRoomTypeId") REFERENCES "ct_hotel_room_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract" ADD CONSTRAINT "ct_contract_baseMealBasisId_fkey" FOREIGN KEY ("baseMealBasisId") REFERENCES "ct_hotel_meal_basis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract" ADD CONSTRAINT "ct_contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract" ADD CONSTRAINT "ct_contract_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract" ADD CONSTRAINT "ct_contract_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_season" ADD CONSTRAINT "ct_contract_season_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_room_type" ADD CONSTRAINT "ct_contract_room_type_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_room_type" ADD CONSTRAINT "ct_contract_room_type_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ct_hotel_room_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_meal_basis" ADD CONSTRAINT "ct_contract_meal_basis_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_meal_basis" ADD CONSTRAINT "ct_contract_meal_basis_mealBasisId_fkey" FOREIGN KEY ("mealBasisId") REFERENCES "ct_hotel_meal_basis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_base_rate" ADD CONSTRAINT "ct_contract_base_rate_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_base_rate" ADD CONSTRAINT "ct_contract_base_rate_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "ct_contract_season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
