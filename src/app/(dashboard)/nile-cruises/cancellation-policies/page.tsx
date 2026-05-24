"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cruiseCancellationPolicyCreateSchema } from "@/lib/validations/nile-cruises";
import { trpc } from "@/lib/trpc";
import type { z } from "zod";

type FormValues = z.input<typeof cruiseCancellationPolicyCreateSchema>;

export default function CancellationPoliciesPage() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = trpc.nileCruises.cancellationPolicy.list.useQuery();

  const create = trpc.nileCruises.cancellationPolicy.create.useMutation({
    onSuccess: () => { toast.success("Policy created"); utils.nileCruises.cancellationPolicy.list.invalidate(); setOpen(false); },
    onError: (err) => toast.error(err.message),
  });

  const update = trpc.nileCruises.cancellationPolicy.update.useMutation({
    onSuccess: () => { toast.success("Updated"); utils.nileCruises.cancellationPolicy.list.invalidate(); setOpen(false); setEditId(null); },
    onError: (err) => toast.error(err.message),
  });

  const del = trpc.nileCruises.cancellationPolicy.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); utils.nileCruises.cancellationPolicy.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(cruiseCancellationPolicyCreateSchema),
    defaultValues: { name: "" },
  });

  const openNew = () => {
    setEditId(null);
    form.reset({ name: "" });
    setOpen(true);
  };

  const openEdit = (pol: NonNullable<typeof data>[number]) => {
    setEditId(pol.id);
    form.reset({ name: pol.name, description: pol.description ?? undefined });
    setOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cancellation Policies</h1>
          <p className="text-sm text-muted-foreground">Define cancellation fee schedules for contracts</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New Policy</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <p className="text-muted-foreground">No cancellation policies</p>
            <Button onClick={openNew}>Create First Policy</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((pol) => (
            <Card key={pol.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <CardTitle className="text-base">{pol.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(pol)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del.mutate({ id: pol.id })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {pol.description && <p className="text-xs text-muted-foreground">{pol.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">{pol._count.tiers} tiers defined</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Policy" : "New Cancellation Policy"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => editId ? update.mutate({ id: editId, data: v }) : create.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name *</FormLabel><FormControl><Input placeholder="Standard Policy" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {editId ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
