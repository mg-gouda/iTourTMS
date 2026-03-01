"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/shared/data-table";
import { trpc } from "@/lib/trpc";

type SupplierPrice = { id: string; routeDesc: string | null; price: any; isActive: boolean; supplier: { name: string }; vehicleType: { name: string }; currency: { code: string; symbol: string } };

const columns: ColumnDef<SupplierPrice>[] = [
  { id: "supplier", header: "Supplier", accessorFn: (r) => r.supplier.name },
  { id: "vehicleType", header: "Vehicle Type", accessorFn: (r) => r.vehicleType.name },
  { accessorKey: "routeDesc", header: "Route", cell: ({ row }) => row.original.routeDesc ?? "—" },
  { id: "price", header: "Price", accessorFn: (r) => `${r.currency.symbol}${Number(r.price).toFixed(2)}` },
];

export default function SupplierPricesPage() {
  const { data, isLoading } = trpc.traffic.supplierTripPrice.list.useQuery();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header"><h1 className="text-2xl font-bold">Supplier Trip Prices</h1><p className="text-muted-foreground">Cost rates from transport suppliers</p></div>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <DataTable columns={columns} data={(data ?? []) as SupplierPrice[]} />
      )}
    </div>
  );
}
