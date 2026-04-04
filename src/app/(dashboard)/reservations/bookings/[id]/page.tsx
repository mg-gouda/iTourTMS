"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  Copy,
  Download,
  Lock,
  Mail,
  Pencil,
  PlaneLanding,
  PlaneTakeoff,
  Plus,
  ShieldCheck,
  ShieldX,
  Trash2,
  Unlock,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { generateBookingPdf } from "@/lib/export/booking-pdf";
import { generateBookingEml } from "@/lib/export/booking-eml";
import { generateVoucherPdf } from "@/lib/export/voucher-pdf";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: booking, isLoading } = trpc.reservations.booking.getById.useQuery({ id });
  const { data: company } = trpc.settings.getCompanySettings.useQuery();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [spoModalOpen, setSpoModalOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [approvalNote, setApprovalNote] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedSpoBreakdown, setSelectedSpoBreakdown] = useState<any[]>([]);

  // Series dialog state
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [seriesFrequency, setSeriesFrequency] = useState<"WEEKLY" | "BIWEEKLY" | "MONTHLY">("WEEKLY");
  const [seriesCount, setSeriesCount] = useState(4);

  const deletePaymentMutation = trpc.reservations.bookingPayment.delete.useMutation({
    onSuccess: () => {
      utils.reservations.booking.getById.invalidate({ id });
      toast.success("Payment deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const transitionMutation = trpc.reservations.booking.transition.useMutation({
    onSuccess: () => {
      utils.reservations.booking.getById.invalidate({ id });
      utils.reservations.booking.list.invalidate();
      setCancelOpen(false);
      setCancelReason("");
    },
  });

  const lockMutation = trpc.reservations.booking.lock.useMutation({
    onSuccess: () => {
      utils.reservations.booking.getById.invalidate({ id });
    },
  });

  const deleteMutation = trpc.reservations.booking.delete.useMutation({
    onSuccess: () => {
      utils.reservations.booking.list.invalidate();
      router.push("/reservations/bookings");
    },
  });

  const approvalMutation = trpc.reservations.booking.approveStopSale.useMutation({
    onSuccess: () => {
      utils.reservations.booking.getById.invalidate({ id });
      utils.reservations.booking.list.invalidate();
      setApprovalOpen(false);
      setApprovalNote("");
    },
  });

  const seriesMutation = trpc.reservations.booking.createSeries.useMutation({
    onSuccess: (data) => {
      utils.reservations.booking.list.invalidate();
      setSeriesOpen(false);
      toast.success(`Created ${data.count} bookings: ${data.codes.join(", ")}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const voucherCreateMutation = trpc.reservations.voucher.create.useMutation({
    onSuccess: (data) => {
      utils.reservations.booking.getById.invalidate({ id });
      toast.success(`Voucher ${data.code} issued successfully`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Fetch contract details when modal opens
  const { data: contractDetail, isLoading: contractDetailLoading } =
    trpc.contracting.contract.getById.useQuery(
      { id: booking?.contract?.id ?? "" },
      { enabled: contractModalOpen && !!booking?.contract?.id },
    );

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Loading...</div>;
  }

  if (!booking) {
    return <div className="py-10 text-center text-muted-foreground">Booking not found</div>;
  }

  const isPendingApproval = booking.status === "PENDING_APPROVAL";
  const canAmend = !["CHECKED_OUT", "CANCELLED", "PENDING_APPROVAL"].includes(booking.status) && !booking.isLocked;
  const canConfirm = booking.status === "DRAFT" || booking.status === "NEW_BOOKING";
  const canCancel = !["CHECKED_OUT", "CANCELLED"].includes(booking.status);
  const canNoShow = booking.status === "CONFIRMED";
  const canDelete = booking.status === "DRAFT" || booking.status === "NEW_BOOKING";
  const canLock = !["CANCELLED", "CHECKED_OUT"].includes(booking.status);

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
            {booking.internalNotes?.includes("[GROUP BOOKING]") && (
              <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
                Group Booking
              </Badge>
            )}
            {booking.internalNotes?.includes("[SERIES") && (
              <Badge variant="outline" className="gap-1 border-purple-500 text-purple-600">
                Series Booking
              </Badge>
            )}
            {booking.isLocked && (
              <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                <Lock className="size-3" />
                Locked
              </Badge>
            )}
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
          {canLock && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                lockMutation.mutate({
                  bookingId: id,
                  lock: !booking.isLocked,
                })
              }
              disabled={lockMutation.isPending}
            >
              {booking.isLocked ? (
                <>
                  <Unlock className="mr-1 size-3.5" />
                  Unlock
                </>
              ) : (
                <>
                  <Lock className="mr-1 size-3.5" />
                  Lock
                </>
              )}
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
          <Button
            size="sm"
            variant="outline"
            disabled={!booking.hotel.email || isPendingApproval}
            title={isPendingApproval ? "Booking requires manager approval before sending to hotel" : !booking.hotel.email ? "Hotel has no email address" : "Send booking to hotel via email"}
            onClick={() => handleSendToHotel(booking, company)}
          >
            <Mail className="mr-1 size-3.5" />
            Send to Hotel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSeriesOpen(true)}
          >
            <Copy className="mr-1 size-3.5" />
            Create Series
          </Button>
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
      {lockMutation.error && (
        <p className="text-sm text-destructive">
          {lockMutation.error.message}
        </p>
      )}

      {/* Pending Approval Banner */}
      {isPendingApproval && (
        <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-200 [&>svg]:text-amber-600">
          <AlertTriangle className="size-4" />
          <AlertTitle>Pending Manager Approval</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>
              This booking was created during a stop-sale period and requires manager approval
              before it can be sent to the hotel or counted in materialization.
            </p>
            {booking.approvedBy && booking.approvalStatus === "APPROVED" ? (
              <p className="text-sm">
                Approved by <strong>{booking.approvedBy.name}</strong> on{" "}
                {format(new Date(booking.approvedAt!), "dd MMM yyyy HH:mm")}
              </p>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    setApprovalAction("approve");
                    setApprovalNote("");
                    setApprovalOpen(true);
                  }}
                >
                  <ShieldCheck className="mr-1 size-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setApprovalAction("reject");
                    setApprovalNote("");
                    setApprovalOpen(true);
                  }}
                >
                  <ShieldX className="mr-1 size-3.5" />
                  Reject
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
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
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="communications">Comms</TabsTrigger>
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
                {booking.market && (
                  <InfoRow label="Market" value={booking.market.name} />
                )}
                {booking.contract && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contract</span>
                    <button
                      type="button"
                      className="font-medium text-right text-primary underline underline-offset-2 hover:text-primary/80 cursor-pointer"
                      onClick={() => setContractModalOpen(true)}
                    >
                      {booking.contract.name} ({booking.contract.code})
                    </button>
                  </div>
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

            {/* Flight Details */}
            {(booking.arrivalFlightNo || booking.departFlightNo) && (
              <Card>
                <CardHeader>
                  <CardTitle>Flight Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {booking.arrivalFlightNo && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <PlaneLanding className="size-4 text-green-600" />
                        <span className="font-semibold">Arrival</span>
                      </div>
                      <div className="space-y-1">
                        <InfoRow label="Flight No" value={booking.arrivalFlightNo} />
                        <InfoRow label="Time" value={booking.arrivalTime} />
                        <InfoRow label="From" value={booking.arrivalOriginApt} />
                        <InfoRow label="To" value={booking.arrivalDestApt} />
                        <InfoRow label="Terminal" value={booking.arrivalTerminal} />
                      </div>
                    </div>
                  )}
                  {booking.departFlightNo && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <PlaneTakeoff className="size-4 text-blue-600" />
                        <span className="font-semibold">Departure</span>
                      </div>
                      <div className="space-y-1">
                        <InfoRow label="Flight No" value={booking.departFlightNo} />
                        <InfoRow label="Time" value={booking.departTime} />
                        <InfoRow label="From" value={booking.departOriginApt} />
                        <InfoRow label="To" value={booking.departDestApt} />
                        <InfoRow label="Terminal" value={booking.departTerminal} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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

                {/* SPO / Offer discounts from rateBreakdown */}
                {(() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const bd = room.rateBreakdown as any;
                  const offers = bd?.offerDiscounts as
                    | { offerName: string; discount: number; description: string }[]
                    | undefined;
                  if (!offers || offers.length === 0) return null;
                  const applied = offers.filter((o) => o.discount > 0);
                  return (
                    <div className="text-sm">
                      <button
                        type="button"
                        className={`underline underline-offset-2 cursor-pointer text-xs font-medium ${
                          applied.length > 0
                            ? "text-green-600 hover:text-green-700"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => {
                          setSelectedSpoBreakdown(offers);
                          setSpoModalOpen(true);
                        }}
                      >
                        {applied.length > 0
                          ? `${applied.length} Special Offer${applied.length !== 1 ? "s" : ""} Applied`
                          : `${offers.length} Special Offer${offers.length !== 1 ? "s" : ""} Evaluated`}
                      </button>
                    </div>
                  );
                })()}

                {/* Structured guest names (per room) */}
                {(() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const rawGuestNames = (booking.guestNames ?? []) as any[];
                  const isStructured = rawGuestNames.length > 0 && typeof rawGuestNames[0] === "object" && rawGuestNames[0] !== null;
                  if (!isStructured) return null;
                  const roomGuests = (rawGuestNames as Array<{ title?: string; name: string; dob?: string; roomIndex?: number; type?: string }>)
                    .filter((g) => g.roomIndex === room.roomIndex);
                  if (roomGuests.length === 0) return null;
                  return (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Guests:</span>
                      <ul className="mt-1 space-y-0.5 pl-4">
                        {roomGuests.map((g, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span>{g.title ? `${g.title} ` : ""}{g.name}</span>
                            {g.type && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {g.type === "ADULT" ? "Adult" : "Child"}
                              </Badge>
                            )}
                            {g.dob && (
                              <span className="text-xs text-muted-foreground">
                                DOB: {format(new Date(g.dob), "dd MMM yyyy")}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                {/* Linked guest records (BookingGuest model) */}
                {room.guests.length > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Linked Guests:</span>
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
                  <TableHead></TableHead>
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => {
                          if (confirm("Delete this payment?")) {
                            deletePaymentMutation.mutate({ id: p.id, bookingId: id });
                          }
                        }}
                      >
                        &times;
                      </Button>
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
          {(booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => voucherCreateMutation.mutate({ bookingId: id })}
                disabled={voucherCreateMutation.isPending}
              >
                <Plus className="mr-1.5 size-3.5" />
                {voucherCreateMutation.isPending ? "Issuing..." : "Issue Voucher"}
              </Button>
            </div>
          )}
          {booking.vouchers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No vouchers issued yet.{" "}
              {booking.status === "CONFIRMED" || booking.status === "CHECKED_IN"
                ? "Click \"Issue Voucher\" to create one."
                : "Confirm the booking first to issue vouchers."}
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

        {/* Special Requests */}
        <TabsContent value="requests" className="space-y-4">
          <SpecialRequestsTab bookingId={id} />
        </TabsContent>

        {/* Communications */}
        <TabsContent value="communications" className="space-y-4">
          <CommunicationsTab bookingId={id} />
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
          <CancellationPenaltyPreview bookingId={id} />
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

      {/* Create Series Dialog */}
      <Dialog open={seriesOpen} onOpenChange={setSeriesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Series from Booking</DialogTitle>
            <DialogDescription>
              Create recurring bookings based on {booking.code} as a template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={seriesFrequency}
                onValueChange={(v) => setSeriesFrequency(v as "WEEKLY" | "BIWEEKLY" | "MONTHLY")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Bookings</Label>
              <Input
                type="number"
                min={1}
                max={52}
                value={seriesCount}
                onChange={(e) => setSeriesCount(Math.min(52, Math.max(1, parseInt(e.target.value) || 1)))}
              />
              <p className="text-xs text-muted-foreground">
                Between 1 and 52 recurring bookings
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeriesOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={seriesMutation.isPending}
              onClick={() =>
                seriesMutation.mutate({
                  templateBookingId: id,
                  frequency: seriesFrequency,
                  count: seriesCount,
                })
              }
            >
              {seriesMutation.isPending ? "Creating..." : `Create ${seriesCount} Bookings`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Detail Modal */}
      <Dialog open={contractModalOpen} onOpenChange={setContractModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contract Details</DialogTitle>
            <DialogDescription>
              {booking.contract
                ? `${booking.contract.name} (${booking.contract.code})`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {contractDetailLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : contractDetail ? (
            <div className="space-y-3 text-sm">
              <InfoRow label="Name" value={contractDetail.name} />
              <InfoRow label="Code" value={contractDetail.code} />
              <InfoRow label="Status" value={contractDetail.status} />
              <InfoRow
                label="Hotel"
                value={contractDetail.hotel.name}
              />
              <InfoRow
                label="Valid From"
                value={format(
                  new Date(contractDetail.validFrom),
                  "dd MMM yyyy",
                )}
              />
              <InfoRow
                label="Valid To"
                value={format(
                  new Date(contractDetail.validTo),
                  "dd MMM yyyy",
                )}
              />
              <InfoRow
                label="Currency"
                value={contractDetail.baseCurrency.name}
              />
              <InfoRow
                label="Rate Basis"
                value={contractDetail.rateBasis}
              />
              <InfoRow
                label="Min Stay"
                value={String(contractDetail.minimumStay)}
              />
              {contractDetail.maximumStay && (
                <InfoRow
                  label="Max Stay"
                  value={String(contractDetail.maximumStay)}
                />
              )}
              {contractDetail.roomTypes.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Room Types:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {contractDetail.roomTypes.map((rt) => (
                      <Badge key={rt.roomType.id} variant="outline">
                        {rt.roomType.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {contractDetail.mealBases.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Meal Bases:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {contractDetail.mealBases.map((mb) => (
                      <Badge key={mb.mealBasis.id} variant="outline">
                        {mb.mealBasis.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {contractDetail.markets.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Markets:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {contractDetail.markets.map((m) => (
                      <Badge key={m.market.id} variant="secondary">
                        {m.market.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {contractDetail.seasons.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Seasons:</span>
                  <div className="mt-1 space-y-1">
                    {contractDetail.seasons.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded border px-2 py-1 text-xs"
                      >
                        <span className="font-medium">
                          Season {s.sortOrder + 1}
                        </span>
                        <span>
                          {format(new Date(s.dateFrom), "dd MMM yyyy")} &mdash;{" "}
                          {format(new Date(s.dateTo), "dd MMM yyyy")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Contract not found.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SPO Detail Modal */}
      <Dialog open={spoModalOpen} onOpenChange={setSpoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Special Offers</DialogTitle>
            <DialogDescription>
              Offer discounts applied to this room
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {selectedSpoBreakdown.map(
              (
                od: {
                  offerName: string;
                  discount: number;
                  description: string;
                },
                i: number,
              ) => (
                <div
                  key={i}
                  className={`rounded-md border p-3 text-sm ${
                    od.discount > 0
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                      : "border-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{od.offerName}</span>
                    {od.discount > 0 ? (
                      <Badge variant="secondary" className="text-green-700 dark:text-green-400">
                        -{od.discount.toFixed(2)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Not eligible
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {od.description}
                  </p>
                </div>
              ),
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve"
                ? "Approve Stop-Sale Override"
                : "Reject Stop-Sale Override"}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve"
                ? `Approving will change booking ${booking.code} to active status, allowing it to be sent to the hotel and counted in materialization.`
                : `Rejecting will cancel booking ${booking.code}. The rooms will not be counted.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder={
                approvalAction === "approve"
                  ? "Approval note..."
                  : "Reason for rejection..."
              }
              rows={3}
            />
          </div>
          {approvalMutation.error && (
            <p className="text-sm text-destructive">
              {approvalMutation.error.message}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={approvalAction === "approve" ? "default" : "destructive"}
              disabled={approvalMutation.isPending}
              onClick={() =>
                approvalMutation.mutate({
                  bookingId: id,
                  action: approvalAction,
                  note: approvalNote || undefined,
                })
              }
            >
              {approvalMutation.isPending
                ? "Processing..."
                : approvalAction === "approve"
                  ? "Approve Booking"
                  : "Reject Booking"}
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
function handleSendToHotel(booking: any, company: any) {
  try {
    const statusLabel = BOOKING_STATUS_LABELS[booking.status as string] ?? booking.status;

    // 1. Generate PDF
    const doc = generateBookingPdf({
      code: booking.code,
      status: statusLabel,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights: booking.nights,
      adults: booking.adults,
      children: booking.children,
      infants: booking.infants ?? 0,
      specialRequests: booking.specialRequests,
      internalNotes: booking.internalNotes,
      bookingNotes: booking.bookingNotes,
      source: booking.source,
      createdAt: booking.createdAt,
      hotel: booking.hotel,
      market: booking.market ?? null,
      currency: booking.currency,
      rooms: booking.rooms.map((r: Record<string, unknown>) => ({
        roomIndex: r.roomIndex,
        roomType: r.roomType,
        mealBasis: r.mealBasis,
        adults: r.adults,
        children: r.children,
        infants: r.infants ?? 0,
        buyingRatePerNight: r.buyingRatePerNight,
        buyingTotal: r.buyingTotal,
        rateBreakdown: r.rateBreakdown ?? null,
      })),
      guestNames: booking.guestNames,
      leadGuestName: booking.leadGuestName,
      arrivalFlightNo: booking.arrivalFlightNo,
      arrivalTime: booking.arrivalTime,
      arrivalOriginApt: booking.arrivalOriginApt,
      arrivalDestApt: booking.arrivalDestApt,
      arrivalTerminal: booking.arrivalTerminal,
      departFlightNo: booking.departFlightNo,
      departTime: booking.departTime,
      departOriginApt: booking.departOriginApt,
      departDestApt: booking.departDestApt,
      departTerminal: booking.departTerminal,
      company: company ? { name: company.name, phone: company.phone, email: company.email, website: company.website } : undefined,
    });

    // 2. Get PDF as base64
    const pdfBase64 = doc.output("datauristring").split(",")[1] ?? "";
    const pdfFilename = `booking-${booking.code}.pdf`;

    // 3. Generate EML
    const emlContent = generateBookingEml(
      {
        code: booking.code,
        status: booking.status,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        specialRequests: booking.specialRequests,
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
        guestNames: booking.guestNames,
        leadGuestName: booking.leadGuestName,
        arrivalFlightNo: booking.arrivalFlightNo,
        arrivalTime: booking.arrivalTime,
        arrivalOriginApt: booking.arrivalOriginApt,
        arrivalDestApt: booking.arrivalDestApt,
        departFlightNo: booking.departFlightNo,
        departTime: booking.departTime,
        departOriginApt: booking.departOriginApt,
        departDestApt: booking.departDestApt,
        company: company ? { name: company.name } : undefined,
      },
      pdfBase64,
      pdfFilename,
    );

    // 4. Download .eml file
    const blob = new Blob([emlContent], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `booking-${booking.code}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // Silently fail
  }
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
        // Flight details
        arrivalFlightNo: booking.arrivalFlightNo,
        arrivalTime: booking.arrivalTime,
        arrivalOriginApt: booking.arrivalOriginApt,
        arrivalDestApt: booking.arrivalDestApt,
        arrivalTerminal: booking.arrivalTerminal,
        departFlightNo: booking.departFlightNo,
        departTime: booking.departTime,
        departOriginApt: booking.departOriginApt,
        departDestApt: booking.departDestApt,
        departTerminal: booking.departTerminal,
      },
    });
    doc.save(`voucher-${voucher.code}.pdf`);
  } catch {
    // Silently fail in case PDF generation has issues
  }
}

// ─── Special Requests Tab ──────────────────────────────────

function SpecialRequestsTab({ bookingId }: { bookingId: string }) {
  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.reservations.specialRequest.listByBooking.useQuery({ bookingId });
  const [text, setText] = useState("");

  const createMutation = trpc.reservations.specialRequest.create.useMutation({
    onSuccess: () => {
      utils.reservations.specialRequest.listByBooking.invalidate({ bookingId });
      setText("");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const deleteMutation = trpc.reservations.specialRequest.delete.useMutation({
    onSuccess: () => utils.reservations.specialRequest.listByBooking.invalidate({ bookingId }),
  });

  if (isLoading) return <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Add a special request..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              createMutation.mutate({ bookingId, category: "OTHER" as const, request: text.trim() });
            }
          }}
        />
        <Button
          size="sm"
          disabled={!text.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate({ bookingId, category: "OTHER" as const, request: text.trim() })}
        >
          Add
        </Button>
      </div>
      {(requests ?? []).length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No special requests.</p>
      ) : (
        <div className="space-y-2">
          {(requests ?? []).map((req) => (
            <div key={req.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <span>{req.request}</span>
                <Badge variant="secondary" className="ml-2 text-xs">{req.status}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate({ id: req.id })}>
                &times;
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Communications Tab ──────────────────────────────────

function CommunicationsTab({ bookingId }: { bookingId: string }) {
  const utils = trpc.useUtils();
  const { data: comms, isLoading } = trpc.reservations.communication.listByBooking.useQuery({ bookingId });
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("EMAIL");

  const createMutation = trpc.reservations.communication.create.useMutation({
    onSuccess: () => {
      utils.reservations.communication.listByBooking.invalidate({ bookingId });
      setSubject("");
      setMessage("");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const deleteMutation = trpc.reservations.communication.delete.useMutation({
    onSuccess: () => utils.reservations.communication.listByBooking.invalidate({ bookingId }),
  });

  if (isLoading) return <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Communication subject" />
            </div>
            <div>
              <Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="PHONE">Phone</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="INTERNAL">Internal Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <textarea
              className="w-full rounded-md border p-2 text-sm"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter message..."
            />
          </div>
          <Button
            size="sm"
            disabled={!subject.trim() || !message.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate({ bookingId, subject, body: message, channel: channel as "EMAIL" | "PHONE" | "FAX" | "API" | "PORTAL", direction: "OUTBOUND" as const, type: "GENERAL" as const })}
          >
            {createMutation.isPending ? "Sending..." : "Log Communication"}
          </Button>
        </CardContent>
      </Card>
      {(comms ?? []).length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No communications logged.</p>
      ) : (
        <div className="space-y-2">
          {(comms ?? []).map((c) => (
            <div key={c.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.subject}</span>
                  <Badge variant="outline" className="text-xs">{c.channel}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(c.sentAt), "dd MMM yyyy HH:mm")}
                    {c.sentBy && ` — ${c.sentBy.name}`}
                  </span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteMutation.mutate({ id: c.id })}>
                    &times;
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cancellation Penalty Preview ──────────────────────────

function CancellationPenaltyPreview({ bookingId }: { bookingId: string }) {
  const { data, isLoading } = trpc.reservations.booking.getCancellationPenalty.useQuery(
    { bookingId },
    { retry: false },
  );

  if (isLoading) return <p className="text-xs text-muted-foreground">Calculating penalty...</p>;
  if (!data) return null;

  return (
    <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm">
      <p className="font-medium text-yellow-800">Cancellation Penalty</p>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-yellow-700">
          {data.daysBefore} day(s) before check-in — {data.penaltyPercent}% penalty
        </span>
        <span className="font-bold text-yellow-900">
          {Number(data.penaltyAmount ?? 0).toFixed(2)}
        </span>
      </div>
      {data.description && (
        <p className="mt-1 text-xs text-yellow-600">Policy: {data.description}</p>
      )}
    </div>
  );
}
