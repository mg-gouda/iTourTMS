"use client";

import {
  BookOpen,
  Briefcase,
  Bus,
  CalendarCheck,
  FileText,
  FolderOpen,
  Globe,
  Landmark,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { ALL_HELP_MODULES } from "../_data";
import type { HelpModule } from "../_data/types";

const MODULE_ICONS: Record<string, React.ElementType> = {
  Landmark,
  FileText,
  Users,
  CalendarCheck,
  Bus,
  Globe,
  Briefcase,
  FolderOpen,
  BookOpen,
};

export function HelpNav() {
  const pathname = usePathname();
  const t = useTranslations("help");
  const activeSlug = pathname.startsWith("/help/") ? pathname.slice("/help/".length).split("/")[0] : null;
  const activeModule: HelpModule | undefined = ALL_HELP_MODULES.find((m) => m.slug === activeSlug);

  return (
    <nav className="space-y-1">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("modules")}
      </p>
      {ALL_HELP_MODULES.map((mod) => {
        const Icon = MODULE_ICONS[mod.icon] ?? BookOpen;
        const href = `/help/${mod.slug}`;
        const isActive = activeSlug === mod.slug;

        return (
          <div key={mod.slug}>
            <Link
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {mod.name}
            </Link>

            {/* Section anchors for the active module */}
            {isActive && activeModule && (
              <div className="ml-6 mt-1 space-y-0.5 border-l pl-3">
                {activeModule.sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block truncate py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
