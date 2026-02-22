"use client";

import { useSession } from "next-auth/react";

export function usePermission(permissionCode: string): boolean {
  const { data: session } = useSession();
  if (!session?.user) return false;

  // Super admin has all permissions
  if (session.user.roles?.includes("super_admin")) return true;

  return session.user.permissions?.includes(permissionCode) ?? false;
}

export function useHasRole(roleName: string): boolean {
  const { data: session } = useSession();
  if (!session?.user) return false;
  return session.user.roles?.includes(roleName) ?? false;
}

export function useIsSuperAdmin(): boolean {
  return useHasRole("super_admin");
}
