"use client";

import { CalendarClock, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PARTNER_BOOKING_STATUS_LABELS,
  PARTNER_BOOKING_STATUS_VARIANTS,
} from "@/lib/constants/b2b-portal";
import { trpc } from "@/lib/trpc";

const STATUSES = ["CONFIRMED", "ON_REQUEST", "PENDING_APPROVAL", "CANCELLED"] as const;

const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** The partner's own bookings. The list is scoped by the session, not by input. */
export default function PartnerBookingsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");

  const { data, isLoading } = trpc.partner.booking.list.useQuery({
    search: search.trim() || undefined,
    status: status === "ALL" ? undefined : status,
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My bookings</h1>
        <p className="text-muted-foreground">
          Everything you have booked with us. Open one to change or cancel it.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Booking reference, your reference or guest surname"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => v && setStatus(v)}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {PARTNER_BOOKING_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            <p>No bookings yet.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/b2b/search">Search &amp; book</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((b) => (
            <Link key={b.id} href={`/b2b/bookings/${b.id}`} className="block">
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{b.code}</span>
                      <Badge variant={PARTNER_BOOKING_STATUS_VARIANTS[b.status] ?? "secondary"}>
                        {PARTNER_BOOKING_STATUS_LABELS[b.status] ?? b.status}
                      </Badge>
                      {b.partnerReference && (
                        <span className="text-muted-foreground text-xs">
                          Your ref: {b.partnerReference}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm font-medium">{b.hotel?.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {date(b.checkIn)} – {date(b.checkOut)} · {b.nights} nights ·{" "}
                      {b.noOfRooms} room{b.noOfRooms === 1 ? "" : "s"} · {b.adults} adults
                      {b.children ? `, ${b.children} children` : ""}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {b.leadGuestFirstName} {b.leadGuestLastName}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-lg font-semibold">
                      {b.currency?.code}{" "}
                      {Number(b.partnerClientPrice ?? b.buyingTotal).toLocaleString("en", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    {b.onRequestDeadline && b.status === "ON_REQUEST" && (
                      <p className="text-muted-foreground flex items-center justify-end gap-1 text-xs">
                        <CalendarClock className="size-3" />
                        Answer by {date(b.onRequestDeadline)}
                      </p>
                    )}
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
