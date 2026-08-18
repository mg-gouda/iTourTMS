"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

/**
 * The partner's own margin, per hotel and per season.
 *
 * Editable in place: a grid of numbers behind a dialog each is a grid nobody
 * keeps up to date. Every cell saves on blur, and search results are re-priced
 * from the next query.
 */
export default function PartnerMarkupPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.partner.markup.grid.useQuery();
  const [pending, setPending] = useState<string | null>(null);

  const save = trpc.partner.markup.set.useMutation({
    onSuccess: () => {
      void utils.partner.markup.grid.invalidate();
      setPending(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setPending(null);
      void utils.partner.markup.grid.invalidate();
    },
  });

  const commit = (hotelId: string, seasonId: string | null, raw: string, previous: number | null) => {
    const trimmed = raw.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      toast.error("Enter a number, or leave it empty for no markup.");
      return;
    }
    if (value === previous) return;
    setPending(`${hotelId}:${seasonId ?? "all"}`);
    save.mutate({ hotelId, seasonId, amountPppn: value });
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your markup</h1>
        <p className="text-muted-foreground">
          What you add on top of our net rate, per person per night. It never changes what
          you pay us.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4 text-sm">
          <Info className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p>
              <strong>Per person per night.</strong> Everybody in the room counts, and every
              night counts. Net 400 for two adults and one child over four nights, with a
              markup of 5, adds 3 × 4 × 5 = 60. Your client price is 460 and you still owe
              us 400.
            </p>
            <p className="text-muted-foreground text-xs">
              A season figure overrides the hotel figure for those dates. Leave a box empty
              to use the hotel figure instead.
            </p>
            {!data.canEdit && (
              <p className="text-xs font-medium">
                You can see the markup but not change it — ask one of your administrators.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {data.hotels.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            No hotels on your account yet, so there is nothing to price.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.hotels.map((hotel) => (
            <Card key={hotel.hotelId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{hotel.name}</CardTitle>
                <p className="text-muted-foreground text-xs">
                  {hotel.city} · priced in {hotel.currencyCode}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium">All year</p>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28"
                      defaultValue={hotel.defaultPppn || ""}
                      placeholder="0.00"
                      disabled={!data.canEdit || pending === `${hotel.hotelId}:all`}
                      onBlur={(e) =>
                        commit(hotel.hotelId, null, e.target.value, hotel.defaultPppn || null)
                      }
                    />
                  </div>

                  {hotel.seasons.map((season) => (
                    <div key={season.id} className="space-y-1">
                      <p className="text-muted-foreground text-xs">
                        {date(season.dateFrom)} – {date(season.dateTo)}
                      </p>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-28"
                        defaultValue={season.pppn ?? ""}
                        placeholder={hotel.defaultPppn ? String(hotel.defaultPppn) : "—"}
                        disabled={!data.canEdit || pending === `${hotel.hotelId}:${season.id}`}
                        onBlur={(e) =>
                          commit(hotel.hotelId, season.id, e.target.value, season.pppn)
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
