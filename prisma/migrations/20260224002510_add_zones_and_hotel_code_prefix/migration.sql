-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "hotelCodePrefix" TEXT;

-- AlterTable
ALTER TABLE "ct_hotel" ADD COLUMN     "zoneId" TEXT;

-- CreateTable
CREATE TABLE "ct_zone" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ct_zone_companyId_idx" ON "ct_zone"("companyId");

-- CreateIndex
CREATE INDEX "ct_zone_cityId_idx" ON "ct_zone"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_zone_companyId_cityId_code_key" ON "ct_zone"("companyId", "cityId", "code");

-- CreateIndex
CREATE INDEX "ct_hotel_zoneId_idx" ON "ct_hotel"("zoneId");

-- AddForeignKey
ALTER TABLE "ct_zone" ADD CONSTRAINT "ct_zone_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_zone" ADD CONSTRAINT "ct_zone_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "ct_city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel" ADD CONSTRAINT "ct_hotel_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ct_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
