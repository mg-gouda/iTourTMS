import {
  Bus,
  CalendarCheck,
  FileText,
  Globe,
  Landmark,
  type LucideIcon,
  Users,
} from "lucide-react";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { MODULE_REGISTRY } from "@/lib/constants/modules";
import { db } from "@/server/db";

const iconMap: Record<string, LucideIcon> = {
  Landmark,
  FileText,
  Users,
  CalendarCheck,
  Bus,
  Globe,
};

const accentMap: Record<string, string> = {
  finance: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  contracting: "from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20",
  crm: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20",
  reservations: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20",
  traffic: "from-orange-500/15 to-orange-500/5 text-orange-600 dark:text-orange-400 border-orange-500/20",
  "b2c-site": "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
};

const hrefMap: Record<string, string> = {
  finance: "/finance",
  contracting: "/contracting",
  crm: "/crm",
  reservations: "/reservations",
  traffic: "/traffic",
  "b2c-site": "/b2c-site",
};

export default async function DashboardPage() {
  const session = await auth();
  const companyId = session?.user?.companyId;

  const installedModules = companyId
    ? await db.installedModule.findMany({
        where: { companyId, isInstalled: true },
        select: { name: true, displayName: true },
      })
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.name ?? "User"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {installedModules.map((mod) => {
          const registry = MODULE_REGISTRY.find((r) => r.name === mod.name);
          const Icon = iconMap[registry?.icon ?? ""] ?? FileText;
          const accent = accentMap[mod.name] ?? "from-muted to-muted/50 text-foreground border-border";
          const href = hrefMap[mod.name] ?? "/";

          return (
            <Link
              key={mod.name}
              href={href}
              className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className={`mb-3 inline-flex rounded-lg bg-gradient-to-br p-2.5 ${accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold tracking-tight">{mod.displayName}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {registry?.description ?? "Module active"}
              </p>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
