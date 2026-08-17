-- AccountTag had no companyId and a globally-unique name, so it behaved as a
-- shared table: any tenant could list, rename or delete another tenant's tags.
--
-- A tag may already be attached to accounts in several companies, so it cannot
-- simply be stamped with one companyId. Split each tag into one row per company
-- that actually uses it, repoint the join table, then drop the originals.

ALTER TABLE "AccountTag" ADD COLUMN "companyId" TEXT;

-- Drop the global unique BEFORE the split: the clones deliberately repeat the
-- same name once per company, which the old index forbids.
DROP INDEX IF EXISTS "AccountTag_name_key";

CREATE TEMP TABLE tag_split ON COMMIT DROP AS
SELECT DISTINCT
    t."id"                      AS old_id,
    t."name",
    t."color",
    a."companyId"               AS company_id,
    gen_random_uuid()::text     AS new_id
FROM "AccountTag" t
JOIN "_AccountTagToFinAccount" j ON j."A" = t."id"
JOIN "fin_account" a            ON a."id" = j."B";

INSERT INTO "AccountTag" ("id", "name", "color", "companyId")
SELECT new_id, "name", "color", company_id FROM tag_split;

-- Point each membership at the per-company clone of its tag.
UPDATE "_AccountTagToFinAccount" j
SET "A" = s.new_id
FROM tag_split s, "fin_account" a
WHERE j."A" = s.old_id
  AND j."B" = a."id"
  AND a."companyId" = s.company_id;

-- Everything still null is either an original (now fully superseded) or a tag
-- that was never attached to any account.
DELETE FROM "AccountTag" WHERE "companyId" IS NULL;

ALTER TABLE "AccountTag" ALTER COLUMN "companyId" SET NOT NULL;

CREATE UNIQUE INDEX "AccountTag_companyId_name_key" ON "AccountTag"("companyId", "name");
CREATE INDEX "AccountTag_companyId_idx" ON "AccountTag"("companyId");

ALTER TABLE "AccountTag" ADD CONSTRAINT "AccountTag_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
