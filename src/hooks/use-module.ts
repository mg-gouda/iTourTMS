"use client";

import { trpc } from "@/lib/trpc";

export function useInstalledModules() {
  // This will be used after setup - for now returns empty
  return { modules: [], isLoading: false };
}

export function useIsModuleInstalled(moduleName: string) {
  const { modules } = useInstalledModules();
  return modules.some(
    (m: { name: string; isInstalled: boolean }) =>
      m.name === moduleName && m.isInstalled,
  );
}
