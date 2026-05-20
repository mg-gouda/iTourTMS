"use client";

import { createContext, useContext } from "react";

interface PermissionsContextValue {
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  roles: [],
  permissions: [],
  isSuperAdmin: false,
});

export function PermissionsProvider({
  children,
  roles,
  permissions,
}: {
  children: React.ReactNode;
  roles: string[];
  permissions: string[];
}) {
  return (
    <PermissionsContext.Provider
      value={{ roles, permissions, isSuperAdmin: roles.includes("super_admin") }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
