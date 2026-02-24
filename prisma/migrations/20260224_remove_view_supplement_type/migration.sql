-- Delete any existing VIEW supplement records
DELETE FROM "ct_contract_supplement" WHERE "supplementType" = 'VIEW';

-- Remove VIEW from SupplementType enum
ALTER TYPE "SupplementType" RENAME TO "SupplementType_old";
CREATE TYPE "SupplementType" AS ENUM ('ROOM_TYPE', 'MEAL', 'OCCUPANCY', 'CHILD', 'EXTRA_BED');
ALTER TABLE "ct_contract_supplement" ALTER COLUMN "supplementType" TYPE "SupplementType" USING ("supplementType"::text::"SupplementType");
DROP TYPE "SupplementType_old";
