"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { BarChart3, CalendarDays, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function ReportsPage() {
  const t = useTranslations("traffic");

  const reports = [
    { title: t("dailyDispatchReport"), description: t("dailyDispatch"), href: "/traffic/reports/daily-dispatch", icon: CalendarDays },
    { title: t("jobStatsReport"), description: t("byStatus"), href: "/traffic/reports/job-stats", icon: BarChart3 },
    { title: t("driverPerformanceReport"), description: t("performanceSummary"), href: "/traffic/reports/driver-performance", icon: Users },
    { title: t("revenueByServiceReport"), description: t("revenueSummary"), href: "/traffic/reports/revenue-by-service", icon: TrendingUp },
  ];

  return (
    <PermissionGuard permission="traffic:report:read">
      <div className="animate-fade-in space-y-6">
      <div className="page-header"><h1 className="text-2xl font-bold">{t("reportsDesc").split(" ")[0]}</h1><p className="text-muted-foreground">{t("reportsDesc")}</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-3">
                <r.icon className="h-5 w-5 text-muted-foreground" />
                <div><CardTitle className="text-base">{r.title}</CardTitle><p className="text-sm text-muted-foreground">{r.description}</p></div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
    </PermissionGuard>
  );
}
