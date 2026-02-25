"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type TariffRow = {
  id: string;
  name: string;
  currencyCode: string;
  generatedAt: Date;
  contract: { id: string; name: string; code: string };
  tourOperator: { id: string; name: string; code: string };
  markupRule: { id: string; name: string; markupType: string; value: { toString(): string } } | null;
};

const columns: ColumnDef<TariffRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    id: "contract",
    header: "Contract",
    cell: ({ row }) => (
      <span>
        {row.original.contract.name}{" "}
        <span className="font-mono text-xs text-muted-foreground">
          ({row.original.contract.code})
        </span>
      </span>
    ),
  },
  {
    id: "tourOperator",
    header: "Tour Operator",
    cell: ({ row }) => row.original.tourOperator.name,
  },
  {
    id: "markup",
    header: "Markup",
    cell: ({ row }) => {
      if (!row.original.markupRule) return <span className="text-muted-foreground">None</span>;
      const r = row.original.markupRule;
      const val = parseFloat(r.value.toString());
      return (
        <Badge variant="outline">
          {r.markupType === "PERCENTAGE" ? `${val}%` : val.toFixed(2)} {r.name}
        </Badge>
      );
    },
  },
  {
    accessorKey: "currencyCode",
    header: "Currency",
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.currencyCode}</Badge>
    ),
  },
  {
    id: "generatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Generated" />
    ),
    accessorFn: (row) => row.generatedAt,
    cell: ({ row }) =>
      new Date(row.original.generatedAt).toLocaleDateString(),
  },
];

export default function TariffsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.contracting.tariff.list.useQuery();

  const regenerateMutation = trpc.contracting.tariff.regenerate.useMutation({
    onSuccess: () => {
      utils.contracting.tariff.list.invalidate();
      toast.success("Tariff regenerated");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.contracting.tariff.delete.useMutation({
    onSuccess: () => {
      utils.contracting.tariff.list.invalidate();
      toast.success("Tariff deleted");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const actionColumn: ColumnDef<TariffRow> = {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Regenerate"
          onClick={() => regenerateMutation.mutate({ id: row.original.id })}
          disabled={regenerateMutation.isPending}
        >
          <RefreshCw className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive"
          title="Delete"
          onClick={() => deleteMutation.mutate({ id: row.original.id })}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    ),
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">Tariffs</h1>
          <p className="text-muted-foreground">
            Generated tariff sheets with markup applied for tour operators
          </p>
        </div>
        <Button asChild>
          <Link href="/contracting/tariffs/generate">
            <Plus className="mr-2 size-4" /> Generate Tariff
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={[...columns, actionColumn]}
          data={(data ?? []) as TariffRow[]}
          searchKey="name"
          searchPlaceholder="Search tariffs..."
          onRowClick={(row) => router.push(`/contracting/tariffs/${row.id}`)}
        />
      )}
    </div>
  );
}
