-- Branches backfill. Idempotent: safe to run after every branch schema step.
-- Run after the schema delta, inside the same transaction.

-- Every company gets a head office.
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
