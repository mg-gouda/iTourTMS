"use client";

import { usePermission } from "@/hooks/use-permission";
import { AccessDenied } from "./access-denied";

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ permission, children, fallback }: PermissionGuardProps) {
  const hasPermission = usePermission(permission);

  if (!hasPermission) {
    return <>{fallback ?? <AccessDenied permission={permission} />}</>;
  }

  return <>{children}</>;
}
