"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { CheckCircle, Download, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
  VOUCHER_STATUS_LABELS,
  VOUCHER_STATUS_VARIANTS,
} from "@/lib/constants/reservations";
import { trpc } from "@/lib/trpc";

type VoucherRow = {
  id: string;
  code: string;
  status: string;
  createdAt: Date | string;
  issuedAt: Date | string;
  usedAt: Date | string | null;
  booking: {
    id: string;
    code: string;
    leadGuestName: string | null;
    checkIn: Date | string;
    checkOut: Date | string;
    hotel: { id: string; name: string };
  };
  createdBy: { id: string; name: string | null } | null;
};

const columns: ColumnDef<VoucherRow>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Voucher Code" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.code}</span>
    ),
  },
  {
    id: "bookingCode",
    header: "Booking",
    accessorFn: (row) => row.booking?.code ?? "—",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.booking?.code ?? "—"}</span>
    ),
  },
  {
    id: "hotel",
    header: "Hotel",
    cell: ({ row }) => row.original.booking?.hotel?.name ?? "—",
  },
  {
    id: "guest",
    header: "Lead Guest",
    cell: ({ row }) => row.original.booking?.leadGuestName ?? "—",
  },
  {
    id: "checkIn",
    header: "Check-in",
    cell: ({ row }) =>
      format(new Date(row.original.booking.checkIn), "dd MMM yyyy"),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={
          (VOUCHER_STATUS_VARIANTS[row.original.status] as
            | "default"
            | "secondary"
            | "outline"
            | "destructive") ?? "secondary"
        }
      >
        {VOUCHER_STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    id: "issuedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Issued" />
    ),
    accessorFn: (row) => row.createdAt,
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "dd MMM yyyy"),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const v = row.original;
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="View booking"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/reservations/bookings/${v.booking.id}`;
            }}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          {v.status === "ISSUED" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600"
                title="Mark as Used"
                onClick={(e) => {
                  e.stopPropagation();
                  ((window as unknown as Record<string, unknown>).__voucherTransition as ((input: { id: string; action: "use" | "cancel" }) => void) | undefined)?.({ id: v.id, action: "use" });
                }}
              >
                <CheckCircle className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                title="Cancel voucher"
                onClick={(e) => {
                  e.stopPropagation();
                  ((window as unknown as Record<string, unknown>).__voucherTransition as ((input: { id: string; action: "use" | "cancel" }) => void) | undefined)?.({ id: v.id, action: "cancel" });
                }}
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      );
    },
  },
];

export default function VouchersPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.reservations.voucher.list.useQuery();

  const transitionMutation = trpc.reservations.voucher.transition.useMutation({
    onSuccess: () => {
      utils.reservations.voucher.list.invalidate();
      toast.success("Voucher status updated");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // Expose transition to static column cells via window
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__voucherTransition = (input: { id: string; action: "use" | "cancel" }) =>
      transitionMutation.mutate(input);
  }

  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((v) => {
      if (statusFilter !== "ALL" && v.status !== statusFilter) return false;
      return true;
    });
  }, [data, statusFilter]);

  const hasFilters = statusFilter !== "ALL";

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {Object.entries(VOUCHER_STATUS_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStatusFilter("ALL")}
        >
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">Vouchers</h1>
          <p className="text-muted-foreground">
            Accommodation vouchers issued for confirmed bookings
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData as VoucherRow[]}
          searchKey="code"
          searchPlaceholder="Search vouchers..."
          toolbar={filterToolbar}
          onRowClick={(row) =>
            router.push(`/reservations/bookings/${row.booking.id}`)
          }
        />
      )}
    </div>
  );
}
