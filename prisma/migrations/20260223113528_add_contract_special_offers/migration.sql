-- CreateEnum
CREATE TYPE "offer_type" AS ENUM ('EARLY_BIRD', 'LONG_STAY', 'FREE_NIGHTS', 'HONEYMOON', 'GROUP_DISCOUNT');

-- CreateTable
CREATE TABLE "ct_contract_special_offer" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "offerType" "offer_type" NOT NULL,
    "description" TEXT,
    "validFrom" DATE,
    "validTo" DATE,
    "bookByDate" DATE,
    "minimumNights" INTEGER,
    "minimumRooms" INTEGER,
    "advanceBookDays" INTEGER,
    "discountType" "SupplementValueType" NOT NULL DEFAULT 'FIXED',
    "discountValue" DECIMAL(12,4) NOT NULL,
    "stayNights" INTEGER,
    "payNights" INTEGER,
    "combinable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_special_offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ct_contract_special_offer_contractId_idx" ON "ct_contract_special_offer"("contractId");

-- AddForeignKey
ALTER TABLE "ct_contract_special_offer" ADD CONSTRAINT "ct_contract_special_offer_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
