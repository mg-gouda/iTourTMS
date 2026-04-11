"use client";

import { format } from "date-fns";
import { Fragment, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANTS,
  BOOKING_SOURCE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANTS,
} from "@/lib/constants/reservations";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function BookingReconciliationPage() {
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNPAID" | "PARTIAL" | "PAID">("ALL");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "WEBSITE" | "DIRECT" | "B2B" | "TOUR_OPERATOR">("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Payment dialog state
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<{
    id: string;
    code: string;
    currencyId: string;
    currencySymbol: string;
    balanceDue: number;
    sellingTotal: number;
    totalPaid: number;
  } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("BANK_TRANSFER");
  const [payReference, setPayReference] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payIsRefund, setPayIsRefund] = useState(false);

  // Expanded row for payment history
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: bookings, isLoading } = trpc.reservations.bookingPayment.listAll.useQuery({
    status: statusFilter,
    source: sourceFilter,
    search: debouncedSearch || undefined,
  });

  const createMutation = trpc.reservations.bookingPayment.create.useMutation({
    onSuccess: () => {
      utils.reservations.bookingPayment.listAll.invalidate();
      setPaymentOpen(false);
      setPayAmount("");
      setPayReference("");
      toast.success("Payment recorded");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.reservations.bookingPayment.delete.useMutation({
    onSuccess: () => {
      utils.reservations.bookingPayment.listAll.invalidate();
      toast.success("Payment deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  function openPaymentDialog(booking: NonNullable<typeof bookings>[number]) {
    const balance = Number(booking.balanceDue);
    setSelectedBooking({
      id: booking.id,
      code: booking.code,
      currencyId: booking.currency.id,
      currencySymbol: booking.currency.symbol,
      balanceDue: balance,
      sellingTotal: Number(booking.sellingTotal),
      totalPaid: Number(booking.totalPaid),
    });
    setPayAmount(balance > 0 ? balance.toFixed(2) : "");
    setPayReference("");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayIsRefund(false);
    setPayMethod("BANK_TRANSFER");
    setPaymentOpen(true);
  }

  // Debounce search
  let searchTimeout: ReturnType<typeof setTimeout>;
  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => setDebouncedSearch(val), 400);
  }

  // KPI summaries
  const totalBookings = bookings?.length ?? 0;
  const totalSelling = bookings?.reduce((s, b) => s + Number(b.sellingTotal), 0) ?? 0;
  const totalPaid = bookings?.reduce((s, b) => s + Number(b.totalPaid), 0) ?? 0;
  const totalOutstanding = bookings?.reduce((s, b) => s + Number(b.balanceDue), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Booking Reconciliation</h1>
        <p className="text-muted-foreground">
          Track and manage payments for all bookings
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalBookings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Selling</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalSelling.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-destructive" : "text-green-600"}`}>
              {totalOutstanding.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search booking, guest, hotel..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-64"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            <SelectItem value="WEBSITE">Website (B2C)</SelectItem>
            <SelectItem value="DIRECT">Direct</SelectItem>
            <SelectItem value="B2B">B2B</SelectItem>
            <SelectItem value="TOUR_OPERATOR">Tour Operator</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Loading...</p>
      ) : !bookings || bookings.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No bookings found.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Selling</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => {
                const sym = b.currency.symbol;
                const balance = Number(b.balanceDue);
                const isExpanded = expandedId === b.id;
                return (
                  <Fragment key={b.id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : b.id)}>
                      <TableCell>
                        <Link href={`/reservations/bookings/${b.id}`} className="font-mono text-sm text-primary underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
                          {b.code}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{b.hotel.name}</TableCell>
                      <TableCell className="text-sm">{b.leadGuestName ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {BOOKING_SOURCE_LABELS[b.source] ?? b.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(b.checkIn), "dd MMM")} — {format(new Date(b.checkOut), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={BOOKING_STATUS_VARIANTS[b.status] ?? "outline"}>
                          {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {sym}{Number(b.sellingTotal).toLocaleString("en", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600">
                        {sym}{Number(b.totalPaid).toLocaleString("en", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm font-semibold ${balance > 0 ? "text-destructive" : "text-green-600"}`}>
                        {sym}{balance.toLocaleString("en", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={PAYMENT_STATUS_VARIANTS[b.paymentStatus] ?? "outline"}>
                          {PAYMENT_STATUS_LABELS[b.paymentStatus] ?? b.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {b.status !== "CANCELLED" && balance > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); openPaymentDialog(b); }}
                          >
                            Record
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {/* Expanded payment history */}
                    {isExpanded && b.payments.length > 0 && (
                      <TableRow key={`${b.id}-payments`}>
                        <TableCell colSpan={11} className="bg-muted/30 p-0">
                          <div className="px-8 py-3">
                            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Payment History</p>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-muted-foreground">
                                  <th className="pb-1 text-left font-medium">Date</th>
                                  <th className="pb-1 text-left font-medium">Method</th>
                                  <th className="pb-1 text-left font-medium">Reference</th>
                                  <th className="pb-1 text-left font-medium">Type</th>
                                  <th className="pb-1 text-right font-medium">Amount</th>
                                  <th className="pb-1 text-left font-medium">By</th>
                                  <th className="pb-1 w-8"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {b.payments.map((p) => (
                                  <tr key={p.id} className="border-t border-border/50">
                                    <td className="py-1.5">{format(new Date(p.paidAt), "dd MMM yyyy")}</td>
                                    <td className="py-1.5">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</td>
                                    <td className="py-1.5 font-mono">{p.reference ?? "—"}</td>
                                    <td className="py-1.5">
                                      <Badge variant={p.isRefund ? "destructive" : "default"} className="text-xs">
                                        {p.isRefund ? "Refund" : "Payment"}
                                      </Badge>
                                    </td>
                                    <td className="py-1.5 text-right font-mono">
                                      {p.isRefund ? "-" : ""}{sym}{Number(p.amount).toLocaleString("en", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-1.5 text-muted-foreground">{p.createdBy?.name ?? "—"}</td>
                                    <td className="py-1.5">
                                      <button
                                        className="text-destructive hover:underline text-xs"
                                        onClick={() => {
                                          if (confirm("Delete this payment?")) {
                                            deleteMutation.mutate({ id: p.id, bookingId: b.id });
                                          }
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {isExpanded && b.payments.length === 0 && (
                      <TableRow key={`${b.id}-empty`}>
                        <TableCell colSpan={11} className="bg-muted/30 text-center text-sm text-muted-foreground py-3">
                          No payments recorded yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{payIsRefund ? "Record Refund" : "Record Payment"}</DialogTitle>
            {selectedBooking?.sellingTotal != null && (
              <DialogDescription className="space-y-1">
                <span className="block">Booking {selectedBooking.code}</span>
                <span className="block text-xs">
                  Total: {selectedBooking.currencySymbol}{selectedBooking.sellingTotal.toFixed(2)}
                  {selectedBooking.totalPaid > 0 && (
                    <> &middot; Paid: <span className="text-green-600">{selectedBooking.currencySymbol}{selectedBooking.totalPaid.toFixed(2)}</span></>
                  )}
                  &middot; Balance due: <span className="font-semibold">{selectedBooking.currencySymbol}{selectedBooking.balanceDue.toFixed(2)}</span>
                </span>
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount ({selectedBooking?.currencySymbol})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="Transaction ref" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="payIsRefund" checked={payIsRefund} onChange={(e) => setPayIsRefund(e.target.checked)} className="rounded" />
              <Label htmlFor="payIsRefund">This is a refund</Label>
            </div>
          </div>
          {createMutation.error && (
            <p className="text-sm text-destructive">{createMutation.error.message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button
              disabled={!payAmount || createMutation.isPending}
              onClick={() =>
                selectedBooking &&
                createMutation.mutate({
                  bookingId: selectedBooking.id,
                  amount: parseFloat(payAmount),
                  currencyId: selectedBooking.currencyId,
                  method: payMethod as "CASH" | "BANK_TRANSFER" | "CREDIT_CARD" | "CHEQUE",
                  reference: payReference || undefined,
                  paidAt: payDate,
                  isRefund: payIsRefund,
                  createFinanceRecords: false,
                })
              }
            >
              {createMutation.isPending ? "Saving..." : payIsRefund ? "Record Refund" : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
