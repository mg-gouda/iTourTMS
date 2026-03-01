"use client";

import { useParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TT_BOOKING_STATUS_LABELS, TT_BOOKING_STATUS_VARIANTS, TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

export default function GuestBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: booking, isLoading } = trpc.traffic.guestBooking.getById.useQuery({ id });

  if (isLoading) return <div className="animate-fade-in space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[300px] w-full" /></div>;
  if (!booking) return <p>Booking not found.</p>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Guest Booking {booking.code}</h1><p className="text-muted-foreground">{booking.guestName}</p></div>
        <Badge variant={(TT_BOOKING_STATUS_VARIANTS[booking.status] ?? "secondary") as never}>{TT_BOOKING_STATUS_LABELS[booking.status]}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Guest</span><span className="font-medium">{booking.guestName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{booking.guestEmail ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{booking.guestPhone ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{TT_SERVICE_TYPE_LABELS[booking.serviceType]}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{new Date(booking.serviceDate).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Type</span><span className="font-medium">{booking.vehicleType.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pax</span><span className="font-medium">{booking.paxCount}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Quoted</span><span className="font-medium">{booking.currency.symbol}{Number(booking.quotedPrice).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-medium">{booking.currency.symbol}{Number(booking.paidAmount).toFixed(2)}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Payments ({booking.payments.length})</CardTitle></CardHeader>
          <CardContent>
            {booking.payments.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No payments yet.</p> : (
              <div className="space-y-2">{booking.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{p.method} &middot; {p.reference ?? "—"}</span>
                  <span className="font-medium">{Number(p.amount).toFixed(2)}</span>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button variant="outline" onClick={() => router.back()}>Back</Button>
    </div>
  );
}
