-- CreateTable
CREATE TABLE "ct_contract_allotment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "totalRooms" INTEGER NOT NULL,
    "freeSale" BOOLEAN NOT NULL DEFAULT false,
    "soldRooms" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_allotment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_stop_sale" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_stop_sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ct_contract_allotment_contractId_idx" ON "ct_contract_allotment"("contractId");

-- CreateIndex
CREATE INDEX "ct_contract_allotment_seasonId_idx" ON "ct_contract_allotment"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_contract_allotment_contractId_seasonId_roomTypeId_key" ON "ct_contract_allotment"("contractId", "seasonId", "roomTypeId");

-- CreateIndex
CREATE INDEX "ct_contract_stop_sale_contractId_idx" ON "ct_contract_stop_sale"("contractId");

-- CreateIndex
CREATE INDEX "ct_contract_stop_sale_contractId_dateFrom_dateTo_idx" ON "ct_contract_stop_sale"("contractId", "dateFrom", "dateTo");

-- AddForeignKey
ALTER TABLE "ct_contract_allotment" ADD CONSTRAINT "ct_contract_allotment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_allotment" ADD CONSTRAINT "ct_contract_allotment_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "ct_contract_season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_allotment" ADD CONSTRAINT "ct_contract_allotment_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ct_hotel_room_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_stop_sale" ADD CONSTRAINT "ct_contract_stop_sale_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_stop_sale" ADD CONSTRAINT "ct_contract_stop_sale_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ct_hotel_room_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;
