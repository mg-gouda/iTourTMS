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
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SectionCard } from "../_components/section-card";
import { HELP_MODULE_MAP } from "../_data";

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

const MODULE_COLORS: Record<string, { banner: string; icon: string; badge: string }> = {
  finance: {
    banner: "from-blue-500/10 to-blue-500/5",
    icon: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  },
  contracting: {
    banner: "from-amber-500/10 to-amber-500/5",
    icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
  crm: {
    banner: "from-green-500/10 to-green-500/5",
    icon: "bg-green-500/15 text-green-600 dark:text-green-400",
    badge: "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400",
  },
  reservations: {
    banner: "from-violet-500/10 to-violet-500/5",
    icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    badge: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
  },
  traffic: {
    banner: "from-orange-500/10 to-orange-500/5",
    icon: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    badge: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  },
  "b2c-site": {
    banner: "from-cyan-500/10 to-cyan-500/5",
    icon: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    badge: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400",
  },
  "b2b-portal": {
    banner: "from-rose-500/10 to-rose-500/5",
    icon: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    badge: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
  },
  "tour-ops": {
    banner: "from-indigo-500/10 to-indigo-500/5",
    icon: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    badge: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400",
  },
};

interface PageProps {
  params: Promise<{ module: string }>;
}

export async function generateStaticParams() {
  return Object.keys(HELP_MODULE_MAP).map((slug) => ({ module: slug }));
}

export default async function ModuleHelpPage({ params }: PageProps) {
  const { module: slug } = await params;
  const mod = HELP_MODULE_MAP[slug];

  if (!mod) notFound();

  const t = await getTranslations("help");
  const Icon = MODULE_ICONS[mod.icon] ?? BookOpen;
  const colors = MODULE_COLORS[slug] ?? {
    banner: "from-primary/10 to-primary/5",
    icon: "bg-primary/15 text-primary",
    badge: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Module header banner */}
      <div className={`rounded-2xl bg-gradient-to-br p-6 ${colors.banner}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.icon}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{mod.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 self-start text-xs ${colors.badge}`}>
            {t("sections", { count: mod.sections.length })}
          </Badge>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-foreground/80">{mod.overview}</p>

        {/* Section quick-jump */}
        <div className="mt-4 flex flex-wrap gap-2">
          {mod.sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex items-center gap-1 rounded-full border bg-background/60 px-3 py-1 text-xs text-foreground/70 transition-colors hover:bg-background hover:text-foreground"
            >
              <ChevronRight className="h-3 w-3" />
              {section.title}
            </a>
          ))}
        </div>
      </div>

      <Separator />

      {/* Sections */}
      <div className="space-y-6">
        {mod.sections.map((section) => (
          <SectionCard key={section.id} section={section} moduleSlug={slug} />
        ))}
      </div>

      {/* Footer navigation */}
      <Separator />
      <div className="flex items-center justify-between pb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/help">{t("backToHelpCenter")}</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href="#" className="text-xs text-muted-foreground">
            {t("backToTop")}
          </a>
        </Button>
      </div>
    </div>
  );
}
