import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Check if setup is complete
  const companyCount = await db.company.count();
  if (companyCount === 0) {
    redirect("/setup");
  }

  // Fetch installed modules for the sidebar
  const companyId = session.user.companyId;
  const installedModules = companyId
    ? await db.installedModule.findMany({
        where: { companyId, isInstalled: true },
        select: { name: true, displayName: true },
      })
    : [];

  // Map modules to include icon from registry
  const { MODULE_REGISTRY } = await import("@/lib/constants/modules");
  const modulesWithIcons = installedModules.map((m) => ({
    ...m,
    icon: MODULE_REGISTRY.find((r) => r.name === m.name)?.icon ?? "FileText",
  }));

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: session.user.name, email: session.user.email }}
        installedModules={modulesWithIcons}
      />
      <SidebarInset>
        <Topbar />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
