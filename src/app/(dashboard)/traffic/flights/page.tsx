"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type Flight = { id: string; flightNumber: string; airlineCode: string | null; flightDate: string | Date; arrTime: string | null; depTime: string | null; terminal: string | null; arrAirport: { code: string } | null; depAirport: { code: string } | null; _count: { jobs: number } };

export default function FlightsPage() {
  const t = useTranslations("traffic");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.traffic.trafficFlight.list.useQuery();

  const columns: ColumnDef<Flight>[] = [
    { accessorKey: "flightNumber", header: t("flightNumber") },
    { accessorKey: "airlineCode", header: t("airline"), cell: ({ row }) => row.original.airlineCode ?? "—" },
    { id: "date", header: tCommon("date"), accessorFn: (row) => new Date(row.flightDate).toLocaleDateString() },
    { id: "arrAirport", header: t("arrAirport"), accessorFn: (row) => row.arrAirport?.code ?? "—" },
    { accessorKey: "arrTime", header: t("arrTime"), cell: ({ row }) => row.original.arrTime ?? "—" },
    { id: "depAirport", header: t("depAirport"), accessorFn: (row) => row.depAirport?.code ?? "—" },
    { accessorKey: "depTime", header: t("depTime"), cell: ({ row }) => row.original.depTime ?? "—" },
    { accessorKey: "terminal", header: t("terminal"), cell: ({ row }) => row.original.terminal ?? "—" },
    { id: "jobs", header: t("trafficJobs"), accessorFn: (row) => row._count.jobs },
  ];

  return (

    <PermissionGuard permission="traffic:airport:read">
      <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{t("flights")}</h1><p className="text-muted-foreground">{t("manageFlights")}</p></div>
        <Button asChild><Link href="/traffic/flights/new"><Plus className="mr-2 h-4 w-4" />{t("newFlight")}</Link></Button>
      </div>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <DataTable columns={columns} data={(data ?? []) as Flight[]} onRowClick={(row) => router.push(`/traffic/flights/${row.id}`)} />
      )}
    </div>
  

    </PermissionGuard>

  );
}
