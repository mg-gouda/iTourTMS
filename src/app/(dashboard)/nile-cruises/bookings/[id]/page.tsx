"use client";

import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CRUISE_BOOKING_STATUS_LABELS,
  CRUISE_BOOKING_STATUS_VARIANTS,
  CRUISE_PAX_TYPE_LABELS,
  CRUISE_SPECIAL_REQUEST_TYPE_LABELS,
  CRUISE_SPECIAL_REQUEST_STATUS_LABELS,
  CRUISE_SPECIAL_REQUEST_STATUS_VARIANTS,
} from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";

// ── Passengers tab ──────────────────────────────────────────────────────────

const PAX_TYPES = ["ADULT", "CHILD", "INFANT", "TEEN"] as const;
const PAX_ROLES = ["LEAD", "COMPANION", "CHILD", "INFANT"] as const;

function PassengersTab({ bookingId }: { bookingId: string }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    paxType: "ADULT" as string,
    paxRole: "COMPANION" as string,
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    passportNumber: "",
    passportExpiryDate: "",
    nationalityId: "",
    gender: "",
    dietary: "",
    isLead: false,
  });

  const { data: passengers } = trpc.nileCruises.passenger.listByBooking.useQuery({ bookingId });
  const { data: countries } = trpc.shared.setup.getCountries.useQuery();

  const create = trpc.nileCruises.passenger.create.useMutation({
    onSuccess: () => { toast.success("Passenger added"); utils.nileCruises.passenger.listByBooking.invalidate({ bookingId }); setOpen(false); },
    onError: (err) => toast.error(err.message),
  });

  const del = trpc.nileCruises.passenger.delete.useMutation({
    onSuccess: () => { toast.success("Passenger removed"); utils.nileCruises.passenger.listByBooking.invalidate({ bookingId }); },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit() {
    if (!form.firstName || !form.lastName) { toast.error("First and last name required"); return; }
    create.mutate({
      bookingId,
      paxType: form.paxType as "ADULT" | "CHILD" | "INFANT" | "TEEN",
      paxRole: form.paxRole as "LEAD" | "COMPANION" | "CHILD" | "INFANT",
      firstName: form.firstName,
      lastName: form.lastName,
      dateOfBirth: form.dateOfBirth || undefined,
      passportNumber: form.passportNumber || undefined,
      passportExpiryDate: form.passportExpiryDate || undefined,
      nationalityId: form.nationalityId || undefined,
      gender: form.gender || undefined,
      dietary: form.dietary || undefined,
      isLead: form.isLead,
    });
  }

  function openAdd() {
    setForm({ paxType: "ADULT", paxRole: "COMPANION", firstName: "", lastName: "", dateOfBirth: "", passportNumber: "", passportExpiryDate: "", nationalityId: "", gender: "", dietary: "", isLead: false });
    setOpen(true);
  }

  const f = (k: keyof typeof form, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Passengers ({passengers?.length ?? 0})</CardTitle>
        <Button size="sm" onClick={openAdd}><Plus className="mr-1 h-3.5 w-3.5" />Add Passenger</Button>
      </CardHeader>
      <CardContent>
        {!passengers?.length ? (
          <p className="text-sm text-muted-foreground py-4">No passengers added yet</p>
        ) : (
          <div className="divide-y">
            {passengers.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {p.firstName} {p.lastName}
                    {p.isLead && <Badge className="ml-2 text-xs" variant="secondary">Lead</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.nationality?.name ?? ""}
                    {p.dateOfBirth ? ` · DOB: ${format(new Date(p.dateOfBirth), "dd MMM yyyy")}` : ""}
                    {p.passportNumber ? ` · PP: ${p.passportNumber}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{CRUISE_PAX_TYPE_LABELS[p.paxType as keyof typeof CRUISE_PAX_TYPE_LABELS]}</Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Remove passenger?")) del.mutate({ id: p.id }); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Passenger</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Type *</label>
              <Select value={form.paxType} onValueChange={(v) => f("paxType", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{PAX_TYPES.map((t) => <SelectItem key={t} value={t}>{CRUISE_PAX_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={form.paxRole} onValueChange={(v) => f("paxRole", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{PAX_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">First Name *</label>
              <Input className="mt-1" value={form.firstName} onChange={(e) => f("firstName", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name *</label>
              <Input className="mt-1" value={form.lastName} onChange={(e) => f("lastName", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Date of Birth</label>
              <Input className="mt-1" type="date" value={form.dateOfBirth} onChange={(e) => f("dateOfBirth", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Gender</label>
              <Select value={form.gender} onValueChange={(v) => f("gender", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Nationality</label>
              <Select value={form.nationalityId} onValueChange={(v) => f("nationalityId", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Passport Number</label>
              <Input className="mt-1 font-mono" value={form.passportNumber} onChange={(e) => f("passportNumber", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Passport Expiry</label>
              <Input className="mt-1" type="date" value={form.passportExpiryDate} onChange={(e) => f("passportExpiryDate", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Dietary Notes</label>
              <Input className="mt-1" value={form.dietary} onChange={(e) => f("dietary", e.target.value)} placeholder="e.g. Vegetarian" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={create.isPending}>Add Passenger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Payments tab ────────────────────────────────────────────────────────────

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "CHEQUE", "ONLINE"] as const;

function PaymentsTab({ bookingId }: { bookingId: string }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", currency: "USD", method: "BANK_TRANSFER", paidAt: format(new Date(), "yyyy-MM-dd"), reference: "", notes: "" });

  const { data: payments } = trpc.nileCruises.payment.listByBooking.useQuery({ bookingId });

  const record = trpc.nileCruises.payment.record.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded");
      utils.nileCruises.payment.listByBooking.invalidate({ bookingId });
      utils.nileCruises.booking.getById.invalidate({ id: bookingId });
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const del = trpc.nileCruises.payment.delete.useMutation({
    onSuccess: () => {
      toast.success("Payment removed");
      utils.nileCruises.payment.listByBooking.invalidate({ bookingId });
      utils.nileCruises.booking.getById.invalidate({ id: bookingId });
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit() {
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }
    record.mutate({
      bookingId,
      amount,
      currency: form.currency,
      method: form.method as never,
      paidAt: form.paidAt,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
    });
  }

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const total = payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Payments</CardTitle>
          {!!total && <p className="text-xs text-muted-foreground mt-0.5">Total paid: <span className="font-mono font-medium">{total.toLocaleString()}</span></p>}
        </div>
        <Button size="sm" onClick={() => { setForm({ amount: "", currency: "USD", method: "BANK_TRANSFER", paidAt: format(new Date(), "yyyy-MM-dd"), reference: "", notes: "" }); setOpen(true); }}>
          <Plus className="mr-1 h-3.5 w-3.5" />Record Payment
        </Button>
      </CardHeader>
      <CardContent>
        {!payments?.length ? (
          <p className="text-sm text-muted-foreground py-4">No payments recorded</p>
        ) : (
          <div className="divide-y">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">{p.method.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(p.paidAt), "dd MMM yyyy")}
                    {p.reference ? ` · Ref: ${p.reference}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium text-green-600">+{Number(p.amount).toLocaleString()} {p.currency}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Remove this payment?")) del.mutate({ id: p.id }); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Amount *</label>
              <Input className="mt-1" type="number" min={0.01} step={0.01} value={form.amount} onChange={(e) => f("amount", e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <Select value={form.currency} onValueChange={(v) => f("currency", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{["USD","EUR","GBP","EGP"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Method *</label>
              <Select value={form.method} onValueChange={(v) => f("method", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Date *</label>
              <Input className="mt-1" type="date" value={form.paidAt} onChange={(e) => f("paidAt", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Reference</label>
              <Input className="mt-1 font-mono" value={form.reference} onChange={(e) => f("reference", e.target.value)} placeholder="e.g. TXN-12345" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <Input className="mt-1" value={form.notes} onChange={(e) => f("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={record.isPending}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Special Requests tab ─────────────────────────────────────────────────────

const SR_TYPES = [
  "DIETARY","ACCESSIBILITY","BED_CONFIG","CELEBRATION","ADJACENT_CABINS",
  "CONNECTING_CABINS","HIGH_DECK","LOW_DECK","EARLY_CHECK_IN","LATE_CHECK_OUT",
  "PORTERAGE","TRANSPORT","GUIDE_LANGUAGE","OTHER",
] as const;

function SpecialRequestsTab({ bookingId }: { bookingId: string }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "DIETARY" as string, description: "" });

  const { data: requests } = trpc.nileCruises.specialRequest.listByBooking.useQuery({ bookingId });

  const create = trpc.nileCruises.specialRequest.create.useMutation({
    onSuccess: () => { toast.success("Request added"); utils.nileCruises.specialRequest.listByBooking.invalidate({ bookingId }); setOpen(false); },
    onError: (err) => toast.error(err.message),
  });

  const fulfill = trpc.nileCruises.specialRequest.fulfill.useMutation({
    onSuccess: () => { toast.success("Marked fulfilled"); utils.nileCruises.specialRequest.listByBooking.invalidate({ bookingId }); },
    onError: (err) => toast.error(err.message),
  });

  const decline = trpc.nileCruises.specialRequest.decline.useMutation({
    onSuccess: () => { toast.success("Marked declined"); utils.nileCruises.specialRequest.listByBooking.invalidate({ bookingId }); },
    onError: (err) => toast.error(err.message),
  });

  const del = trpc.nileCruises.specialRequest.delete.useMutation({
    onSuccess: () => { toast.success("Request removed"); utils.nileCruises.specialRequest.listByBooking.invalidate({ bookingId }); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Special Requests ({requests?.length ?? 0})</CardTitle>
        <Button size="sm" onClick={() => { setForm({ type: "DIETARY", description: "" }); setOpen(true); }}>
          <Plus className="mr-1 h-3.5 w-3.5" />Add Request
        </Button>
      </CardHeader>
      <CardContent>
        {!requests?.length ? (
          <p className="text-sm text-muted-foreground py-4">No special requests</p>
        ) : (
          <div className="divide-y">
            {requests.map((r) => (
              <div key={r.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{CRUISE_SPECIAL_REQUEST_TYPE_LABELS[r.type as keyof typeof CRUISE_SPECIAL_REQUEST_TYPE_LABELS]}</p>
                    <Badge
                      variant={CRUISE_SPECIAL_REQUEST_STATUS_VARIANTS[r.status as keyof typeof CRUISE_SPECIAL_REQUEST_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}
                      className="text-xs"
                    >
                      {CRUISE_SPECIAL_REQUEST_STATUS_LABELS[r.status as keyof typeof CRUISE_SPECIAL_REQUEST_STATUS_LABELS]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {r.status === "PENDING" && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => fulfill.mutate({ id: r.id })} title="Fulfill">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => decline.mutate({ id: r.id })} title="Decline">
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => { if (confirm("Remove request?")) del.mutate({ id: r.id }); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                {r.response && <p className="text-xs text-green-700 mt-0.5 italic">Response: {r.response}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Special Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Type *</label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{SR_TYPES.map((t) => <SelectItem key={t} value={t}>{CRUISE_SPECIAL_REQUEST_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Input className="mt-1" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe the request..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!form.description) { toast.error("Description required"); return; } create.mutate({ bookingId, type: form.type as never, description: form.description }); }} disabled={create.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Communications tab ───────────────────────────────────────────────────────

const CHANNELS = ["EMAIL", "PHONE", "WHATSAPP", "IN_PERSON"] as const;

function CommunicationsTab({ bookingId }: { bookingId: string }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ direction: "OUTBOUND", channel: "EMAIL", subject: "", body: "" });

  const { data: communications } = trpc.nileCruises.communication.listByBooking.useQuery({ bookingId });

  const create = trpc.nileCruises.communication.create.useMutation({
    onSuccess: () => { toast.success("Communication logged"); utils.nileCruises.communication.listByBooking.invalidate({ bookingId }); setOpen(false); },
    onError: (err) => toast.error(err.message),
  });

  const del = trpc.nileCruises.communication.delete.useMutation({
    onSuccess: () => { toast.success("Removed"); utils.nileCruises.communication.listByBooking.invalidate({ bookingId }); },
    onError: (err) => toast.error(err.message),
  });

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Communications ({communications?.length ?? 0})</CardTitle>
        <Button size="sm" onClick={() => { setForm({ direction: "OUTBOUND", channel: "EMAIL", subject: "", body: "" }); setOpen(true); }}>
          <Plus className="mr-1 h-3.5 w-3.5" />Log Communication
        </Button>
      </CardHeader>
      <CardContent>
        {!communications?.length ? (
          <p className="text-sm text-muted-foreground py-4">No communications logged</p>
        ) : (
          <div className="divide-y">
            {communications.map((c) => (
              <div key={c.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{c.direction}</Badge>
                    <Badge variant="secondary" className="text-xs">{c.channel}</Badge>
                    {c.subject && <p className="text-sm font-medium">{c.subject}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{format(new Date(c.occurredAt), "dd MMM yyyy")}</p>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Remove?")) del.mutate({ id: c.id }); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.body}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Direction *</label>
              <Select value={form.direction} onValueChange={(v) => f("direction", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTBOUND">Outbound (we sent)</SelectItem>
                  <SelectItem value="INBOUND">Inbound (they sent)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Channel *</label>
              <Select value={form.channel} onValueChange={(v) => f("channel", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Subject</label>
              <Input className="mt-1" value={form.subject} onChange={(e) => f("subject", e.target.value)} placeholder="Optional subject" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Body / Notes *</label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
                value={form.body}
                onChange={(e) => f("body", e.target.value)}
                placeholder="What was discussed or communicated..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!form.body) { toast.error("Body required"); return; } create.mutate({ bookingId, direction: form.direction as "INBOUND" | "OUTBOUND", channel: form.channel as "EMAIL" | "PHONE" | "WHATSAPP" | "IN_PERSON", subject: form.subject || undefined, body: form.body }); }} disabled={create.isPending}>Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CruiseBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.nileCruises.booking.getById.useQuery({ id });
  const { data: vouchers } = trpc.nileCruises.voucher.listByBooking.useQuery({ bookingId: id });
  const { data: amendments } = trpc.nileCruises.amendment.listByBooking.useQuery({ bookingId: id });

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
      {/* Header */}
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
          { label: "Total Price", value: `${Number(data.grossTotal ?? 0).toLocaleString()} ${data.baseCurrency}`, color: "" },
          { label: "Paid Amount", value: `${Number(data.paidAmount ?? 0).toLocaleString()} ${data.baseCurrency}`, color: "text-green-600" },
          { label: "Balance Due", value: `${Number(data.balanceDue ?? 0).toLocaleString()} ${data.baseCurrency}`, color: Number(data.balanceDue ?? 0) > 0 ? "text-red-500" : "text-green-600" },
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
          <TabsTrigger value="passengers">Passengers</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="vouchers">Vouchers ({vouchers?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="amendments">Amendments ({amendments?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="comms">Communications</TabsTrigger>
        </TabsList>

        <TabsContent value="passengers"><PassengersTab bookingId={id} /></TabsContent>
        <TabsContent value="payments"><PaymentsTab bookingId={id} /></TabsContent>

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

        <TabsContent value="requests"><SpecialRequestsTab bookingId={id} /></TabsContent>

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

        <TabsContent value="comms"><CommunicationsTab bookingId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}
