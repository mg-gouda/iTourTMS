"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

type Rep = { id: string; phone: string | null; isActive: boolean; user: { name: string | null; email: string }; _count: { repZones: number; assignments: number } };

const columns: ColumnDef<Rep>[] = [
  { id: "name", header: "Name", accessorFn: (row) => row.user.name ?? row.user.email },
  { id: "email", header: "Email", accessorFn: (row) => row.user.email },
  { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
  { id: "zones", header: "Zones", accessorFn: (row) => row._count.repZones },
  { id: "assignments", header: "Jobs", accessorFn: (row) => row._count.assignments },
];

export default function RepsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.traffic.rep.list.useQuery();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Representatives</h1><p className="text-muted-foreground">Manage field reps and zone assignments</p></div>
        <Button asChild><Link href="/traffic/reps/new"><Plus className="mr-2 h-4 w-4" />New Rep</Link></Button>
      </div>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <DataTable columns={columns} data={(data ?? []) as Rep[]} onRowClick={(row) => router.push(`/traffic/reps/${row.id}`)} />
      )}
    </div>
  );
}
