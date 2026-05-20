"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Search,
  CalendarCheck,
  FileText,
  DollarSign,
  TrendingUp,
  CreditCard,
  BarChart3,
  Receipt,
  ClipboardList,
} from "lucide-react";

import { PermissionGuard } from "@/components/shared/permission-guard";

export default function B2bPortalDashboardPage() {
  const t = useTranslations("b2bPortal");

  const sections = [
    { href: "/b2b-portal/tour-operators", label: t("tourOperators"), desc: t("tourOperator"), icon: Users },
    { href: "/b2b-portal/travel-agents", label: t("travelAgents"), desc: t("travelAgent"), icon: UserCheck },
    { href: "/b2b-portal/search", label: t("searchBook"), desc: t("reservations"), icon: Search },
    { href: "/b2b-portal/reservations", label: t("reservations"), desc: t("reservations"), icon: CalendarCheck },
    { href: "/b2b-portal/vouchers", label: t("vouchers"), desc: t("vouchers"), icon: FileText },
    { href: "/b2b-portal/rate-sheets", label: t("rateSheets"), desc: t("rateSheet"), icon: DollarSign },
    { href: "/b2b-portal/markups", label: t("markupRules"), desc: t("markupRule"), icon: TrendingUp },
    { href: "/b2b-portal/credit", label: t("creditManagement"), desc: t("credit"), icon: CreditCard },
    { href: "/b2b-portal/reports/bookings", label: t("bookingReports"), desc: t("totalBookings"), icon: BarChart3 },
    { href: "/b2b-portal/reports/revenue", label: t("revenue"), desc: t("totalRevenue"), icon: Receipt },
    { href: "/b2b-portal/reports/statements", label: t("statements"), desc: t("balance"), icon: ClipboardList },
  ];

  return (
    <PermissionGuard permission="b2b-portal:tourOperator:read">
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("activePartners")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sections.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-indigo-500/15 to-indigo-500/5 p-2.5 text-indigo-600 dark:text-indigo-400">
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
