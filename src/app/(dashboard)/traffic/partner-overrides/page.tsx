"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/shared/data-table";
import { trpc } from "@/lib/trpc";

type Override = { id: string; price: any; isActive: boolean; partner: { name: string }; priceItem: { vehicleType: { name: string }; fromZone: { name: string } | null; toZone: { name: string } | null; currency: { symbol: string } } };

const columns: ColumnDef<Override>[] = [
  { id: "partner", header: "Partner", accessorFn: (r) => r.partner.name },
  { id: "vehicleType", header: "Vehicle Type", accessorFn: (r) => r.priceItem.vehicleType.name },
  { id: "fromZone", header: "From", accessorFn: (r) => r.priceItem.fromZone?.name ?? "Any" },
  { id: "toZone", header: "To", accessorFn: (r) => r.priceItem.toZone?.name ?? "Any" },
  { id: "price", header: "Override Price", accessorFn: (r) => `${r.priceItem.currency.symbol}${Number(r.price).toFixed(2)}` },
];

export default function PartnerOverridesPage() {
  const { data, isLoading } = trpc.traffic.partnerPriceOverride.list.useQuery();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header"><h1 className="text-2xl font-bold">Partner Price Overrides</h1><p className="text-muted-foreground">Custom pricing per agent/customer</p></div>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <DataTable columns={columns} data={(data ?? []) as Override[]} />
      )}
    </div>
  );
}
