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
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Trash2,
  Unlock,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import type { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  HOTEL_CREDIT_STATUS_LABELS,
  HOTEL_CREDIT_STATUS_VARIANTS,
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
  const { data: hotelCredits, refetch: refetchCredits } = trpc.reservations.hotelCredit.getByBooking.useQuery(id);
  const { data: cancellationPenalty, isLoading: penaltyLoading } =
    trpc.reservations.booking.getCancellationPenalty.useQuery(
      { bookingId: id },
      { enabled: cancelOpen, retry: false },
    );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [issueCreditNote, setIssueCreditNote] = useState(false);
  const [creditNoteNotes, setCreditNoteNotes] = useState("");
  // Split penalty state
  const [hotelPenaltyOverride, setHotelPenaltyOverride] = useState(false);
  const [hotelPenaltyCustom, setHotelPenaltyCustom] = useState("");
  const [sourcePenaltyOverride, setSourcePenaltyOverride] = useState(false);
  const [sourcePenaltyCustom, setSourcePenaltyCustom] = useState("");
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyAmount, setApplyAmount] = useState("");
  const [applyCreditId, setApplyCreditId] = useState("");
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [spoModalOpen, setSpoModalOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [approvalNote, setApprovalNote] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedSpoBreakdown, setSelectedSpoBreakdown] = useState<any[]>([]);

  // SPO detail modal
  const [spoDetailOpen, setSpoDetailOpen] = useState(false);
  const [selectedSpoId, setSelectedSpoId] = useState<string | null>(null);

  // Special offer detail modal
  const [offerDetailOpen, setOfferDetailOpen] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hotelConfNo, setHotelConfNo] = useState("");
  const [confirmFile, setConfirmFile] = useState("");
  const [confirmUploading, setConfirmUploading] = useState(false);

  // Series dialog state
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [seriesFrequency, setSeriesFrequency] = useState<"WEEKLY" | "BIWEEKLY" | "MONTHLY">("WEEKLY");
  const [seriesCount, setSeriesCount] = useState(4);

  // Booking date edit state
  const [editingBookingDate, setEditingBookingDate] = useState(false);
  const [bookingDateValue, setBookingDateValue] = useState("");

  // Recalculate confirm state
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [recalcSellingOpen, setRecalcSellingOpen] = useState(false);

  const transitionMutation = trpc.reservations.booking.transition.useMutation({
    onSuccess: () => {
      utils.reservations.booking.getById.invalidate({ id });
      utils.reservations.booking.list.invalidate();
      refetchCredits();
      setCancelOpen(false);
      setCancelReason("");
      setIssueCreditNote(false);
      setCreditNoteNotes("");
      setHotelPenaltyOverride(false);
      setHotelPenaltyCustom("");
      setSourcePenaltyOverride(false);
      setSourcePenaltyCustom("");
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

  const updateBookingDateMutation = trpc.reservations.booking.updateBookingDate.useMutation({
    onSuccess: () => {
      utils.reservations.booking.getById.invalidate({ id });
      setEditingBookingDate(false);
      toast.success("Booking date updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const recalculateBuyingMutation = trpc.reservations.booking.recalculateBuying.useMutation({
    onSuccess: (data) => {
      utils.reservations.booking.getById.invalidate({ id });
      setRecalcOpen(false);
      const w = (data as { warnings?: string[] }).warnings ?? [];
      if (w.length > 0) toast.warning(`Recalculated with warnings: ${w.join("; ")}`);
      else toast.success("Buying rates recalculated successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const recalculateSellingMutation = trpc.reservations.booking.recalculateSelling.useMutation({
    onSuccess: () => {
      utils.reservations.booking.getById.invalidate({ id });
      setRecalcSellingOpen(false);
      toast.success("Selling rates recalculated successfully");
    },
    onError: (err) => toast.error(err.message),
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

  const applyCreditMutation = trpc.reservations.hotelCredit.consume.useMutation({
    onSuccess: () => {
      refetchCredits();
      utils.reservations.booking.getById.invalidate({ id });
      toast.success("Hotel credit applied successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelCreditMutation = trpc.reservations.hotelCredit.cancel.useMutation({
    onSuccess: () => {
      refetchCredits();
      toast.success("Credit note cancelled");
    },
    onError: (err) => toast.error(err.message),
  });

  // Fetch contract details when modal opens
  const { data: contractDetail, isLoading: contractDetailLoading } =
    trpc.contracting.contract.getById.useQuery(
      { id: booking?.contract?.id ?? "" },
      { enabled: contractModalOpen && !!booking?.contract?.id },
    );

  // Fetch SPO details when SPO detail modal opens
  const { data: spoDetail, isLoading: spoDetailLoading } =
    trpc.contracting.seasonSpo.getById.useQuery(
      { id: selectedSpoId ?? "" },
      { enabled: spoDetailOpen && !!selectedSpoId },
    );

  // Fetch special offer details when offer detail modal opens
  const { data: offerDetail, isLoading: offerDetailLoading } =
    trpc.contracting.specialOffer.getById.useQuery(
      { id: selectedOfferId ?? "" },
      { enabled: offerDetailOpen && !!selectedOfferId },
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
              onClick={() => setConfirmOpen(true)}
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
            disabled={isPendingApproval}
            title={isPendingApproval ? "Booking requires manager approval before sending to hotel" : !booking.hotel.email ? "Send to hotel — no email on record, add recipient manually in your email client" : "Send booking to hotel via email"}
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
          <TabsTrigger value="hotel-credits">Hotel Credits</TabsTrigger>
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
                {/* Editable booking date — used for SPO / rate re-validation */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Booking Date</span>
                  {editingBookingDate ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="date"
                        className="h-7 w-36 text-xs"
                        value={bookingDateValue}
                        onChange={(e) => setBookingDateValue(e.target.value)}
                      />
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={updateBookingDateMutation.isPending}
                        onClick={() => updateBookingDateMutation.mutate({ id, bookingDate: bookingDateValue || null })}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingBookingDate(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">
                        {booking.bookingDate
                          ? format(new Date(booking.bookingDate), "dd MMM yyyy")
                          : format(new Date(booking.createdAt), "dd MMM yyyy") + " (auto)"}
                      </span>
                      {!booking.isLocked && !["CANCELLED", "CHECKED_OUT"].includes(booking.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5"
                          onClick={() => {
                            setBookingDateValue(
                              booking.bookingDate
                                ? format(new Date(booking.bookingDate), "yyyy-MM-dd")
                                : format(new Date(booking.createdAt), "yyyy-MM-dd")
                            );
                            setEditingBookingDate(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {booking.confirmedBy && (
                  <InfoRow
                    label="Confirmed"
                    value={`${booking.confirmedBy.name} on ${format(new Date(booking.confirmedAt!), "dd MMM yyyy HH:mm")}`}
                  />
                )}
                {booking.hotelConfNo && (
                  <InfoRow label="Hotel Conf. No." value={<span className="font-mono font-semibold">{booking.hotelConfNo}</span>} />
                )}
                {booking.confirmationFile && (
                  <InfoRow
                    label="Confirmation Doc"
                    value={
                      <a href={booking.confirmationFile} download rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:text-primary/80">
                        <Download className="h-3.5 w-3.5" />
                        {booking.confirmationFile.split("/").pop()}
                      </a>
                    }
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

                {/* ── Rate columns ── */}
                {(() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const bd = room.rateBreakdown as any;
                  type NightSeg = {
                    type: string; label: string; nights: number;
                    ratePerNight: number; adults: number;
                    adultTotalPerNight: number; subtotal: number;
                    subtotalAfterOffers?: number;
                    offerDiscounts?: { offerName: string; discount: number; description: string }[];
                    spoId?: string;
                    appliedOfferIds?: string[];
                  };
                  type SellingMk = { ruleId: string | null; ruleName: string | null; markupType: string; markupValue: number; markupAmount: number };
                  const segs = bd?.nightSegments as NightSeg[] | undefined;
                  const sellingMk = bd?.sellingMarkup as SellingMk | undefined;
                  const canRecalc = booking.contractId && !booking.isLocked && !["CANCELLED", "CHECKED_OUT"].includes(booking.status);

                  const buyingContent = segs && segs.length > 1 ? (
                    <div className="space-y-1 font-mono text-xs mt-1.5">
                      {segs.map((seg, si) => {
                        const appliedOffers = seg.offerDiscounts?.filter((o) => o.discount > 0) ?? [];
                        const hasDiscount = seg.subtotalAfterOffers != null && seg.subtotalAfterOffers < seg.subtotal;
                        const discountPct = hasDiscount && seg.subtotal > 0
                          ? ((1 - seg.subtotalAfterOffers! / seg.subtotal) * 100).toFixed(1)
                          : null;
                        const offerName = appliedOffers[0]?.offerName ?? "Discount";
                        return (
                          <div key={si} className={seg.type === "SPO" ? "text-amber-600 dark:text-amber-400" : ""}>
                            {seg.type === "SPO" && seg.spoId ? (
                              <button type="button" className="font-medium underline underline-offset-2 hover:opacity-75"
                                onClick={() => { setSelectedSpoId(seg.spoId!); setSpoDetailOpen(true); }}>
                                {seg.label}
                              </button>
                            ) : (
                              <span className="font-medium">{seg.label}</span>
                            )}
                            {discountPct && seg.appliedOfferIds?.[0] ? (
                              <button type="button"
                                className="text-green-600 dark:text-green-400 underline underline-offset-2 hover:opacity-75"
                                onClick={() => { setSelectedOfferId(seg.appliedOfferIds![0]); setOfferDetailOpen(true); }}>
                                {" "}-{discountPct}% {offerName}
                              </button>
                            ) : discountPct ? (
                              <span className="text-green-600 dark:text-green-400"> -{discountPct}% {offerName}</span>
                            ) : null}
                            {": "}{booking.currency.symbol}{seg.ratePerNight.toFixed(2)} &times;{" "}
                            {seg.adults} pax &times; {seg.nights}n{" = "}
                            {hasDiscount ? (
                              <><s className="text-muted-foreground">{booking.currency.symbol}{seg.subtotal.toFixed(2)}</s>{" "}{booking.currency.symbol}{seg.subtotalAfterOffers!.toFixed(2)}</>
                            ) : <>{booking.currency.symbol}{seg.subtotal.toFixed(2)}</>}
                          </div>
                        );
                      })}
                      <div className="border-t pt-1 font-medium text-foreground">
                        Total: {booking.currency.symbol}{Number(room.buyingTotal).toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <p className="font-mono text-xs mt-1.5">
                      {booking.currency.symbol}{Number(room.buyingRatePerNight).toFixed(2)}/night &times; {booking.nights} = {booking.currency.symbol}{Number(room.buyingTotal).toFixed(2)}
                    </p>
                  );

                  const sellingMkLabel = sellingMk
                    ? sellingMk.markupType === "PERCENTAGE"
                      ? `+${sellingMk.markupValue}%`
                      : `+${booking.currency.symbol}${sellingMk.markupValue} flat`
                    : null;

                  const margin = Number(room.sellingTotal) - Number(room.buyingTotal);
                  const marginPct = Number(room.buyingTotal) > 0 ? (margin / Number(room.buyingTotal)) * 100 : 0;

                  return (
                    <div className="grid grid-cols-[5fr_5fr_2fr] gap-3 text-sm">
                      {/* ── Buying ── */}
                      <div className="rounded-md border p-2.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Buying</span>
                          {canRecalc && (
                            <button type="button" title="Recalculate buying rates"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => setRecalcOpen(true)}>
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {buyingContent}
                      </div>

                      {/* ── Selling ── */}
                      <div className="rounded-md border p-2.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selling</span>
                          {!booking.isLocked && !["CANCELLED", "CHECKED_OUT"].includes(booking.status) && (
                            <button type="button" title="Recalculate selling rates"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => setRecalcSellingOpen(true)}>
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-1 font-mono text-xs mt-1.5">
                          {sellingMk ? (
                            <>
                              <div>
                                <span className="text-muted-foreground">Buying: </span>
                                {booking.currency.symbol}{Number(room.buyingTotal).toFixed(2)}
                              </div>
                              <div>
                                {sellingMk.ruleName ? (
                                  <button type="button"
                                    className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:opacity-75"
                                    onClick={() => {
                                      if (sellingMk.ruleId) {
                                        setSelectedSpoBreakdown([{
                                          offerName: sellingMk.ruleName ?? "",
                                          discount: sellingMk.markupAmount,
                                          description: `${sellingMk.markupType === "PERCENTAGE" ? `${sellingMk.markupValue}%` : `${sellingMk.markupValue} flat`} markup`,
                                        }]);
                                        setSpoModalOpen(true);
                                      }
                                    }}>
                                    {sellingMkLabel}
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground">{sellingMkLabel ?? "No markup"}</span>
                                )}
                                {sellingMk.ruleName && <span className="text-muted-foreground"> ({sellingMk.ruleName})</span>}
                                {sellingMk.markupAmount !== 0 && (
                                  <span> = {booking.currency.symbol}{sellingMk.markupAmount > 0 ? "+" : ""}{sellingMk.markupAmount.toFixed(2)}</span>
                                )}
                              </div>
                              <div className="border-t pt-1 font-medium text-foreground">
                                Total: {booking.currency.symbol}{Number(room.sellingTotal).toFixed(2)}
                              </div>
                            </>
                          ) : (
                            <p>
                              {booking.currency.symbol}{Number(room.sellingRatePerNight).toFixed(2)}/night &times; {booking.nights} = {booking.currency.symbol}{Number(room.sellingTotal).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ── Margin ── */}
                      <div className="rounded-md border p-2.5">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Margin</span>
                        <div className="mt-1.5 space-y-0.5">
                          <p className={`font-mono text-sm font-semibold ${margin > 0 ? "text-green-600 dark:text-green-400" : margin < 0 ? "text-destructive" : ""}`}>
                            {booking.currency.symbol}{margin.toFixed(2)}
                          </p>
                          {Number(room.buyingTotal) > 0 && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {marginPct.toFixed(1)}% on buying
                            </p>
                          )}
                        </div>
                      </div>
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
        <TabsContent value="payments" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {booking.payments.length} payment(s) recorded
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/finance/booking-reconciliation">
                Go to Booking Reconciliation
              </Link>
            </Button>
          </div>

          {/* ── Collections (FROM_SOURCE) ── */}
          {(() => {
            const sourceLabel =
              booking.source === "TOUR_OPERATOR"
                ? `Tour Operator${booking.tourOperator ? ` — ${booking.tourOperator.name}` : ""}`
                : booking.source === "API"
                  ? "B2C / Online Guest"
                  : "Direct / Individual Guest";
            const collections = booking.payments.filter((p) => p.direction === "FROM_SOURCE");
            const totalCollected = collections.reduce(
              (s, p) => s + (p.isRefund ? -Number(p.amount) : Number(p.amount)),
              0,
            );
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Collections</h3>
                  <span className="text-xs text-muted-foreground">({sourceLabel})</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Selling Total</p>
                      <p className="text-base font-mono font-semibold">
                        {booking.currency.symbol}{Number(booking.sellingTotal).toLocaleString("en", { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Collected</p>
                      <p className="text-base font-mono font-semibold text-green-600">
                        {booking.currency.symbol}{totalCollected.toLocaleString("en", { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Balance Due</p>
                      <p className={`text-base font-mono font-semibold ${Number(booking.balanceDue) > 0 ? "text-destructive" : "text-green-600"}`}>
                        {booking.currency.symbol}{Number(booking.balanceDue).toLocaleString("en", { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                {collections.length > 0 ? (
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
                      {collections.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{format(new Date(p.paidAt), "dd MMM yyyy")}</TableCell>
                          <TableCell>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</TableCell>
                          <TableCell className="font-mono text-sm">{p.reference ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={p.isRefund ? "destructive" : "default"}>
                              {p.isRefund ? "Refund" : "Collection"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {p.isRefund ? "-" : ""}{p.currency.symbol}{Number(p.amount).toLocaleString("en", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.createdBy?.name ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">No collections recorded yet.</p>
                )}
              </div>
            );
          })()}

          <div className="border-t" />

          {/* ── Hotel Payments (TO_HOTEL) ── */}
          {(() => {
            const hotelPayments = booking.payments.filter((p) => p.direction === "TO_HOTEL");
            const totalPaidToHotel = hotelPayments.reduce(
              (s, p) => s + (p.isRefund ? -Number(p.amount) : Number(p.amount)),
              0,
            );
            const creditApplied = Number(booking.creditApplied ?? 0);
            const netDueToHotel = Math.max(0, Number(booking.buyingTotal) - totalPaidToHotel - creditApplied);
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Hotel Payments</h3>
                  <span className="text-xs text-muted-foreground">(payments made to {booking.hotel.name})</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Buying Total</p>
                      <p className="text-base font-mono font-semibold">
                        {booking.currency.symbol}{Number(booking.buyingTotal).toLocaleString("en", { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Paid to Hotel</p>
                      <p className="text-base font-mono font-semibold text-green-600">
                        {booking.currency.symbol}{totalPaidToHotel.toLocaleString("en", { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Credit Applied</p>
                      <p className="text-base font-mono font-semibold text-blue-600">
                        {booking.currency.symbol}{creditApplied.toLocaleString("en", { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Net Due to Hotel</p>
                      <p className={`text-base font-mono font-semibold ${netDueToHotel > 0 ? "text-destructive" : "text-green-600"}`}>
                        {booking.currency.symbol}{netDueToHotel.toLocaleString("en", { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                {hotelPayments.length > 0 ? (
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
                      {hotelPayments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{format(new Date(p.paidAt), "dd MMM yyyy")}</TableCell>
                          <TableCell>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</TableCell>
                          <TableCell className="font-mono text-sm">{p.reference ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={p.isRefund ? "destructive" : "secondary"}>
                              {p.isRefund ? "Refund from Hotel" : "Payment to Hotel"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {p.isRefund ? "-" : ""}{p.currency.symbol}{Number(p.amount).toLocaleString("en", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.createdBy?.name ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">No hotel payments recorded yet.</p>
                )}
              </div>
            );
          })()}
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

        {/* Hotel Credits */}
        <TabsContent value="hotel-credits" className="space-y-4">
          {/* Issued Credit Note (from this booking being cancelled) */}
          {hotelCredits?.issued && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Credit Note Issued by This Booking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-mono font-semibold">{hotelCredits.issued.code}</p>
                    <p className="text-xs text-muted-foreground">
                      Issued {format(new Date(hotelCredits.issued.createdAt), "dd MMM yyyy")} · {hotelCredits.issued.currency.symbol}{Number(hotelCredits.issued.amount).toFixed(2)} original
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={HOTEL_CREDIT_STATUS_VARIANTS[hotelCredits.issued.status] as "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | "success" | "warning" | "info"}>
                      {HOTEL_CREDIT_STATUS_LABELS[hotelCredits.issued.status]}
                    </Badge>
                    <p className="text-sm font-mono">
                      {hotelCredits.issued.currency.symbol}{Number(hotelCredits.issued.remainingAmount).toFixed(2)} remaining
                    </p>
                    {hotelCredits.issued.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => cancelCreditMutation.mutate(hotelCredits.issued!.id)}
                        disabled={cancelCreditMutation.isPending}
                      >
                        Cancel Credit
                      </Button>
                    )}
                  </div>
                </div>
                {hotelCredits.issued.consumptions.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Applied To Booking</TableHead>
                        <TableHead>Amount Used</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hotelCredits.issued.consumptions.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Link href={`/reservations/bookings/${c.booking.id}`} className="font-mono text-primary hover:underline">
                              {c.booking.code}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono">{hotelCredits.issued!.currency.symbol}{Number(c.amountUsed).toFixed(2)}</TableCell>
                          <TableCell>{format(new Date(c.usedAt), "dd MMM yyyy")}</TableCell>
                          <TableCell className="text-muted-foreground">{c.usedBy.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Credits Applied to This Booking */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Credits Applied to This Booking</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setApplyDialogOpen(true)}
                  disabled={booking.status === "CANCELLED" || booking.status === "CHECKED_OUT"}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Apply Hotel Credit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {hotelCredits?.consumed && hotelCredits.consumed.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Credit Code</TableHead>
                        <TableHead>Hotel</TableHead>
                        <TableHead className="text-right">Amount Applied</TableHead>
                        <TableHead>Applied By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hotelCredits.consumed.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.creditNote.code}</TableCell>
                          <TableCell>{c.creditNote.hotel.name}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            -{c.creditNote.currency.symbol}{Number(c.amountUsed).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{c.usedBy.name}</TableCell>
                          <TableCell>{format(new Date(c.usedAt), "dd MMM yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3 flex justify-end text-sm">
                    <span className="text-muted-foreground mr-2">Net Hotel Cost:</span>
                    <span className="font-mono font-semibold">
                      {booking.currency.symbol}{(Number(booking.buyingTotal) - Number(booking.creditApplied)).toFixed(2)}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({booking.currency.symbol}{Number(booking.buyingTotal).toFixed(2)} - {booking.currency.symbol}{Number(booking.creditApplied).toFixed(2)} credits)
                    </span>
                  </div>
                </>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No hotel credits applied to this booking.</p>
              )}
            </CardContent>
          </Card>
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

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={(open) => { setConfirmOpen(open); if (!open) { setHotelConfNo(""); setConfirmFile(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              Provide a hotel confirmation number or upload a confirmation document to confirm booking {booking.code}. At least one is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hotel Confirmation Number</Label>
              <Input
                value={hotelConfNo}
                onChange={(e) => setHotelConfNo(e.target.value)}
                placeholder="e.g. HC-123456"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmation Document</Label>
              {confirmFile ? (
                <div className="flex items-center gap-2 rounded border p-2 text-sm">
                  <span className="flex-1 truncate">{confirmFile.split("/").pop()}</span>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmFile("")} className="h-7 text-destructive">Remove</Button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.eml,.png,.jpg,.jpeg,.webp"
                    className="text-sm"
                    disabled={confirmUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10 MB)"); return; }
                      setConfirmUploading(true);
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("folder", "general");
                      try {
                        const res = await fetch("/api/upload/image", { method: "POST", body: formData });
                        const json = await res.json();
                        if (!res.ok) throw new Error(json.error || "Upload failed");
                        setConfirmFile(json.url);
                        toast.success("File uploaded");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Upload failed");
                      } finally {
                        setConfirmUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, EML, or image — max 10 MB</p>
                </div>
              )}
            </div>
          </div>
          {transitionMutation.error && (
            <p className="text-sm text-destructive">{transitionMutation.error.message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              disabled={(!hotelConfNo.trim() && !confirmFile) || transitionMutation.isPending || confirmUploading}
              onClick={() =>
                transitionMutation.mutate({
                  bookingId: id,
                  action: "confirm",
                  hotelConfNo: hotelConfNo.trim() || undefined,
                  confirmationFile: confirmFile || undefined,
                })
              }
            >
              {transitionMutation.isPending ? "Confirming..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recalculate Buying Rates Confirmation Dialog */}
      <Dialog open={recalcOpen} onOpenChange={setRecalcOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recalculate Buying Rates</DialogTitle>
            <DialogDescription>
              This will re-run the contract rate engine for all rooms in booking{" "}
              <span className="font-mono font-semibold">{booking.code}</span> using the current
              seasonal rates and any active SPOs. The buying total will be updated.
              Selling prices and payments are not affected.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current buying total</span>
              <span className="font-mono">{booking.currency.symbol}{Number(booking.buyingTotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booking date used</span>
              <span className="font-mono text-xs">
                {booking.bookingDate
                  ? format(new Date(booking.bookingDate), "dd MMM yyyy") + " (override)"
                  : format(new Date(booking.createdAt), "dd MMM yyyy") + " (created date)"}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecalcOpen(false)}>Cancel</Button>
            <Button
              onClick={() => recalculateBuyingMutation.mutate({ id })}
              disabled={recalculateBuyingMutation.isPending}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {recalculateBuyingMutation.isPending ? "Calculating…" : "Recalculate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recalculate Selling Confirmation Dialog */}
      <Dialog open={recalcSellingOpen} onOpenChange={setRecalcSellingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recalculate Selling Rates</DialogTitle>
            <DialogDescription>
              Re-applies the current markup rule to the stored buying totals and updates the selling rates for all rooms. The buying rates are not changed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecalcSellingOpen(false)}>Cancel</Button>
            <Button
              onClick={() => recalculateSellingMutation.mutate({ id })}
              disabled={recalculateSellingMutation.isPending}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {recalculateSellingMutation.isPending ? "Calculating…" : "Recalculate Selling"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              This will cancel booking {booking.code}. If the booking was
              confirmed, allotment will be restored.
            </DialogDescription>
          </DialogHeader>

          {/* ── Split Cancellation Penalty ── */}
          {penaltyLoading ? (
            <p className="text-xs text-muted-foreground">Calculating penalty...</p>
          ) : (
            <div className="space-y-3">
              {/* Hotel side (buying) */}
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Hotel Penalty (Buying Side)</p>
                  {cancellationPenalty && (
                    <span className="text-xs text-muted-foreground">
                      {cancellationPenalty.daysBefore}d before — {cancellationPenalty.penaltyPercent}%
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Contract Amount</span>
                  <span className="font-mono font-semibold">
                    {booking.currency.symbol}{Number(cancellationPenalty?.penaltyAmount ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hotel-penalty-override"
                    checked={hotelPenaltyOverride}
                    onCheckedChange={(v) => {
                      setHotelPenaltyOverride(!!v);
                      if (!v) setHotelPenaltyCustom("");
                    }}
                  />
                  <Label htmlFor="hotel-penalty-override" className="cursor-pointer text-xs">
                    Override hotel penalty (e.g. hotel waived fees)
                  </Label>
                </div>
                {hotelPenaltyOverride && (
                  <div className="pl-6 flex items-center gap-2">
                    <Label className="text-xs shrink-0">Custom Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={hotelPenaltyCustom}
                      onChange={(e) => setHotelPenaltyCustom(e.target.value)}
                      placeholder="0.00 = free cancellation"
                      className="h-7 text-xs"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">{booking.currency.symbol}</span>
                  </div>
                )}
              </div>

              {/* Source side (selling) */}
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Source Penalty (Selling Side)
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {booking.source === "TOUR_OPERATOR"
                      ? `TO: ${booking.tourOperator?.name ?? "Tour Operator"}`
                      : booking.source === "API"
                        ? "B2C / Online Guest"
                        : "Individual Guest"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Default Amount</span>
                  <span className="font-mono font-semibold">
                    {booking.currency.symbol}{Number(cancellationPenalty?.penaltyAmount ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="source-penalty-override"
                    checked={sourcePenaltyOverride}
                    onCheckedChange={(v) => {
                      setSourcePenaltyOverride(!!v);
                      if (!v) setSourcePenaltyCustom("");
                    }}
                  />
                  <Label htmlFor="source-penalty-override" className="cursor-pointer text-xs">
                    Override source penalty
                  </Label>
                </div>
                {sourcePenaltyOverride && (
                  <div className="pl-6 flex items-center gap-2">
                    <Label className="text-xs shrink-0">Custom Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sourcePenaltyCustom}
                      onChange={(e) => setSourcePenaltyCustom(e.target.value)}
                      placeholder="0.00"
                      className="h-7 text-xs"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">{booking.currency.symbol}</span>
                  </div>
                )}
              </div>
              {cancellationPenalty?.description && (
                <p className="text-xs text-muted-foreground px-1">
                  Policy: {cancellationPenalty.description}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Cancellation Reason</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Optional reason..."
              rows={2}
            />
          </div>

          {/* Hotel Credit Note — shown when payment method is CASH */}
          {booking.hotelPaymentMethod === "CASH" && Number(booking.buyingTotal) > 0 && (() => {
            const contractPenaltyAmt = Number(cancellationPenalty?.penaltyAmount ?? 0);
            const effectiveHotelPenalty = hotelPenaltyOverride
              ? (Number(hotelPenaltyCustom) || 0)
              : contractPenaltyAmt;
            const creditNoteAmount = Math.max(0, Number(booking.buyingTotal) - effectiveHotelPenalty);
            return (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-3 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="issue-credit-note"
                    checked={issueCreditNote}
                    onCheckedChange={(v) => setIssueCreditNote(!!v)}
                    disabled={creditNoteAmount <= 0}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="issue-credit-note" className="cursor-pointer font-medium">
                      Issue Hotel Credit Note
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {creditNoteAmount > 0 ? (
                        <>The hotel owes us <strong>{booking.currency.symbol}{creditNoteAmount.toFixed(2)}</strong> after penalty — issue a credit note for future bookings.</>
                      ) : (
                        "Hotel penalty covers the full buying amount — no credit balance to issue."
                      )}
                    </p>
                  </div>
                </div>
                {issueCreditNote && creditNoteAmount > 0 && (
                  <div className="space-y-2 pl-6">
                    <Label className="text-xs">Credit Note Notes (optional)</Label>
                    <Textarea
                      value={creditNoteNotes}
                      onChange={(e) => setCreditNoteNotes(e.target.value)}
                      placeholder="e.g. Room credit to be used within 12 months"
                      rows={2}
                      className="text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      A Vendor Refund entry will be automatically posted to Finance.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

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
              onClick={() => {
                const contractPenaltyAmt = Number(cancellationPenalty?.penaltyAmount ?? 0);
                const effectiveHotelPenalty = hotelPenaltyOverride
                  ? (Number(hotelPenaltyCustom) || 0)
                  : contractPenaltyAmt;
                const effectiveSourcePenalty = sourcePenaltyOverride
                  ? (Number(sourcePenaltyCustom) || 0)
                  : contractPenaltyAmt;
                transitionMutation.mutate({
                  bookingId: id,
                  action: "cancel",
                  reason: cancelReason || undefined,
                  issueCreditNote,
                  creditNoteNotes: creditNoteNotes || undefined,
                  hotelPenaltyOverridden: hotelPenaltyOverride,
                  hotelPenaltyAmount: effectiveHotelPenalty,
                  sourcePenaltyOverridden: sourcePenaltyOverride,
                  sourcePenaltyAmount: effectiveSourcePenalty,
                });
              }}
            >
              {transitionMutation.isPending ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Hotel Credit Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Hotel Credit</DialogTitle>
            <DialogDescription>
              Apply a hotel credit note against this booking&apos;s hotel cost.
            </DialogDescription>
          </DialogHeader>
          <ApplyCreditDialogContent
            bookingId={id}
            hotelId={booking.hotelId}
            onApply={(creditNoteId, amountUsed) => {
              applyCreditMutation.mutate(
                { creditNoteId, bookingId: id, amountUsed },
                { onSuccess: () => setApplyDialogOpen(false) },
              );

            }}
            isPending={applyCreditMutation.isPending}
          />
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

      {/* SPO Detail Modal */}
      <Dialog open={spoDetailOpen} onOpenChange={(o) => { setSpoDetailOpen(o); if (!o) setSelectedSpoId(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Season SPO Details</DialogTitle>
            <DialogDescription>
              {spoDetailLoading ? "Loading…" : spoDetail ? `${spoDetail.name ?? spoDetail.id} — ${spoDetail.spoType.replace(/_/g, " ")}` : ""}
            </DialogDescription>
          </DialogHeader>
          {spoDetailLoading && <div className="py-6 text-center text-sm text-muted-foreground">Loading SPO details…</div>}
          {spoDetail && !spoDetailLoading && (() => {
            const spo = spoDetail;
            const SPO_TYPE_LABELS: Record<string, string> = {
              RATE_OVERRIDE: "Rate Override",
              BOOKING_WINDOW: "Booking Window",
              PERCENTAGE: "Percentage",
            };
            return (
              <div className="space-y-4 text-sm">
                {/* Header info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">Contract:</span>{" "}
                    <span className="font-medium">{spo.contract.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hotel:</span>{" "}
                    <span className="font-medium">{spo.contract.hotel.code} — {spo.contract.hotel.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <Badge variant="outline">{SPO_TYPE_LABELS[spo.spoType] ?? spo.spoType}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <Badge variant={spo.active ? "default" : "secondary"}>{spo.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  {spo.dateFrom && (
                    <div>
                      <span className="text-muted-foreground">Travel From:</span>{" "}
                      <span>{format(new Date(spo.dateFrom), "dd MMM yyyy")}</span>
                    </div>
                  )}
                  {spo.dateTo && (
                    <div>
                      <span className="text-muted-foreground">Travel To:</span>{" "}
                      <span>{format(new Date(spo.dateTo), "dd MMM yyyy")}</span>
                    </div>
                  )}
                  {spo.bookFrom && (
                    <div>
                      <span className="text-muted-foreground">Book From:</span>{" "}
                      <span>{format(new Date(spo.bookFrom), "dd MMM yyyy")}</span>
                    </div>
                  )}
                  {spo.bookTo && (
                    <div>
                      <span className="text-muted-foreground">Book To:</span>{" "}
                      <span>{format(new Date(spo.bookTo), "dd MMM yyyy")}</span>
                    </div>
                  )}
                </div>
                {/* Base rates */}
                {(spo.basePp != null || spo.sglSup != null || spo.thirdAdultRed != null) && (
                  <div className="rounded-md border p-3 space-y-1">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-2">Rates</p>
                    <div className="grid grid-cols-3 gap-2">
                      {spo.basePp != null && (
                        <div><span className="text-muted-foreground">Base PP:</span> <span className="font-mono font-medium">{Number(spo.basePp).toFixed(2)}</span></div>
                      )}
                      {spo.sglSup != null && (
                        <div><span className="text-muted-foreground">Sgl Sup:</span> <span className="font-mono font-medium">{Number(spo.sglSup).toFixed(2)}</span></div>
                      )}
                      {spo.thirdAdultRed != null && (
                        <div><span className="text-muted-foreground">3rd Adult Red:</span> <span className="font-mono font-medium">{Number(spo.thirdAdultRed).toFixed(2)}</span></div>
                      )}
                      {spo.firstChildPct != null && (
                        <div><span className="text-muted-foreground">1st Child %:</span> <span className="font-mono font-medium">{Number(spo.firstChildPct)}%</span></div>
                      )}
                      {spo.secondChildPct != null && (
                        <div><span className="text-muted-foreground">2nd Child %:</span> <span className="font-mono font-medium">{Number(spo.secondChildPct)}%</span></div>
                      )}
                      {spo.value != null && spo.valueType && (
                        <div><span className="text-muted-foreground">Value:</span> <span className="font-mono font-medium">{Number(spo.value)}{spo.valueType === "PERCENTAGE" ? "%" : ""}</span></div>
                      )}
                    </div>
                  </div>
                )}
                {/* Travel date rows */}
                {spo.travelDates.length > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-2">Travel Date Periods</p>
                    <table className="w-full text-xs border rounded-md overflow-hidden">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2">From</th>
                          <th className="text-left p-2">To</th>
                          <th className="text-right p-2">Base PP</th>
                          <th className="text-right p-2">Sgl Sup</th>
                          <th className="text-right p-2">3rd Red</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spo.travelDates.map((td, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{format(new Date(td.dateFrom), "dd MMM yyyy")}</td>
                            <td className="p-2">{format(new Date(td.dateTo), "dd MMM yyyy")}</td>
                            <td className="p-2 text-right font-mono">{td.basePp != null ? Number(td.basePp).toFixed(2) : "—"}</td>
                            <td className="p-2 text-right font-mono">{td.sglSup != null ? Number(td.sglSup).toFixed(2) : "—"}</td>
                            <td className="p-2 text-right font-mono">{td.thirdAdultRed != null ? Number(td.thirdAdultRed).toFixed(2) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* BTC periods */}
                {spo.btcPeriods.length > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-2">Back-to-Contract Periods</p>
                    <table className="w-full text-xs border rounded-md overflow-hidden">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2">From</th>
                          <th className="text-left p-2">To</th>
                          <th className="text-center p-2">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spo.btcPeriods.map((b, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{format(new Date(b.dateFrom), "dd MMM yyyy")}</td>
                            <td className="p-2">{format(new Date(b.dateTo), "dd MMM yyyy")}</td>
                            <td className="p-2 text-center">
                              <Badge variant={b.active ? "default" : "secondary"} className="text-[10px]">{b.active ? "Yes" : "No"}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Room supplements */}
                {spo.roomSupplements.length > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-2">Room Supplements</p>
                    <div className="space-y-1">
                      {spo.roomSupplements.map((rs, i) => (
                        <div key={i} className="flex items-center justify-between rounded border px-3 py-1.5 text-xs">
                          <span>{rs.roomType.name} ({rs.roomType.code})</span>
                          <span className="font-mono">{Number(rs.value)}{rs.valueType === "PERCENTAGE" ? "%" : " flat"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Special Offer Detail Modal */}
      <Dialog open={offerDetailOpen} onOpenChange={(o) => { setOfferDetailOpen(o); if (!o) setSelectedOfferId(null); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Special Offer Details</DialogTitle>
            <DialogDescription>
              {offerDetailLoading ? "Loading…" : offerDetail?.name ?? ""}
            </DialogDescription>
          </DialogHeader>
          {offerDetailLoading && <div className="py-6 text-center text-sm text-muted-foreground">Loading offer details…</div>}
          {offerDetail && !offerDetailLoading && (() => {
            const o = offerDetail;
            const OFFER_TYPE_LABELS: Record<string, string> = {
              EARLY_BIRD: "Early Bird",
              LONG_STAY: "Long Stay",
              FREE_NIGHTS: "Free Nights",
              HONEYMOON: "Honeymoon",
              GROUP_DISCOUNT: "Group Discount",
              NORMAL_EBD: "Early Bird (EBD)",
            };
            return (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <Badge variant="outline">{OFFER_TYPE_LABELS[o.offerType] ?? o.offerType}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <Badge variant={o.active ? "default" : "secondary"}>{o.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Discount:</span>{" "}
                    <span className="font-mono font-medium text-green-600">
                      {o.discountType === "PERCENTAGE" ? `${Number(o.discountValue)}%` : `${Number(o.discountValue)} flat`}
                    </span>
                  </div>
                  {o.validFrom && (
                    <div><span className="text-muted-foreground">Valid From:</span> <span>{format(new Date(o.validFrom), "dd MMM yyyy")}</span></div>
                  )}
                  {o.validTo && (
                    <div><span className="text-muted-foreground">Valid To:</span> <span>{format(new Date(o.validTo), "dd MMM yyyy")}</span></div>
                  )}
                  {o.bookByDate && (
                    <div><span className="text-muted-foreground">Book By:</span> <span>{format(new Date(o.bookByDate), "dd MMM yyyy")}</span></div>
                  )}
                  {o.bookFromDate && (
                    <div><span className="text-muted-foreground">Book From:</span> <span>{format(new Date(o.bookFromDate), "dd MMM yyyy")}</span></div>
                  )}
                  {o.advanceBookDays != null && (
                    <div><span className="text-muted-foreground">Advance Book Days:</span> <span className="font-mono">{o.advanceBookDays}+ days</span></div>
                  )}
                  {o.minimumNights != null && (
                    <div><span className="text-muted-foreground">Min Nights:</span> <span className="font-mono">{o.minimumNights}</span></div>
                  )}
                  {o.minimumRooms != null && (
                    <div><span className="text-muted-foreground">Min Rooms:</span> <span className="font-mono">{o.minimumRooms}</span></div>
                  )}
                  {o.stayNights != null && o.payNights != null && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Stay/Pay:</span>{" "}
                      <span className="font-mono">Stay {o.stayNights}, Pay {o.payNights}</span>
                    </div>
                  )}
                  {o.stayDateType && (
                    <div><span className="text-muted-foreground">Stay Date Type:</span> <span>{o.stayDateType}</span></div>
                  )}
                  {o.paymentPct != null && (
                    <div><span className="text-muted-foreground">Payment %:</span> <span className="font-mono">{o.paymentPct}%</span></div>
                  )}
                  {o.paymentDeadline && (
                    <div><span className="text-muted-foreground">Payment Deadline:</span> <span>{format(new Date(o.paymentDeadline), "dd MMM yyyy")}</span></div>
                  )}
                  {o.roomingListBy && (
                    <div><span className="text-muted-foreground">Rooming List By:</span> <span>{format(new Date(o.roomingListBy), "dd MMM yyyy")}</span></div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Combinable:</span>{" "}
                    <Badge variant={o.combinable ? "default" : "secondary"}>{o.combinable ? "Yes" : "No"}</Badge>
                  </div>
                </div>
              </div>
            );
          })()}
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
  value: ReactNode;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value ?? "—"}</span>
    </div>
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

// ─── Apply Credit Dialog Content ───────────────────────────

function ApplyCreditDialogContent({
  bookingId,
  hotelId,
  onApply,
  isPending,
}: {
  bookingId: string;
  hotelId: string;
  onApply: (creditNoteId: string, amountUsed: number) => void;
  isPending: boolean;
}) {
  const { data: available, isLoading } = trpc.reservations.hotelCredit.getAvailableByHotel.useQuery(hotelId);
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");

  const selected = available?.find((c) => c.id === selectedId);
  const maxAmount = selected ? Number(selected.remainingAmount) : 0;

  if (isLoading) return <p className="py-4 text-center text-sm text-muted-foreground">Loading credits...</p>;
  if (!available || available.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No open hotel credit notes available for this hotel.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Credit Note</Label>
        <Select value={selectedId} onValueChange={(v) => { setSelectedId(v); setAmount(""); }}>
          <SelectTrigger>
            <SelectValue placeholder="Select a credit note..." />
          </SelectTrigger>
          <SelectContent>
            {available.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} — {c.sourceBooking?.code} — {c.currency.symbol}{Number(c.remainingAmount).toFixed(2)} remaining
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selected && (
        <div className="space-y-2">
          <Label>Amount to Apply (max: {selected.currency.symbol}{maxAmount.toFixed(2)})</Label>
          <Input
            type="number"
            min={0.01}
            max={maxAmount}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Max ${maxAmount.toFixed(2)}`}
          />
        </div>
      )}
      <DialogFooter>
        <Button
          disabled={!selectedId || !amount || Number(amount) <= 0 || Number(amount) > maxAmount || isPending}
          onClick={() => onApply(selectedId, Number(amount))}
        >
          {isPending ? "Applying..." : "Apply Credit"}
        </Button>
      </DialogFooter>
    </div>
  );
}

