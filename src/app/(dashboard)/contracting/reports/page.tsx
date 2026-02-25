"use client";

import { BarChart3, Calendar, FileBarChart, Gift, Clock, Layers } from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const reports = [
  {
    title: "Contract Summary",
    description: "Aggregated view of all contracts grouped by hotel, status, or currency",
    href: "/contracting/reports/contract-summary",
    icon: FileBarChart,
  },
  {
    title: "Rate Comparison",
    description: "Compare base rates across contracts for the same hotel",
    href: "/contracting/reports/rate-comparison",
    icon: BarChart3,
  },
  {
    title: "Season Coverage",
    description: "Visualize date coverage by contract seasons across the year",
    href: "/contracting/reports/season-coverage",
    icon: Calendar,
  },
  {
    title: "Seasonal Offers",
    description: "Overview of special offers and promotions across all contracts",
    href: "/contracting/reports/seasonal-offers",
    icon: Gift,
  },
  {
    title: "EBD Conditions",
    description: "Early booking discount conditions and deadlines by contract",
    href: "/contracting/reports/ebd-conditions",
    icon: Clock,
  },
  {
    title: "Allotment Utilization",
    description: "Room allotment usage and availability across contracts",
    href: "/contracting/reports/allotment-utilization",
    icon: Layers,
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="text-2xl font-bold tracking-tight">
          Contracting Reports
        </h1>
        <p className="text-muted-foreground">
          Analytical reports for contract rates, coverage, and performance
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30 cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <report.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{report.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
