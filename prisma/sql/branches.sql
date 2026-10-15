-- Branches: the data-safe part of the migration. Idempotent; run it whole.
--
-- Order on a populated database:
--   1. this file (tables, branch columns filled, then NOT NULL)
--   2. `prisma migrate diff ... --script` for what remains (FKs, indexes)
-- A plain schema diff alone would ADD COLUMN "branchId" NOT NULL and fail on
-- every table that already has rows.

-- ── Tables ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "branch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "name" TEXT NOT NULL,
    "isHq" BOOLEAN NOT NULL DEFAULT false,
    "destinationIds" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_branch" (
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    CONSTRAINT "user_branch_pkey" PRIMARY KEY ("userId","branchId")
);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allBranches" BOOLEAN NOT NULL DEFAULT false;

-- ── Every company gets a head office ────────────────────────────────────────
INSERT INTO branch (id, "companyId", code, name, "isHq", "destinationIds", active, "createdAt", "updatedAt")
SELECT 'br_' || substr(md5(random()::text || c.id), 1, 22), c.id, 'HQ', 'Head Office', true, '{}', true, now(), now()
FROM "Company" c
WHERE NOT EXISTS (SELECT 1 FROM branch b WHERE b."companyId" = c.id AND b."isHq");

-- Staff with no branch yet work at head office. super_admins see all branches
-- regardless; partner logins never touch branch-scoped data.
INSERT INTO user_branch ("userId", "branchId")
SELECT u.id, b.id
FROM "User" u
JOIN branch b ON b."companyId" = u."companyId" AND b."isHq"
WHERE u."tourOperatorId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM user_branch ub WHERE ub."userId" = u.id);

-- ── Branch-owned records: existing rows belong to head office ───────────────
CREATE OR REPLACE FUNCTION pg_temp.own_by_branch(tbl text) RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "branchId" TEXT', tbl);
  EXECUTE format(
    'UPDATE %I t SET "branchId" = b.id FROM branch b
      WHERE b."companyId" = t."companyId" AND b."isHq" AND t."branchId" IS NULL', tbl);
  EXECUTE format('ALTER TABLE %I ALTER COLUMN "branchId" SET NOT NULL', tbl);
END $$ LANGUAGE plpgsql;

-- Traffic
SELECT pg_temp.own_by_branch('tt_traffic_job');
SELECT pg_temp.own_by_branch('tt_vehicle');
SELECT pg_temp.own_by_branch('tt_driver');
SELECT pg_temp.own_by_branch('tt_rep');
SELECT pg_temp.own_by_branch('tt_guest_booking');
SELECT pg_temp.own_by_branch('tt_traffic_flight');
