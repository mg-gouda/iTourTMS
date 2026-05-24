"use client";

import { format } from "date-fns";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function CruiseOffersPage() {
  const { data: contracts, isLoading } = trpc.nileCruises.contract.list.useQuery();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Special Offers</h1>
        <p className="text-sm text-muted-foreground">Manage offers via the contract detail page</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !contracts?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <p className="text-muted-foreground">No published contracts</p>
            <p className="text-sm text-muted-foreground">Publish a contract first, then add offers from the contract detail page</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => (
            <Link key={c.id} href={`/nile-cruises/contracts/${c.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{c.code}</p>
                    <p className="text-xs text-muted-foreground">{c.name} · {c.boat.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(c.validFrom), "dd MMM yyyy")} – {format(new Date(c.validTo), "dd MMM yyyy")}
                    </span>
                    <Badge variant="default">Published</Badge>
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
