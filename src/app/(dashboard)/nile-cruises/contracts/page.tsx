"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CRUISE_CONTRACT_STATUS_LABELS, CRUISE_CONTRACT_STATUS_VARIANTS } from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";

export default function CruiseContractsPage() {
  const { data, isLoading } = trpc.nileCruises.contract.list.useQuery();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cruise Contracts</h1>
          <p className="text-sm text-muted-foreground">Rate agreements with boat operators and allotment contracts</p>
        </div>
        <Button asChild>
          <Link href="/nile-cruises/contracts/new">
            <Plus className="mr-2 h-4 w-4" /> New Contract
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <p className="text-muted-foreground">No contracts yet</p>
            <Button asChild><Link href="/nile-cruises/contracts/new">Create First Contract</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((c) => (
            <Link key={c.id} href={`/nile-cruises/contracts/${c.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-sm">{c.code}</p>
                      <p className="text-xs text-muted-foreground">{c.name}</p>
                    </div>
                    <div className="hidden sm:block text-xs text-muted-foreground">
                      {c.boat.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden md:block text-xs text-muted-foreground text-right">
                      <div>{format(new Date(c.validFrom), "dd MMM yyyy")} – {format(new Date(c.validTo), "dd MMM yyyy")}</div>
                      <div className="font-medium">{c.baseCurrency}</div>
                    </div>
                    <Badge variant={CRUISE_CONTRACT_STATUS_VARIANTS[c.status as keyof typeof CRUISE_CONTRACT_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                      {CRUISE_CONTRACT_STATUS_LABELS[c.status as keyof typeof CRUISE_CONTRACT_STATUS_LABELS]}
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
