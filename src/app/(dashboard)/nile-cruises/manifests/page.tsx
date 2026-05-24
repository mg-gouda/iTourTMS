"use client";

import { format } from "date-fns";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MANIFEST_STATUS_LABELS, MANIFEST_STATUS_VARIANTS } from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";

export default function CruiseManifestsPage() {
  const { data, isLoading } = trpc.nileCruises.manifest.listByDeparture.useQuery({});

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Passenger Manifests</h1>
        <p className="text-sm text-muted-foreground">Tourism authority submissions</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <p className="text-muted-foreground">No manifests generated yet</p>
            <p className="text-sm text-muted-foreground">Generate manifests from the departure detail page</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((m) => (
            <Link key={m.id} href={`/nile-cruises/manifests/${m.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-sm">{m.departure.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.departure.boat.name} · {format(new Date(m.departure.embarkDate), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-muted-foreground">
                      v{m.versionNumber} · {m.totalPax} pax
                    </div>
                    <Badge variant={MANIFEST_STATUS_VARIANTS[m.status as keyof typeof MANIFEST_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                      {MANIFEST_STATUS_LABELS[m.status as keyof typeof MANIFEST_STATUS_LABELS]}
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
