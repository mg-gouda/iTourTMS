"use client";

import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CRUISE_CONTRACT_STATUS_LABELS,
  CRUISE_CONTRACT_STATUS_VARIANTS,
  CRUISE_SUPPLEMENT_TYPE_LABELS,
  CRUISE_GALA_MEAL_TYPE_LABELS,
  CRUISE_OFFER_TYPE_LABELS,
} from "@/lib/constants/nile-cruises";
import {
  cruiseSeasonCreateSchema,
  cruiseBaseRateItemSchema,
  cruiseOfferCreateSchema,
  cruiseGalaMealCreateSchema,
  cruiseSupplementItemSchema,
} from "@/lib/validations/nile-cruises";
import { trpc } from "@/lib/trpc";
import type { z } from "zod";

// ── Season form ──────────────────────────────────────────────────────────────

type SeasonForm = z.input<typeof cruiseSeasonCreateSchema>;

function SeasonsTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState<"add" | string | null>(null);

  const { data: seasons } = trpc.nileCruises.season.listByContract.useQuery({ contractId });

  const createSeason = trpc.nileCruises.season.create.useMutation({
    onSuccess: () => { toast.success("Season added"); utils.nileCruises.season.listByContract.invalidate({ contractId }); setOpen(null); },
    onError: (err) => toast.error(err.message),
  });

  const updateSeason = trpc.nileCruises.season.update.useMutation({
    onSuccess: () => { toast.success("Season updated"); utils.nileCruises.season.listByContract.invalidate({ contractId }); setOpen(null); },
    onError: (err) => toast.error(err.message),
  });

  const deleteSeason = trpc.nileCruises.season.delete.useMutation({
    onSuccess: () => { toast.success("Season deleted"); utils.nileCruises.season.listByContract.invalidate({ contractId }); },
    onError: (err) => toast.error(err.message),
  });

  const editingSeason = seasons?.find((s) => s.id === open);

  const form = useForm<SeasonForm>({
    resolver: zodResolver(cruiseSeasonCreateSchema),
    defaultValues: { contractId, name: "", code: "", dateFrom: "", dateTo: "", sortOrder: 0 },
  });

  function openAdd() { form.reset({ contractId, name: "", code: "", dateFrom: "", dateTo: "", sortOrder: 0 }); setOpen("add"); }
  function openEdit(s: NonNullable<typeof editingSeason>) {
    form.reset({
      contractId,
      name: s.name,
      code: s.code,
      dateFrom: format(new Date(s.dateFrom), "yyyy-MM-dd"),
      dateTo: format(new Date(s.dateTo), "yyyy-MM-dd"),
      releaseDays: s.releaseDays ?? undefined,
      sortOrder: s.sortOrder,
    });
    setOpen(s.id);
  }

  function onSubmit(v: SeasonForm) {
    if (open === "add") createSeason.mutate(v);
    else if (open) updateSeason.mutate({ id: open, data: v });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Seasons</CardTitle>
        <Button size="sm" onClick={openAdd}><Plus className="mr-1 h-3.5 w-3.5" />Add Season</Button>
      </CardHeader>
      <CardContent>
        {!seasons?.length ? (
          <p className="text-sm text-muted-foreground py-4">No seasons defined — add at least one before setting rates</p>
        ) : (
          <div className="divide-y">
            {seasons.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5">
                <div>
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{s.code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(s.dateFrom), "dd MMM yyyy")} – {format(new Date(s.dateTo), "dd MMM yyyy")}
                  </p>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this season?")) deleteSeason.mutate({ id: s.id }); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open === "add" || (!!open && open !== "add")} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{open === "add" ? "Add Season" : "Edit Season"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Name *</FormLabel>
                    <FormControl><Input placeholder="e.g. High Season" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl><Input placeholder="e.g. HIGH_24" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="releaseDays" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release Days</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dateFrom" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date From *</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value as string} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dateTo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date To *</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value as string} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
                <Button type="submit" disabled={createSeason.isPending || updateSeason.isPending}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Base Rates tab ───────────────────────────────────────────────────────────

function BaseRatesTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const { data: matrix } = trpc.nileCruises.baseRate.getMatrix.useQuery({ contractId });
  const [rates, setRates] = useState<Record<string, string>>({});
  const [currency, setCurrency] = useState("USD");

  const bulkSave = trpc.nileCruises.baseRate.bulkSave.useMutation({
    onSuccess: () => { toast.success("Base rates saved"); utils.nileCruises.baseRate.getMatrix.invalidate({ contractId }); },
    onError: (err) => toast.error(err.message),
  });

  // Initialize rates from existing data
  const getKey = (seasonId: string, catId: string) => `${seasonId}__${catId}`;

  function handleSave() {
    const items: z.infer<typeof cruiseBaseRateItemSchema>[] = [];
    for (const [key, val] of Object.entries(rates)) {
      const [seasonId, cabinCategoryId] = key.split("__");
      const rate = parseFloat(val);
      if (!isNaN(rate) && rate >= 0) {
        items.push({ seasonId, cabinCategoryId, ratePerPaxPerNight: rate, currency });
      }
    }
    // Also include existing rates that weren't changed
    if (matrix) {
      for (const r of matrix.rates) {
        const key = getKey(r.seasonId, r.cabinCategoryId);
        if (!(key in rates)) {
          items.push({ seasonId: r.seasonId, cabinCategoryId: r.cabinCategoryId, ratePerPaxPerNight: Number(r.ratePerPaxPerNight), currency: r.currency });
        }
      }
    }
    bulkSave.mutate({ contractId, rates: items });
  }

  function getRate(seasonId: string, catId: string): string {
    const key = getKey(seasonId, catId);
    if (key in rates) return rates[key];
    const existing = matrix?.rates.find((r) => r.seasonId === seasonId && r.cabinCategoryId === catId);
    return existing ? String(Number(existing.ratePerPaxPerNight)) : "";
  }

  if (!matrix?.seasons.length) return (
    <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
      Add seasons first before setting base rates.
    </CardContent></Card>
  );

  if (!matrix?.categories.length) return (
    <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
      No cabin categories found for this contract&apos;s boat.
    </CardContent></Card>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Base Rates (per pax / per night)</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["USD","EUR","GBP","EGP"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleSave} disabled={bulkSave.isPending}>
            <Save className="mr-1 h-3.5 w-3.5" />{bulkSave.isPending ? "Saving..." : "Save Rates"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left pb-2 pr-4 font-medium">Season</th>
              {matrix.categories.map((cat) => (
                <th key={cat.id} className="text-center pb-2 px-2 font-medium">{cat.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {matrix.seasons.map((season) => (
              <tr key={season.id}>
                <td className="py-2 pr-4">
                  <p className="font-medium">{season.name}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(season.dateFrom), "dd MMM")} – {format(new Date(season.dateTo), "dd MMM yyyy")}</p>
                </td>
                {matrix.categories.map((cat) => (
                  <td key={cat.id} className="py-2 px-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-24 text-right"
                      value={getRate(season.id, cat.id)}
                      onChange={(e) => setRates((prev) => ({ ...prev, [getKey(season.id, cat.id)]: e.target.value }))}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ── Supplements tab ──────────────────────────────────────────────────────────

const SUPP_TYPES = ["CABIN_CATEGORY", "OCCUPANCY", "DECK", "VIEW"] as const;

function SupplementsTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const { data: supplements } = trpc.nileCruises.supplement.listByContract.useQuery({ contractId });
  const { data: matrix } = trpc.nileCruises.baseRate.getMatrix.useQuery({ contractId });

  const bulkSave = trpc.nileCruises.supplement.bulkSaveByType.useMutation({
    onSuccess: () => { toast.success("Supplement saved"); utils.nileCruises.supplement.listByContract.invalidate({ contractId }); setOpen(false); },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<z.input<typeof cruiseSupplementItemSchema> & { type: string; contractId: string }>({
    defaultValues: { type: "CABIN_CATEGORY", valueType: "FIXED", value: 0, perPaxPerNight: true },
  });

  function onSubmit(v: z.input<typeof cruiseSupplementItemSchema> & { type: string }) {
    const existing = (supplements ?? []).filter((s) => s.type !== v.type);
    const newItem: z.infer<typeof cruiseSupplementItemSchema> = {
      seasonId: v.seasonId ?? matrix?.seasons[0]?.id ?? "",
      type: v.type as "CABIN_CATEGORY" | "OCCUPANCY" | "DECK" | "VIEW" | "GALA_MEAL",
      cabinCategoryId: v.cabinCategoryId,
      valueType: v.valueType,
      value: v.value,
      perPaxPerNight: v.perPaxPerNight,
    };
    bulkSave.mutate({ contractId, type: v.type as never, supplements: [...existing.map((s) => ({ seasonId: s.seasonId ?? matrix?.seasons[0]?.id ?? "", type: s.type as never, cabinCategoryId: s.cabinCategoryId ?? undefined, valueType: s.valueType as "FIXED" | "PERCENTAGE", value: Number(s.value), perPaxPerNight: s.perPaxPerNight })), newItem] });
  }

  function remove(s: { id: string; type: string }) {
    const remaining = (supplements ?? []).filter((x) => x.id !== s.id).filter((x) => x.type === s.type);
    bulkSave.mutate({ contractId, type: s.type as never, supplements: remaining.map((x) => ({ seasonId: x.seasonId ?? matrix?.seasons[0]?.id ?? "", type: x.type as never, cabinCategoryId: x.cabinCategoryId ?? undefined, valueType: x.valueType as "FIXED" | "PERCENTAGE", value: Number(x.value), perPaxPerNight: x.perPaxPerNight })) });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Supplements</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />Add Supplement</Button>
      </CardHeader>
      <CardContent>
        {!supplements?.length ? (
          <p className="text-sm text-muted-foreground py-4">No supplements defined</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left pb-2">Type</th>
                  <th className="text-left pb-2">Season</th>
                  <th className="text-left pb-2">Category</th>
                  <th className="text-left pb-2">Value Type</th>
                  <th className="text-right pb-2">Value</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {supplements.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2">{CRUISE_SUPPLEMENT_TYPE_LABELS[s.type as keyof typeof CRUISE_SUPPLEMENT_TYPE_LABELS]}</td>
                    <td className="py-2">{s.season?.name ?? "All"}</td>
                    <td className="py-2">{s.cabinCategory?.name ?? "All"}</td>
                    <td className="py-2 text-xs">{s.valueType}</td>
                    <td className="py-2 text-right font-mono">{Number(s.value).toFixed(2)}</td>
                    <td className="py-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Remove?")) remove(s); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Supplement</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium">Type *</label>
                <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPP_TYPES.map((t) => <SelectItem key={t} value={t}>{CRUISE_SUPPLEMENT_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Season *</label>
                <Select value={form.watch("seasonId") ?? ""} onValueChange={(v) => form.setValue("seasonId", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select season" /></SelectTrigger>
                  <SelectContent>
                    {matrix?.seasons.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={form.watch("cabinCategoryId") ?? ""} onValueChange={(v) => form.setValue("cabinCategoryId", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="All categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {matrix?.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Value Type *</label>
                <Select value={form.watch("valueType")} onValueChange={(v) => form.setValue("valueType", v as "FIXED" | "PERCENTAGE")}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Value *</label>
                <Input type="number" step={0.01} className="mt-1" value={form.watch("value") ?? 0} onChange={(e) => form.setValue("value", Number(e.target.value))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={bulkSave.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Offers tab ───────────────────────────────────────────────────────────────

const OFFER_TYPES = ["EARLY_BIRD","LONG_STAY","FREE_NIGHTS","HONEYMOON","GROUP_DISCOUNT","SINGLE_SUPPLEMENT_WAIVER","FREE_DOMESTIC_FLIGHT","MARKETING_CONTRIBUTION","COMBINABLE_DISCOUNT"] as const;

function OffersTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState<"add" | string | null>(null);
  const { data: offers } = trpc.nileCruises.offer.listByContract.useQuery({ contractId });

  const createOffer = trpc.nileCruises.offer.create.useMutation({
    onSuccess: () => { toast.success("Offer added"); utils.nileCruises.offer.listByContract.invalidate({ contractId }); setOpen(null); },
    onError: (err) => toast.error(err.message),
  });

  const updateOffer = trpc.nileCruises.offer.update.useMutation({
    onSuccess: () => { toast.success("Offer updated"); utils.nileCruises.offer.listByContract.invalidate({ contractId }); setOpen(null); },
    onError: (err) => toast.error(err.message),
  });

  const deleteOffer = trpc.nileCruises.offer.delete.useMutation({
    onSuccess: () => { toast.success("Offer removed"); utils.nileCruises.offer.listByContract.invalidate({ contractId }); },
    onError: (err) => toast.error(err.message),
  });

  type OfferForm = z.input<typeof cruiseOfferCreateSchema>;
  const form = useForm<OfferForm>({
    resolver: zodResolver(cruiseOfferCreateSchema),
    defaultValues: { contractId, type: "EARLY_BIRD", name: "", valueType: "PERCENTAGE", value: 0, isCombinable: false, active: true, sortOrder: 0, applicableCabinCategoryIds: [], applicableMarketIds: [], notCombinableWith: [] },
  });

  const editingOffer = offers?.find((o) => o.id === open);

  function openAdd() {
    form.reset({ contractId, type: "EARLY_BIRD", name: "", valueType: "PERCENTAGE", value: 0, isCombinable: false, active: true, sortOrder: 0, applicableCabinCategoryIds: [], applicableMarketIds: [], notCombinableWith: [] });
    setOpen("add");
  }

  function openEdit(o: NonNullable<typeof editingOffer>) {
    form.reset({
      contractId,
      type: o.type as OfferForm["type"],
      name: o.name,
      description: o.description ?? undefined,
      valueType: o.valueType as OfferForm["valueType"],
      value: o.value != null ? Number(o.value) : 0,
      freeNightsPay: o.freeNightsPay ?? undefined,
      freeNightsGet: o.freeNightsGet ?? undefined,
      daysBeforeDeparture: o.daysBeforeDeparture ?? undefined,
      minNights: o.minNights ?? undefined,
      minPax: o.minPax ?? undefined,
      isCombinable: o.isCombinable,
      active: o.active,
      sortOrder: o.sortOrder,
      applicableCabinCategoryIds: [],
      applicableMarketIds: [],
      notCombinableWith: [],
    });
    setOpen(o.id);
  }

  function onSubmit(v: OfferForm) {
    if (open === "add") createOffer.mutate(v);
    else if (open) updateOffer.mutate({ id: open, data: v });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Special Offers</CardTitle>
        <Button size="sm" onClick={openAdd}><Plus className="mr-1 h-3.5 w-3.5" />Add Offer</Button>
      </CardHeader>
      <CardContent>
        {!offers?.length ? (
          <p className="text-sm text-muted-foreground py-4">No offers defined</p>
        ) : (
          <div className="space-y-2">
            {offers.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="text-sm font-medium">{o.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CRUISE_OFFER_TYPE_LABELS[o.type as keyof typeof CRUISE_OFFER_TYPE_LABELS]} ·{" "}
                    {o.valueType === "PERCENTAGE" && o.value != null ? `${Number(o.value).toFixed(0)}%` : o.valueType}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={o.active ? "default" : "secondary"}>{o.active ? "Active" : "Inactive"}</Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(o)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete offer?")) deleteOffer.mutate({ id: o.id }); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open === "add" || (!!open && open !== "add")} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{open === "add" ? "Add Offer" : "Edit Offer"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{OFFER_TYPES.map((t) => <SelectItem key={t} value={t}>{CRUISE_OFFER_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl><Input placeholder="e.g. Early Bird 20%" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="valueType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value Type *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Percentage %</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                        <SelectItem value="FREE_NIGHTS">Free Nights</SelectItem>
                        <SelectItem value="UPGRADE">Upgrade</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl><Input type="number" step={0.01} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="daysBeforeDeparture" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days Before Dep.</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="minNights" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Nights</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-4">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="isCombinable" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-4">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <FormLabel className="!mt-0">Combinable</FormLabel>
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
                <Button type="submit" disabled={createOffer.isPending || updateOffer.isPending}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Gala Meals tab ───────────────────────────────────────────────────────────

const GALA_TYPES = ["NEW_YEARS_EVE","CHRISTMAS_EVE","CHRISTMAS_DAY","EASTER_SUNDAY","RAMADAN_IFTAR","OTHER"] as const;

function GalaMealsTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const { data: galaMeals } = trpc.nileCruises.galaMeal.listByContract.useQuery({ contractId });

  const createMeal = trpc.nileCruises.galaMeal.create.useMutation({
    onSuccess: () => { toast.success("Gala meal added"); utils.nileCruises.galaMeal.listByContract.invalidate({ contractId }); setOpen(false); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMeal = trpc.nileCruises.galaMeal.delete.useMutation({
    onSuccess: () => { toast.success("Gala meal removed"); utils.nileCruises.galaMeal.listByContract.invalidate({ contractId }); },
    onError: (err) => toast.error(err.message),
  });

  type GalaForm = z.input<typeof cruiseGalaMealCreateSchema>;
  const form = useForm<GalaForm>({
    resolver: zodResolver(cruiseGalaMealCreateSchema),
    defaultValues: { contractId, type: "NEW_YEARS_EVE", applicableDate: "", pricePerPax: 0, isMandatory: true, currency: "USD" },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Gala Meals</CardTitle>
        <Button size="sm" onClick={() => { form.reset({ contractId, type: "NEW_YEARS_EVE", applicableDate: "", pricePerPax: 0, isMandatory: true, currency: "USD" }); setOpen(true); }}>
          <Plus className="mr-1 h-3.5 w-3.5" />Add Gala Meal
        </Button>
      </CardHeader>
      <CardContent>
        {!galaMeals?.length ? (
          <p className="text-sm text-muted-foreground py-4">No gala meals defined</p>
        ) : (
          <div className="divide-y">
            {galaMeals.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">{CRUISE_GALA_MEAL_TYPE_LABELS[g.type as keyof typeof CRUISE_GALA_MEAL_TYPE_LABELS]}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(g.applicableDate), "dd MMM yyyy")}
                    {g.isMandatory ? " · Mandatory" : " · Optional"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">{Number(g.pricePerPax).toFixed(2)} {g.currency}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Remove?")) deleteMeal.mutate({ id: g.id }); }}>
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
          <DialogHeader><DialogTitle>Add Gala Meal</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createMeal.mutate(v))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Type *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{GALA_TYPES.map((t) => <SelectItem key={t} value={t}>{CRUISE_GALA_MEAL_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="applicableDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value as string} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{["USD","EUR","GBP","EGP"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="pricePerPax" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price / Pax *</FormLabel>
                    <FormControl><Input type="number" min={0} step={0.01} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="childPricePerPax" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Child Price / Pax</FormLabel>
                    <FormControl><Input type="number" min={0} step={0.01} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="isMandatory" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-4 col-span-2">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <FormLabel className="!mt-0">Mandatory</FormLabel>
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMeal.isPending}>Add</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Markup tab ───────────────────────────────────────────────────────────────

function MarkupTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const { data: markup } = trpc.nileCruises.markup.listByContract.useQuery({ contractId });
  const [edited, setEdited] = useState<Record<string, string>>({});

  const saveMarket = trpc.nileCruises.markup.saveMarketMarkup.useMutation({
    onSuccess: () => { toast.success("Saved"); utils.nileCruises.markup.listByContract.invalidate({ contractId }); },
    onError: (err) => toast.error(err.message),
  });
  const saveTo = trpc.nileCruises.markup.saveToMarkup.useMutation({
    onSuccess: () => { toast.success("Saved"); utils.nileCruises.markup.listByContract.invalidate({ contractId }); },
    onError: (err) => toast.error(err.message),
  });

  function getVal(id: string, fallback: number) {
    return id in edited ? edited[id] : String(fallback);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Market & Agent Markup</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {markup?.markets.length ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">MARKETS</p>
            <div className="divide-y">
              {markup.markets.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2.5">
                  <p className="text-sm">{m.market.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        className="w-20 text-right"
                        value={getVal(m.id, Number(m.markup))}
                        onChange={(e) => setEdited((p) => ({ ...p, [m.id]: e.target.value }))}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => saveMarket.mutate({ contractId, marketId: m.market.id, markup: Number(getVal(m.id, Number(m.markup))) })}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {markup?.tourOperators.length ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">TOUR OPERATORS</p>
            <div className="divide-y">
              {markup.tourOperators.map((to) => (
                <div key={to.id} className="flex items-center justify-between py-2.5">
                  <p className="text-sm">{to.tourOperator.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        className="w-20 text-right"
                        value={getVal(to.id, Number(to.markup))}
                        onChange={(e) => setEdited((p) => ({ ...p, [to.id]: e.target.value }))}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => saveTo.mutate({ contractId, tourOperatorId: to.tourOperator.id, markup: Number(getVal(to.id, Number(to.markup))) })}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {!markup?.markets.length && !markup?.tourOperators.length && (
          <p className="text-sm text-muted-foreground py-4">
            No markets or tour operators linked to this contract. Link them from the shared setup.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CruiseContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.nileCruises.contract.getById.useQuery({ id });

  const post = trpc.nileCruises.contract.post.useMutation({
    onSuccess: () => { toast.success("Contract posted"); utils.nileCruises.contract.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const publish = trpc.nileCruises.contract.publish.useMutation({
    onSuccess: () => { toast.success("Contract published"); utils.nileCruises.contract.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const del = trpc.nileCruises.contract.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); router.push("/nile-cruises/contracts"); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data) return <div className="p-6 text-muted-foreground">Contract not found</div>;

  const statusVariant = CRUISE_CONTRACT_STATUS_VARIANTS[data.status as keyof typeof CRUISE_CONTRACT_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{data.code}</h1>
            <Badge variant={statusVariant}>
              {CRUISE_CONTRACT_STATUS_LABELS[data.status as keyof typeof CRUISE_CONTRACT_STATUS_LABELS]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{data.name} · {data.boat.name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {data.status === "DRAFT" && (
            <Button variant="outline" onClick={() => post.mutate({ id })} disabled={post.isPending}>Post</Button>
          )}
          {data.status === "POSTED" && (
            <Button variant="default" onClick={() => publish.mutate({ id })} disabled={publish.isPending}>Publish</Button>
          )}
          {data.status === "DRAFT" && (
            <Button variant="destructive" onClick={() => { if (confirm("Delete contract?")) del.mutate({ id }); }}>Delete</Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Valid From", value: format(new Date(data.validFrom), "dd MMM yyyy") },
          { label: "Valid To", value: format(new Date(data.validTo), "dd MMM yyyy") },
          { label: "Currency", value: data.baseCurrency },
          { label: "Seasons", value: data.seasons.length },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="seasons">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="seasons">Seasons ({data.seasons.length})</TabsTrigger>
          <TabsTrigger value="rates">Base Rates</TabsTrigger>
          <TabsTrigger value="supplements">Supplements</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="gala">Gala Meals</TabsTrigger>
          <TabsTrigger value="markup">Markup</TabsTrigger>
        </TabsList>

        <TabsContent value="seasons"><SeasonsTab contractId={id} /></TabsContent>
        <TabsContent value="rates"><BaseRatesTab contractId={id} /></TabsContent>
        <TabsContent value="supplements"><SupplementsTab contractId={id} /></TabsContent>
        <TabsContent value="offers"><OffersTab contractId={id} /></TabsContent>
        <TabsContent value="gala"><GalaMealsTab contractId={id} /></TabsContent>
        <TabsContent value="markup"><MarkupTab contractId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}
