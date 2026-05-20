"use client";

import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type Rep = { id: string; phone: string | null; isActive: boolean; user: { name: string | null; email: string }; _count: { repZones: number; assignments: number } };

export default function RepsPage() {
  const router = useRouter();
  const t = useTranslations("traffic");
  const tc = useTranslations("common");

  const columns: ColumnDef<Rep>[] = [
    { id: "name", header: tc("name"), accessorFn: (row) => row.user.name ?? row.user.email },
    { id: "email", header: tc("email"), accessorFn: (row) => row.user.email },
    { accessorKey: "phone", header: tc("phone"), cell: ({ row }) => row.original.phone ?? "—" },
    { id: "zones", header: t("zones"), accessorFn: (row) => row._count.repZones },
    { id: "assignments", header: t("trafficJobs"), accessorFn: (row) => row._count.assignments },
  ];
  const { data, isLoading } = trpc.traffic.rep.list.useQuery();

  return (

    <PermissionGuard permission="traffic:driver:read">
      <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{t("reps")}</h1><p className="text-muted-foreground">{t("manageReps")}</p></div>
        <Button asChild><Link href="/traffic/reps/new"><Plus className="mr-2 h-4 w-4" />{t("newRep")}</Link></Button>
      </div>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <DataTable columns={columns} data={(data ?? []) as Rep[]} onRowClick={(row) => router.push(`/traffic/reps/${row.id}`)} />
      )}
    </div>
  

    </PermissionGuard>

  );
}
