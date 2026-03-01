"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { TT_VEHICLE_STATUS_LABELS, TT_VEHICLE_STATUS_VARIANTS, TT_VEHICLE_OWNERSHIP_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

type Vehicle = {
  id: string;
  plateNumber: string;
  make: string | null;
  model: string | null;
  year: number | null;
  ownership: string;
  status: string;
  vehicleType: { name: string };
  supplier: { name: string } | null;
  _count: { compliances: number; driverVehicles: number };
};

const columns: ColumnDef<Vehicle>[] = [
  { accessorKey: "plateNumber", header: "Plate Number", cell: ({ row }) => <span className="font-mono">{row.original.plateNumber}</span> },
  { id: "type", header: "Type", accessorFn: (row) => row.vehicleType.name },
  { id: "makeModel", header: "Make/Model", accessorFn: (row) => [row.make, row.model].filter(Boolean).join(" ") || "—" },
  { accessorKey: "year", header: "Year", cell: ({ row }) => row.original.year ?? "—" },
  { id: "ownership", header: "Ownership", accessorFn: (row) => TT_VEHICLE_OWNERSHIP_LABELS[row.ownership] ?? row.ownership },
  {
    id: "status", header: "Status", accessorFn: (row) => row.status,
    cell: ({ row }) => (
      <Badge variant={(TT_VEHICLE_STATUS_VARIANTS[row.original.status] ?? "secondary") as never}>
        {TT_VEHICLE_STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  },
  { id: "supplier", header: "Supplier", accessorFn: (row) => row.supplier?.name ?? "—" },
  { id: "drivers", header: "Drivers", accessorFn: (row) => row._count.driverVehicles },
];

export default function VehiclesPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.traffic.vehicle.list.useQuery();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vehicles</h1>
          <p className="text-muted-foreground">Manage fleet inventory</p>
        </div>
        <Button asChild><Link href="/traffic/vehicles/new"><Plus className="mr-2 h-4 w-4" />New Vehicle</Link></Button>
      </div>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <DataTable columns={columns} data={(data ?? []) as Vehicle[]} onRowClick={(row) => router.push(`/traffic/vehicles/${row.id}`)} />
      )}
    </div>
  );
}
