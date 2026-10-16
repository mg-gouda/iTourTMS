"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { Mail, Plus } from "lucide-react";
import Link from "next/link";
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
  const router = useRouter();
  const { data, isLoading } = trpc.crm.mailing.list.useQuery();

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Mailing" />,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{row.original.name}</p>
          <p className="text-muted-foreground truncate text-xs">{row.original.subject}</p>
        </div>
      ),
    },
    {
      id: "target",
      header: "Audience",
      accessorFn: (r) => (r.audience as { target?: string }).target ?? "",
      cell: ({ getValue }) => <span className="capitalize">{getValue() as string}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={VARIANT[row.original.status]}>{row.original.status.toLowerCase()}</Badge>,
    },
    {
      id: "sent",
      header: "Sent",
      accessorFn: (r) => r.sentCount,
      cell: ({ row }) =>
        row.original.status === "DRAFT" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-mono tabular-nums">
            {row.original.sentCount}/{row.original._count.recipients}
            {row.original.failedCount > 0 && <span className="text-destructive"> · {row.original.failedCount} failed</span>}
          </span>
        ),
    },
    {
      id: "date",
      accessorFn: (r) => new Date(r.sentAt ?? r.createdAt).getTime(),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => new Date(row.original.sentAt ?? row.original.createdAt).toLocaleDateString(),
    },
  ];
  const shown = useBranchColumns(columns);

  return (
    <PermissionGuard permission="crm:lead:read">
      <div className="animate-fade-in space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mailings</h1>
            <p className="text-muted-foreground">One email to many leads or customers, with unsubscribe handled for you.</p>
          </div>
          <Button asChild>
            <Link href="/crm/mailings/new">
              <Plus className="me-2 size-4" /> New mailing
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !data?.length ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
            <Mail className="text-muted-foreground size-8" aria-hidden />
            <div>
              <p className="font-medium">No mailings yet</p>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Pick an audience (say, warm UK leads from the website), write once, send yourself a test, then send.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/crm/mailings/new">
                <Plus className="me-2 size-4" /> Write the first mailing
              </Link>
            </Button>
          </div>
        ) : (
          <DataTable
            columns={shown}
            data={data}
            searchKey="name"
            searchPlaceholder="Search mailings…"
            onRowClick={(r) => router.push(`/crm/mailings/${r.id}`)}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
