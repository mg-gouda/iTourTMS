"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import type { ExcursionPdfData } from "@/lib/export/crm-excursion-pdf";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CostSheetEditor } from "@/components/crm/cost-sheet-editor";
import { SellingPriceEditor } from "@/components/crm/selling-price-editor";
import {
  CRM_ACTIVITY_CATEGORY_LABELS,
  CRM_AGE_GROUP_LABELS,
  CRM_NATIONALITY_TIER_LABELS,
  CRM_PRODUCT_TYPE_LABELS,
  CRM_SEASON_TYPE_LABELS,
  CRM_TRIP_MODE_LABELS,
} from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";
import {
  addonCreateSchema,
  ageGroupCreateSchema,
  costSheetCreateSchema,
  excursionUpdateSchema,
  programCreateSchema,
  programItemCreateSchema,
} from "@/lib/validations/crm";

type ExcursionFormValues = z.input<typeof excursionUpdateSchema>;

export default function ExcursionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: excursion, isLoading } = trpc.crm.excursion.getById.useQuery({ id });
  const { data: stats } = trpc.crm.excursion.stats.useQuery({ id });
  const { data: suppliers } = trpc.crm.supplier.list.useQuery();

  // --- Info form ---
  const form = useForm<ExcursionFormValues>({
    resolver: zodResolver(excursionUpdateSchema),
    defaultValues: {
      code: "",
      name: "",
      duration: "",
      description: "",
      inclusions: "",
      exclusions: "",
      minPax: 1,
      active: true,
    },
  });

  useEffect(() => {
    if (excursion) {
      form.reset({
        code: excursion.code,
        name: excursion.name,
        productType: excursion.productType,
        category: excursion.category,
        tripMode: excursion.tripMode,
        duration: excursion.duration ?? "",
        description: excursion.description ?? "",
        inclusions: excursion.inclusions ?? "",
        exclusions: excursion.exclusions ?? "",
        minPax: excursion.minPax ?? 1,
        maxPax: excursion.maxPax ?? undefined,
        active: excursion.active,
      });
    }
  }, [excursion, form]);

  const updateMutation = trpc.crm.excursion.update.useMutation({
    onSuccess: () => {
      utils.crm.excursion.getById.invalidate({ id });
      utils.crm.excursion.list.invalidate();
    },
  });

  const deleteMutation = trpc.crm.excursion.delete.useMutation({
    onSuccess: () => {
      utils.crm.excursion.list.invalidate();
      router.push("/crm/excursions");
    },
  });

  // --- Program ---
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const programForm = useForm<z.input<typeof programCreateSchema>>({
    resolver: zodResolver(programCreateSchema),
    defaultValues: { excursionId: id, dayNumber: 1, title: "", description: "", sortOrder: 0 },
  });
  const createProgram = trpc.crm.program.create.useMutation({
    onSuccess: () => {
      utils.crm.excursion.getById.invalidate({ id });
      setProgramDialogOpen(false);
      programForm.reset({ excursionId: id, dayNumber: 1, title: "", description: "", sortOrder: 0 });
    },
  });
  const deleteProgram = trpc.crm.program.delete.useMutation({
    onSuccess: () => utils.crm.excursion.getById.invalidate({ id }),
  });
  const updateProgram = trpc.crm.program.update.useMutation({
    onSuccess: () => { utils.crm.excursion.getById.invalidate({ id }); toast.success("Program updated"); },
    onError: (e) => toast.error(e.message),
  });

  // --- Program Items ---
  const [itemDialogProgramId, setItemDialogProgramId] = useState<string | null>(null);
  const itemForm = useForm<z.input<typeof programItemCreateSchema>>({
    resolver: zodResolver(programItemCreateSchema),
    defaultValues: { programId: "", time: "", title: "", description: "", location: "", sortOrder: 0 },
  });
  const createItem = trpc.crm.program.createItem.useMutation({
    onSuccess: () => {
      utils.crm.excursion.getById.invalidate({ id });
      setItemDialogProgramId(null);
      itemForm.reset();
    },
  });
  const deleteItem = trpc.crm.program.deleteItem.useMutation({
    onSuccess: () => utils.crm.excursion.getById.invalidate({ id }),
  });
  const updateItem = trpc.crm.program.updateItem.useMutation({
    onSuccess: () => { utils.crm.excursion.getById.invalidate({ id }); toast.success("Item updated"); },
    onError: (e) => toast.error(e.message),
  });

  // --- Age Groups ---
  const [ageGroupDialogOpen, setAgeGroupDialogOpen] = useState(false);
  const ageGroupForm = useForm<z.input<typeof ageGroupCreateSchema>>({
    resolver: zodResolver(ageGroupCreateSchema),
    defaultValues: { excursionId: id, label: "ADULT", minAge: 0, maxAge: 99, sortOrder: 0 },
  });
  const createAgeGroup = trpc.crm.ageGroup.create.useMutation({
    onSuccess: () => {
      utils.crm.excursion.getById.invalidate({ id });
      setAgeGroupDialogOpen(false);
      ageGroupForm.reset({ excursionId: id, label: "ADULT", minAge: 0, maxAge: 99, sortOrder: 0 });
    },
  });
  const deleteAgeGroup = trpc.crm.ageGroup.delete.useMutation({
    onSuccess: () => utils.crm.excursion.getById.invalidate({ id }),
  });

  // --- Addons ---
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const addonForm = useForm<z.input<typeof addonCreateSchema>>({
    resolver: zodResolver(addonCreateSchema),
    defaultValues: { excursionId: id, name: "", description: "", price: undefined, sortOrder: 0 },
  });
  const createAddon = trpc.crm.addon.create.useMutation({
    onSuccess: () => {
      utils.crm.excursion.getById.invalidate({ id });
      setAddonDialogOpen(false);
      addonForm.reset({ excursionId: id, name: "", description: "", price: undefined, sortOrder: 0 });
    },
  });
  const deleteAddon = trpc.crm.addon.delete.useMutation({
    onSuccess: () => utils.crm.excursion.getById.invalidate({ id }),
  });
  const updateAddon = trpc.crm.addon.update.useMutation({
    onSuccess: () => { utils.crm.excursion.getById.invalidate({ id }); toast.success("Addon updated"); },
    onError: (e) => toast.error(e.message),
  });

  // --- Cost Sheets ---
  const [costSheetDialogOpen, setCostSheetDialogOpen] = useState(false);
  const costSheetForm = useForm<z.input<typeof costSheetCreateSchema>>({
    resolver: zodResolver(costSheetCreateSchema),
    defaultValues: {
      excursionId: id, name: "", seasonType: "LOW", nationalityTier: "DEFAULT",
      tripMode: "SHARED", validFrom: "", validTo: "", referencePax: 10, baseCurrency: "USD", notes: "",
    },
  });
  const createCostSheet = trpc.crm.costSheet.create.useMutation({
    onSuccess: () => {
      utils.crm.excursion.getById.invalidate({ id });
      setCostSheetDialogOpen(false);
      costSheetForm.reset({
        excursionId: id, name: "", seasonType: "LOW", nationalityTier: "DEFAULT",
        tripMode: "SHARED", validFrom: "", validTo: "", referencePax: 10, baseCurrency: "USD", notes: "",
      });
    },
  });
  const deleteCostSheet = trpc.crm.costSheet.delete.useMutation({
    onSuccess: () => utils.crm.excursion.getById.invalidate({ id }),
  });
  const updateCostSheet = trpc.crm.costSheet.update.useMutation({
    onSuccess: () => { utils.crm.excursion.getById.invalidate({ id }); toast.success("Cost sheet updated"); },
    onError: (e) => toast.error(e.message),
  });

  // --- Component Editor ---
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const { data: pickupLocations } = trpc.crm.pickupLocation.listByExcursion.useQuery({ excursionId: id });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!excursion) return <p>Excursion not found</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{excursion.name}</h1>
            <Badge variant={excursion.active ? "default" : "secondary"}>
              {excursion.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="font-mono text-sm text-muted-foreground">{excursion.code}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const { generateExcursionPdf } = await import("@/lib/export/crm-excursion-pdf");
              const pdf = generateExcursionPdf({
                name: excursion.name,
                code: excursion.code,
                productType: excursion.productType,
                category: excursion.category,
                tripMode: excursion.tripMode,
                duration: excursion.duration,
                maxPax: excursion.maxPax,
                description: excursion.description,
                inclusions: excursion.inclusions,
                exclusions: excursion.exclusions,
                importantNotes: "",
                programs: (excursion.programs ?? []).map((p) => ({
                  name: p.title,
                  sortOrder: p.sortOrder,
                  items: p.items.map((it) => ({
                    sortOrder: it.sortOrder,
                    time: it.time,
                    title: it.title,
                    description: it.description,
                  })),
                })),
                ageGroups: (excursion.ageGroups ?? []).map((ag) => ({
                  label: ag.label,
                  ageGroup: ag.label,
                  minAge: ag.minAge,
                  maxAge: ag.maxAge,
                })),
                costSheets: (excursion.costSheets ?? []).map((cs) => ({
                  ...(cs as Record<string, unknown>),
                  label: cs.name,
                  seasonType: cs.seasonType,
                  validFrom: cs.validFrom ?? new Date(),
                  validTo: cs.validTo ?? new Date(),
                  totalCost: cs.totalCost,
                  currency: "USD",
                  components: ((cs as Record<string, unknown>).components as Array<Record<string, unknown>>) ?? [],
                })) as ExcursionPdfData["costSheets"],
              });
              pdf.save(`${excursion.code}-detail.pdf`);
            }}
          >
            Export PDF
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { if (confirm("Delete this excursion?")) deleteMutation.mutate({ id }); }}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Performance Stats */}
      {stats && (stats.totalBookings > 0) && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Bookings</p>
              <p className="text-lg font-bold">{stats.totalBookings}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-bold font-mono text-green-600">${stats.confirmedRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className="text-lg font-bold font-mono">${(stats.confirmedRevenue - stats.confirmedCost).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Pax Served</p>
              <p className="text-lg font-bold">{stats.totalPaxServed}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="program">Program ({excursion.programs?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="extras">Age Groups & Addons</TabsTrigger>
          <TabsTrigger value="costs">Cost Sheets ({excursion.costSheets?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        {/* ── Info Tab ── */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => updateMutation.mutate({ id, data: v }))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="code" render={({ field }) => (
                      <FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="productType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.entries(CRM_PRODUCT_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.entries(CRM_ACTIVITY_CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="tripMode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trip Mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.entries(CRM_TRIP_MODE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="duration" render={({ field }) => (
                    <FormItem><FormLabel>Duration</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="inclusions" render={({ field }) => (
                    <FormItem><FormLabel>Inclusions</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="exclusions" render={({ field }) => (
                    <FormItem><FormLabel>Exclusions</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="active" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel>Active</FormLabel>
                    </FormItem>
                  )} />
                  {updateMutation.error && <p className="text-sm text-destructive">{updateMutation.error.message}</p>}
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Program Tab ── */}
        <TabsContent value="program" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={programDialogOpen} onOpenChange={setProgramDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Day</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Program Day</DialogTitle></DialogHeader>
                <Form {...programForm}>
                  <form onSubmit={programForm.handleSubmit((v) => createProgram.mutate(v))} className="space-y-4">
                    <FormField control={programForm.control} name="dayNumber" render={({ field }) => (
                      <FormItem><FormLabel>Day Number</FormLabel><FormControl>
                        <Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={programForm.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={programForm.control} name="description" render={({ field }) => (
                      <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                    )} />
                    <Button type="submit" disabled={createProgram.isPending}>Add Day</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {excursion.programs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No program days yet. Add days to build the itinerary.</p>
          ) : (
            excursion.programs.map((prog) => (
              <Card key={prog.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Day {prog.dayNumber}: {prog.title}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setItemDialogProgramId(prog.id);
                          itemForm.reset({ programId: prog.id, time: "", title: "", description: "", location: "", sortOrder: 0 });
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => { if (confirm("Delete this day?")) deleteProgram.mutate({ id: prog.id }); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {prog.description && (
                    <p className="text-xs text-muted-foreground">{prog.description}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  {prog.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No items yet</p>
                  ) : (
                    <div className="space-y-1">
                      {prog.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            {item.time && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" /> {item.time}
                              </span>
                            )}
                            <span className="font-medium">{item.title}</span>
                            {item.location && <span className="text-xs text-muted-foreground">@ {item.location}</span>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => deleteItem.mutate({ id: item.id })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {/* Item Dialog */}
          <Dialog open={!!itemDialogProgramId} onOpenChange={(open) => { if (!open) setItemDialogProgramId(null); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>New Timeline Item</DialogTitle></DialogHeader>
              <Form {...itemForm}>
                <form onSubmit={itemForm.handleSubmit((v) => createItem.mutate(v))} className="space-y-4">
                  <FormField control={itemForm.control} name="time" render={({ field }) => (
                    <FormItem><FormLabel>Time</FormLabel><FormControl><Input placeholder="09:00" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={itemForm.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={itemForm.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={itemForm.control} name="location" render={({ field }) => (
                    <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <Button type="submit" disabled={createItem.isPending}>Add Item</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Age Groups & Addons Tab ── */}
        <TabsContent value="extras" className="mt-4 space-y-6">
          {/* Age Groups */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Age Groups</CardTitle>
                <Dialog open={ageGroupDialogOpen} onOpenChange={setAgeGroupDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Age Group</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Age Group</DialogTitle></DialogHeader>
                    <Form {...ageGroupForm}>
                      <form onSubmit={ageGroupForm.handleSubmit((v) => createAgeGroup.mutate(v))} className="space-y-4">
                        <FormField control={ageGroupForm.control} name="label" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Label</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {Object.entries(CRM_AGE_GROUP_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={ageGroupForm.control} name="minAge" render={({ field }) => (
                            <FormItem><FormLabel>Min Age</FormLabel><FormControl>
                              <Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                            </FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={ageGroupForm.control} name="maxAge" render={({ field }) => (
                            <FormItem><FormLabel>Max Age</FormLabel><FormControl>
                              <Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                            </FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <Button type="submit" disabled={createAgeGroup.isPending}>Add Age Group</Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {excursion.ageGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No age groups defined</p>
              ) : (
                <div className="space-y-2">
                  {excursion.ageGroups.map((ag) => (
                    <div key={ag.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <div>
                        <Badge variant="outline" className="mr-2">{CRM_AGE_GROUP_LABELS[ag.label]}</Badge>
                        {ag.minAge}–{ag.maxAge} years
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => deleteAgeGroup.mutate({ id: ag.id })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Addons */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Optional Addons</CardTitle>
                <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Addon</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Addon</DialogTitle></DialogHeader>
                    <Form {...addonForm}>
                      <form onSubmit={addonForm.handleSubmit((v) => createAddon.mutate(v))} className="space-y-4">
                        <FormField control={addonForm.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={addonForm.control} name="description" render={({ field }) => (
                          <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={addonForm.control} name="price" render={({ field }) => (
                          <FormItem><FormLabel>Price</FormLabel><FormControl>
                            <Input type="number" min={0} step="0.01" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                          </FormControl></FormItem>
                        )} />
                        <Button type="submit" disabled={createAddon.isPending}>Add Addon</Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {excursion.addons.length === 0 ? (
                <p className="text-sm text-muted-foreground">No addons yet</p>
              ) : (
                <div className="space-y-2">
                  {excursion.addons.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{addon.name}</span>
                        {addon.description && <span className="ml-2 text-muted-foreground">{addon.description}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {addon.price && <span className="font-mono">${Number(addon.price).toFixed(2)}</span>}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => deleteAddon.mutate({ id: addon.id })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Cost Sheets Tab ── */}
        <TabsContent value="costs" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={costSheetDialogOpen} onOpenChange={setCostSheetDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Cost Sheet</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>New Cost Sheet</DialogTitle></DialogHeader>
                <Form {...costSheetForm}>
                  <form onSubmit={costSheetForm.handleSubmit((v) => createCostSheet.mutate(v))} className="space-y-4">
                    <FormField control={costSheetForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Summer 2026 — Shared" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-3 gap-3">
                      <FormField control={costSheetForm.control} name="seasonType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Season</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {Object.entries(CRM_SEASON_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={costSheetForm.control} name="nationalityTier" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nationality</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {Object.entries(CRM_NATIONALITY_TIER_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={costSheetForm.control} name="tripMode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trip Mode</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {Object.entries(CRM_TRIP_MODE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={costSheetForm.control} name="validFrom" render={({ field }) => (
                        <FormItem><FormLabel>Valid From</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={costSheetForm.control} name="validTo" render={({ field }) => (
                        <FormItem><FormLabel>Valid To</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={costSheetForm.control} name="referencePax" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference Pax</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={costSheetForm.control} name="baseCurrency" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {["EGP", "USD", "EUR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <Button type="submit" disabled={createCostSheet.isPending}>Create Cost Sheet</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {excursion.costSheets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cost sheets yet</p>
          ) : (
            excursion.costSheets.map((sheet) => {
              const isEditing = editingSheetId === sheet.id;
              return (
                <Card key={sheet.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{sheet.name}</CardTitle>
                        <div className="mt-1 flex gap-2">
                          <Badge variant="outline">{CRM_SEASON_TYPE_LABELS[sheet.seasonType]}</Badge>
                          <Badge variant="outline">{CRM_NATIONALITY_TIER_LABELS[sheet.nationalityTier]}</Badge>
                          <Badge variant="outline">{CRM_TRIP_MODE_LABELS[sheet.tripMode]}</Badge>
                          <Badge variant="outline">{sheet.referencePax} pax ref</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">
                          {sheet.baseCurrency} {Number(sheet.totalCost ?? 0).toFixed(2)}/pax
                        </span>
                        {!isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingSheetId(sheet.id)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => { if (confirm("Delete this cost sheet?")) deleteCostSheet.mutate({ id: sheet.id }); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {isEditing ? (
                      <CostSheetEditor
                        sheetId={sheet.id}
                        excursionId={id}
                        referencePax={sheet.referencePax ?? 10}
                        baseCurrency={(sheet.baseCurrency as "EGP" | "USD" | "EUR") ?? "USD"}
                        existingComponents={sheet.components}
                        existingLocations={pickupLocations ?? []}
                        suppliers={suppliers ?? []}
                        onSaved={() => { utils.crm.excursion.getById.invalidate({ id }); setEditingSheetId(null); }}
                        onCancel={() => setEditingSheetId(null)}
                      />
                    ) : sheet.components.length === 0 ? (
                      <Button variant="outline" size="sm" className="mt-1" onClick={() => setEditingSheetId(sheet.id)}>
                        <Plus className="mr-1 h-3 w-3" /> Add Components
                      </Button>
                    ) : (
                      <div className="overflow-hidden rounded border">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-3 py-1.5 text-left font-medium">Type</th>
                              <th className="px-3 py-1.5 text-left font-medium">Description</th>
                              <th className="px-3 py-1.5 text-center font-medium">Pricing</th>
                              <th className="px-3 py-1.5 text-right font-medium">Qty</th>
                              <th className="px-3 py-1.5 text-right font-medium">Unit Cost</th>
                              <th className="px-3 py-1.5 text-center font-medium">CCY</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sheet.components.map((comp) => (
                              <tr key={comp.id} className="border-b last:border-0">
                                <td className="px-3 py-1.5 capitalize">{comp.costType.toLowerCase().replace(/_/g, " ")}</td>
                                <td className="px-3 py-1.5">{comp.description}</td>
                                <td className="px-3 py-1.5 text-center">
                                  <Badge variant={comp.pricingType === "BULK" ? "secondary" : "outline"} className="text-xs">
                                    {comp.pricingType === "BULK" ? "Bulk" : "Per Pax"}
                                  </Badge>
                                </td>
                                <td className="px-3 py-1.5 text-right">{comp.qty}</td>
                                <td className="px-3 py-1.5 text-right font-mono">{Number(comp.unitCost).toFixed(2)}</td>
                                <td className="px-3 py-1.5 text-center">{comp.currency}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── Pricing Tab ── */}
        <TabsContent value="pricing" className="mt-4">
          <SellingPriceEditor
            excursionId={id}
            costSheets={excursion.costSheets.map((s) => ({
              id: s.id,
              name: s.name,
              seasonType: s.seasonType,
              nationalityTier: s.nationalityTier,
              tripMode: s.tripMode,
              calcBasis: s.calcBasis,
              totalCost: s.totalCost,
            }))}
            ageGroups={excursion.ageGroups.map((ag) => ({
              id: ag.id,
              label: CRM_AGE_GROUP_LABELS[ag.label] ?? ag.label,
              minAge: ag.minAge,
              maxAge: ag.maxAge,
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
