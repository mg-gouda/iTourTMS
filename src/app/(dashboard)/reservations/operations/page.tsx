"use client";

import {
  Hotel,
  PlaneLanding,
  PlaneTakeoff,
  Plus,
  XCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function DailyOperationsPage() {
  const { data, isLoading } = trpc.reservations.reports.dailyOps.useQuery();

  const cards = [
    {
      title: "Arrivals Today",
      value: data?.arrivalsToday,
      icon: PlaneLanding,
      color: "text-green-600",
    },
    {
      title: "Departures Today",
      value: data?.departuresToday,
      icon: PlaneTakeoff,
      color: "text-orange-600",
    },
    {
      title: "In-House",
      value: data?.inHouseCount,
      icon: Hotel,
      color: "text-blue-600",
    },
    {
      title: "New Bookings",
      value: data?.newBookingsToday,
      icon: Plus,
      color: "text-emerald-600",
    },
    {
      title: "Cancellations",
      value: data?.cancellationsToday,
      icon: XCircle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Operations</h1>
        <p className="text-muted-foreground">
          Today&apos;s operational overview for reservations
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className={`text-3xl font-bold ${card.color}`}>
                  {card.value ?? 0}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
