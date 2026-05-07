"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search, Ticket, CheckCircle2, XCircle, Clock, AlertCircle, Filter, X, PencilLine,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

// ─── Status helpers ───────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:   { label: "Pending",   icon: Clock,         class: "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/20 dark:border-yellow-900 dark:text-yellow-400" },
  CONFIRMED: { label: "Confirmed", icon: CheckCircle2,   class: "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900 dark:text-green-400" },
  CANCELLED: { label: "Cancelled", icon: XCircle,        class: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400" },
  NO_SHOW:   { label: "No Show",   icon: AlertCircle,    class: "bg-gray-100 border-gray-200 text-gray-600 dark:bg-gray-900/40 dark:border-gray-700 dark:text-gray-400" },
};

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: "Manual", B2C: "B2C", HOTEL_GUIDE: "Hotel Guide", B2B: "B2B Portal",
};

// ─── Booking Form ─────────────────────────────────────────────────
interface BookingFormProps {
  onDone: (saved: boolean) => void;
  editId?: string;
}

function BookingForm({ onDone, editId }: BookingFormProps) {
  const utils = trpc.useUtils();

  const { data: tourOperators } = trpc.crm.excursionTicket.listTourOperators.useQuery();
  const { data: hotels } = trpc.crm.excursionTicket.listHotels.useQuery();
  const { data: excursions } = trpc.crm.excursionTicket.listExcursions.useQuery();
  const { data: existing } = trpc.crm.excursionTicket.getById.useQuery(
    { id: editId! },
    { enabled: !!editId },
  );

  const [form, setForm] = useState({
    tourOperatorId: "",
    hotelId: "",
    excursionId: "",
    guestName: "",
    guestMobile: "",
    hotelGuideName: "",
    arrivalDate: "",
    price: "",
    priceCurrency: "",
    pickupTime: "",
    roomNo: "",
    adults: 1,
    children: 0,
    excursionDate: "",
    language: "EN",
    remarks: "",
    source: "MANUAL" as const,
  });
  const [priceAutoFilled, setPriceAutoFilled] = useState(false);
  const [pickupAutoFilled, setPickupAutoFilled] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      setForm({
        tourOperatorId: existing.tourOperatorId ?? "",
        hotelId: existing.hotelId,
        excursionId: existing.excursionId,
        guestName: existing.guestName ?? "",
        guestMobile: existing.guestMobile ?? "",
        hotelGuideName: existing.hotelGuideName ?? "",
        arrivalDate: existing.arrivalDate ? format(new Date(existing.arrivalDate), "yyyy-MM-dd") : "",
        price: existing.price != null ? String(Number(existing.price)) : "",
        priceCurrency: existing.priceCurrency ?? "",
        pickupTime: existing.pickupTime ?? "",
        roomNo: existing.roomNo ?? "",
        adults: existing.adults,
        children: existing.children,
        excursionDate: format(new Date(existing.excursionDate), "yyyy-MM-dd"),
        language: existing.language,
        remarks: existing.remarks ?? "",
        source: existing.source as typeof form.source,
      });
    }
  }, [existing]);

  // Auto-fill pickup time when hotel + excursion both selected
  const { data: autoPickup } = trpc.crm.excursionTicket.getPickupTime.useQuery(
    { hotelId: form.hotelId, excursionId: form.excursionId },
    { enabled: !!form.hotelId && !!form.excursionId },
  );

  useEffect(() => {
    if (autoPickup && !editId) {
      setForm((f) => ({ ...f, pickupTime: autoPickup }));
      setPickupAutoFilled(true);
    }
  }, [autoPickup, editId]);

  // Auto-fill price when excursion selected (new tickets only)
  const { data: excursionPrice } = trpc.crm.excursionTicket.getExcursionPrice.useQuery(
    { excursionId: form.excursionId },
    { enabled: !!form.excursionId },
  );

  useEffect(() => {
    if (excursionPrice && !editId) {
      setForm((f) => ({ ...f, price: String(excursionPrice.price), priceCurrency: excursionPrice.currency }));
      setPriceAutoFilled(true);
    }
  }, [excursionPrice, editId]);

  const createMutation = trpc.crm.excursionTicket.create.useMutation({
    onSuccess: () => {
      utils.crm.excursionTicket.list.invalidate();
      toast.success("Ticket created");
      onDone(true);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.crm.excursionTicket.update.useMutation({
    onSuccess: () => {
      utils.crm.excursionTicket.list.invalidate();
      toast.success("Ticket updated");
      onDone(true);
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.hotelId || !form.excursionId || !form.excursionDate) {
      toast.error("Hotel, Excursion, and Date are required");
      return;
    }
    const payload = {
      tourOperatorId: form.tourOperatorId || undefined,
      hotelId: form.hotelId,
      excursionId: form.excursionId,
      guestName: form.guestName || undefined,
      guestMobile: form.guestMobile || undefined,
      hotelGuideName: form.hotelGuideName || undefined,
      arrivalDate: form.arrivalDate || undefined,
      price: form.price ? Number(form.price) : undefined,
      priceCurrency: form.priceCurrency || undefined,
      pickupTime: form.pickupTime || undefined,
      roomNo: form.roomNo || undefined,
      adults: form.adults,
      children: form.children,
      excursionDate: form.excursionDate,
      language: form.language,
      remarks: form.remarks || undefined,
      source: form.source,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const L = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
    <label className="mb-1 block text-[11px] font-medium text-foreground/60">
      {children}{req && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">

      {/* ── Strip: title + source + action buttons ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Ticket className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">{editId ? "Edit Ticket" : "New Ticket"}</span>
          {!editId && <span className="text-[11px] text-muted-foreground">— No. auto-generated</span>}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[11px] text-muted-foreground"><span className="text-destructive">*</span> required</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onDone(false)}>
            {editId ? "Cancel" : "Clear"}
          </Button>
          <Button type="submit" disabled={isPending} size="sm" className="h-7 px-3 text-xs min-w-[100px]">
            {isPending ? "Saving…" : editId ? "Update" : "Save Ticket"}
          </Button>
        </div>
      </div>

      {/* ── Row 1: Hotel · Excursion · Exc.Date · Arrival · Source ── */}
      <div className="grid grid-cols-12 gap-x-2.5 gap-y-2.5">
        <div className="col-span-3">
          <L req>Hotel</L>
          <Combobox
            options={hotels?.map((h) => ({
              value: h.id,
              label: h.destination ? `${h.name} · ${h.destination.name}` : h.name,
            })) ?? []}
            value={form.hotelId}
            onValueChange={(v) => setForm((f) => ({ ...f, hotelId: v, pickupTime: "" }))}
            placeholder="— Select hotel —"
            searchPlaceholder="Search hotel…"
            className="h-8 text-xs"
          />
        </div>
        <div className="col-span-3">
          <L req>Excursion</L>
          <Combobox
            options={excursions?.map((e) => ({ value: e.id, label: `${e.name} (${e.code})` })) ?? []}
            value={form.excursionId}
            onValueChange={(v) => setForm((f) => ({ ...f, excursionId: v, pickupTime: "", price: "", priceCurrency: "" }))}
            placeholder="— Select excursion —"
            searchPlaceholder="Search excursion…"
            className="h-8 text-xs"
          />
        </div>
        <div className="col-span-2">
          <L req>Exc. Date</L>
          <Input type="date" className="h-8 text-xs" value={form.excursionDate} onChange={(e) => setForm((f) => ({ ...f, excursionDate: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <L>Arrival Date</L>
          <Input type="date" className="h-8 text-xs" value={form.arrivalDate} onChange={(e) => setForm((f) => ({ ...f, arrivalDate: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <L>Source</L>
          <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v as typeof form.source }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MANUAL">Manual</SelectItem>
              <SelectItem value="B2C">B2C Website</SelectItem>
              <SelectItem value="HOTEL_GUIDE">Hotel Guide</SelectItem>
              <SelectItem value="B2B">B2B Portal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Row 2: Tour Op · Guest · Mobile · Guide · Pickup · Room ── */}
      <div className="grid grid-cols-12 gap-x-2.5 gap-y-2.5">
        <div className="col-span-3">
          <L>Tour Operator</L>
          <Combobox
            options={[
              { value: "", label: "— None —" },
              ...(tourOperators?.map((to) => ({ value: to.id, label: `${to.name} (${to.code})` })) ?? []),
            ]}
            value={form.tourOperatorId}
            onValueChange={(v) => setForm((f) => ({ ...f, tourOperatorId: v }))}
            placeholder="— Select TO —"
            searchPlaceholder="Search tour operator…"
            className="h-8 text-xs"
          />
        </div>
        <div className="col-span-3">
          <L>Guest Name</L>
          <Input className="h-8 text-xs" placeholder="Full name" value={form.guestName} onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <L>Mobile</L>
          <Input className="h-8 text-xs" placeholder="+1 234 567 8900" value={form.guestMobile} onChange={(e) => setForm((f) => ({ ...f, guestMobile: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <L>Hotel Guide</L>
          <Input className="h-8 text-xs" placeholder="Guide name" value={form.hotelGuideName} onChange={(e) => setForm((f) => ({ ...f, hotelGuideName: e.target.value }))} />
        </div>
        <div className="col-span-1">
          <L>Pickup</L>
          <div className="relative">
            <Input type="time" className="h-8 text-[11px] px-1.5" value={form.pickupTime}
              onChange={(e) => { setForm((f) => ({ ...f, pickupTime: e.target.value })); setPickupAutoFilled(false); }} />
            {pickupAutoFilled && (
              <span className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded bg-primary/10 px-0.5 text-[9px] font-medium text-primary">auto</span>
            )}
          </div>
        </div>
        <div className="col-span-1">
          <L>Room</L>
          <Input className="h-8 text-xs" placeholder="204" value={form.roomNo} onChange={(e) => setForm((f) => ({ ...f, roomNo: e.target.value }))} />
        </div>
      </div>

      {/* ── Row 3: Adt · CHD · Price · Curr · Lang · Remarks ── */}
      <div className="grid grid-cols-12 gap-x-2.5 gap-y-2.5">
        <div className="col-span-1">
          <L req>Adt</L>
          <Input type="number" min={1} className="h-8 text-xs text-center" value={form.adults} onChange={(e) => setForm((f) => ({ ...f, adults: Math.max(1, Number(e.target.value)) }))} />
        </div>
        <div className="col-span-1">
          <L>CHD</L>
          <Input type="number" min={0} className="h-8 text-xs text-center" value={form.children} onChange={(e) => setForm((f) => ({ ...f, children: Math.max(0, Number(e.target.value)) }))} />
        </div>
        <div className="col-span-2">
          <L>Price / Person</L>
          <div className="relative">
            <Input type="number" min={0} step="0.01" className="h-8 text-xs pr-8" placeholder="0.00" value={form.price}
              onChange={(e) => { setForm((f) => ({ ...f, price: e.target.value })); setPriceAutoFilled(false); }} />
            {priceAutoFilled && (
              <span className="absolute right-1 top-1/2 -translate-y-1/2 rounded bg-primary/10 px-0.5 text-[9px] font-medium text-primary">auto</span>
            )}
          </div>
        </div>
        <div className="col-span-1">
          <L>Curr.</L>
          <Input className="h-8 text-xs text-center uppercase tracking-widest" placeholder="USD" maxLength={3}
            value={form.priceCurrency} onChange={(e) => setForm((f) => ({ ...f, priceCurrency: e.target.value.toUpperCase() }))} />
        </div>
        <div className="col-span-2">
          <L>Language</L>
          <Select value={form.language} onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EN">English</SelectItem>
              <SelectItem value="AR">Arabic</SelectItem>
              <SelectItem value="DE">German</SelectItem>
              <SelectItem value="FR">French</SelectItem>
              <SelectItem value="RU">Russian</SelectItem>
              <SelectItem value="IT">Italian</SelectItem>
              <SelectItem value="PL">Polish</SelectItem>
              <SelectItem value="ES">Spanish</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-5">
          <L>Remarks</L>
          <Textarea rows={1} className="text-xs resize-none py-1.5 min-h-[32px]" placeholder="Optional remarks…"
            value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
        </div>
      </div>

      {!form.pickupTime && form.hotelId && form.excursionId && (
        <p className="text-[10px] text-amber-500">⚠ No pickup time configured for this hotel / excursion combination</p>
      )}
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function ExcursionBookingsPage() {
  const [editId, setEditId] = useState<string | undefined>();
  const [formKey, setFormKey] = useState(0); // bump to reset form
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const formRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: tickets, isLoading } = trpc.crm.excursionTicket.list.useQuery();

  const setStatusMutation = trpc.crm.excursionTicket.setStatus.useMutation({
    onSuccess: () => utils.crm.excursionTicket.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  function startEdit(id: string) {
    setEditId(id);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function handleDone(saved: boolean) {
    setEditId(undefined);
    if (saved) setFormKey((k) => k + 1); // reset form fields after save
  }

  const filtered = tickets?.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.ticketNo.toLowerCase().includes(q) ||
      t.hotel.name.toLowerCase().includes(q) ||
      t.excursion.name.toLowerCase().includes(q) ||
      (t.tourOperator?.name ?? "").toLowerCase().includes(q) ||
      (t.guestName ?? "").toLowerCase().includes(q) ||
      (t.guestMobile ?? "").toLowerCase().includes(q) ||
      (t.roomNo ?? "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchSource = filterSource === "all" || t.source === filterSource;
    return matchSearch && matchStatus && matchSource;
  });

  const totalPax = filtered?.reduce((s, t) => s + t.adults + t.children, 0) ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-0">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Excursion Bookings</h1>
          <p className="text-sm text-muted-foreground">Central ticket pool — Manual, B2C, Hotel Guide & B2B</p>
        </div>
        {editId && (
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5">
            <PencilLine className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">Editing mode</span>
            <button onClick={() => handleDone(false)} className="ml-1 rounded-full p-0.5 hover:bg-primary/10">
              <X className="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
        )}
      </div>

      {/* ── Inline Form ── */}
      <div ref={formRef} className={cn(
        "border-b bg-muted/20 px-6 py-3 transition-colors",
        editId && "bg-primary/5 border-primary/20",
      )}>
        <BookingForm key={formKey} onDone={handleDone} editId={editId} />
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-background px-6 py-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search ticket, hotel, excursion, guest…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-36">
            <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="NO_SHOW">No Show</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="MANUAL">Manual</SelectItem>
            <SelectItem value="B2C">B2C</SelectItem>
            <SelectItem value="HOTEL_GUIDE">Hotel Guide</SelectItem>
            <SelectItem value="B2B">B2B</SelectItem>
          </SelectContent>
        </Select>
        {filtered && (
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} ticket{filtered.length !== 1 ? "s" : ""} · {totalPax} pax
          </span>
        )}
      </div>

      {/* ── Ticket Table ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !filtered?.length ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <Ticket className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No tickets yet — fill in the form above to add one</p>
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left">TKT No.</th>
                  <th className="px-3 py-2.5 text-left">Guest</th>
                  <th className="px-3 py-2.5 text-left">Tour Operator</th>
                  <th className="px-3 py-2.5 text-left">Hotel</th>
                  <th className="px-3 py-2.5 text-left">Excursion</th>
                  <th className="px-3 py-2.5 text-center">Pickup</th>
                  <th className="px-3 py-2.5 text-center">Room</th>
                  <th className="px-3 py-2.5 text-center">Adt</th>
                  <th className="px-3 py-2.5 text-center">CHD</th>
                  <th className="px-3 py-2.5 text-center">Price</th>
                  <th className="px-3 py-2.5 text-left">Exc. Date</th>
                  <th className="px-3 py-2.5 text-center">Source</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((t) => {
                  const sc = STATUS_CONFIG[t.status as keyof typeof STATUS_CONFIG];
                  const Icon = sc.icon;
                  const isEditing = editId === t.id;
                  return (
                    <tr key={t.id} className={cn(
                      "transition-colors",
                      isEditing ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "hover:bg-muted/20",
                    )}>
                      <td className="px-3 py-2.5">
                        <button onClick={() => startEdit(t.id)} className="font-mono text-xs font-bold text-primary hover:underline">
                          {t.ticketNo}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        {t.guestName ? (
                          <div>
                            <p className="text-xs font-medium leading-tight">{t.guestName}</p>
                            {t.guestMobile && <p className="text-[10px] text-muted-foreground">{t.guestMobile}</p>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {t.tourOperator?.name ?? <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium">{t.hotel.name}</td>
                      <td className="px-3 py-2.5 text-xs">{t.excursion.name}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-xs">
                        {t.pickupTime ?? <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                        {t.roomNo ?? <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold">{t.adults}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">{t.children}</td>
                      <td className="px-3 py-2.5 text-center text-xs">
                        {t.price != null ? (
                          <span className="font-medium">{Number(t.price).toFixed(2)} <span className="text-muted-foreground">{t.priceCurrency ?? ""}</span></span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {format(new Date(t.excursionDate), "dd MMM yyyy")}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant="outline" className="text-[10px]">{SOURCE_LABEL[t.source]}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium", sc.class)}>
                          <Icon className="h-2.5 w-2.5" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {t.status === "PENDING" && (
                            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-green-600 hover:text-green-700"
                              onClick={() => setStatusMutation.mutate({ id: t.id, status: "CONFIRMED" })}>
                              Confirm
                            </Button>
                          )}
                          {(t.status === "PENDING" || t.status === "CONFIRMED") && (
                            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-destructive hover:text-destructive"
                              onClick={() => setStatusMutation.mutate({ id: t.id, status: "CANCELLED" })}>
                              Cancel
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => startEdit(t.id)}>
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
