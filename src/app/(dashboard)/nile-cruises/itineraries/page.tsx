"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function ItinerariesPage() {
  const { data, isLoading } = trpc.nileCruises.itinerary.list.useQuery();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Itineraries</h1>
          <p className="text-sm text-muted-foreground">Day-by-day port call programs</p>
        </div>
        <Button asChild>
          <Link href="/nile-cruises/itineraries/new">
            <Plus className="mr-2 h-4 w-4" /> New Itinerary
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <p className="text-muted-foreground">No itineraries yet</p>
            <Button asChild><Link href="/nile-cruises/itineraries/new">Create First Itinerary</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((it) => (
            <Link key={it.id} href={`/nile-cruises/itineraries/${it.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.mode} · {it._count.days} days</p>
                  </div>
                  <Badge variant="outline">{it.cruiseType.name}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
