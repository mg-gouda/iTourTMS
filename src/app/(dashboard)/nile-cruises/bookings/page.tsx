"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CRUISE_BOOKING_STATUS_LABELS, CRUISE_BOOKING_STATUS_VARIANTS } from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";

export default function CruiseBookingsPage() {
  const { data, isLoading } = trpc.nileCruises.booking.list.useQuery({});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cruise Bookings</h1>
          <p className="text-sm text-muted-foreground">All cruise reservations</p>
        </div>
        <Button asChild>
          <Link href="/nile-cruises/bookings/new">
            <Plus className="mr-2 h-4 w-4" /> New Booking
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <p className="text-muted-foreground">No bookings yet</p>
            <Button asChild><Link href="/nile-cruises/bookings/new">Create First Booking</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((b) => (
            <Link key={b.id} href={`/nile-cruises/bookings/${b.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-sm">{b.code}</p>
                      <p className="text-xs text-muted-foreground">{b.leadGuestName}</p>
                    </div>
                    <div className="hidden sm:block text-xs text-muted-foreground">
                      {b.departure.boat.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden md:block text-xs text-muted-foreground text-right">
                      <div>{format(new Date(b.departure.embarkDate), "dd MMM yyyy")}</div>
                      <div>{b.adults}A {b.children > 0 ? `${b.children}C` : ""} {b.infants > 0 ? `${b.infants}I` : ""}</div>
                    </div>
                    <div className="hidden lg:block text-xs font-medium">
                      ${Number(b.grossTotal ?? 0).toLocaleString()}
                    </div>
                    <Badge variant={CRUISE_BOOKING_STATUS_VARIANTS[b.status as keyof typeof CRUISE_BOOKING_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                      {CRUISE_BOOKING_STATUS_LABELS[b.status as keyof typeof CRUISE_BOOKING_STATUS_LABELS]}
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
