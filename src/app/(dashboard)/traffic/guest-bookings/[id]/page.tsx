"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TT_BOOKING_STATUS_LABELS, TT_BOOKING_STATUS_VARIANTS, TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "ONLINE", label: "Online" },
  { value: "OTHER", label: "Other" },
];

export default function GuestBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payments ({booking.payments.length})</CardTitle>
            <RecordPaymentDialog
              bookingId={id}
              currencySymbol={booking.currency.symbol}
              onSuccess={() => utils.traffic.guestBooking.getById.invalidate({ id })}
            />
          </CardHeader>
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

      {/* Get Quote section */}
      <GetQuoteCard booking={booking} />

      <Button variant="outline" onClick={() => router.back()}>Back</Button>
    </div>
  );
}

function RecordPaymentDialog({ bookingId, currencySymbol, onSuccess }: { bookingId: string; currencySymbol: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");

  const confirmMutation = trpc.traffic.guestBooking.confirmPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded");
      setOpen(false);
      setAmount("");
      setMethod("CASH");
      setReference("");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { toast.error("Enter a valid amount"); return; }
    confirmMutation.mutate({
      bookingId,
      amount: parsed,
      method,
      reference: reference || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Record Payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount ({currencySymbol})</Label>
            <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={confirmMutation.isPending}>
              {confirmMutation.isPending ? "Recording..." : "Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GetQuoteCard({ booking }: { booking: { vehicleType: { id: string; name: string }; serviceType: string } }) {
  const [showQuote, setShowQuote] = useState(false);

  const { data: quote, isLoading, refetch } = trpc.traffic.guestBooking.getQuote.useQuery(
    {
      vehicleTypeId: booking.vehicleType.id,
      serviceType: booking.serviceType,
    },
    { enabled: showQuote }
  );

  function handleGetQuote() {
    if (showQuote) {
      refetch();
    } else {
      setShowQuote(true);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Price Quote</CardTitle>
        <Button size="sm" variant="outline" onClick={handleGetQuote} disabled={isLoading}>
          {isLoading ? "Loading..." : "Get Quote"}
        </Button>
      </CardHeader>
      <CardContent>
        {!showQuote && <p className="py-4 text-center text-sm text-muted-foreground">Click &quot;Get Quote&quot; to fetch the current price for this service configuration.</p>}
        {showQuote && !isLoading && !quote && <p className="py-4 text-center text-sm text-muted-foreground">No matching price found for this vehicle type and service configuration.</p>}
        {quote && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-medium">{quote.currency.symbol}{Number(quote.price).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Price Type</span><span className="font-medium">{quote.priceType}</span></div>
            {quote.description && <div className="flex justify-between"><span className="text-muted-foreground">Description</span><span className="font-medium">{quote.description}</span></div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
