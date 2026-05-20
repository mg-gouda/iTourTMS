"use client";

import { usePermissions } from "@/components/providers/permissions-provider";

export function usePermission(permissionCode: string): boolean {
  const { isSuperAdmin, permissions } = usePermissions();
  if (isSuperAdmin) return true;
  return permissions.includes(permissionCode);
}

export function useHasRole(roleName: string): boolean {
  const { roles } = usePermissions();
  return roles.includes(roleName);
}

export function useIsSuperAdmin(): boolean {
  const { isSuperAdmin } = usePermissions();
  return isSuperAdmin;
}
