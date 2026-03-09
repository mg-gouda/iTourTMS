"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

type RateSheetRow = {
  id: string;
  name: string;
  contract: { id: string; code: string; name: string } | null;
  tourOperator: { id: string; name: string; code: string } | null;
  markupRule: { id: string; name: string; markupType: string; value: unknown } | null;
  generatedAt: Date;
};

const columns: ColumnDef<RateSheetRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    id: "contract",
    header: "Contract",
    cell: ({ row }) => row.original.contract?.name ?? "—",
  },
  {
    id: "tourOperator",
    header: "Tour Operator",
    cell: ({ row }) => row.original.tourOperator?.name ?? "—",
  },
  {
    id: "markupRule",
    header: "Markup Rule",
    cell: ({ row }) => row.original.markupRule?.name ?? "—",
  },
  {
    id: "generatedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Generated At" />,
    cell: ({ row }) => new Date(row.original.generatedAt).toLocaleDateString(),
  },
];

export default function RateSheetsPage() {
  const { data, isLoading } = trpc.b2bPortal.rateSheet.list.useQuery();
  const { data: operators } = trpc.b2bPortal.tourOperator.list.useQuery();
  const [operatorFilter, setOperatorFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let rows = (data ?? []) as RateSheetRow[];
    if (operatorFilter !== "all")
      rows = rows.filter((r) => r.tourOperator?.name === operatorFilter);
    return rows;
  }, [data, operatorFilter]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rate Sheets</h1>
          <p className="text-muted-foreground">Publish and distribute rate sheets to partners</p>
        </div>
        <Button asChild>
          <Link href="/contracting/tariffs">
            <ExternalLink className="mr-2 size-4" /> Generate Rate Sheet
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
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchKey="name"
          searchPlaceholder="Search rate sheets..."
          toolbar={
            <Select value={operatorFilter} onValueChange={setOperatorFilter}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="All Operators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Operators</SelectItem>
                {(operators ?? []).map((op: { id: string; name: string }) => (
                  <SelectItem key={op.id} value={op.name}>
                    {op.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      )}
    </div>
  );
}
