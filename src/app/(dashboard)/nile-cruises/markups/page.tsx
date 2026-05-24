"use client";

import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function CruiseMarkupsPage() {
  const { data: contracts, isLoading } = trpc.nileCruises.contract.list.useQuery();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Markups & Tariff</h1>
        <p className="text-sm text-muted-foreground">Configure market and agent markups per contract</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !contracts?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <p className="text-muted-foreground">No contracts yet</p>
            <p className="text-sm text-muted-foreground">Create contracts first, then configure their markups</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => (
            <Link key={c.id} href={`/nile-cruises/contracts/${c.id}?tab=markup`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{c.code}</p>
                    <p className="text-xs text-muted-foreground">{c.name} · {c.boat.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.status}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
