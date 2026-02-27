"use client";

import { format } from "date-fns";
import {
  Ban,
  CheckCircle,
  Clock,
  Download,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { z } from "zod";

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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  BOOKING_SOURCE_LABELS,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANTS,
  GUEST_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANTS,
  TIMELINE_ACTION_LABELS,
  VOUCHER_STATUS_LABELS,
  VOUCHER_STATUS_VARIANTS,
} from "@/lib/constants/reservations";
import { generateVoucherPdf } from "@/lib/export/voucher-pdf";
import { trpc } from "@/lib/trpc";

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: booking, isLoading } = trpc.reservations.booking.getById.useQuery({ id });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);

  const transitionMutation = trpc.reservations.booking.transition.useMutation({
    onSuccess: () => {
      utils.reservations.booking.getById.invalidate({ id });
      utils.reservations.booking.list.invalidate();
      setCancelOpen(false);
      setCancelReason("");
    },
  });

  const deleteMutation = trpc.reservations.booking.delete.useMutation({
    onSuccess: () => {
      utils.reservations.booking.list.invalidate();
      router.push("/reservations/bookings");
    },
  });

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Loading...</div>;
  }

  if (!booking) {
    return <div className="py-10 text-center text-muted-foreground">Booking not found</div>;
  }

  const canAmend = !["CHECKED_OUT", "CANCELLED"].includes(booking.status);
  const canConfirm = booking.status === "DRAFT";
  const canCancel = !["CHECKED_OUT", "CANCELLED"].includes(booking.status);
  const canCheckIn = booking.status === "CONFIRMED";
  const canCheckOut = booking.status === "CHECKED_IN";
  const canNoShow = booking.status === "CONFIRMED";
  const canDelete = booking.status === "DRAFT";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono">
              {booking.code}
            </h1>
            <Badge
              variant={
                (BOOKING_STATUS_VARIANTS[booking.status] as
                  | "default"
                  | "secondary"
                  | "outline"
                  | "destructive") ?? "secondary"
              }
            >
              {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
            </Badge>
            <Badge
              variant={
                (PAYMENT_STATUS_VARIANTS[booking.paymentStatus] as
                  | "default"
                  | "secondary"
                  | "outline"
                  | "destructive") ?? "secondary"
              }
            >
              {PAYMENT_STATUS_LABELS[booking.paymentStatus] ?? booking.paymentStatus}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {booking.hotel.name} &bull;{" "}
            {BOOKING_SOURCE_LABELS[booking.source] ?? booking.source}
            {booking.tourOperator ? ` — ${booking.tourOperator.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAmend && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/reservations/bookings/${id}/edit`}>
                <Pencil className="mr-1 size-3.5" />
                Amend
              </Link>
            </Button>
          )}
          {canConfirm && (
            <Button
              size="sm"
              onClick={() =>
                transitionMutation.mutate({
                  bookingId: id,
                  action: "confirm",
                })
              }
              disabled={transitionMutation.isPending}
            >
              <CheckCircle className="mr-1 size-3.5" />
              Confirm
            </Button>
          )}
          {canCheckIn && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                transitionMutation.mutate({
                  bookingId: id,
                  action: "check_in",
                })
              }
              disabled={transitionMutation.isPending}
            >
              <LogIn className="mr-1 size-3.5" />
              Check In
            </Button>
          )}
          {canCheckOut && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                transitionMutation.mutate({
                  bookingId: id,
                  action: "check_out",
                })
              }
              disabled={transitionMutation.isPending}
            >
              <LogOut className="mr-1 size-3.5" />
              Check Out
            </Button>
          )}
          {canNoShow && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                transitionMutation.mutate({
                  bookingId: id,
                  action: "no_show",
                })
              }
              disabled={transitionMutation.isPending}
            >
              <UserX className="mr-1 size-3.5" />
              No Show
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setCancelOpen(true)}
            >
              <Ban className="mr-1 size-3.5" />
              Cancel
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 size-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {transitionMutation.error && (
        <p className="text-sm text-destructive">
          {transitionMutation.error.message}
        </p>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rooms">Rooms ({booking.rooms.length})</TabsTrigger>
          <TabsTrigger value="payments">
            Payments ({booking.payments.length})
          </TabsTrigger>
          <TabsTrigger value="vouchers">
            Vouchers ({booking.vouchers.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Stay Details */}
            <Card>
              <CardHeader>
                <CardTitle>Stay Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Hotel" value={booking.hotel.name} />
                <InfoRow
                  label="Check-in"
                  value={format(new Date(booking.checkIn), "dd MMM yyyy")}
                />
                <InfoRow
                  label="Check-out"
                  value={format(new Date(booking.checkOut), "dd MMM yyyy")}
                />
                <InfoRow label="Nights" value={String(booking.nights)} />
                <InfoRow
                  label="Rooms"
                  value={String(booking.rooms.length)}
                />
                {booking.contract && (
                  <InfoRow label="Contract" value={`${booking.contract.name} (${booking.contract.code})`} />
                )}
                {booking.rateBasis && (
                  <InfoRow label="Rate Basis" value={booking.rateBasis} />
                )}
                <InfoRow
                  label="Manual Rate"
                  value={booking.manualRate ? "Yes" : "No"}
                />
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow
                  label="Buying Total"
                  value={`${booking.currency.symbol}${Number(booking.buyingTotal).toLocaleString("en", { minimumFractionDigits: 2 })}`}
                />
                <InfoRow
                  label="Selling Total"
                  value={`${booking.currency.symbol}${Number(booking.sellingTotal).toLocaleString("en", { minimumFractionDigits: 2 })}`}
                />
                <InfoRow
                  label="Margin"
                  value={`${booking.currency.symbol}${(Number(booking.sellingTotal) - Number(booking.buyingTotal)).toLocaleString("en", { minimumFractionDigits: 2 })}`}
                />
                <div className="my-2 border-t" />
                <InfoRow
                  label="Total Paid"
                  value={`${booking.currency.symbol}${Number(booking.totalPaid).toLocaleString("en", { minimumFractionDigits: 2 })}`}
                />
                <InfoRow
                  label="Balance Due"
                  value={`${booking.currency.symbol}${Number(booking.balanceDue).toLocaleString("en", { minimumFractionDigits: 2 })}`}
                />
                {booking.markupRule && (
                  <>
                    <div className="my-2 border-t" />
                    <InfoRow label="Markup Rule" value={booking.markupRule.name} />
                    <InfoRow
                      label="Markup"
                      value={`${booking.markupType === "PERCENTAGE" ? `${Number(booking.markupValue)}%` : `${booking.currency.symbol}${Number(booking.markupValue)}`} (${booking.currency.symbol}${Number(booking.markupAmount).toLocaleString("en", { minimumFractionDigits: 2 })})`}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Guest Info */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Guest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Name" value={booking.leadGuestName} />
                <InfoRow label="Email" value={booking.leadGuestEmail} />
                <InfoRow label="Phone" value={booking.leadGuestPhone} />
              </CardContent>
            </Card>

            {/* Booking Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow
                  label="Created"
                  value={
                    booking.createdBy
                      ? `${booking.createdBy.name} on ${format(new Date(booking.createdAt), "dd MMM yyyy HH:mm")}`
                      : format(new Date(booking.createdAt), "dd MMM yyyy HH:mm")
                  }
                />
                {booking.confirmedBy && (
                  <InfoRow
                    label="Confirmed"
                    value={`${booking.confirmedBy.name} on ${format(new Date(booking.confirmedAt!), "dd MMM yyyy HH:mm")}`}
                  />
                )}
                {booking.cancelledBy && (
                  <InfoRow
                    label="Cancelled"
                    value={`${booking.cancelledBy.name} on ${format(new Date(booking.cancelledAt!), "dd MMM yyyy HH:mm")}`}
                  />
                )}
                {booking.externalRef && (
                  <InfoRow label="External Ref" value={booking.externalRef} />
                )}
                {booking.specialRequests && (
                  <InfoRow label="Special Requests" value={booking.specialRequests} />
                )}
                {booking.internalNotes && (
                  <InfoRow label="Internal Notes" value={booking.internalNotes} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rooms */}
        <TabsContent value="rooms" className="space-y-4">
          {booking.rooms.map((room) => (
            <Card key={room.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Room {room.roomIndex}: {room.roomType.name}
                  </CardTitle>
                  <Badge variant="outline">{room.mealBasis.name}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-6 text-sm">
                  <span>
                    <span className="text-muted-foreground">Adults:</span>{" "}
                    {room.adults}
                  </span>
                  <span>
                    <span className="text-muted-foreground">Children:</span>{" "}
                    {room.children}
                  </span>
                  {room.extraBed && (
                    <Badge variant="secondary" className="text-xs">
                      Extra Bed
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Buying:</span>{" "}
                    <span className="font-mono">
                      {booking.currency.symbol}
                      {Number(room.buyingRatePerNight).toFixed(2)}/night &times;{" "}
                      {booking.nights} ={" "}
                      {booking.currency.symbol}
                      {Number(room.buyingTotal).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Selling:</span>{" "}
                    <span className="font-mono">
                      {booking.currency.symbol}
                      {Number(room.sellingRatePerNight).toFixed(2)}/night &times;{" "}
                      {booking.nights} ={" "}
                      {booking.currency.symbol}
                      {Number(room.sellingTotal).toFixed(2)}
                    </span>
                  </div>
                </div>

                {room.guests.length > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Guests:</span>
                    <ul className="mt-1 space-y-0.5 pl-4">
                      {room.guests.map((bg) => (
                        <li key={bg.id} className="flex items-center gap-2">
                          <span>
                            {bg.guest.firstName} {bg.guest.lastName}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {GUEST_TYPE_LABELS[bg.guestType] ?? bg.guestType}
                          </Badge>
                          {bg.isLeadGuest && (
                            <Badge variant="default" className="text-[10px] px-1 py-0">
                              Lead
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {room.specialRequests && (
                  <p className="text-sm text-muted-foreground">
                    Requests: {room.specialRequests}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {booking.payments.length} payment(s) recorded
            </p>
            {booking.status !== "CANCELLED" && (
              <Button size="sm" onClick={() => setPaymentOpen(true)}>
                <Plus className="mr-1 size-3.5" />
                Record Payment
              </Button>
            )}
          </div>

          {booking.payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {booking.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {format(new Date(p.paidAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {p.reference ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.isRefund ? "destructive" : "default"}>
                        {p.isRefund ? "Refund" : "Payment"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {p.isRefund ? "-" : ""}
                      {p.currency.symbol}
                      {Number(p.amount).toLocaleString("en", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.createdBy?.name ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <PaymentDialog
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            bookingId={id}
            currencyId={booking.currency.id}
            currencySymbol={booking.currency.symbol}
          />
        </TabsContent>

        {/* Vouchers */}
        <TabsContent value="vouchers" className="space-y-4">
          {booking.vouchers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No vouchers issued. Vouchers are auto-generated when a booking is confirmed.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {booking.vouchers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-medium">
                      {v.code}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (VOUCHER_STATUS_VARIANTS[v.status] as
                            | "default"
                            | "secondary"
                            | "outline"
                            | "destructive") ?? "secondary"
                        }
                      >
                        {VOUCHER_STATUS_LABELS[v.status] ?? v.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(v.createdAt), "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.createdBy?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadVoucher(v, booking)}
                      >
                        <Download className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="space-y-4">
          {booking.timeline.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No timeline events.
            </p>
          ) : (
            <div className="space-y-3">
              {booking.timeline.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded border p-3"
                >
                  <Clock className="mt-0.5 size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {TIMELINE_ACTION_LABELS[event.action] ?? event.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.createdAt), "dd MMM yyyy HH:mm")}
                      </span>
                    </div>
                    {event.details && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {event.details}
                      </p>
                    )}
                    {event.user && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {event.user.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              This will cancel booking {booking.code}. If the booking was
              confirmed, allotment will be restored.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Cancellation Reason</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Optional reason..."
              rows={3}
            />
          </div>
          {transitionMutation.error && (
            <p className="text-sm text-destructive">
              {transitionMutation.error.message}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              disabled={transitionMutation.isPending}
              onClick={() =>
                transitionMutation.mutate({
                  bookingId: id,
                  action: "cancel",
                  reason: cancelReason || undefined,
                })
              }
            >
              {transitionMutation.isPending ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Booking</DialogTitle>
            <DialogDescription>
              This will permanently delete draft booking {booking.code}. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id })}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ──

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value ?? "—"}</span>
    </div>
  );
}

function PaymentDialog({
  open,
  onOpenChange,
  bookingId,
  currencyId,
  currencySymbol,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  currencyId: string;
  currencySymbol: string;
}) {
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [isRefund, setIsRefund] = useState(false);

  const createMutation = trpc.reservations.bookingPayment.create.useMutation({
    onSuccess: () => {
      utils.reservations.booking.getById.invalidate({ id: bookingId });
      onOpenChange(false);
      setAmount("");
      setReference("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isRefund ? "Record Refund" : "Record Payment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Amount ({currencySymbol})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction ref"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRefund"
              checked={isRefund}
              onChange={(e) => setIsRefund(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isRefund">This is a refund</Label>
          </div>
        </div>
        {createMutation.error && (
          <p className="text-sm text-destructive">
            {createMutation.error.message}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!amount || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                bookingId,
                amount: parseFloat(amount),
                currencyId,
                method: method as "CASH" | "BANK_TRANSFER" | "CREDIT_CARD" | "CHEQUE",
                reference: reference || undefined,
                paidAt,
                isRefund,
                createFinanceRecords: false,
              })
            }
          >
            {createMutation.isPending
              ? "Saving..."
              : isRefund
                ? "Record Refund"
                : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function downloadVoucher(voucher: any, booking: any) {
  try {
    const doc = generateVoucherPdf({
      code: voucher.code,
      status: voucher.status,
      issuedAt: voucher.createdAt,
      booking: {
        code: booking.code,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        specialRequests: booking.specialRequests,
        source: booking.source,
        hotel: booking.hotel,
        tourOperator: booking.tourOperator,
        currency: booking.currency,
        rooms: booking.rooms.map((r: Record<string, unknown>) => ({
          roomIndex: r.roomIndex,
          roomType: r.roomType,
          mealBasis: r.mealBasis,
          adults: r.adults,
          children: r.children,
          infants: r.infants ?? 0,
        })),
        guests: booking.rooms.flatMap((r: Record<string, unknown>) =>
          ((r.guests as Array<Record<string, unknown>>) ?? []).map(
            (bg) => ({
              isLeadGuest: bg.isLeadGuest,
              guestType: bg.guestType,
              guest: bg.guest,
            }),
          ),
        ),
        guestNames: booking.guestNames as string[] | null,
        leadGuestName: booking.leadGuestName as string | null,
      },
    });
    doc.save(`voucher-${voucher.code}.pdf`);
  } catch {
    // Silently fail in case PDF generation has issues
  }
}
