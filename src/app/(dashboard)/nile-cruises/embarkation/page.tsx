"use client";

import { format } from "date-fns";
import { Anchor } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CRUISE_BOOKING_STATUS_LABELS, CRUISE_BOOKING_STATUS_VARIANTS } from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

export default function EmbarkationPage() {
  const { data, isLoading } = trpc.nileCruises.dashboard.todayEmbarkations.useQuery();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Anchor className="h-5 w-5" />
          Embarkation Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Today&apos;s departures — {format(new Date(), "dd MMMM yyyy")}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16">
            <Anchor className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">No departures today</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((dep) => (
            <Card key={dep.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{dep.code} · {dep.boat.name}</CardTitle>
                  <span className="text-sm text-muted-foreground">{dep._count.bookings} bookings</span>
                </div>
                <p className="text-xs text-muted-foreground">{dep.cruiseType.name}</p>
              </CardHeader>
              <CardContent>
                <Link href={`/nile-cruises/departures/${dep.id}`} className="text-sm text-primary hover:underline">
                  View departure →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
