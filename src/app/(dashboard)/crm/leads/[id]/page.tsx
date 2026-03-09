"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
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
  CRM_LEAD_SOURCE_LABELS,
  CRM_LEAD_STATUS_LABELS,
  CRM_LEAD_STATUS_VARIANTS,
} from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";
import { activityCreateSchema, leadUpdateSchema } from "@/lib/validations/crm";

type LeadFormValues = z.input<typeof leadUpdateSchema>;
type ActivityFormValues = z.input<typeof activityCreateSchema>;

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: lead, isLoading } = trpc.crm.lead.getById.useQuery({ id });
  const { data: users } = trpc.user.list.useQuery();

  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadUpdateSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (lead) {
      form.reset({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        source: lead.source,
        status: lead.status,
        assignedToId: lead.assignedToId ?? "",
        notes: lead.notes ?? "",
      });
    }
  }, [lead, form]);

  const updateMutation = trpc.crm.lead.update.useMutation({
    onSuccess: () => {
      utils.crm.lead.getById.invalidate({ id });
      utils.crm.lead.list.invalidate();
    },
  });

  const deleteMutation = trpc.crm.lead.delete.useMutation({
    onSuccess: () => {
      utils.crm.lead.list.invalidate();
      router.push("/crm/leads");
    },
  });

  const convertMutation = trpc.crm.opportunity.create.useMutation({
    onSuccess: () => {
      updateMutation.mutate({ id, data: { status: "WON" } });
      router.push(`/crm/pipeline`);
    },
  });

  const convertToCustomerMutation = trpc.crm.lead.convertToCustomer.useMutation({
    onSuccess: (customer) => {
      utils.crm.lead.getById.invalidate({ id });
      utils.crm.lead.list.invalidate();
      router.push(`/crm/contacts/${customer.id}`);
    },
  });

  // Activity form
  const activityForm = useForm<ActivityFormValues>({
    resolver: zodResolver(activityCreateSchema),
    defaultValues: {
      type: "NOTE",
      subject: "",
      description: "",
      leadId: id,
    },
  });

  const createActivityMutation = trpc.crm.activity.create.useMutation({
    onSuccess: () => {
      utils.crm.lead.getById.invalidate({ id });
      setActivityDialogOpen(false);
      activityForm.reset({ type: "NOTE", subject: "", description: "", dueDate: "", leadId: id });
    },
  });

  const deleteActivityMutation = trpc.crm.activity.delete.useMutation({
    onSuccess: () => utils.crm.lead.getById.invalidate({ id }),
  });

  const updateActivityMutation = trpc.crm.activity.update.useMutation({
    onSuccess: () => {
      utils.crm.lead.getById.invalidate({ id });
      setEditingActivityId(null);
    },
  });

  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editActSubject, setEditActSubject] = useState("");
  const [editActDescription, setEditActDescription] = useState("");
  const [editActDueDate, setEditActDueDate] = useState("");

  function onSubmit(values: LeadFormValues) {
    updateMutation.mutate({ id, data: values });
  }

  function handleConvert() {
    if (!lead) return;
    convertMutation.mutate({
      title: `${lead.firstName} ${lead.lastName} — Opportunity`,
      stage: "PROSPECTING",
      leadId: lead.id,
      ownerId: lead.assignedToId ?? "",
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!lead) return <p>Lead not found</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {lead.firstName} {lead.lastName}
            </h1>
            <Badge variant={CRM_LEAD_STATUS_VARIANTS[lead.status] as "default"}>
              {CRM_LEAD_STATUS_LABELS[lead.status]}
            </Badge>
          </div>
          <p className="font-mono text-sm text-muted-foreground">{lead.code}</p>
        </div>
        <div className="flex gap-2">
          {lead.status !== "WON" && lead.status !== "LOST" && (
            <>
              <Button variant="outline" onClick={handleConvert} disabled={convertMutation.isPending}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Convert to Opportunity
              </Button>
              <Button
                variant="outline"
                onClick={() => convertToCustomerMutation.mutate({ id })}
                disabled={convertToCustomerMutation.isPending}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Convert to Customer
              </Button>
            </>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Delete this lead?")) deleteMutation.mutate({ id });
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="activities">
            Activities ({lead.activities?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(CRM_LEAD_SOURCE_LABELS).map(([val, label]) => (
                                <SelectItem key={val} value={val}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(CRM_LEAD_STATUS_LABELS).map(([val, label]) => (
                                <SelectItem key={val} value={val}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="assignedToId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(users ?? []).map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name ?? u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl><Textarea {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {updateMutation.error && (
                    <p className="text-sm text-destructive">{updateMutation.error.message}</p>
                  )}

                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Activity
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Activity</DialogTitle>
                  </DialogHeader>
                  <Form {...activityForm}>
                    <form
                      onSubmit={activityForm.handleSubmit((v) => createActivityMutation.mutate(v))}
                      className="space-y-4"
                    >
                      <FormField
                        control={activityForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(CRM_ACTIVITY_TYPE_LABELS).map(([val, label]) => (
                                  <SelectItem key={val} value={val}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={activityForm.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={activityForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={activityForm.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createActivityMutation.isPending}>
                        {createActivityMutation.isPending ? "Adding..." : "Add Activity"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {(lead.activities?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No activities yet</p>
            ) : (
              <div className="space-y-2">
                {lead.activities.map((act) => (
                  <Card key={act.id} className={act.completedAt ? "opacity-60" : ""}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          <Badge variant="outline" className="mr-2">
                            {CRM_ACTIVITY_TYPE_LABELS[act.type]}
                          </Badge>
                          {editingActivityId === act.id ? (
                            <Input
                              className="inline h-7 w-48 text-sm"
                              value={editActSubject}
                              onChange={(e) => setEditActSubject(e.target.value)}
                            />
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
                          {act.completedAt && (
                            <Badge variant="default" className="text-xs">Completed</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(act.createdAt).toLocaleDateString()}
                          </span>
                          {editingActivityId === act.id ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => updateActivityMutation.mutate({
                                  id: act.id,
                                  data: { subject: editActSubject, description: editActDescription, dueDate: editActDueDate },
                                })}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingActivityId(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {!act.completedAt && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-green-600"
                                  title="Mark complete"
                                  onClick={() => updateActivityMutation.mutate({
                                    id: act.id,
                                    data: { completedAt: new Date().toISOString() },
                                  })}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => {
                                  setEditingActivityId(act.id);
                                  setEditActSubject(act.subject);
                                  setEditActDescription(act.description ?? "");
                                  setEditActDueDate(act.dueDate ? new Date(act.dueDate).toISOString().split("T")[0] : "");
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-destructive"
                                onClick={() => deleteActivityMutation.mutate({ id: act.id })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {editingActivityId === act.id ? (
                      <CardContent className="pt-0 pb-3 space-y-2">
                        <Textarea
                          value={editActDescription}
                          onChange={(e) => setEditActDescription(e.target.value)}
                          placeholder="Description"
                          rows={2}
                        />
                        <Input
                          type="date"
                          value={editActDueDate}
                          onChange={(e) => setEditActDueDate(e.target.value)}
                          className="w-48"
                        />
                      </CardContent>
                    ) : act.description ? (
                      <CardContent className="pt-0 pb-3">
                        <p className="text-sm text-muted-foreground">{act.description}</p>
                      </CardContent>
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
