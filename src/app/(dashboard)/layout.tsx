import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BackButton } from "@/components/shared/back-button";
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

  // Fetch installed modules and inner background
  const companyId = session.user.companyId;
  const [installedModules, companyBranding] = await Promise.all([
    companyId
      ? db.installedModule.findMany({
          where: { companyId, isInstalled: true },
          select: { name: true, displayName: true },
        })
      : [],
    companyId
      ? db.company.findUnique({
          where: { id: companyId },
          select: { innerBgUrl: true, sidebarLogoUrl: true },
        })
      : null,
  ]);

  // Map modules to include icon from registry
  const { MODULE_REGISTRY } = await import("@/lib/constants/modules");
  const modulesWithIcons = installedModules.map((m) => ({
    ...m,
    icon: MODULE_REGISTRY.find((r) => r.name === m.name)?.icon ?? "FileText",
  }));

  return (
    <SidebarProvider>
      <AppSidebar
        installedModules={modulesWithIcons}
        sidebarLogoUrl={companyBranding?.sidebarLogoUrl}
      />
      <SidebarInset>
        <Topbar
          user={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
          }}
        />
        <main className="relative flex-1 overflow-auto p-4 md:p-6">
          {companyBranding?.innerBgUrl && (
            <div
              className="pointer-events-none fixed inset-0 opacity-50"
              style={{
                backgroundImage: `url(${companyBranding.innerBgUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
          )}
          <div className="relative">
            <div className="mb-4">
              <BackButton />
            </div>
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
