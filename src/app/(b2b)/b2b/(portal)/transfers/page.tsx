"use client";

import { Bus, Search, Users } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const money = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PRICE_BASIS: Record<string, string> = {
  PER_VEHICLE: "per vehicle",
  PER_PERSON: "per person",
};

/** Airport and inter-zone transfers, at the partner's own rate. */
export default function PartnerTransfersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.partner.products.transfers.useQuery({
    search: search.trim() || undefined,
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transfers</h1>
        <p className="text-muted-foreground">
          Airport and inter-zone transfers. Prices are yours — what you pay us.
        </p>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search by vehicle type"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            No transfers are priced on your account yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Bus className="text-muted-foreground size-4" />
                    <span className="font-medium">{t.vehicleType}</span>
                    {t.capacity !== null && (
                      <Badge variant="outline" className="gap-1">
                        <Users className="size-3" /> {t.capacity}
                      </Badge>
                    )}
                    {t.serviceType && <Badge variant="secondary">{t.serviceType}</Badge>}
                  </div>
                  <p className="text-muted-foreground text-xs">{t.route}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-medium">{money(t.net, t.currency)}</p>
                  <p className="text-muted-foreground text-xs">
                    {PRICE_BASIS[t.priceType] ?? t.priceType}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        To arrange a transfer, contact your account manager with the route, date and flight.
      </p>
    </div>
  );
}
