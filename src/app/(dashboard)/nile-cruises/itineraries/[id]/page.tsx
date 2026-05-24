"use client";

import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cruiseItineraryCreateSchema } from "@/lib/validations/nile-cruises";
import { trpc } from "@/lib/trpc";
import type { z } from "zod";

type FormValues = z.input<typeof cruiseItineraryCreateSchema>;

const PORT_OPTIONS = [
  "LUXOR","ASWAN","ESNA","EDFU","KOM_OMBO","ABU_SIMBEL","CAIRO",
  "EL_MINYA","ASYUT","SOHAG","QENA","DENDERA","ABYDOS",
  "WADI_EL_SEBOUA","AMADA","KASR_IBRIM","OTHER",
] as const;

const PORT_LABELS: Record<string, string> = {
  LUXOR: "Luxor", ASWAN: "Aswan", ESNA: "Esna", EDFU: "Edfu",
  KOM_OMBO: "Kom Ombo", ABU_SIMBEL: "Abu Simbel", CAIRO: "Cairo",
  EL_MINYA: "El Minya", ASYUT: "Asyut", SOHAG: "Sohag", QENA: "Qena",
  DENDERA: "Dendera", ABYDOS: "Abydos", WADI_EL_SEBOUA: "Wadi El Seboua",
  AMADA: "Amada", KASR_IBRIM: "Kasr Ibrim", OTHER: "Other",
};

export default function ItineraryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.nileCruises.itinerary.getById.useQuery({ id });
  const { data: days } = trpc.nileCruises.itinerary.listDays.useQuery({ itineraryId: id });

  const update = trpc.nileCruises.itinerary.update.useMutation({
    onSuccess: () => { toast.success("Saved"); utils.nileCruises.itinerary.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(cruiseItineraryCreateSchema),
    defaultValues: { name: "", mode: "FIXED", cruiseTypeId: "", description: "" },
  });

  useEffect(() => {
    if (data) form.reset({
      name: data.name,
      mode: data.mode,
      cruiseTypeId: data.cruiseTypeId,
      boatId: data.boatId ?? undefined,
      description: data.description ?? undefined,
    });
  }, [data, form]);

  const [newDay, setNewDay] = useState({ dayNumber: 1, portOfCall: "LUXOR" as string, title: "" });

  const saveDays = trpc.nileCruises.itinerary.saveDays.useMutation({
    onSuccess: () => { toast.success("Day added"); utils.nileCruises.itinerary.listDays.invalidate({ itineraryId: id }); },
    onError: (err) => toast.error(err.message),
  });

  const addDay = () => {
    if (!newDay.title.trim() || !newDay.portOfCall) return;
    const current = (days ?? []).map((d) => ({
      dayNumber: d.dayNumber,
      portOfCall: d.portOfCall,
      title: d.title,
      description: d.description ?? undefined,
      arrivalTime: d.arrivalTime ?? undefined,
      departureTime: d.departureTime ?? undefined,
    }));
    saveDays.mutate({
      itineraryId: id,
      days: [...current, { dayNumber: newDay.dayNumber, portOfCall: newDay.portOfCall as never, title: newDay.title }],
    });
    setNewDay((p) => ({ ...p, dayNumber: p.dayNumber + 1, title: "" }));
  };

  const removeDay = (dayNumber: number) => {
    const current = (days ?? [])
      .filter((d) => d.dayNumber !== dayNumber)
      .map((d) => ({
        dayNumber: d.dayNumber,
        portOfCall: d.portOfCall,
        title: d.title,
        description: d.description ?? undefined,
        arrivalTime: d.arrivalTime ?? undefined,
        departureTime: d.departureTime ?? undefined,
      }));
    saveDays.mutate({ itineraryId: id, days: current });
  };

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data) return <div className="p-6 text-muted-foreground">Itinerary not found</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{data.name}</h1>
        <p className="text-sm text-muted-foreground">{data.mode} · {data.cruiseType.name}</p>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="days">Day Program ({days?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => update.mutate({ id, data: v }))} className="space-y-4">
              <Card>
                <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="mode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mode</FormLabel>
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
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="days">
          <Card>
            <CardHeader><CardTitle className="text-base">Day-by-Day Program</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!days?.length ? (
                <p className="text-sm text-muted-foreground">No days defined yet</p>
              ) : (
                <div className="divide-y">
                  {days.sort((a, b) => a.dayNumber - b.dayNumber).map((day) => (
                    <div key={day.id} className="flex items-start justify-between py-2">
                      <div className="flex gap-3">
                        <span className="text-sm font-bold text-muted-foreground w-12">Day {day.dayNumber}</span>
                        <div>
                          <p className="text-sm font-medium">{PORT_LABELS[day.portOfCall] ?? day.portOfCall} — {day.title}</p>
                          {day.description && <p className="text-xs text-muted-foreground">{day.description}</p>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeDay(day.dayNumber)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-3 grid gap-2 sm:grid-cols-4">
                <Input
                  type="number" min={1}
                  value={newDay.dayNumber}
                  onChange={(e) => setNewDay((p) => ({ ...p, dayNumber: Number(e.target.value) }))}
                  placeholder="Day #"
                  className="sm:col-span-1"
                />
                <Select value={newDay.portOfCall} onValueChange={(v) => setNewDay((p) => ({ ...p, portOfCall: v }))}>
                  <SelectTrigger className="sm:col-span-1"><SelectValue placeholder="Port" /></SelectTrigger>
                  <SelectContent>
                    {PORT_OPTIONS.map((p) => <SelectItem key={p} value={p}>{PORT_LABELS[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  value={newDay.title}
                  onChange={(e) => setNewDay((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Day title"
                  className="sm:col-span-1"
                />
                <Button type="button" onClick={addDay} disabled={!newDay.title.trim() || saveDays.isPending}>
                  <Plus className="mr-1 h-4 w-4" /> Add Day
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
