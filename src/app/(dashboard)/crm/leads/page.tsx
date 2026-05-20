"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CRM_LEAD_SOURCE_LABELS,
  CRM_LEAD_STATUS_LABELS,
  CRM_LEAD_STATUS_VARIANTS,
} from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type LeadRow = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string | null;
  source: string;
  status: string;
  assignedTo: { id: string; name: string | null } | null;
  createdAt: Date;
};

export default function LeadsPage() {
  const t = useTranslations("crm");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = trpc.crm.lead.list.useQuery();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const columns: ColumnDef<LeadRow>[] = [
    {
      accessorKey: "code",
      header: tc("code"),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    {
      id: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={tc("name")} />,
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: tc("email"),
      cell: ({ row }) => row.original.email ?? "—",
    },
    {
      accessorKey: "source",
      header: t("source"),
      cell: ({ row }) => CRM_LEAD_SOURCE_LABELS[row.original.source] ?? row.original.source,
    },
    {
      accessorKey: "status",
      header: tc("status"),
      cell: ({ row }) => (
        <Badge variant={CRM_LEAD_STATUS_VARIANTS[row.original.status] as "default"}>
          {CRM_LEAD_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "assignedTo",
      header: t("assignedTo"),
      accessorFn: (row) => row.assignedTo?.name ?? "",
      cell: ({ row }) => row.original.assignedTo?.name ?? "—",
    },
  ];

  const filtered = useMemo(() => {
    let rows = (data ?? []) as LeadRow[];
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    if (sourceFilter !== "all") rows = rows.filter((r) => r.source === sourceFilter);
    return rows;
  }, [data, statusFilter, sourceFilter]);

  const filterToolbar = (
    <>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder={t("allStatuses")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allStatuses")}</SelectItem>
          {Object.entries(CRM_LEAD_STATUS_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sourceFilter} onValueChange={setSourceFilter}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder={t("allSources")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allSources")}</SelectItem>
          {Object.entries(CRM_LEAD_SOURCE_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (

    <PermissionGuard permission="crm:lead:read">
      <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("leads")}</h1>
          <p className="text-muted-foreground">{t("manageSalesLeads")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const { exportLeadsToExcel } = await import("@/lib/export/crm-leads-excel");
              await exportLeadsToExcel((data ?? []) as unknown as Parameters<typeof exportLeadsToExcel>[0]);
            }}
            disabled={!data?.length}
          >
            {t("exportExcel")}
          </Button>
          <Button asChild>
            <Link href="/crm/leads/new">
              <Plus className="mr-2 size-4" /> {t("newLead")}
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchKey="name"
          searchPlaceholder={t("searchLeads")}
          toolbar={filterToolbar}
          onRowClick={(row) => router.push(`/crm/leads/${row.id}`)}
        />
      )}
    </div>


    </PermissionGuard>

  );
}
