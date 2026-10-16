"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Segment {
  id: string;
  code: string;
  status: string;
  checkIn: Date | string;
  checkOut: Date | string;
  hotel: { name: string };
}

const day = (d: Date | string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/**
 * One guest across several hotels or room types: the segments in travel
 * order, and the way to add the next one. Hotel changes get an inter-hotel
 * transfer automatically.
 */
export function SplitStayCard({ bookingId, segments }: { bookingId: string; segments: Segment[] }) {
  const last = segments.at(-1);
  // Continue from the last segment, so a new one always goes on the end.
  const continueFrom = last?.id ?? bookingId;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Split stay</CardTitle>
          <CardDescription>
            {segments.length > 1
              ? `${segments.length} segments. A transfer is booked automatically wherever the hotel changes.`
              : "Moving the guest to another hotel or room type? Add the next segment."}
          </CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/reservations/bookings/new?splitOf=${continueFrom}`}>
            <Plus className="me-1 size-4" /> Add next segment
          </Link>
        </Button>
      </CardHeader>
      {segments.length > 1 && (
        <CardContent>
          <ol className="flex flex-wrap items-center gap-2">
            {segments.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="text-muted-foreground size-4 rtl:rotate-180" aria-hidden />}
                <Link
                  href={`/reservations/bookings/${s.id}`}
                  aria-current={s.id === bookingId ? "page" : undefined}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted",
                    s.id === bookingId && "border-primary bg-primary/5",
                    s.status === "CANCELLED" && "opacity-60 line-through",
                  )}
                >
                  <span className="block font-medium">{s.hotel.name}</span>
                  <span className="text-muted-foreground block text-xs">
                    {day(s.checkIn)} – {day(s.checkOut)} · <span className="font-mono">{s.code}</span>
                  </span>
                </Link>
                {s.status === "CANCELLED" && <Badge variant="secondary">Cancelled</Badge>}
              </li>
            ))}
          </ol>
        </CardContent>
      )}
    </Card>
  );
}
