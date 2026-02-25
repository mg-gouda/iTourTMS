"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { differenceInDays, format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_VARIANTS,
} from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type TimeframeOption = {
  label: string;
  days: number;
  includeExpired: boolean;
};

const TIMEFRAMES: TimeframeOption[] = [
  { label: "30 Days", days: 30, includeExpired: false },
  { label: "60 Days", days: 60, includeExpired: false },
  { label: "90 Days", days: 90, includeExpired: false },
  { label: "Expired", days: 365, includeExpired: true },
];

type ExpiringRow = {
  id: string;
  name: string;
  code: string;
  status: string;
  validFrom: string | Date;
  validTo: string | Date;
  hotel: { id: string; name: string } | null;
  baseCurrency: { id: string; code: string } | null;
};

function getDaysLeft(validTo: string | Date): number {
  return differenceInDays(new Date(validTo), new Date());
}

const columns: ColumnDef<ExpiringRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contract" />
    ),
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.name}</span>
        <span className="ml-2 font-mono text-xs text-muted-foreground">
          {row.original.code}
        </span>
      </div>
    ),
  },
  {
    id: "hotel",
    header: "Hotel",
    cell: ({ row }) => row.original.hotel?.name ?? "—",
  },
  {
    id: "validTo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Expires" />
    ),
    cell: ({ row }) => format(new Date(row.original.validTo), "dd MMM yyyy"),
  },
  {
    id: "daysLeft",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Days Left" />
    ),
    cell: ({ row }) => {
      const days = getDaysLeft(row.original.validTo);
      return (
        <span
          className={cn(
            "font-mono text-sm font-medium",
            days < 0 && "text-destructive",
            days >= 0 && days <= 30 && "text-orange-600 dark:text-orange-400",
            days > 30 && days <= 60 && "text-amber-600 dark:text-amber-400",
            days > 60 && "text-muted-foreground",
          )}
        >
          {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
        </span>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = getDaysLeft(rowA.original.validTo);
      const b = getDaysLeft(rowB.original.validTo);
      return a - b;
    },
  },
  {
    id: "currency",
    header: "Currency",
    cell: ({ row }) => row.original.baseCurrency?.code ?? "—",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={
          (CONTRACT_STATUS_VARIANTS[row.original.status] as
            | "default"
            | "secondary"
            | "outline"
            | "destructive") ?? "secondary"
        }
      >
        {CONTRACT_STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
];

export default function ExpiringContractsPage() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<TimeframeOption>(TIMEFRAMES[1]); // 60 days default

  const { data, isLoading } = trpc.contracting.contract.listExpiring.useQuery({
    days: timeframe.days,
    includeExpired: timeframe.includeExpired,
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight">
              Expiring Contracts
            </h1>
          </div>
          <p className="text-muted-foreground">
            Contracts expiring soon or already expired — take action before it's
            too late
          </p>
        </div>
      </div>

      {/* Timeframe filter */}
      <div className="flex gap-2">
        {TIMEFRAMES.map((tf) => (
          <Button
            key={tf.label}
            variant={timeframe.label === tf.label ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeframe(tf)}
          >
            {tf.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b px-4 py-3"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data as ExpiringRow[]) ?? []}
          searchKey="name"
          searchPlaceholder="Search expiring contracts..."
          onRowClick={(row) =>
            router.push(`/contracting/contracts/${row.id}`)
          }
        />
      )}
    </div>
  );
}
