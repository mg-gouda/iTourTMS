-- CreateEnum
CREATE TYPE "StarRating" AS ENUM ('ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'FIVE_DELUXE');

-- CreateEnum
CREATE TYPE "MealCode" AS ENUM ('RO', 'BB', 'HB', 'FB', 'AI', 'UAI', 'SC');

-- CreateEnum
CREATE TYPE "ChildAgeCategory" AS ENUM ('INFANT', 'CHILD', 'TEEN');

-- CreateEnum
CREATE TYPE "ChildBedding" AS ENUM ('SHARING_WITH_PARENTS', 'EXTRA_BED', 'OWN_BED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'POSTED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "ct_destination" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_hotel_amenity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_hotel_amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_hotel" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "starRating" "StarRating" NOT NULL DEFAULT 'THREE',
    "chainName" TEXT,
    "description" TEXT,
    "shortDescription" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "stateId" TEXT,
    "countryId" TEXT NOT NULL,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "destinationId" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "email" TEXT,
    "website" TEXT,
    "reservationEmail" TEXT,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "checkInTime" TEXT NOT NULL DEFAULT '14:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '12:00',
    "totalRooms" INTEGER,
    "yearBuilt" INTEGER,
    "yearRenovated" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_hotel_image" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ct_hotel_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_hotel_room_type" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "maxAdults" INTEGER NOT NULL DEFAULT 2,
    "maxChildren" INTEGER NOT NULL DEFAULT 1,
    "maxInfants" INTEGER NOT NULL DEFAULT 1,
    "maxOccupancy" INTEGER NOT NULL DEFAULT 3,
    "extraBedAvailable" BOOLEAN NOT NULL DEFAULT false,
    "maxExtraBeds" INTEGER NOT NULL DEFAULT 0,
    "roomSize" DOUBLE PRECISION,
    "bedConfiguration" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_hotel_room_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_room_type_occupancy" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "infants" INTEGER NOT NULL DEFAULT 0,
    "extraBeds" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ct_room_type_occupancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_child_policy" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "category" "ChildAgeCategory" NOT NULL,
    "ageFrom" INTEGER NOT NULL,
    "ageTo" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "freeInSharing" BOOLEAN NOT NULL DEFAULT false,
    "maxFreePerRoom" INTEGER NOT NULL DEFAULT 0,
    "extraBedAllowed" BOOLEAN NOT NULL DEFAULT true,
    "mealsIncluded" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_child_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_hotel_meal_basis" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "mealCode" "MealCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_hotel_meal_basis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_HotelToHotelAmenity" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_HotelToHotelAmenity_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "ct_destination_companyId_idx" ON "ct_destination"("companyId");

-- CreateIndex
CREATE INDEX "ct_destination_countryId_idx" ON "ct_destination"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_destination_companyId_code_key" ON "ct_destination"("companyId", "code");

-- CreateIndex
CREATE INDEX "ct_hotel_amenity_companyId_idx" ON "ct_hotel_amenity"("companyId");

-- CreateIndex
CREATE INDEX "ct_hotel_companyId_idx" ON "ct_hotel"("companyId");

-- CreateIndex
CREATE INDEX "ct_hotel_countryId_idx" ON "ct_hotel"("countryId");

-- CreateIndex
CREATE INDEX "ct_hotel_destinationId_idx" ON "ct_hotel"("destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_hotel_companyId_code_key" ON "ct_hotel"("companyId", "code");

-- CreateIndex
CREATE INDEX "ct_hotel_image_hotelId_idx" ON "ct_hotel_image"("hotelId");

-- CreateIndex
CREATE INDEX "ct_hotel_room_type_hotelId_idx" ON "ct_hotel_room_type"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_hotel_room_type_hotelId_code_key" ON "ct_hotel_room_type"("hotelId", "code");

-- CreateIndex
CREATE INDEX "ct_room_type_occupancy_roomTypeId_idx" ON "ct_room_type_occupancy"("roomTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_room_type_occupancy_roomTypeId_adults_children_infants_e_key" ON "ct_room_type_occupancy"("roomTypeId", "adults", "children", "infants", "extraBeds");

-- CreateIndex
CREATE INDEX "ct_child_policy_hotelId_idx" ON "ct_child_policy"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_child_policy_hotelId_category_key" ON "ct_child_policy"("hotelId", "category");

-- CreateIndex
CREATE INDEX "ct_hotel_meal_basis_hotelId_idx" ON "ct_hotel_meal_basis"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_hotel_meal_basis_hotelId_mealCode_key" ON "ct_hotel_meal_basis"("hotelId", "mealCode");

-- CreateIndex
CREATE INDEX "_HotelToHotelAmenity_B_index" ON "_HotelToHotelAmenity"("B");

-- AddForeignKey
ALTER TABLE "ct_destination" ADD CONSTRAINT "ct_destination_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_destination" ADD CONSTRAINT "ct_destination_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel_amenity" ADD CONSTRAINT "ct_hotel_amenity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel" ADD CONSTRAINT "ct_hotel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel" ADD CONSTRAINT "ct_hotel_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "CountryState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel" ADD CONSTRAINT "ct_hotel_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel" ADD CONSTRAINT "ct_hotel_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "ct_destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel_image" ADD CONSTRAINT "ct_hotel_image_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel_room_type" ADD CONSTRAINT "ct_hotel_room_type_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_room_type_occupancy" ADD CONSTRAINT "ct_room_type_occupancy_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ct_hotel_room_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_child_policy" ADD CONSTRAINT "ct_child_policy_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel_meal_basis" ADD CONSTRAINT "ct_hotel_meal_basis_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HotelToHotelAmenity" ADD CONSTRAINT "_HotelToHotelAmenity_A_fkey" FOREIGN KEY ("A") REFERENCES "ct_hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HotelToHotelAmenity" ADD CONSTRAINT "_HotelToHotelAmenity_B_fkey" FOREIGN KEY ("B") REFERENCES "ct_hotel_amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
