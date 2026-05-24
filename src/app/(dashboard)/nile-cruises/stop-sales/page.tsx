"use client";

import { format } from "date-fns";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cruiseStopSaleCreateSchema } from "@/lib/validations/nile-cruises";
import { trpc } from "@/lib/trpc";
import type { z } from "zod";

type FormValues = z.input<typeof cruiseStopSaleCreateSchema>;

export default function StopSalesPage() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = trpc.nileCruises.stopSale.list.useQuery();
  const { data: boats } = trpc.nileCruises.boat.list.useQuery();

  const create = trpc.nileCruises.stopSale.create.useMutation({
    onSuccess: () => { toast.success("Stop sale created"); utils.nileCruises.stopSale.list.invalidate(); setOpen(false); },
    onError: (err) => toast.error(err.message),
  });

  const deactivate = trpc.nileCruises.stopSale.deactivate.useMutation({
    onSuccess: () => { toast.success("Stop sale removed"); utils.nileCruises.stopSale.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(cruiseStopSaleCreateSchema),
    defaultValues: { fromDate: "", toDate: "", scope: "ALL", reason: "" },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stop Sales</h1>
          <p className="text-sm text-muted-foreground">Block availability for specific date ranges</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Stop Sale</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <p className="text-muted-foreground">No active stop sales</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((ss) => (
            <Card key={ss.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(ss.fromDate), "dd MMM yyyy")} – {format(new Date(ss.toDate), "dd MMM yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ss.boat?.name ?? "All boats"} · {ss.scope} · {ss.reason}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={ss.active ? "destructive" : "secondary"}>
                    {ss.active ? "Active" : "Inactive"}
                  </Badge>
                  {ss.active && (
                    <Button variant="outline" size="sm" onClick={() => deactivate.mutate({ id: ss.id })}>
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Stop Sale</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="scope" render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="CABIN_CATEGORY">Cabin Category</SelectItem>
                      <SelectItem value="DEPARTURE">Departure</SelectItem>
                      <SelectItem value="MARKET">Market</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="boatId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Boat (optional)</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="All boats" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {boats?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="fromDate" render={({ field }) => (
                  <FormItem><FormLabel>From *</FormLabel><FormControl><Input type="date" {...field} value={field.value as string} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="toDate" render={({ field }) => (
                  <FormItem><FormLabel>To *</FormLabel><FormControl><Input type="date" {...field} value={field.value as string} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem><FormLabel>Reason *</FormLabel><FormControl><Input placeholder="e.g. Maintenance period" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>Create Stop Sale</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
