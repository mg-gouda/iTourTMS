"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const VOUCHER_STATUS_LABELS: Record<string, string> = {
  ISSUED: "Issued",
  USED: "Used",
  CANCELLED: "Cancelled",
};

const VOUCHER_STATUS_VARIANTS: Record<string, string> = {
  ISSUED: "default",
  USED: "secondary",
  CANCELLED: "destructive",
};

type VoucherRow = {
  id: string;
  code: string;
  status: string;
  issuedAt: Date;
  booking: {
    id: string;
    code: string;
    hotel: { id: string; name: string };
    tourOperator: { id: string; name: string; code: string } | null;
  };
};

const columns: ColumnDef<VoucherRow>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
  },
  {
    id: "bookingCode",
    header: "Booking",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.booking.code}</span>,
  },
  {
    id: "hotelName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hotel" />,
    cell: ({ row }) => <span className="font-medium">{row.original.booking.hotel.name}</span>,
  },
  {
    id: "tourOperatorName",
    header: "Tour Operator",
    cell: ({ row }) => row.original.booking.tourOperator?.name ?? "—",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={VOUCHER_STATUS_VARIANTS[row.original.status] as "default"}>
        {VOUCHER_STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "issuedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Issued At" />,
    cell: ({ row }) => new Date(row.original.issuedAt).toLocaleDateString(),
  },
];

export default function VouchersPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.b2bPortal.voucher.list.useQuery({});
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let rows = (data?.items ?? []) as unknown as VoucherRow[];
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [data, statusFilter]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vouchers</h1>
          <p className="text-muted-foreground">Generate and manage booking vouchers</p>
        </div>
        <GenerateVoucherButton />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchKey="hotelName"
          searchPlaceholder="Search vouchers..."
          toolbar={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(VOUCHER_STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          onRowClick={(row) => router.push(`/reservations/bookings/${row.id}`)}
        />
      )}
    </div>
  );
}

function GenerateVoucherButton() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: bookings } = trpc.b2bPortal.reservation.list.useQuery(
    { page: 1, pageSize: 50 },
    { enabled: open },
  );

  const generateMutation = trpc.b2bPortal.voucher.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Voucher ${data.code} generated`);
      utils.b2bPortal.voucher.list.invalidate();
      setOpen(false);
      setBookingId("");
      setNotes("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Generate Voucher</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Voucher</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Booking</Label>
            <Select value={bookingId} onValueChange={setBookingId}>
              <SelectTrigger><SelectValue placeholder="Select booking..." /></SelectTrigger>
              <SelectContent>
                {(bookings?.items ?? []).map((b: { id: string; code: string; leadGuestName: string | null }) => (
                  <SelectItem key={b.id} value={b.id}>{b.code} — {b.leadGuestName ?? "N/A"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Voucher notes..." />
          </div>
          <Button
            className="w-full"
            disabled={!bookingId || generateMutation.isPending}
            onClick={() => generateMutation.mutate({ bookingId, notes: notes || undefined })}
          >
            {generateMutation.isPending ? "Generating..." : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
