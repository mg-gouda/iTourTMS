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

  // Check license validity — complete halt if expired/missing/revoked
  const companyId = session.user.companyId;
  let licenseExpiryWarning: string | null = null;
  if (companyId) {
    const license = await db.license.findFirst({
      where: { companyId, isActivated: true },
      select: { expiresAt: true, isRevoked: true },
    });
    if (!license || license.isRevoked || !license.expiresAt || license.expiresAt < new Date()) {
      redirect("/license-expired");
    }
    // Show warning banner if license expires within 30 days
    const daysRemaining = Math.ceil(
      (license.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysRemaining <= 30) {
      licenseExpiryWarning = `Your license expires on ${license.expiresAt.toLocaleDateString()} (${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining). Contact your administrator to renew.`;
    }
  }

  // Fetch installed modules and inner background
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
        {licenseExpiryWarning && (
            <div className="border-b border-yellow-300 bg-yellow-50 px-4 py-2 text-center text-sm font-medium text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
              {licenseExpiryWarning}
            </div>
          )}
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
