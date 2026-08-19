"use client";

import { Package, Search } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const money = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Ready-made tour packages, at the partner's own rate. */
export default function PartnerPackagesPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.partner.products.packages.useQuery({
    search: search.trim() || undefined,
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tour packages</h1>
        <p className="text-muted-foreground">
          Ready-made itineraries we have costed. Prices are yours — what you pay us.
        </p>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search packages"
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
            No packages are available on your account yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Package className="text-muted-foreground size-4" />
                    <span className="font-medium">{p.name}</span>
                  </div>
                  {p.description && (
                    <p className="text-muted-foreground line-clamp-2 text-xs">{p.description}</p>
                  )}
                  {p.components.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {p.components.slice(0, 6).map((c) => (
                        <Badge key={c.id} variant="outline" className="text-[10px]">
                          {c.type}
                        </Badge>
                      ))}
                      {p.components.length > 6 && (
                        <span className="text-muted-foreground text-[10px]">
                          +{p.components.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-medium">{money(p.net, p.currency)}</p>
                  <p className="text-muted-foreground text-xs">total</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        To book a package, contact your account manager with the name and your travel dates.
      </p>
    </div>
  );
}
