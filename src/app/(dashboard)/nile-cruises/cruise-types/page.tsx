"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CRUISE_TYPE_CODE_LABELS, CRUISE_PORT_LABELS } from "@/lib/constants/nile-cruises";
import { cruiseTypeCreateSchema } from "@/lib/validations/nile-cruises";
import { trpc } from "@/lib/trpc";
import type { z } from "zod";

type FormValues = z.input<typeof cruiseTypeCreateSchema>;

const PORT_OPTIONS = [
  "LUXOR","ASWAN","ESNA","EDFU","KOM_OMBO","ABU_SIMBEL","CAIRO",
  "EL_MINYA","ASYUT","SOHAG","QENA","DENDERA","ABYDOS",
  "WADI_EL_SEBOUA","AMADA","KASR_IBRIM","OTHER",
] as const;

const CODE_OPTIONS = [
  "NILE_3N_LUX_ASW","NILE_4N_ASW_LUX","NILE_7N_ROUNDTRIP",
  "LONG_NILE_CAIRO_ASW","LAKE_NASSER","DAHABIYA_CUSTOM","OTHER",
] as const;

export default function CruiseTypesPage() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = trpc.nileCruises.cruiseType.list.useQuery();

  const create = trpc.nileCruises.cruiseType.create.useMutation({
    onSuccess: () => { toast.success("Cruise type created"); utils.nileCruises.cruiseType.list.invalidate(); setOpen(false); },
    onError: (err) => toast.error(err.message),
  });

  const update = trpc.nileCruises.cruiseType.update.useMutation({
    onSuccess: () => { toast.success("Updated"); utils.nileCruises.cruiseType.list.invalidate(); setOpen(false); setEditId(null); },
    onError: (err) => toast.error(err.message),
  });

  const del = trpc.nileCruises.cruiseType.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); utils.nileCruises.cruiseType.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(cruiseTypeCreateSchema),
    defaultValues: {
      name: "",
      code: "OTHER",
      durationNights: 4,
      itineraryMode: "FIXED",
      embarkPort: "LUXOR",
      disembarkPort: "ASWAN",
    },
  });

  const openNew = () => {
    setEditId(null);
    form.reset({
      name: "",
      code: "OTHER",
      durationNights: 4,
      itineraryMode: "FIXED",
      embarkPort: "LUXOR",
      disembarkPort: "ASWAN",
    });
    setOpen(true);
  };

  const openEdit = (ct: NonNullable<typeof data>[number]) => {
    setEditId(ct.id);
    form.reset({
      name: ct.name,
      code: ct.code,
      durationNights: ct.durationNights,
      itineraryMode: ct.itineraryMode,
      embarkPort: ct.embarkPort,
      disembarkPort: ct.disembarkPort,
      description: ct.description ?? undefined,
    });
    setOpen(true);
  };

  const onSubmit = (v: FormValues) => {
    if (editId) update.mutate({ id: editId, data: v });
    else create.mutate(v);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cruise Types</h1>
          <p className="text-sm text-muted-foreground">Define your cruise itinerary types (Luxor-Aswan, Aswan-Luxor, etc.)</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New Type</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <p className="text-muted-foreground">No cruise types yet</p>
            <Button onClick={openNew}>Add First Type</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((ct) => (
            <Card key={ct.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{ct.name}</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono">{ct.code}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ct)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del.mutate({ id: ct.id })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="outline">{ct.durationNights} nights</Badge>
                  <Badge variant="secondary">{ct.itineraryMode}</Badge>
                </div>
                {ct.description && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{ct.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Cruise Type" : "New Cruise Type"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Name *</FormLabel><FormControl><Input placeholder="Luxor to Aswan" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CODE_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>{CRUISE_TYPE_CODE_LABELS[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="durationNights" render={({ field }) => (
                  <FormItem><FormLabel>Duration (nights) *</FormLabel><FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="itineraryMode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed</SelectItem>
                        <SelectItem value="VARIABLE">Variable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="embarkPort" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Embark Port *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {PORT_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p}>{CRUISE_PORT_LABELS[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="disembarkPort" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disembark Port *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {PORT_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p}>{CRUISE_PORT_LABELS[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {editId ? "Save Changes" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
