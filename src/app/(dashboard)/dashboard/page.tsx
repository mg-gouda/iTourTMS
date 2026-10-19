import {
  Briefcase,
  Bus,
  CalendarCheck,
  ChevronRight,
  FileText,
  FolderOpen,
  Globe,
  Landmark,
  Ship,
  type LucideIcon,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

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
  Briefcase,
  FolderOpen,
  Ship,
};

// Settings-style icon tiles: a solid hue per module, white glyph (all ≥3:1).
const tileMap: Record<string, string> = {
  finance: "bg-emerald-600",
  contracting: "bg-blue-600",
  crm: "bg-violet-600",
  reservations: "bg-amber-600",
  traffic: "bg-orange-600",
  "b2c-site": "bg-cyan-600",
  "b2b-portal": "bg-indigo-600",
  "tour-ops": "bg-rose-600",
  "nile-cruises": "bg-sky-600",
};

const hrefMap: Record<string, string> = {
  finance: "/finance",
  contracting: "/contracting",
  crm: "/crm",
  reservations: "/reservations",
  traffic: "/traffic",
  "b2c-site": "/b2c-site",
  "b2b-portal": "/b2b-portal",
  "tour-ops": "/tour-ops",
  "nile-cruises": "/nile-cruises",
};

export default async function DashboardPage() {
  const session = await auth();
  const companyId = session?.user?.companyId;
  const t = await getTranslations("dashboard");

  const installedModules = companyId
    ? await db.installedModule.findMany({
        where: { companyId, isInstalled: true },
        select: { name: true, displayName: true },
      })
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("welcomeBack", { name: session?.user?.name ?? "User" })}
        </p>
      </div>

      {/* Grouped list, as in iOS Settings: one row per module. */}
      <ul className="max-w-3xl divide-y overflow-hidden rounded-xl border bg-card">
        {installedModules.map((mod) => {
          const registry = MODULE_REGISTRY.find((r) => r.name === mod.name);
          const Icon = iconMap[registry?.icon ?? ""] ?? FileText;
          const href = hrefMap[mod.name] ?? "/";
          return (
            <li key={mod.name}>
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-[9px] text-white ${tileMap[mod.name] ?? "bg-gray-500"}`}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{mod.displayName}</span>
                  <span className="text-muted-foreground block truncate text-[13px]">
                    {registry?.description ?? t("moduleActive")}
                  </span>
                </span>
                <ChevronRight className="text-muted-foreground/60 size-4 shrink-0 rtl:rotate-180" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
