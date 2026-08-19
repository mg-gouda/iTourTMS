"use client";

import { Clock, Search, Users } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const money = (n: number, currency: string | null) =>
  `${currency ? `${currency} ` : ""}${n.toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Day trips and activities, at the partner's own rate. */
export default function PartnerExcursionsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.partner.products.excursions.useQuery({
    search: search.trim() || undefined,
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Excursions</h1>
        <p className="text-muted-foreground">
          Day trips and activities. Prices are per person and are yours — what you pay us.
        </p>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search excursions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            No excursions are available on your account yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{e.name}</span>
                    <Badge variant="outline">{e.code}</Badge>
                    <Badge variant="secondary">{e.category}</Badge>
                  </div>
                  {e.description && (
                    <p className="text-muted-foreground line-clamp-2 text-xs">{e.description}</p>
                  )}
                  <p className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                    {e.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {e.duration}
                      </span>
                    )}
                    {(e.minPax || e.maxPax) && (
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {e.minPax ?? 1}–{e.maxPax ?? "any"} pax
                      </span>
                    )}
                  </p>
                </div>

                <div className="shrink-0 space-y-1 text-right">
                  {e.prices.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Price on request</p>
                  ) : (
                    e.prices.map((p) => (
                      <p key={p.id} className="text-sm">
                        <span className="text-muted-foreground mr-2 text-xs">{p.label}</span>
                        <span className="font-medium">{money(p.net, p.currency)}</span>
                      </p>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        To book an excursion, contact your account manager with the code and your travel dates.
      </p>
    </div>
  );
}
