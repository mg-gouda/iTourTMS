-- Idempotent. Adds the four permission codes routers check but the catalogue
-- lacked, and grants them to the matching system roles without touching any
-- other role permission (re-running seed-roles.ts would reset custom edits).
INSERT INTO "Permission" (id, code, module, resource, action, "displayName")
VALUES
  ('perm_ct_tariff_manage', 'contracting:tariff:manage', 'contracting', 'tariff', 'manage', 'Generate & Edit Tariffs'),
  ('perm_crm_supplier_del', 'crm:supplier:delete', 'crm', 'supplier', 'delete', 'Delete Suppliers'),
  ('perm_to_pnl_update', 'tour-ops:pnl:update', 'tour-ops', 'pnl', 'update', 'Edit & Close P&L'),
  ('perm_b2c_inquiry_upd', 'b2c-site:inquiry:update', 'b2c-site', 'inquiry', 'update', 'Handle Inquiries')
ON CONFLICT (code) DO NOTHING;

-- Grant to the same system roles prisma/seed-roles.ts gives them, by name.
INSERT INTO "RolePermission" (id, "roleId", "permissionId")
SELECT 'rp_' || md5(r.id || p.id), r.id, p.id
FROM (VALUES
  ('contracting:tariff:manage', 'contracting_commercial_director'),
  ('contracting:tariff:manage', 'contracting_manager'),
  ('contracting:tariff:manage', 'contracting_pricing_admin'),
  ('crm:supplier:delete', 'excursions_manager'),
  ('tour-ops:pnl:update', 'operations_manager'),
  ('b2c-site:inquiry:update', 'b2c_operator')
) AS m(code, role_name)
JOIN "Role" r ON r.name = m.role_name
JOIN "Permission" p ON p.code = m.code
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
