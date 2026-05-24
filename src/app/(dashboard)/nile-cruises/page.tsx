"use client";

import { Anchor, Calendar, Ship, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CRUISE_BOOKING_STATUS_LABELS, CRUISE_BOOKING_STATUS_VARIANTS, CRUISE_DEPARTURE_STATUS_LABELS, CRUISE_DEPARTURE_STATUS_VARIANTS } from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";

export default function NileCruisesDashboardPage() {
  const { data: kpis, isLoading } = trpc.nileCruises.dashboard.kpis.useQuery();
  const { data: upcoming } = trpc.nileCruises.dashboard.upcomingDepartures.useQuery({ days: 30 });
  const { data: recentBookings } = trpc.nileCruises.dashboard.recentBookings.useQuery({ limit: 8 });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Ship className="h-6 w-6 text-primary" />
            Nile Cruises
          </h1>
          <p className="text-sm text-muted-foreground">Fleet management, contracts, departures and bookings</p>
        </div>
        <Button asChild>
          <Link href="/nile-cruises/bookings/new">New Booking</Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Bookings (MTD)", value: kpis?.totalBookingsThisMonth, icon: Anchor, color: "text-blue-500" },
          { label: "Confirmed", value: kpis?.confirmedBookings, icon: TrendingUp, color: "text-green-500" },
          { label: "Revenue (MTD)", value: kpis ? `$${kpis.totalRevenue.toLocaleString()}` : null, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Active Departures", value: kpis?.activeDepartures, icon: Calendar, color: "text-violet-500" },
          { label: "Total Pax", value: kpis?.totalPassengers, icon: Users, color: "text-orange-500" },
          { label: "Pending Requests", value: kpis?.pendingRequests, icon: Anchor, color: "text-red-500" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex items-center gap-2">
                  <kpi.icon className={`h-6 w-6 ${kpi.color} shrink-0`} />
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold">{kpi.value ?? "—"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Departures */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Upcoming Departures</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/nile-cruises/departures">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!upcoming?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No upcoming departures in 30 days</p>
            ) : (
              <div className="divide-y">
                {upcoming.map((dep) => (
                  <Link
                    key={dep.id}
                    href={`/nile-cruises/departures/${dep.id}`}
                    className="flex items-center justify-between py-2.5 px-1 hover:bg-muted/50 rounded transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{dep.code}</p>
                      <p className="text-xs text-muted-foreground">{dep.boat.name} · {dep.cruiseType.name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <p className="text-xs text-muted-foreground">{format(new Date(dep.embarkDate), "dd MMM yyyy")}</p>
                      <Badge variant={CRUISE_DEPARTURE_STATUS_VARIANTS[dep.status as keyof typeof CRUISE_DEPARTURE_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                        {CRUISE_DEPARTURE_STATUS_LABELS[dep.status as keyof typeof CRUISE_DEPARTURE_STATUS_LABELS]}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Bookings</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/nile-cruises/bookings">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!recentBookings?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No bookings yet</p>
            ) : (
              <div className="divide-y">
                {recentBookings.map((b) => (
                  <Link
                    key={b.id}
                    href={`/nile-cruises/bookings/${b.id}`}
                    className="flex items-center justify-between py-2.5 px-1 hover:bg-muted/50 rounded transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{b.code}</p>
                      <p className="text-xs text-muted-foreground">{b.leadGuestName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-muted-foreground">{format(new Date(b.departure.embarkDate), "dd MMM yyyy")}</p>
                      <Badge variant={CRUISE_BOOKING_STATUS_VARIANTS[b.status as keyof typeof CRUISE_BOOKING_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                        {CRUISE_BOOKING_STATUS_LABELS[b.status as keyof typeof CRUISE_BOOKING_STATUS_LABELS]}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Boats & Fleet", href: "/nile-cruises/boats", desc: "Manage your fleet" },
          { label: "Contracts", href: "/nile-cruises/contracts", desc: "Rate agreements" },
          { label: "Cabin Chart", href: "/nile-cruises/cabin-chart", desc: "Availability grid" },
          { label: "Manifests", href: "/nile-cruises/manifests", desc: "Passenger lists" },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="pt-4 pb-3">
                <p className="text-sm font-medium">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
