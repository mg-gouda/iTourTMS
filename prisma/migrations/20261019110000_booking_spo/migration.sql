-- AlterTable
ALTER TABLE "rv_booking" ADD COLUMN     "spoCode" TEXT,
ADD COLUMN     "spoDate" DATE,
ADD COLUMN     "spoFlag" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "rv_booking_document" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rv_booking_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rv_booking_document_bookingId_kind_key" ON "rv_booking_document"("bookingId", "kind");

-- AddForeignKey
ALTER TABLE "rv_booking_document" ADD CONSTRAINT "rv_booking_document_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_document" ADD CONSTRAINT "rv_booking_document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

