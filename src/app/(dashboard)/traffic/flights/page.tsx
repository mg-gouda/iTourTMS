"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

type Flight = { id: string; flightNumber: string; airlineCode: string | null; flightDate: string | Date; arrTime: string | null; depTime: string | null; terminal: string | null; arrAirport: { code: string } | null; depAirport: { code: string } | null; _count: { jobs: number } };

const columns: ColumnDef<Flight>[] = [
  { accessorKey: "flightNumber", header: "Flight No." },
  { accessorKey: "airlineCode", header: "Airline", cell: ({ row }) => row.original.airlineCode ?? "—" },
  { id: "date", header: "Date", accessorFn: (row) => new Date(row.flightDate).toLocaleDateString() },
  { id: "arrAirport", header: "Arr Airport", accessorFn: (row) => row.arrAirport?.code ?? "—" },
  { accessorKey: "arrTime", header: "Arr Time", cell: ({ row }) => row.original.arrTime ?? "—" },
  { id: "depAirport", header: "Dep Airport", accessorFn: (row) => row.depAirport?.code ?? "—" },
  { accessorKey: "depTime", header: "Dep Time", cell: ({ row }) => row.original.depTime ?? "—" },
  { accessorKey: "terminal", header: "Terminal", cell: ({ row }) => row.original.terminal ?? "—" },
  { id: "jobs", header: "Jobs", accessorFn: (row) => row._count.jobs },
];

export default function FlightsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.traffic.trafficFlight.list.useQuery();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Flights</h1><p className="text-muted-foreground">Manage flight records for arrivals and departures</p></div>
        <Button asChild><Link href="/traffic/flights/new"><Plus className="mr-2 h-4 w-4" />New Flight</Link></Button>
      </div>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <DataTable columns={columns} data={(data ?? []) as Flight[]} onRowClick={(row) => router.push(`/traffic/flights/${row.id}`)} />
      )}
    </div>
  );
}
