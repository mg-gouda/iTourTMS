"use client";

import { Download, FileSpreadsheet, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STAR_RATING_LABELS } from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";

const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Net rates by room and season, per contract, for the hotels on the partner's
 * allowlist. Nothing else appears here, because nothing else is theirs.
 */
export default function PartnerRateSheetsPage() {
  const { data, isLoading } = trpc.partner.rateSheet.list.useQuery();

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rate sheets</h1>
        <p className="text-muted-foreground">
          Your net rates by room type and season. Download one per contract.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            <FileSpreadsheet className="mx-auto mb-3 size-8 opacity-40" />
            <p>No rate sheets are available on your account yet.</p>
            <p className="mt-1 text-xs">Your account manager sets which hotels you can sell.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.hotel?.name}</span>
                    {c.hotel?.starRating && (
                      <Badge variant="outline" className="gap-1">
                        <Star className="size-3" />
                        {STAR_RATING_LABELS[c.hotel.starRating] ?? c.hotel.starRating}
                      </Badge>
                    )}
                    <span className="text-muted-foreground text-xs">{c.hotel?.city}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {c.code} · valid {date(c.validFrom)} – {date(c.validTo)} ·{" "}
                    {c.baseCurrency?.code}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {c._count.roomTypes} room types · {c._count.seasons} seasons
                    {c._count.specialOffers
                      ? ` · ${c._count.specialOffers} special offer${c._count.specialOffers === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>

                <Button variant="outline" asChild className="shrink-0">
                  <a href={`/api/b2b/documents/rate-sheet/${c.id}`}>
                    <Download className="mr-2 size-4" /> Rate sheet
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
