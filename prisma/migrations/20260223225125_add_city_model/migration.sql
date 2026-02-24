-- AlterTable
ALTER TABLE "ct_hotel" ADD COLUMN     "cityId" TEXT;

-- CreateTable
CREATE TABLE "ct_city" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_city_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ct_city_companyId_idx" ON "ct_city"("companyId");

-- CreateIndex
CREATE INDEX "ct_city_destinationId_idx" ON "ct_city"("destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_city_companyId_destinationId_name_key" ON "ct_city"("companyId", "destinationId", "name");

-- CreateIndex
CREATE INDEX "ct_hotel_cityId_idx" ON "ct_hotel"("cityId");

-- AddForeignKey
ALTER TABLE "ct_city" ADD CONSTRAINT "ct_city_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_city" ADD CONSTRAINT "ct_city_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "ct_destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel" ADD CONSTRAINT "ct_hotel_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "ct_city"("id") ON DELETE SET NULL ON UPDATE CASCADE;
