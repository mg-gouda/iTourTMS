import {
  BookOpen,
  Briefcase,
  Bus,
  CalendarCheck,
  ChevronRight,
  FileText,
  FolderOpen,
  Globe,
  Landmark,
  LayoutDashboard,
  LogIn,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ALL_HELP_MODULES } from "./_data";

const MODULE_ICONS: Record<string, React.ElementType> = {
  Landmark,
  FileText,
  Users,
  CalendarCheck,
  Bus,
  Globe,
  Briefcase,
  FolderOpen,
};

const MODULE_COLORS: Record<string, string> = {
  finance: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  contracting: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  crm: "bg-green-500/10 text-green-600 dark:text-green-400",
  reservations: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  traffic: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "b2c-site": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "b2b-portal": "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "tour-ops": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
};

const GETTING_STARTED_ICONS = [LogIn, LayoutDashboard, Settings, BookOpen] as const;
const GETTING_STARTED_KEYS = ["login", "dashboard", "configure", "explore"] as const;

export default async function HelpPage() {
  const t = await getTranslations("help");

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Hero */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        </div>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Separator />

      {/* Getting Started */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("gettingStarted")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GETTING_STARTED_KEYS.map((key, i) => {
            const Icon = GETTING_STARTED_ICONS[i];
            return (
              <div key={key} className="rounded-xl border bg-muted/30 p-4 text-sm">
                <Icon className="mb-2 h-5 w-5 text-primary/70" />
                <p className="font-medium">{t(`gettingStartedItems.${key}.title`)}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t(`gettingStartedItems.${key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Module grid */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("moduleGuides")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ALL_HELP_MODULES.map((mod) => {
            const Icon = MODULE_ICONS[mod.icon] ?? BookOpen;
            const colorClass = MODULE_COLORS[mod.slug] ?? "bg-primary/10 text-primary";

            return (
              <Card
                key={mod.slug}
                className="group relative overflow-hidden border-border/60 transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {t("sections", { count: mod.sections.length })}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2 text-base">{mod.name}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {mod.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="mb-4 space-y-1">
                    {mod.sections.slice(0, 3).map((section) => (
                      <li key={section.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ChevronRight className="h-3 w-3 shrink-0" />
                        {section.title}
                      </li>
                    ))}
                    {mod.sections.length > 3 && (
                      <li className="text-xs text-muted-foreground">
                        {t("moreSections", { count: mod.sections.length - 3 })}
                      </li>
                    )}
                  </ul>
                  <Button asChild size="sm" className="w-full" variant="outline">
                    <Link href={`/help/${mod.slug}`}>
                      {t("viewGuide")}
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
