"use client";

import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  PlaneLanding,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

/**
 * The partner's own landing page: their credit, their arrivals, what needs
 * attention. Every figure is scoped to the signed-in partner by the procedure
 * — this is not a staff view of all partners.
 */
export default function PartnerDashboardPage() {
  const { data, isLoading } = trpc.partner.dashboard.stats.useQuery();

  const money = (n: number, currency: string | null) =>
    `${currency ? `${currency} ` : ""}${n.toLocaleString("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const date = (d: Date | string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const needsAttention = data.bookings.onRequest + data.bookings.pending;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">{data.partnerName}</p>
        </div>
        <Button asChild>
          <Link href="/b2b/search">
            Search &amp; book <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available credit</CardTitle>
            <CreditCard className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {data.credit.available === null
                ? "No limit"
                : money(data.credit.available, data.credit.currency)}
            </p>
            <p className="text-muted-foreground text-xs">
              {money(data.credit.used, data.credit.currency)} used
              {data.credit.limit !== null && ` of ${money(data.credit.limit, data.credit.currency)}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arriving in 30 days</CardTitle>
            <PlaneLanding className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{data.bookings.arrivingIn30Days}</p>
            <p className="text-muted-foreground text-xs">
              {data.bookings.confirmed} confirmed in total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action needed</CardTitle>
            <TriangleAlert className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{needsAttention}</p>
            <p className="text-muted-foreground text-xs">
              {needsAttention === 0
                ? "Nothing outstanding"
                : `${data.bookings.onRequest} on request, ${data.bookings.pending} awaiting approval`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booked this year</CardTitle>
            <CalendarClock className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {money(data.yearToDateNet, data.credit.currency)}
            </p>
            <p className="text-muted-foreground text-xs">At your net rates</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Next arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcoming.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No upcoming stays. <Link href="/b2b/search" className="underline">Search availability</Link>.
              </p>
            ) : (
              <div className="divide-y">
                {data.upcoming.map((b) => (
                  <Link
                    key={b.id}
                    href={`/b2b/bookings/${b.id}`}
                    className="hover:bg-muted/50 -mx-2 flex items-center justify-between rounded px-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {b.leadGuestFirstName} {b.leadGuestLastName}
                        <span className="text-muted-foreground font-normal"> · {b.hotel.name}</span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {date(b.checkIn)} → {date(b.checkOut)} · {b.code}
                        {b.partnerReference && ` · your ref ${b.partnerReference}`}
                      </p>
                    </div>
                    <Badge variant={b.status === "CONFIRMED" ? "default" : "secondary"}>
                      {b.status === "ON_REQUEST" ? "On request" : "Confirmed"}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your account manager</CardTitle>
          </CardHeader>
          <CardContent>
            {data.accountManager ? (
              <>
                <p className="font-medium">{data.accountManager.name}</p>
                <a
                  href={`mailto:${data.accountManager.email}`}
                  className="text-muted-foreground text-sm hover:underline"
                >
                  {data.accountManager.email}
                </a>
                <p className="text-muted-foreground mt-3 text-xs">
                  Ask them about credit, rates, or anything the portal will not let you do.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                No account manager assigned yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
