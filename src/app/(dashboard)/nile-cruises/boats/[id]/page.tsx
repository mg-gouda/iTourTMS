"use client";

import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Plus, Trash2, Layers } from "lucide-react";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cruiseBoatUpdateSchema, cruiseCabinCategoryCreateSchema, cruiseCabinCategoryUpdateSchema, cruiseCabinCreateSchema } from "@/lib/validations/nile-cruises";
import { trpc } from "@/lib/trpc";

type FormValues = z.input<typeof cruiseBoatUpdateSchema>;

export default function CruiseBoatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data: boat, isLoading } = trpc.nileCruises.boat.getById.useQuery({ id });
  const { data: decks } = trpc.nileCruises.deck.listByBoat.useQuery({ boatId: id });
  const { data: categories } = trpc.nileCruises.cabinCategory.listByBoat.useQuery({ boatId: id });
  const { data: cabins } = trpc.nileCruises.cabin.listByBoat.useQuery({ boatId: id });
  const { data: amenities } = trpc.nileCruises.boat.listAmenities.useQuery({ boatId: id });

  const update = trpc.nileCruises.boat.update.useMutation({
    onSuccess: () => { toast.success("Boat updated"); utils.nileCruises.boat.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const setActiveBoat = trpc.nileCruises.boat.setActive.useMutation({
    onSuccess: () => { toast.success("Status updated"); utils.nileCruises.boat.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const createDeck = trpc.nileCruises.deck.create.useMutation({
    onSuccess: () => { toast.success("Deck added"); utils.nileCruises.deck.listByBoat.invalidate({ boatId: id }); },
    onError: (err) => toast.error(err.message),
  });
  const deleteDeck = trpc.nileCruises.deck.delete.useMutation({
    onSuccess: () => utils.nileCruises.deck.listByBoat.invalidate({ boatId: id }),
    onError: (err) => toast.error(err.message),
  });
  const [newDeck, setNewDeck] = useState({ name: "", level: "MAIN_DECK" as const, sortOrder: 0 });


  const deleteAmenity = trpc.nileCruises.boat.deleteAmenity.useMutation({
    onSuccess: () => utils.nileCruises.boat.listAmenities.invalidate({ boatId: id }),
  });

  const [newAmenity, setNewAmenity] = useState("");
  const createAmenity = trpc.nileCruises.boat.createAmenity.useMutation({
    onSuccess: () => { setNewAmenity(""); utils.nileCruises.boat.listAmenities.invalidate({ boatId: id }); },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(cruiseBoatUpdateSchema),
    defaultValues: {
      name: "",
      code: "",
      ownershipMode: "OWN_FLEET",
      boatClass: "STEAMER",
      starRating: "FIVE",
      totalCabins: 0,
      totalDecks: 0,
      maxPax: 0,
      homePortCode: "LUXOR",
      hasPool: false,
      hasSpa: false,
      hasGym: false,
      active: true,
    },
  });

  useEffect(() => {
    if (boat) {
      form.reset({
        name: boat.name,
        code: boat.code,
        ownershipMode: boat.ownershipMode,
        boatClass: boat.boatClass,
        starRating: boat.starRating,
        totalCabins: boat.totalCabins,
        totalDecks: boat.totalDecks,
        maxPax: boat.maxPax,
        yearBuilt: boat.yearBuilt ?? undefined,
        yearRenovated: boat.yearRenovated ?? undefined,
        description: boat.description ?? undefined,
        shortDescription: boat.shortDescription ?? undefined,
        homePortCode: boat.homePortCode,
        hasPool: boat.hasPool,
        hasSpa: boat.hasSpa,
        hasGym: boat.hasGym,
        active: boat.active,
      });
    }
  }, [boat, form]);

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!boat) return <div className="p-6 text-muted-foreground">Boat not found</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{boat.name}</h1>
          <p className="text-sm text-muted-foreground">{boat.code} · {boat.boatClass} · {boat.starRating}</p>
        </div>
        <Switch
          checked={boat.active}
          onCheckedChange={(v) => setActiveBoat.mutate({ id, active: v })}
        />
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="decks">Decks ({decks?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="cabins">Cabins ({cabins?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="amenities">Amenities ({amenities?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => update.mutate({ id, data: v }))} className="space-y-4">
              <Card>
                <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem><FormLabel>Code</FormLabel><FormControl><Input className="font-mono" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="ownershipMode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ownership</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="OWN_FLEET">Own Fleet</SelectItem>
                          <SelectItem value="CONTRACTED">Contracted</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="boatClass" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="STEAMER">Cruise Ship</SelectItem>
                          <SelectItem value="DAHABIYA">Dahabiya</SelectItem>
                          <SelectItem value="LAKE_CRUISER">Lake Cruiser</SelectItem>
                          <SelectItem value="LONG_NILE_CRUISER">Long Nile Cruiser</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="starRating" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Star Rating</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="THREE">3 Stars</SelectItem>
                          <SelectItem value="FOUR">4 Stars</SelectItem>
                          <SelectItem value="FIVE">5 Stars</SelectItem>
                          <SelectItem value="FIVE_DELUXE">5 Stars Deluxe</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="homePortCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Home Port</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["LUXOR","ASWAN","ESNA","EDFU","KOM_OMBO","ABU_SIMBEL","CAIRO","EL_MINYA","ASYUT","SOHAG","QENA","DENDERA","ABYDOS","WADI_EL_SEBOUA","AMADA","KASR_IBRIM","OTHER"].map((p) => (
                            <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="totalCabins" render={({ field }) => (
                    <FormItem><FormLabel>Total Cabins</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="totalDecks" render={({ field }) => (
                    <FormItem><FormLabel>Total Decks</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="maxPax" render={({ field }) => (
                    <FormItem><FormLabel>Max Pax</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="yearBuilt" render={({ field }) => (
                    <FormItem><FormLabel>Year Built</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="yearRenovated" render={({ field }) => (
                    <FormItem><FormLabel>Year Renovated</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="shortDescription" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Short Description</FormLabel><FormControl><Input placeholder="Brief tagline" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="sm:col-span-2 grid grid-cols-3 gap-4 pt-2">
                    <FormField control={form.control} name="hasPool" render={({ field }) => (
                      <FormItem className="flex items-center gap-3 rounded border px-4 py-3">
                        <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="mb-0 cursor-pointer">Swimming Pool</FormLabel>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="hasSpa" render={({ field }) => (
                      <FormItem className="flex items-center gap-3 rounded border px-4 py-3">
                        <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="mb-0 cursor-pointer">Spa</FormLabel>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="hasGym" render={({ field }) => (
                      <FormItem className="flex items-center gap-3 rounded border px-4 py-3">
                        <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="mb-0 cursor-pointer">Gym</FormLabel>
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="decks">
          <Card>
            <CardHeader><CardTitle className="text-base">Decks</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!decks?.length ? (
                <p className="text-sm text-muted-foreground py-2">No decks defined yet</p>
              ) : (
                <div className="divide-y">
                  {decks.map((deck) => (
                    <div key={deck.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">{deck.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {deck.level.replace(/_/g, " ")} · {deck._count.cabins} cabin{deck._count.cabins !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteDeck.mutate({ id: deck.id })}
                        disabled={deleteDeck.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-3 grid gap-2 sm:grid-cols-4">
                <Input
                  placeholder="Deck name (e.g. Sun Deck)"
                  value={newDeck.name}
                  onChange={(e) => setNewDeck((p) => ({ ...p, name: e.target.value }))}
                  className="sm:col-span-2"
                />
                <Select value={newDeck.level} onValueChange={(v) => setNewDeck((p) => ({ ...p, level: v as typeof newDeck.level }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOWER_DECK">Lower Deck</SelectItem>
                    <SelectItem value="MAIN_DECK">Main Deck</SelectItem>
                    <SelectItem value="UPPER_DECK">Upper Deck</SelectItem>
                    <SelectItem value="SUN_DECK">Sun Deck</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={() => {
                    if (!newDeck.name.trim()) return;
                    createDeck.mutate({ boatId: id, name: newDeck.name.trim(), level: newDeck.level, sortOrder: decks?.length ?? 0 });
                    setNewDeck((p) => ({ ...p, name: "" }));
                  }}
                  disabled={!newDeck.name.trim() || createDeck.isPending}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add Deck
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <CabinCategoriesTab boatId={id} categories={categories ?? []} />
        </TabsContent>

        <TabsContent value="cabins">
          <CabinsTab boatId={id} cabins={cabins ?? []} decks={decks ?? []} categories={categories ?? []} />
        </TabsContent>

        <TabsContent value="amenities">
          <Card>
            <CardHeader><CardTitle className="text-base">Amenities</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Swimming pool, Spa, Sun deck"
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newAmenity.trim()) { e.preventDefault(); createAmenity.mutate({ boatId: id, name: newAmenity.trim() }); } }}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => newAmenity.trim() && createAmenity.mutate({ boatId: id, name: newAmenity.trim() })}
                  disabled={createAmenity.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {!amenities?.length ? (
                <p className="text-sm text-muted-foreground">No amenities listed</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <div key={a.id} className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm">
                      {a.name}
                      <button onClick={() => deleteAmenity.mutate({ id: a.id })} className="ml-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
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

// ─── Cabin Categories Tab ────────────────────────────────────────────────────

function CabinCategoriesTab({ boatId, categories }: { boatId: string; categories: any[] }) {
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const addForm = useForm<z.input<typeof cruiseCabinCategoryCreateSchema>>({
    resolver: zodResolver(cruiseCabinCategoryCreateSchema),
    defaultValues: {
      boatId,
      code: "",
      name: "",
      minOccupancy: 1,
      baseOccupancy: 2,
      maxAdults: 2,
      maxChildren: 1,
      maxInfants: 1,
      maxOccupancy: 3,
      extraBedAvailable: false,
      maxExtraBeds: 0,
      hasBalcony: false,
      hasBathtub: false,
      active: true,
    },
  });

  const editForm = useForm<z.input<typeof cruiseCabinCategoryUpdateSchema>>({
    resolver: zodResolver(cruiseCabinCategoryUpdateSchema),
  });

  const createMutation = trpc.nileCruises.cabinCategory.create.useMutation({
    onSuccess: () => {
      toast.success("Category added");
      utils.nileCruises.cabinCategory.listByBoat.invalidate({ boatId });
      setAddOpen(false);
      addForm.reset();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.nileCruises.cabinCategory.update.useMutation({
    onSuccess: () => {
      toast.success("Category updated");
      utils.nileCruises.cabinCategory.listByBoat.invalidate({ boatId });
      setEditingId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.nileCruises.cabinCategory.delete.useMutation({
    onSuccess: () => utils.nileCruises.cabinCategory.listByBoat.invalidate({ boatId }),
    onError: (err) => toast.error(err.message),
  });

  function openEdit(cat: any) {
    editForm.reset({
      code: cat.code,
      name: cat.name,
      description: cat.description ?? undefined,
      bedConfiguration: cat.bedConfiguration ?? undefined,
      minOccupancy: cat.minOccupancy,
      baseOccupancy: cat.baseOccupancy,
      maxAdults: cat.maxAdults,
      maxChildren: cat.maxChildren,
      maxInfants: cat.maxInfants,
      maxOccupancy: cat.maxOccupancy,
      extraBedAvailable: cat.extraBedAvailable,
      maxExtraBeds: cat.maxExtraBeds,
      sizeM2: cat.sizeM2 ? Number(cat.sizeM2) : undefined,
      hasBalcony: cat.hasBalcony,
      hasBathtub: cat.hasBathtub,
      active: cat.active,
    });
    setEditingId(cat.id);
  }

  function openCopy(cat: any) {
    addForm.reset({
      boatId,
      code: `${cat.code}-CPY`,
      name: `${cat.name} (Copy)`,
      description: cat.description ?? undefined,
      bedConfiguration: cat.bedConfiguration ?? undefined,
      minOccupancy: cat.minOccupancy,
      baseOccupancy: cat.baseOccupancy,
      maxAdults: cat.maxAdults,
      maxChildren: cat.maxChildren,
      maxInfants: cat.maxInfants,
      maxOccupancy: cat.maxOccupancy,
      extraBedAvailable: cat.extraBedAvailable,
      maxExtraBeds: cat.maxExtraBeds,
      sizeM2: cat.sizeM2 ? Number(cat.sizeM2) : undefined,
      hasBalcony: cat.hasBalcony,
      hasBathtub: cat.hasBathtub,
      active: cat.active,
    });
    setAddOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No cabin categories yet. Add one to get started.</div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{cat.name}</span>
                    <span className="font-mono text-sm text-muted-foreground">{cat.code}</span>
                    <Badge variant={cat.active ? "default" : "secondary"}>{cat.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min {cat.minOccupancy} · Std {cat.baseOccupancy}A · Max {cat.maxAdults}A / {cat.maxChildren}C / {cat.maxInfants}I · Total {cat.maxOccupancy}
                    {cat.sizeM2 ? ` · ${cat.sizeM2} m²` : ""}
                    {cat.bedConfiguration ? ` · ${cat.bedConfiguration}` : ""}
                    {cat.hasBalcony ? " · Balcony" : ""}
                    {cat.hasBathtub ? " · Bathtub" : ""}
                    {cat.extraBedAvailable ? ` · Extra bed ×${cat.maxExtraBeds}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(cat)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => openCopy(cat)}>Copy</Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate({ id: cat.id })} disabled={deleteMutation.isPending}>Remove</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Add Cabin Category</DialogTitle></DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              <CategoryFormFields form={addForm} />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={(o) => { if (!o) setEditingId(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Edit Cabin Category</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((v) => updateMutation.mutate({ id: editingId!, data: v }))} className="space-y-4">
              <CategoryFormFields form={editForm} isEdit />
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryFormFields({ form, isEdit = false }: { form: any; isEdit?: boolean }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Name *</FormLabel>
            <FormControl><Input placeholder="Standard Cabin" {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="code" render={({ field }) => (
          <FormItem>
            <FormLabel>Code *</FormLabel>
            <FormControl><Input placeholder="STD" className="font-mono" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {/* Occupancy row */}
      <div className="flex items-end gap-4">
        <div className="grid flex-1 grid-cols-5 gap-3">
          <FormField control={form.control} name="minOccupancy" render={({ field }) => (
            <FormItem>
              <FormLabel>Min Adults</FormLabel>
              <FormControl><Input type="number" min={1} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="baseOccupancy" render={({ field }) => (
            <FormItem>
              <FormLabel>Std Adults</FormLabel>
              <FormControl><Input type="number" min={1} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="maxAdults" render={({ field }) => (
            <FormItem>
              <FormLabel>Max Adults</FormLabel>
              <FormControl><Input type="number" min={1} {...field} value={field.value ?? ""} onChange={(e) => {
                const val = Number(e.target.value);
                field.onChange(val);
                form.setValue("maxOccupancy", val + (form.getValues("maxChildren") || 0));
              }} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="maxChildren" render={({ field }) => (
            <FormItem>
              <FormLabel>Max Children</FormLabel>
              <FormControl><Input type="number" min={0} {...field} value={field.value ?? ""} onChange={(e) => {
                const val = Number(e.target.value);
                field.onChange(val);
                form.setValue("maxOccupancy", (form.getValues("maxAdults") || 0) + val);
              }} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="maxOccupancy" render={({ field }) => (
            <FormItem>
              <FormLabel>Max Total</FormLabel>
              <FormControl><Input type="number" {...field} value={field.value ?? ""} readOnly className="bg-muted" /></FormControl>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="maxInfants" render={({ field }) => (
          <FormItem className="flex items-center gap-2 pb-2">
            <FormControl>
              <Checkbox checked={(field.value ?? 0) > 0} onCheckedChange={(c) => field.onChange(c ? 1 : 0)} />
            </FormControl>
            <FormLabel className="!mt-0 whitespace-nowrap">Inf Allow</FormLabel>
          </FormItem>
        )} />
      </div>

      {/* Extra bed */}
      <div className="flex items-center gap-6">
        <FormField control={form.control} name="extraBedAvailable" render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
            <FormLabel className="!mt-0">Extra Bed Available</FormLabel>
          </FormItem>
        )} />
        <FormField control={form.control} name="maxExtraBeds" render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormLabel className="whitespace-nowrap">Max Extra Beds</FormLabel>
            <FormControl><Input type="number" min={0} className="w-20" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
          </FormItem>
        )} />
      </div>

      {/* Physical details */}
      <div className="grid grid-cols-3 gap-4">
        <FormField control={form.control} name="bedConfiguration" render={({ field }) => (
          <FormItem>
            <FormLabel>Bed Configuration</FormLabel>
            <FormControl><Input placeholder="e.g. 1 King / 2 Twin" {...field} value={field.value ?? ""} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="sizeM2" render={({ field }) => (
          <FormItem>
            <FormLabel>Size (m²)</FormLabel>
            <FormControl><Input type="number" min={0} placeholder="28" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
          </FormItem>
        )} />
        <div className="flex flex-col gap-3 pt-6">
          <FormField control={form.control} name="hasBalcony" render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
              <FormLabel className="!mt-0">Balcony</FormLabel>
            </FormItem>
          )} />
          <FormField control={form.control} name="hasBathtub" render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
              <FormLabel className="!mt-0">Bathtub</FormLabel>
            </FormItem>
          )} />
        </div>
      </div>

      <FormField control={form.control} name="description" render={({ field }) => (
        <FormItem>
          <FormLabel>Description</FormLabel>
          <FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl>
        </FormItem>
      )} />

      {isEdit && (
        <FormField control={form.control} name="active" render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
            <FormLabel className="!mt-0">Active</FormLabel>
          </FormItem>
        )} />
      )}
    </>
  );
}

// ─── Cabins Tab ──────────────────────────────────────────────────────────────

const VIEW_OPTIONS = [
  { value: "NILE_VIEW", label: "Nile View" },
  { value: "CITY_VIEW", label: "City View" },
  { value: "INSIDE", label: "Inside" },
  { value: "PANORAMIC", label: "Panoramic" },
] as const;

const BED_OPTIONS = [
  { value: "TWIN", label: "Twin" },
  { value: "DOUBLE", label: "Double" },
  { value: "TWIN_OR_DOUBLE", label: "Twin or Double" },
  { value: "KING", label: "King" },
  { value: "SUITE_CONFIG", label: "Suite Configuration" },
] as const;

type CabinView = "NILE_VIEW" | "CITY_VIEW" | "INSIDE" | "PANORAMIC";
type CabinBedType = "TWIN" | "DOUBLE" | "TWIN_OR_DOUBLE" | "KING" | "SUITE_CONFIG";

function CabinsTab({
  boatId,
  cabins,
  decks,
  categories,
}: {
  boatId: string;
  cabins: any[];
  decks: any[];
  categories: any[];
}) {
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // ── Add single cabin form ──
  const addForm = useForm({
    resolver: zodResolver(cruiseCabinCreateSchema),
    defaultValues: {
      boatId,
      deckId: "",
      categoryId: "",
      cabinNumber: "",
      view: "NILE_VIEW" as CabinView,
      bedType: "TWIN" as CabinBedType,
      isAccessible: false,
      isConnecting: false,
      active: true,
    },
  });

  // ── Bulk generate state ──
  const [bulk, setBulk] = useState({
    deckId: "",
    categoryId: "",
    view: "NILE_VIEW" as CabinView,
    bedType: "TWIN" as CabinBedType,
    prefix: "",
    startNumber: 101,
    count: 10,
    isAccessible: false,
  });

  const createMutation = trpc.nileCruises.cabin.create.useMutation({
    onSuccess: () => {
      toast.success("Cabin added");
      utils.nileCruises.cabin.listByBoat.invalidate({ boatId });
      setAddOpen(false);
      addForm.reset();
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkCreateMutation = trpc.nileCruises.cabin.bulkCreate.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.count} cabins generated`);
      utils.nileCruises.cabin.listByBoat.invalidate({ boatId });
      setBulkOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.nileCruises.cabin.delete.useMutation({
    onSuccess: () => utils.nileCruises.cabin.listByBoat.invalidate({ boatId }),
    onError: (err) => toast.error(err.message),
  });

  const toggleActiveMutation = trpc.nileCruises.cabin.update.useMutation({
    onSuccess: () => utils.nileCruises.cabin.listByBoat.invalidate({ boatId }),
  });

  function handleBulkGenerate() {
    if (!bulk.deckId || !bulk.categoryId) {
      toast.error("Select a deck and category");
      return;
    }
    const generated = Array.from({ length: bulk.count }, (_, i) => ({
      deckId: bulk.deckId,
      categoryId: bulk.categoryId,
      cabinNumber: `${bulk.prefix}${bulk.startNumber + i}`,
      view: bulk.view,
      bedType: bulk.bedType,
      isAccessible: bulk.isAccessible,
      isConnecting: false,
      active: true,
    }));
    bulkCreateMutation.mutate({ boatId, cabins: generated });
  }

  // Group cabins by deck
  const byDeck = decks.map((deck) => ({
    deck,
    cabins: cabins.filter((c) => c.deckId === deck.id),
  }));
  const unassigned = cabins.filter((c) => !decks.find((d) => d.id === c.deckId));

  // Bulk preview
  const preview = Array.from({ length: Math.min(bulk.count, 5) }, (_, i) =>
    `${bulk.prefix}${bulk.startNumber + i}`
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{cabins.length} cabin{cabins.length !== 1 ? "s" : ""} total</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Layers className="mr-1 h-4 w-4" /> Bulk Generate
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add Cabin
          </Button>
        </div>
      </div>

      {cabins.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No cabins yet.</p>
          <p className="text-sm mt-1">Use Bulk Generate to create multiple cabins at once, or Add Cabin for a single room.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {byDeck.map(({ deck, cabins: dc }) => dc.length === 0 ? null : (
            <div key={deck.id}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {deck.name} <span className="font-normal">({dc.length})</span>
              </h3>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {dc.map((cabin: any) => (
                  <CabinCard
                    key={cabin.id}
                    cabin={cabin}
                    onDelete={() => deleteMutation.mutate({ id: cabin.id })}
                    onToggleActive={() => toggleActiveMutation.mutate({ id: cabin.id, data: { active: !cabin.active } })}
                    deleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            </div>
          ))}
          {unassigned.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Unassigned ({unassigned.length})</h3>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {unassigned.map((cabin: any) => (
                  <CabinCard key={cabin.id} cabin={cabin} onDelete={() => deleteMutation.mutate({ id: cabin.id })} onToggleActive={() => toggleActiveMutation.mutate({ id: cabin.id, data: { active: !cabin.active } })} deleting={deleteMutation.isPending} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Add Single Cabin Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Cabin</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const vals = addForm.getValues();
              createMutation.mutate(vals as any);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Cabin Number *</label>
                <Input placeholder="101" {...addForm.register("cabinNumber")} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Deck *</label>
                <Select value={addForm.watch("deckId")} onValueChange={(v) => addForm.setValue("deckId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select deck" /></SelectTrigger>
                  <SelectContent>
                    {decks.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium">Category *</label>
                <Select value={addForm.watch("categoryId")} onValueChange={(v) => addForm.setValue("categoryId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">View *</label>
                <Select value={addForm.watch("view")} onValueChange={(v) => addForm.setValue("view", v as CabinView)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VIEW_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Bed Type *</label>
                <Select value={addForm.watch("bedType")} onValueChange={(v) => addForm.setValue("bedType", v as CabinBedType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BED_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={!!addForm.watch("isAccessible")} onCheckedChange={(v) => addForm.setValue("isAccessible", !!v)} />
                Wheelchair Accessible
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={!!addForm.watch("isConnecting")} onCheckedChange={(v) => addForm.setValue("isConnecting", !!v)} />
                Connecting Room
              </label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Cabin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Generate Dialog ── */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Generate Cabins</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Deck *</label>
                <Select value={bulk.deckId} onValueChange={(v) => setBulk((p) => ({ ...p, deckId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select deck" /></SelectTrigger>
                  <SelectContent>
                    {decks.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Category *</label>
                <Select value={bulk.categoryId} onValueChange={(v) => setBulk((p) => ({ ...p, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">View</label>
                <Select value={bulk.view} onValueChange={(v) => setBulk((p) => ({ ...p, view: v as CabinView }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VIEW_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Bed Type</label>
                <Select value={bulk.bedType} onValueChange={(v) => setBulk((p) => ({ ...p, bedType: v as CabinBedType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BED_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Prefix</label>
                <Input placeholder="e.g. A- or 1" value={bulk.prefix} onChange={(e) => setBulk((p) => ({ ...p, prefix: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Start Number</label>
                <Input type="number" min={1} value={bulk.startNumber} onChange={(e) => setBulk((p) => ({ ...p, startNumber: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Count</label>
                <Input type="number" min={1} max={100} value={bulk.count} onChange={(e) => setBulk((p) => ({ ...p, count: Number(e.target.value) }))} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={bulk.isAccessible} onCheckedChange={(v) => setBulk((p) => ({ ...p, isAccessible: !!v }))} />
              All cabins wheelchair accessible
            </label>

            {bulk.count > 0 && bulk.startNumber > 0 && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Preview: </span>
                {preview.join(", ")}{bulk.count > 5 ? ` … ${bulk.prefix}${bulk.startNumber + bulk.count - 1}` : ""}
                <span className="ml-2">({bulk.count} cabins)</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleBulkGenerate} disabled={bulkCreateMutation.isPending || !bulk.deckId || !bulk.categoryId}>
              {bulkCreateMutation.isPending ? "Generating..." : `Generate ${bulk.count} Cabins`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CabinCard({ cabin, onDelete, onToggleActive, deleting }: { cabin: any; onDelete: () => void; onToggleActive: () => void; deleting: boolean }) {
  const viewLabel: Record<string, string> = { NILE_VIEW: "Nile", CITY_VIEW: "City", INSIDE: "Inside", PANORAMIC: "Panoramic" };
  const bedLabel: Record<string, string> = { TWIN: "Twin", DOUBLE: "Double", TWIN_OR_DOUBLE: "Tw/Db", KING: "King", SUITE_CONFIG: "Suite" };
  return (
    <div className={`rounded border px-3 py-2 text-sm ${cabin.active ? "" : "opacity-50"}`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold">{cabin.cabinNumber}</span>
        <div className="flex items-center gap-1">
          <button onClick={onToggleActive} className="text-xs text-muted-foreground hover:text-foreground" title={cabin.active ? "Mark Out of Order" : "Mark Active"}>
            {cabin.active ? "✓" : "✗"}
          </button>
          <button onClick={onDelete} disabled={deleting} className="text-muted-foreground hover:text-destructive ml-1" title="Delete">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        {cabin.category?.code} · {viewLabel[cabin.view] ?? cabin.view} · {bedLabel[cabin.bedType] ?? cabin.bedType}
        {cabin.isAccessible ? " · ♿" : ""}
        {cabin.isConnecting ? " · ⇄" : ""}
      </p>
    </div>
  );
}
