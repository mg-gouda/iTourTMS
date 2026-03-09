"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  CRM_ACTIVITY_TYPE_LABELS,
  CRM_BOOKING_STATUS_LABELS,
  CRM_BOOKING_STATUS_VARIANTS,
  CRM_OPPORTUNITY_STAGE_LABELS,
  CRM_OPPORTUNITY_STAGE_VARIANTS,
} from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";
import { activityCreateSchema, opportunityUpdateSchema } from "@/lib/validations/crm";

type OppFormValues = z.input<typeof opportunityUpdateSchema>;
type ActivityFormValues = z.input<typeof activityCreateSchema>;

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: opp, isLoading } = trpc.crm.opportunity.getById.useQuery({ id });
  const { data: users } = trpc.user.list.useQuery();

  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  const form = useForm<OppFormValues>({
    resolver: zodResolver(opportunityUpdateSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (opp) {
      form.reset({
        title: opp.title,
        stage: opp.stage,
        value: opp.value ? Number(opp.value) : undefined,
        probability: opp.probability ?? undefined,
        expectedCloseDate: opp.expectedCloseDate
          ? new Date(opp.expectedCloseDate).toISOString().split("T")[0]
          : "",
        ownerId: opp.ownerId ?? "",
        notes: opp.notes ?? "",
      });
    }
  }, [opp, form]);

  const updateMutation = trpc.crm.opportunity.update.useMutation({
    onSuccess: () => {
      utils.crm.opportunity.getById.invalidate({ id });
      utils.crm.opportunity.list.invalidate();
    },
  });

  const deleteMutation = trpc.crm.opportunity.delete.useMutation({
    onSuccess: () => {
      utils.crm.opportunity.list.invalidate();
      router.push("/crm/pipeline");
    },
  });

  const activityForm = useForm<ActivityFormValues>({
    resolver: zodResolver(activityCreateSchema),
    defaultValues: { type: "NOTE", subject: "", description: "", opportunityId: id },
  });

  const createActivityMutation = trpc.crm.activity.create.useMutation({
    onSuccess: () => {
      utils.crm.opportunity.getById.invalidate({ id });
      setActivityDialogOpen(false);
      activityForm.reset({ type: "NOTE", subject: "", description: "", dueDate: "", opportunityId: id });
    },
  });

  const deleteActivityMutation = trpc.crm.activity.delete.useMutation({
    onSuccess: () => utils.crm.opportunity.getById.invalidate({ id }),
  });

  const updateActivityMutation = trpc.crm.activity.update.useMutation({
    onSuccess: () => {
      utils.crm.opportunity.getById.invalidate({ id });
      setEditingActivityId(null);
    },
  });

  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editActSubject, setEditActSubject] = useState("");
  const [editActDescription, setEditActDescription] = useState("");
  const [editActDueDate, setEditActDueDate] = useState("");

  function onSubmit(values: OppFormValues) {
    updateMutation.mutate({ id, data: values });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!opp) return <p>Opportunity not found</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{opp.title}</h1>
            <Badge variant={CRM_OPPORTUNITY_STAGE_VARIANTS[opp.stage] as "default"}>
              {CRM_OPPORTUNITY_STAGE_LABELS[opp.stage]}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {opp.value && <span>${Number(opp.value).toLocaleString()}</span>}
            {opp.probability != null && <span>{opp.probability}% probability</span>}
            {opp.lead && <span>Lead: {opp.lead.code}</span>}
            {opp.customer && <span>Customer: {opp.customer.firstName} {opp.customer.lastName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/crm/bookings/new?opportunityId=${id}${opp.customerId ? `&customerId=${opp.customerId}` : ""}`}>
              <CalendarCheck className="mr-1 h-4 w-4" /> Create Booking
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Delete this opportunity?")) deleteMutation.mutate({ id });
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="bookings">Bookings ({opp.bookings?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="activities">Activities ({opp.activities?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="stage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stage</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.entries(CRM_OPPORTUNITY_STAGE_LABELS).map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="probability" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Probability (%)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={100} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="value" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="0.01" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="expectedCloseDate" render={({ field }) => (
                      <FormItem><FormLabel>Expected Close</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="ownerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select owner" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(users ?? []).map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
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

        <TabsContent value="bookings" className="mt-4">
          {(opp.bookings?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings linked to this opportunity yet</p>
          ) : (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left text-xs font-medium">Code</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium">Travel Date</th>
                    <th className="px-3 py-1.5 text-center text-xs font-medium">Items</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium">Total</th>
                    <th className="px-3 py-1.5 text-center text-xs font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {opp.bookings.map((bk) => (
                    <tr key={bk.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-1.5">
                        <Link href={`/crm/bookings/${bk.id}`} className="font-mono text-xs text-primary hover:underline">
                          {bk.code}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5">{new Date(bk.travelDate).toLocaleDateString()}</td>
                      <td className="px-3 py-1.5 text-center">{bk._count.items}</td>
                      <td className="px-3 py-1.5 text-right font-mono">${Number(bk.totalSelling ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-center">
                        <Badge variant={CRM_BOOKING_STATUS_VARIANTS[bk.status] as "default"}>
                          {CRM_BOOKING_STATUS_LABELS[bk.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Activity</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Activity</DialogTitle></DialogHeader>
                  <Form {...activityForm}>
                    <form onSubmit={activityForm.handleSubmit((v) => createActivityMutation.mutate(v))} className="space-y-4">
                      <FormField control={activityForm.control} name="type" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {Object.entries(CRM_ACTIVITY_TYPE_LABELS).map(([v, l]) => (
                                <SelectItem key={v} value={v}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={activityForm.control} name="subject" render={({ field }) => (
                        <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={activityForm.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={activityForm.control} name="dueDate" render={({ field }) => (
                        <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                      )} />
                      <Button type="submit" disabled={createActivityMutation.isPending}>
                        {createActivityMutation.isPending ? "Adding..." : "Add Activity"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {(opp.activities?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No activities yet</p>
            ) : (
              <div className="space-y-2">
                {opp.activities.map((act) => (
                  <Card key={act.id} className={act.completedAt ? "opacity-60" : ""}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          <Badge variant="outline" className="mr-2">{CRM_ACTIVITY_TYPE_LABELS[act.type]}</Badge>
                          {editingActivityId === act.id ? (
                            <Input className="inline h-7 w-48 text-sm" value={editActSubject} onChange={(e) => setEditActSubject(e.target.value)} />
                          ) : (
                            <span className={act.completedAt ? "line-through" : ""}>{act.subject}</span>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {act.dueDate && !act.completedAt && (
                            <Badge variant={new Date(act.dueDate) < new Date() ? "destructive" : "secondary"} className="text-xs">
                              Due {new Date(act.dueDate).toLocaleDateString()}
                            </Badge>
                          )}
                          {act.completedAt && <Badge variant="default" className="text-xs">Completed</Badge>}
                          <span className="text-xs text-muted-foreground">{new Date(act.createdAt).toLocaleDateString()}</span>
                          {editingActivityId === act.id ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateActivityMutation.mutate({ id: act.id, data: { subject: editActSubject, description: editActDescription, dueDate: editActDueDate } })}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingActivityId(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {!act.completedAt && (
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" title="Mark complete" onClick={() => updateActivityMutation.mutate({ id: act.id, data: { completedAt: new Date().toISOString() } })}>
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingActivityId(act.id); setEditActSubject(act.subject); setEditActDescription(act.description ?? ""); setEditActDueDate(act.dueDate ? new Date(act.dueDate).toISOString().split("T")[0] : ""); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteActivityMutation.mutate({ id: act.id })}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {editingActivityId === act.id ? (
                      <CardContent className="pt-0 pb-3 space-y-2">
                        <Textarea value={editActDescription} onChange={(e) => setEditActDescription(e.target.value)} placeholder="Description" rows={2} />
                        <Input type="date" value={editActDueDate} onChange={(e) => setEditActDueDate(e.target.value)} className="w-48" />
                      </CardContent>
                    ) : act.description ? (
                      <CardContent className="pt-0 pb-3"><p className="text-sm text-muted-foreground">{act.description}</p></CardContent>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
