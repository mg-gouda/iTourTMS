"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const reports = [
  { title: "Daily Dispatch", description: "View all jobs for a specific date", href: "/traffic/reports/daily-dispatch", icon: CalendarDays },
  { title: "Job Statistics", description: "Job counts by status and service type", href: "/traffic/reports/job-stats", icon: BarChart3 },
  { title: "Driver Performance", description: "Completed jobs and no-shows per driver", href: "/traffic/reports/driver-performance", icon: Users },
  { title: "Revenue by Service", description: "Revenue, cost, and margin by service type", href: "/traffic/reports/revenue-by-service", icon: TrendingUp },
];

export default function ReportsPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header"><h1 className="text-2xl font-bold">Reports</h1><p className="text-muted-foreground">Traffic & transport analytics</p></div>
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
  );
}
