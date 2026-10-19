"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { Mail, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchColumns } from "@/hooks/use-branch-columns";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/server/trpc/router";

type Row = inferRouterOutputs<AppRouter>["crm"]["mailing"]["list"][number];

const VARIANT: Record<string, "default" | "secondary" | "outline"> = { DRAFT: "outline", SENDING: "secondary", SENT: "default" };

export default function MailingsPage() {
  const t = useTranslations("crm.mailings");
  const router = useRouter();
  const { data, isLoading } = trpc.crm.mailing.list.useQuery();

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("mailing")} />,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{row.original.name}</p>
          <p className="text-muted-foreground truncate text-xs">{row.original.subject}</p>
        </div>
      ),
    },
    {
      id: "target",
      header: t("audience"),
      accessorFn: (r) => (r.audience as { target?: string }).target ?? "",
      cell: ({ getValue }) => (getValue() ? t(`target.${getValue() as "leads" | "customers"}`) : "—"),
    },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ row }) => <Badge variant={VARIANT[row.original.status]}>{t(`state.${row.original.status as "DRAFT"}`)}</Badge>,
    },
    {
      id: "sent",
      header: t("sent"),
      accessorFn: (r) => r.sentCount,
      cell: ({ row }) =>
        row.original.status === "DRAFT" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-mono tabular-nums">
            {row.original.sentCount}/{row.original._count.recipients}
            {row.original.failedCount > 0 && <span className="text-destructive"> · {t("failedSuffix", { count: row.original.failedCount })}</span>}
          </span>
        ),
    },
    {
      id: "date",
      accessorFn: (r) => new Date(r.sentAt ?? r.createdAt).getTime(),
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("date")} />,
      cell: ({ row }) => new Date(row.original.sentAt ?? row.original.createdAt).toLocaleDateString(),
    },
  ];
  const shown = useBranchColumns(columns);

  return (
    <PermissionGuard permission="crm:lead:read">
      <div className="animate-fade-in space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button asChild>
            <Link href="/crm/mailings/new">
              <Plus className="me-2 size-4" /> {t("new")}
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !data?.length ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
            <Mail className="text-muted-foreground size-8" aria-hidden />
            <div>
              <p className="font-medium">{t("emptyTitle")}</p>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">{t("emptyBody")}</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/crm/mailings/new">
                <Plus className="me-2 size-4" /> {t("emptyCta")}
              </Link>
            </Button>
          </div>
        ) : (
          <DataTable
            columns={shown}
            data={data}
            searchKey="name"
            searchPlaceholder={t("search")}
            onRowClick={(r) => router.push(`/crm/mailings/${r.id}`)}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
