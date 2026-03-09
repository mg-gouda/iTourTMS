"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard, DollarSign, Plus, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

type PartnerRow = {
  id: string;
  name: string;
  creditLimit: unknown;
  creditUsed: unknown;
  paymentTermDays: number | null;
};

type TransactionRow = {
  id: string;
  createdAt: Date;
  type: string;
  amount: unknown;
  runningBalance: unknown;
  reference: string | null;
  booking: { id: string; code: string } | null;
  notes: string | null;
};

const TRANSACTION_TYPE_VARIANTS: Record<string, string> = {
  PAYMENT: "default",
  CHARGE: "destructive",
  ADJUSTMENT: "secondary",
  REFUND: "outline",
};

const transactionColumns: ColumnDef<TransactionRow>[] = [
  {
    id: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    accessorFn: (row) => new Date(row.createdAt).getTime(),
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant={(TRANSACTION_TYPE_VARIANTS[row.original.type] ?? "secondary") as "default"}>
        {row.original.type}
      </Badge>
    ),
  },
  {
    id: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const val = Number(row.original.amount ?? 0);
      return (
        <span className={val >= 0 ? "text-green-600" : "text-red-600"}>
          ${Math.abs(val).toLocaleString()}
        </span>
      );
    },
  },
  {
    id: "runningBalance",
    header: "Balance",
    cell: ({ row }) => `$${Number(row.original.runningBalance ?? 0).toLocaleString()}`,
  },
  {
    accessorKey: "reference",
    header: "Reference",
    cell: ({ row }) => row.original.reference ?? "—",
  },
  {
    id: "booking",
    header: "Booking",
    cell: ({ row }) =>
      row.original.booking ? (
        <span className="font-mono text-xs">{row.original.booking.code}</span>
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => (
      <span className="max-w-[200px] truncate block text-sm text-muted-foreground">
        {row.original.notes ?? "—"}
      </span>
    ),
  },
];

export default function CreditManagementPage() {
  const utils = trpc.useUtils();
  const { data: partners, isLoading: partnersLoading } = trpc.b2bPortal.tourOperator.list.useQuery();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, reference: "", notes: "" });
  const [adjustmentForm, setAdjustmentForm] = useState({ amount: 0, notes: "" });

  const { data: transactions, isLoading: txLoading } = trpc.b2bPortal.credit.listTransactions.useQuery(
    { tourOperatorId: selectedPartnerId! },
    { enabled: !!selectedPartnerId }
  );

  const paymentMutation = trpc.b2bPortal.credit.recordPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded");
      utils.b2bPortal.credit.listTransactions.invalidate();
      utils.b2bPortal.tourOperator.list.invalidate();
      setPaymentDialogOpen(false);
      setPaymentForm({ amount: 0, reference: "", notes: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const adjustmentMutation = trpc.b2bPortal.credit.adjustment.useMutation({
    onSuccess: () => {
      toast.success("Adjustment recorded");
      utils.b2bPortal.credit.listTransactions.invalidate();
      utils.b2bPortal.tourOperator.list.invalidate();
      setAdjustmentDialogOpen(false);
      setAdjustmentForm({ amount: 0, notes: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  function getCreditColor(limit: number, used: number) {
    if (limit <= 0) return "text-muted-foreground";
    const available = limit - used;
    const pct = available / limit;
    if (pct > 0.5) return "text-green-600";
    if (pct > 0.2) return "text-amber-600";
    return "text-red-600";
  }

  function getCreditBorder(limit: number, used: number) {
    if (limit <= 0) return "";
    const pct = (limit - used) / limit;
    if (pct > 0.5) return "border-green-200 dark:border-green-800";
    if (pct > 0.2) return "border-amber-200 dark:border-amber-800";
    return "border-red-200 dark:border-red-800";
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credit Management</h1>
        <p className="text-muted-foreground">Partner credit limits, balances, and payment tracking</p>
      </div>

      {/* Partner Credit Overview */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Partner Credit Overview</h2>
        {partnersLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2"><Skeleton className="h-4 w-32" /></CardHeader>
                <CardContent><Skeleton className="h-8 w-24" /></CardContent>
              </Card>
            ))}
          </div>
        ) : !partners?.length ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No partners found. Add tour operators first.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(partners as PartnerRow[]).map((partner) => {
              const limit = Number(partner.creditLimit ?? 0);
              const used = Number(partner.creditUsed ?? 0);
              const available = limit - used;
              const isSelected = selectedPartnerId === partner.id;

              return (
                <Card
                  key={partner.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${getCreditBorder(limit, used)} ${isSelected ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedPartnerId(partner.id)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{partner.name}</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Credit Limit</span>
                        <span className="font-medium">${limit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Used</span>
                        <span className="font-medium">${used.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Available</span>
                        <span className={`font-bold ${getCreditColor(limit, used)}`}>
                          ${available.toLocaleString()}
                        </span>
                      </div>
                      {partner.paymentTermDays && (
                        <div className="flex justify-between text-sm pt-1 border-t">
                          <span className="text-muted-foreground">Payment Terms</span>
                          <span>{partner.paymentTermDays} days</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Credit Transactions */}
      {selectedPartnerId && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Transactions — {(partners as PartnerRow[])?.find((p) => p.id === selectedPartnerId)?.name}
            </h2>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { setPaymentForm({ amount: 0, reference: "", notes: "" }); setPaymentDialogOpen(true); }}>
                <DollarSign className="mr-1 h-4 w-4" /> Record Payment
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setAdjustmentForm({ amount: 0, notes: "" }); setAdjustmentDialogOpen(true); }}>
                <SlidersHorizontal className="mr-1 h-4 w-4" /> Adjustment
              </Button>
            </div>
          </div>

          {txLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-64" />
              <div className="overflow-hidden rounded-lg border shadow-sm">
                <div className="bg-primary h-10" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <DataTable
              columns={transactionColumns}
              data={(transactions ?? []) as TransactionRow[]}
              searchKey="reference"
              searchPlaceholder="Search transactions..."
            />
          )}
        </div>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => { if (!open) setPaymentDialogOpen(false); else setPaymentDialogOpen(true); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              paymentMutation.mutate({
                tourOperatorId: selectedPartnerId!,
                amount: paymentForm.amount,
                reference: paymentForm.reference || undefined,
                notes: paymentForm.notes || undefined,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })} required />
            </div>
            <div>
              <Label>Reference</Label>
              <Input value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="e.g. Bank transfer ref" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
            </div>
            {paymentMutation.error && (
              <p className="text-sm text-destructive">{paymentMutation.error.message}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={paymentMutation.isPending}>
                {paymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={(open) => { if (!open) setAdjustmentDialogOpen(false); else setAdjustmentDialogOpen(true); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Credit Adjustment</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adjustmentMutation.mutate({
                tourOperatorId: selectedPartnerId!,
                amount: adjustmentForm.amount,
                notes: adjustmentForm.notes || undefined,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label>Amount (negative to reduce)</Label>
              <Input type="number" step="0.01" value={adjustmentForm.amount} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: parseFloat(e.target.value) || 0 })} required />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={adjustmentForm.notes} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })} />
            </div>
            {adjustmentMutation.error && (
              <p className="text-sm text-destructive">{adjustmentMutation.error.message}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={adjustmentMutation.isPending}>
                {adjustmentMutation.isPending ? "Saving..." : "Apply Adjustment"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAdjustmentDialogOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
