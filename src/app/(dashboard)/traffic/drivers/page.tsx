"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { TT_DRIVER_STATUS_LABELS, TT_DRIVER_STATUS_VARIANTS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

type Driver = {
  id: string;
  status: string;
  licenseNumber: string | null;
  phone: string | null;
  user: { name: string | null; email: string };
  _count: { driverVehicles: number; assignments: number };
};

const columns: ColumnDef<Driver>[] = [
  { id: "name", header: "Name", accessorFn: (row) => row.user.name ?? row.user.email },
  { id: "email", header: "Email", accessorFn: (row) => row.user.email },
  { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
  { accessorKey: "licenseNumber", header: "License", cell: ({ row }) => row.original.licenseNumber ?? "—" },
  {
    id: "status", header: "Status", accessorFn: (row) => row.status,
    cell: ({ row }) => (
      <Badge variant={(TT_DRIVER_STATUS_VARIANTS[row.original.status] ?? "secondary") as never}>
        {TT_DRIVER_STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  },
  { id: "vehicles", header: "Vehicles", accessorFn: (row) => row._count.driverVehicles },
  { id: "assignments", header: "Jobs", accessorFn: (row) => row._count.assignments },
];

export default function DriversPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.traffic.driver.list.useQuery();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drivers</h1>
          <p className="text-muted-foreground">Manage driver records</p>
        </div>
        <Button asChild><Link href="/traffic/drivers/new"><Plus className="mr-2 h-4 w-4" />New Driver</Link></Button>
      </div>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <DataTable columns={columns} data={(data ?? []) as Driver[]} onRowClick={(row) => router.push(`/traffic/drivers/${row.id}`)} />
      )}
    </div>
  );
}
