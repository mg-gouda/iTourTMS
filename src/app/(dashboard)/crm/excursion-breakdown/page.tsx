"use client";

import { useState, useEffect } from "react";
import {
  Filter, Send, Car, User, Users, Clock, CheckCircle2,
  AlertCircle, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

const STATUS_ICON = {
  PENDING:   { icon: Clock,         class: "text-yellow-600" },
  CONFIRMED: { icon: CheckCircle2,  class: "text-green-600"  },
  CANCELLED: { icon: AlertCircle,   class: "text-red-500"    },
  NO_SHOW:   { icon: AlertCircle,   class: "text-gray-400"   },
};

const LANG_LABEL: Record<string, string> = {
  EN: "English", AR: "Arabic", DE: "German", FR: "French",
  RU: "Russian", IT: "Italian", PL: "Polish", ES: "Spanish",
};

export default function ExcursionBreakdownPage() {
  const t = useTranslations("crm");
  const tc = useTranslations("common");
  // ── Filters ──
  const [filterExcursionId, setFilterExcursionId] = useState("");
  const [filterDate, setFilterDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [filterLanguage, setFilterLanguage] = useState("all");

  // ── Assignment state ──
  const [repId, setRepId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

  const { data: excursions } = trpc.crm.excursionTicket.listExcursions.useQuery();
  const { data: reps } = trpc.crm.excursionBreakdown.listReps.useQuery();
  const { data: vehicles } = trpc.crm.excursionBreakdown.listVehicles.useQuery();
  const { data: drivers } = trpc.crm.excursionBreakdown.listDrivers.useQuery();

  // Tickets for the current filter
  const { data: tickets, isLoading: ticketsLoading } = trpc.crm.excursionTicket.list.useQuery(
    {
      excursionId: filterExcursionId || undefined,
      dateFrom: filterDate,
      dateTo: filterDate,
      language: filterLanguage !== "all" ? filterLanguage : undefined,
    },
    { enabled: !!filterDate },
  );

  // Existing breakdown for this filter combination
  const { data: existingBreakdown } = trpc.crm.excursionBreakdown.list.useQuery(
    {
      excursionId: filterExcursionId || undefined,
      dateFrom: filterDate,
      dateTo: filterDate,
      language: filterLanguage !== "all" ? filterLanguage : undefined,
    },
    { enabled: !!filterDate },
  );

  // Find matching breakdown (exact match)
  const breakdown = existingBreakdown?.find(
    (b) =>
      (!filterExcursionId || b.excursionId === filterExcursionId) &&
      b.excursionDate.toString().startsWith(filterDate) &&
      (filterLanguage === "all" || b.language === filterLanguage),
  ) ?? null;

  // Populate assignment fields from existing breakdown
  useEffect(() => {
    if (breakdown) {
      setRepId(breakdown.repId ?? "");
      setVehicleId(breakdown.vehicleId ?? "");
      setDriverId(breakdown.driverId ?? "");
      setNotes(breakdown.notes ?? "");
      setSelectedTicketIds(new Set(breakdown.tickets.map((t) => t.id)));
    } else {
      setRepId("");
      setVehicleId("");
      setDriverId("");
      setNotes("");
      setSelectedTicketIds(new Set());
    }
  }, [breakdown?.id]);

  const saveMutation = trpc.crm.excursionBreakdown.saveBreakdown.useMutation({
    onSuccess: () => {
      utils.crm.excursionBreakdown.list.invalidate();
      toast.success("Breakdown saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const publishMutation = trpc.crm.excursionBreakdown.publish.useMutation({
    onSuccess: () => {
      utils.crm.excursionBreakdown.list.invalidate();
      toast.success("Breakdown published to rep portal");
    },
    onError: (e) => toast.error(e.message),
  });

  const unpublishMutation = trpc.crm.excursionBreakdown.unpublish.useMutation({
    onSuccess: () => {
      utils.crm.excursionBreakdown.list.invalidate();
      toast.success("Breakdown reverted to draft");
    },
    onError: (e) => toast.error(e.message),
  });

  function toggleTicket(id: string) {
    setSelectedTicketIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!tickets) return;
    if (selectedTicketIds.size === tickets.length) {
      setSelectedTicketIds(new Set());
    } else {
      setSelectedTicketIds(new Set(tickets.map((t) => t.id)));
    }
  }

  function handleSave() {
    if (!filterExcursionId) { toast.error("Select an excursion first"); return; }
    if (!filterDate) { toast.error("Select a date"); return; }
    saveMutation.mutate({
      excursionId: filterExcursionId,
      excursionDate: filterDate,
      language: filterLanguage !== "all" ? filterLanguage : "EN",
      ticketIds: Array.from(selectedTicketIds),
      repId: repId || undefined,
      vehicleId: vehicleId || undefined,
      driverId: driverId || undefined,
      notes: notes || undefined,
    });
  }

  const totalAdults = tickets?.filter((t) => selectedTicketIds.has(t.id)).reduce((s, t) => s + t.adults, 0) ?? 0;
  const totalChildren = tickets?.filter((t) => selectedTicketIds.has(t.id)).reduce((s, t) => s + t.children, 0) ?? 0;
  const totalPax = totalAdults + totalChildren;

  const breakdownPublished = breakdown?.status === "PUBLISHED";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("breakdown")}</h1>
          <p className="text-sm text-muted-foreground">
            Filter tickets by excursion & date · assign rep, vehicle & driver · publish to rep portal
          </p>
        </div>
        <div className="flex gap-2">
          {breakdown && (
            breakdownPublished ? (
              <Button size="sm" variant="outline" onClick={() => unpublishMutation.mutate({ id: breakdown.id })} disabled={unpublishMutation.isPending}>
                {tc("draft")}
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="gap-1.5 border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => publishMutation.mutate({ id: breakdown.id })} disabled={publishMutation.isPending}>
                <Send className="h-3.5 w-3.5" /> {tc("publish")}
              </Button>
            )
          )}
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? tc("saving") : t("breakdown")}
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={filterExcursionId || "all"} onValueChange={(v) => setFilterExcursionId(v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 w-56 bg-background"><SelectValue placeholder="All Excursions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Excursions</SelectItem>
            {excursions?.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="h-9 w-44 bg-background text-sm" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        <Select value={filterLanguage} onValueChange={setFilterLanguage}>
          <SelectTrigger className="h-9 w-36 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {Object.entries(LANG_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        {breakdown && (
          <Badge className={cn("ml-auto", breakdownPublished ? "bg-green-600 hover:bg-green-700" : "bg-amber-500 hover:bg-amber-600")}>
            {breakdownPublished ? "Published" : "Draft"}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* ── Left: Ticket list ── */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              Tickets
              {tickets && (
                <span className="ml-2 font-normal text-muted-foreground text-xs">
                  {selectedTicketIds.size} of {tickets.length} selected · {totalPax} pax ({totalAdults} adt + {totalChildren} chd)
                </span>
              )}
            </p>
            {tickets && tickets.length > 0 && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={toggleAll}>
                {selectedTicketIds.size === tickets.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>

          {ticketsLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
          ) : !tickets?.length ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No tickets for the selected filters</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {tickets.map((t) => {
                const selected = selectedTicketIds.has(t.id);
                const sc = STATUS_ICON[t.status as keyof typeof STATUS_ICON];
                const StatusIcon = sc.icon;
                return (
                  <PermissionGuard permission="crm:booking:read">
                    <label
                    key={t.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/30 hover:bg-muted/20",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleTicket(t.id)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    <div className="flex flex-1 items-center gap-4 min-w-0">
                      <span className="font-mono text-xs font-semibold text-primary w-24 shrink-0">{t.ticketNo}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.hotel.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.excursion.name}
                          {t.tourOperator && <span className="ml-1 text-muted-foreground/60">· {t.tourOperator.name}</span>}
                        </p>
                      </div>
                      <div className="text-center shrink-0">
                        {t.pickupTime ? (
                          <span className="font-mono text-xs font-semibold">{t.pickupTime}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </div>
                      <div className="text-center shrink-0 w-20 text-xs text-muted-foreground">
                        {t.roomNo ? <span className="font-medium text-foreground">Rm {t.roomNo}</span> : "—"}
                      </div>
                      <div className="shrink-0 text-xs tabular-nums">
                        <span className="font-semibold">{t.adults}</span>
                        <span className="text-muted-foreground"> adt</span>
                        {t.children > 0 && <><span className="ml-1 font-semibold">{t.children}</span><span className="text-muted-foreground"> chd</span></>}
                      </div>
                      <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", sc.class)} />
                    </div>
                  </label>
                  </PermissionGuard>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: Assignment Panel ── */}
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Breakdown Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{filterDate ? format(new Date(filterDate), "dd MMM yyyy") : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Language</span>
                <span className="font-medium">{filterLanguage !== "all" ? LANG_LABEL[filterLanguage] : "All"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tickets</span>
                <span className="font-semibold">{selectedTicketIds.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Pax</span>
                <span className="font-semibold">{totalPax}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Adults / CHD</span>
                <span>{totalAdults} / {totalChildren}</span>
              </div>
            </CardContent>
          </Card>

          {/* Rep Assignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <User className="h-4 w-4" /> Excursion Rep
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={repId || "none"} onValueChange={(v) => setRepId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="— Assign rep —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No rep —</SelectItem>
                  {reps?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!reps?.length && (
                <p className="mt-1 text-xs text-muted-foreground">No active reps. Add reps in Traffic → Reps.</p>
              )}
            </CardContent>
          </Card>

          {/* Vehicle & Driver — Traffic Pool */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Car className="h-4 w-4" /> Vehicle & Driver
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">Traffic Pool</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Vehicle</span>
                <Select value={vehicleId || "none"} onValueChange={(v) => setVehicleId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="— Assign vehicle —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No vehicle —</SelectItem>
                    {vehicles?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plateNumber}
                        {v.vehicleType && <span className="text-muted-foreground ml-1">· {v.vehicleType.name} ({v.vehicleType.capacity} pax)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Driver</span>
                <Select value={driverId || "none"} onValueChange={(v) => setDriverId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="— Assign driver —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No driver —</SelectItem>
                    {drivers?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!vehicles?.length && (
                <p className="text-xs text-muted-foreground">No active vehicles. Add in Traffic → Fleet.</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea rows={3} className="text-sm resize-none" placeholder="Breakdown notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </CardContent>
          </Card>

          <Button className="w-full" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? tc("saving") : t("breakdown")}
          </Button>
        </div>
      </div>
    </div>
  );
}
