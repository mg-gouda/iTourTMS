"use client";

import { Plus, Ship } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const STAR_LABELS: Record<string, string> = {
  THREE: "3★", FOUR: "4★", FIVE: "5★", FIVE_DELUXE: "5★ Deluxe",
};

export default function CruiseBoatsPage() {
  const { data: boats, isLoading } = trpc.nileCruises.boat.list.useQuery();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cruise Boats</h1>
          <p className="text-sm text-muted-foreground">Manage your Nile cruise fleet</p>
        </div>
        <Button asChild>
          <Link href="/nile-cruises/boats/new">
            <Plus className="mr-2 h-4 w-4" /> New Boat
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : !boats?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Ship className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No boats registered yet</p>
            <Button asChild>
              <Link href="/nile-cruises/boats/new">Add First Boat</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boats.map((boat) => (
            <Link key={boat.id} href={`/nile-cruises/boats/${boat.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{boat.name}</CardTitle>
                    <Badge variant={boat.active ? "default" : "secondary"}>
                      {boat.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 font-medium">{STAR_LABELS[boat.starRating] ?? boat.starRating}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{boat.boatClass.replace(/_/g, " ")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>Cabins: <strong className="text-foreground">{boat.totalCabins}</strong></span>
                    <span>Max pax: <strong className="text-foreground">{boat.maxPax}</strong></span>
                    {boat.yearBuilt && <span>Built: <strong className="text-foreground">{boat.yearBuilt}</strong></span>}
                    <span>Code: <strong className="text-foreground font-mono">{boat.code}</strong></span>
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
