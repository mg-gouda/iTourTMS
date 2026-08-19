"use client";

import {
  ArrowLeft,
  CalendarClock,
  Download,
  FileText,
  Pencil,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { BookingAmendDialog } from "@/components/b2b/booking-amend-dialog";
import { BookingCancelDialog } from "@/components/b2b/booking-cancel-dialog";
import { BookingDetailsForm } from "@/components/b2b/booking-details-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PARTNER_BOOKING_STATUS_LABELS,
  PARTNER_BOOKING_STATUS_VARIANTS,
  PARTNER_TIMELINE_LABELS,
} from "@/lib/constants/b2b-portal";
import { trpc } from "@/lib/trpc";

const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const money = (n: number | string | { toString(): string }, currency?: string | null) =>
  `${currency ? `${currency} ` : ""}${Number(n).toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * One booking, everything the partner may do with it. What they may change on
 * their own is decided server-side; this only shows the outcome and asks for
 * confirmation when money is involved.
 */
export default function PartnerBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [amendOpen, setAmendOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: booking, isLoading, refetch } = trpc.partner.booking.getById.useQuery({ id });

  if (isLoading || !booking) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const editable = ["CONFIRMED", "ON_REQUEST", "PENDING_APPROVAL"].includes(booking.status);
  const started = new Date(booking.checkIn) <= new Date();
  const canChange = editable && !started;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/b2b/bookings">
              <ArrowLeft className="mr-1 size-4" /> My bookings
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{booking.code}</h1>
            <Badge variant={PARTNER_BOOKING_STATUS_VARIANTS[booking.status] ?? "secondary"}>
              {PARTNER_BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {booking.hotel?.name}
            {booking.hotel?.city ? ` · ${booking.hotel.city}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/b2b/documents/booking/${booking.id}?kind=confirmation`}>
              <FileText className="mr-2 size-4" /> Confirmation
            </a>
          </Button>
          {booking.status === "CONFIRMED" && (
            <Button variant="outline" asChild>
              <a href={`/api/b2b/documents/booking/${booking.id}?kind=voucher`}>
                <Download className="mr-2 size-4" /> Voucher
              </a>
            </Button>
          )}
          {canChange && (
            <>
              <Button variant="outline" onClick={() => setAmendOpen(true)}>
                <Pencil className="mr-2 size-4" /> Change dates or rooms
              </Button>
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                <X className="mr-2 size-4" /> Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {booking.status === "ON_REQUEST" && booking.onRequestDeadline && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p>
              The hotel has not confirmed these rooms yet. We will come back to you by{" "}
              <strong>{date(booking.onRequestDeadline)}</strong>. Nothing is held and no credit
              is used until it is confirmed.
            </p>
          </CardContent>
        </Card>
      )}

      {booking.status === "PENDING_APPROVAL" && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p>
              This booking is waiting for approval from your account manager. It is not
              confirmed with the hotel yet.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {date(booking.checkIn)} – {date(booking.checkOut)}
            </p>
            <p className="text-muted-foreground text-xs">{booking.nights} nights</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Party</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {booking.noOfRooms} room{booking.noOfRooms === 1 ? "" : "s"}
            </p>
            <p className="text-muted-foreground text-xs">
              {booking.adults} adults
              {booking.children ? `, ${booking.children} children` : ""}
              {booking.infants ? `, ${booking.infants} infants` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {money(booking.partnerClientPrice ?? booking.sellingTotal, booking.currency?.code)}
            </p>
            <p className="text-muted-foreground text-xs">
              Net {money(booking.sellingTotal, booking.currency?.code)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Booked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {booking.bookingDate ? date(booking.bookingDate) : "—"}
            </p>
            <p className="text-muted-foreground text-xs">
              {booking.partnerReference ? `Your ref: ${booking.partnerReference}` : "No reference"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rooms">
        <TabsList>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="details">Guests &amp; flights</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-xs">
                  <tr>
                    <th className="p-3 text-left font-medium">Room</th>
                    <th className="p-3 text-left font-medium">Board</th>
                    <th className="p-3 text-left font-medium">Occupancy</th>
                    <th className="p-3 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.rooms.map((room) => (
                    <tr key={room.id} className="border-b last:border-0">
                      <td className="p-3">
                        <span className="text-muted-foreground mr-2">#{room.roomIndex}</span>
                        {room.roomType?.name}
                      </td>
                      <td className="p-3">{room.mealBasis?.name}</td>
                      <td className="p-3">
                        {room.adults} adults
                        {room.children ? `, ${room.children} children` : ""}
                        {room.infants ? `, ${room.infants} infants` : ""}
                      </td>
                      <td className="p-3 text-right">
                        {money(room.sellingTotal, booking.currency?.code)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <BookingDetailsForm
            booking={booking}
            editable={canChange}
            onSaved={() => void refetch()}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="py-4">
              {booking.timeline.length === 0 && booking.rateChanges.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nothing has changed since you booked.</p>
              ) : (
                <ol className="space-y-4">
                  {booking.timeline.map((entry) => (
                    <li key={entry.id} className="border-l-2 pl-4">
                      <p className="text-sm font-medium">
                        {PARTNER_TIMELINE_LABELS[entry.action] ?? entry.action}
                      </p>
                      {entry.details && (
                        <p className="text-muted-foreground text-xs">{entry.details}</p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {new Date(entry.createdAt).toLocaleString("en-GB")}
                      </p>
                    </li>
                  ))}
                  {booking.rateChanges.map((change) => (
                    <li key={change.id} className="border-l-2 pl-4">
                      <p className="text-sm font-medium">Price changed</p>
                      <p className="text-muted-foreground text-xs">
                        {money(change.oldBuyingTotal, booking.currency?.code)} →{" "}
                        {money(change.newBuyingTotal, booking.currency?.code)}
                        {change.reason ? ` · ${change.reason}` : ""}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(change.changedAt).toLocaleString("en-GB")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BookingAmendDialog
        booking={booking}
        open={amendOpen}
        onOpenChange={setAmendOpen}
        onApplied={() => void refetch()}
      />
      <BookingCancelDialog
        bookingId={booking.id}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onDone={() => void refetch()}
      />
    </div>
  );
}
