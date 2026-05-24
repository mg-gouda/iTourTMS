"use client";

import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CRUISE_BOOKING_STATUS_LABELS,
  CRUISE_BOOKING_STATUS_VARIANTS,
  CRUISE_PAX_TYPE_LABELS,
} from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";

export default function CruiseBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.nileCruises.booking.getById.useQuery({ id });
  const { data: passengers } = trpc.nileCruises.passenger.listByBooking.useQuery({ bookingId: id });
  const { data: payments } = trpc.nileCruises.payment.listByBooking.useQuery({ bookingId: id });
  const { data: vouchers } = trpc.nileCruises.voucher.listByBooking.useQuery({ bookingId: id });
  const { data: amendments } = trpc.nileCruises.amendment.listByBooking.useQuery({ bookingId: id });
  const { data: communications } = trpc.nileCruises.communication.listByBooking.useQuery({ bookingId: id });
  const { data: specialRequests } = trpc.nileCruises.specialRequest.listByBooking.useQuery({ bookingId: id });

  const confirm = trpc.nileCruises.booking.confirm.useMutation({
    onSuccess: () => { toast.success("Booking confirmed"); utils.nileCruises.booking.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const cancel = trpc.nileCruises.booking.cancel.useMutation({
    onSuccess: () => { toast.success("Booking cancelled"); utils.nileCruises.booking.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const markEmbarked = trpc.nileCruises.booking.markEmbarked.useMutation({
    onSuccess: () => { toast.success("Marked as embarked"); utils.nileCruises.booking.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const generateVoucher = trpc.nileCruises.voucher.generate.useMutation({
    onSuccess: () => { toast.success("Voucher generated"); utils.nileCruises.voucher.listByBooking.invalidate({ bookingId: id }); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data) return <div className="p-6 text-muted-foreground">Booking not found</div>;

  const statusVariant = CRUISE_BOOKING_STATUS_VARIANTS[data.status as keyof typeof CRUISE_BOOKING_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{data.code}</h1>
            <Badge variant={statusVariant}>
              {CRUISE_BOOKING_STATUS_LABELS[data.status as keyof typeof CRUISE_BOOKING_STATUS_LABELS]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.leadGuestName} · {data.adults}A {data.children > 0 ? `${data.children}C` : ""} {data.infants > 0 ? `${data.infants}I` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.departure.boat.name} · {format(new Date(data.departure.embarkDate), "dd MMM yyyy")} – {format(new Date(data.departure.disembarkDate), "dd MMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {data.status === "DRAFT" && (
            <Button onClick={() => confirm.mutate({ id })} disabled={confirm.isPending}>Confirm</Button>
          )}
          {data.status === "CONFIRMED" && (
            <Button variant="outline" onClick={() => markEmbarked.mutate({ id })} disabled={markEmbarked.isPending}>
              Mark Embarked
            </Button>
          )}
          {["CONFIRMED", "OPTION"].includes(data.status) && (
            <Button variant="outline" onClick={() => generateVoucher.mutate({ bookingId: id })} disabled={generateVoucher.isPending}>
              Issue Voucher
            </Button>
          )}
          {["DRAFT", "OPTION", "CONFIRMED"].includes(data.status) && (
            <Button variant="destructive" onClick={() => { if (window.confirm("Cancel this booking?")) cancel.mutate({ id, reason: "Cancelled by operator" }); }} disabled={cancel.isPending}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Price", value: `$${Number(data.grossTotal ?? 0).toLocaleString()}`, color: "" },
          { label: "Paid Amount", value: `$${Number(data.paidAmount ?? 0).toLocaleString()}`, color: "text-green-600" },
          { label: "Balance Due", value: `$${Number(data.balanceDue ?? 0).toLocaleString()}`, color: Number(data.balanceDue ?? 0) > 0 ? "text-red-500" : "text-green-600" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="passengers">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="passengers">Passengers ({passengers?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="vouchers">Vouchers ({vouchers?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({specialRequests?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="amendments">Amendments ({amendments?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="comms">Communications ({communications?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="passengers">
          <Card>
            <CardHeader><CardTitle className="text-base">Passengers</CardTitle></CardHeader>
            <CardContent>
              {!passengers?.length ? (
                <p className="text-sm text-muted-foreground py-4">No passengers added yet</p>
              ) : (
                <div className="divide-y">
                  {passengers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">
                          {p.title?.name ? `${p.title.name} ` : ""}{p.firstName} {p.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.nationality?.name ?? ""}
                          {p.dateOfBirth ? ` · DOB: ${format(new Date(p.dateOfBirth), "dd MMM yyyy")}` : ""}
                          {p.passportNumber ? ` · PP: ${p.passportNumber}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {CRUISE_PAX_TYPE_LABELS[p.paxType as keyof typeof CRUISE_PAX_TYPE_LABELS]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
            <CardContent>
              {!payments?.length ? (
                <p className="text-sm text-muted-foreground py-4">No payments recorded</p>
              ) : (
                <div className="divide-y">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">{p.method}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(p.paidAt), "dd MMM yyyy")}
                          {p.reference ? ` · Ref: ${p.reference}` : ""}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-medium text-green-600">
                        +${Number(p.amount).toLocaleString()} {p.currency}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vouchers">
          <Card>
            <CardHeader><CardTitle className="text-base">Vouchers</CardTitle></CardHeader>
            <CardContent>
              {!vouchers?.length ? (
                <p className="text-sm text-muted-foreground py-4">No vouchers issued</p>
              ) : (
                <div className="divide-y">
                  {vouchers.map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-2">
                      <p className="text-sm font-medium font-mono">{v.code}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{format(new Date(v.issuedAt), "dd MMM yyyy")}</p>
                        <Badge variant={v.status === "ISSUED" ? "default" : "secondary"}>{v.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader><CardTitle className="text-base">Special Requests</CardTitle></CardHeader>
            <CardContent>
              {!specialRequests?.length ? (
                <p className="text-sm text-muted-foreground py-4">No special requests</p>
              ) : (
                <div className="divide-y">
                  {specialRequests.map((r) => (
                    <div key={r.id} className="py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{r.type}</p>
                        <Badge variant={r.status === "CONFIRMED" ? "default" : r.status === "DECLINED" ? "destructive" : "secondary"}>
                          {r.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amendments">
          <Card>
            <CardHeader><CardTitle className="text-base">Amendment History</CardTitle></CardHeader>
            <CardContent>
              {!amendments?.length ? (
                <p className="text-sm text-muted-foreground py-4">No amendments recorded</p>
              ) : (
                <div className="divide-y">
                  {amendments.map((a) => (
                    <div key={a.id} className="py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{a.type}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(a.performedAt), "dd MMM yyyy")}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comms">
          <Card>
            <CardHeader><CardTitle className="text-base">Communications</CardTitle></CardHeader>
            <CardContent>
              {!communications?.length ? (
                <p className="text-sm text-muted-foreground py-4">No communications logged</p>
              ) : (
                <div className="divide-y">
                  {communications.map((c) => (
                    <div key={c.id} className="py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{c.direction}</Badge>
                          <Badge variant="secondary">{c.channel}</Badge>
                          {c.subject && <p className="text-sm font-medium">{c.subject}</p>}
                        </div>
                        <p className="text-xs text-muted-foreground">{format(new Date(c.occurredAt), "dd MMM yyyy")}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
