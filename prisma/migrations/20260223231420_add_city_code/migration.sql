-- AlterTable: add code column with default, then backfill existing rows
ALTER TABLE "ct_city" ADD COLUMN "code" TEXT NOT NULL DEFAULT '';

-- Backfill existing rows: generate 3-letter uppercase code from first 3 chars of name
UPDATE "ct_city" SET "code" = UPPER(SUBSTRING("name" FROM 1 FOR 3)) WHERE "code" = '';

-- Drop the default now that existing rows are backfilled
ALTER TABLE "ct_city" ALTER COLUMN "code" DROP DEFAULT;

-- Drop old unique constraint (companyId, destinationId, name)
DROP INDEX IF EXISTS "ct_city_companyId_destinationId_name_key";

-- CreateIndex: new unique constraint (companyId, destinationId, code)
CREATE UNIQUE INDEX "ct_city_companyId_destinationId_code_key" ON "ct_city"("companyId", "destinationId", "code");
