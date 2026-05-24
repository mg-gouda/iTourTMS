"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CRUISE_DEPARTURE_STATUS_LABELS, CRUISE_DEPARTURE_STATUS_VARIANTS } from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";

export default function CruiseDeparturesPage() {
  const { data, isLoading } = trpc.nileCruises.departure.list.useQuery({});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Departures</h1>
          <p className="text-sm text-muted-foreground">Scheduled cruise sailings</p>
        </div>
        <Button asChild>
          <Link href="/nile-cruises/departures/new">
            <Plus className="mr-2 h-4 w-4" /> New Departure
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <p className="text-muted-foreground">No departures scheduled</p>
            <Button asChild><Link href="/nile-cruises/departures/new">Schedule First Departure</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((dep) => (
            <Link key={dep.id} href={`/nile-cruises/departures/${dep.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-sm">{dep.code}</p>
                      <p className="text-xs text-muted-foreground">{dep.boat.name} · {dep.cruiseType.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-right text-xs text-muted-foreground">
                      <div>Embark: {format(new Date(dep.embarkDate), "dd MMM yyyy")}</div>
                      <div>Disembark: {format(new Date(dep.disembarkDate), "dd MMM yyyy")}</div>
                    </div>
                    <div className="text-xs text-muted-foreground hidden md:block">
                      {dep._count.bookings} bookings
                    </div>
                    <Badge variant={CRUISE_DEPARTURE_STATUS_VARIANTS[dep.status as keyof typeof CRUISE_DEPARTURE_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                      {CRUISE_DEPARTURE_STATUS_LABELS[dep.status as keyof typeof CRUISE_DEPARTURE_STATUS_LABELS]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
