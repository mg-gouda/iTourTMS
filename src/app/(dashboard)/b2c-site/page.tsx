"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Palette,
  Image,
  FileText,
  BookOpen,
  HelpCircle,
  Star,
  Mail,
  MessageSquare,
  DollarSign,
} from "lucide-react";

import { PermissionGuard } from "@/components/shared/permission-guard";

export default function B2cSiteDashboardPage() {
  const t = useTranslations("b2cSite");

  const sections = [
    { href: "/b2c-site/branding", label: t("branding"), desc: t("siteName"), icon: Palette },
    { href: "/b2c-site/hero-slides", label: t("heroSlides"), desc: t("headline"), icon: Image },
    { href: "/b2c-site/pages", label: t("pages"), desc: t("slug"), icon: FileText },
    { href: "/b2c-site/blog", label: t("blog"), desc: t("blogPost"), icon: BookOpen },
    { href: "/b2c-site/faq", label: t("faq"), desc: t("faqItem"), icon: HelpCircle },
    { href: "/b2c-site/testimonials", label: t("testimonials"), desc: t("testimonial"), icon: Star },
    { href: "/b2c-site/inquiries", label: t("inquiries"), desc: t("inquiry"), icon: MessageSquare },
    { href: "/b2c-site/newsletter", label: t("newsletter"), desc: t("subscribers"), icon: Mail },
    { href: "/b2c-site/markup", label: t("markupRules"), desc: t("markupRule"), icon: DollarSign },
  ];

  return (
    <PermissionGuard permission="b2c-site:branding:read">
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("branding")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sections.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 p-2.5 text-cyan-600 dark:text-cyan-400">
              <item.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold tracking-tight">{item.label}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {item.desc}
            </p>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
    </PermissionGuard>
  );
}
