"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/shared/data-table";
import { TT_PRICE_TYPE_LABELS, TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

type PriceItem = { id: string; priceType: string; price: any; serviceType: string | null; description: string | null; isActive: boolean; vehicleType: { name: string }; fromZone: { name: string } | null; toZone: { name: string } | null; currency: { code: string; symbol: string } };

const columns: ColumnDef<PriceItem>[] = [
  { id: "vehicleType", header: "Vehicle Type", accessorFn: (r) => r.vehicleType.name },
  { id: "service", header: "Service", accessorFn: (r) => r.serviceType ? TT_SERVICE_TYPE_LABELS[r.serviceType] ?? r.serviceType : "Any" },
  { id: "priceType", header: "Price Type", accessorFn: (r) => TT_PRICE_TYPE_LABELS[r.priceType] ?? r.priceType },
  { id: "fromZone", header: "From Zone", accessorFn: (r) => r.fromZone?.name ?? "Any" },
  { id: "toZone", header: "To Zone", accessorFn: (r) => r.toZone?.name ?? "Any" },
  { id: "price", header: "Price", accessorFn: (r) => `${r.currency.symbol}${Number(r.price).toFixed(2)}` },
];

export default function PricingPage() {
  const { data, isLoading } = trpc.traffic.priceItem.list.useQuery();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header"><h1 className="text-2xl font-bold">Price Items</h1><p className="text-muted-foreground">Base pricing grid for transport services</p></div>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <DataTable columns={columns} data={(data ?? []) as PriceItem[]} />
      )}
    </div>
  );
}
