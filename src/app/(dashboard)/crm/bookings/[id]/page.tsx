"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Download, FileSpreadsheet, Pencil, Plus, Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
} from "@/lib/constants/crm";
import { exportBookingToExcel } from "@/lib/export/booking-excel";
import { generateBookingVoucher } from "@/lib/export/booking-voucher-pdf";
import { trpc } from "@/lib/trpc";
import { activityCreateSchema } from "@/lib/validations/crm";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

type ActivityFormValues = z.input<typeof activityCreateSchema>;

interface EditItem {
  excursionId: string;
  excursionCode: string;
  excursionName: string;
  costSheetId: string;
  label: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
}

export default function BookingDetailPage() {
  const t = useTranslations("crm");
  const tc = useTranslations("common");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: booking, isLoading } = trpc.crm.booking.getById.useQuery({ id });

  const updateMutation = trpc.crm.booking.update.useMutation({
    onSuccess: () => {
      utils.crm.booking.getById.invalidate({ id });
      utils.crm.booking.list.invalidate();
    },
  });

  const updateWithItemsMutation = trpc.crm.booking.updateWithItems.useMutation({
    onSuccess: () => {
      utils.crm.booking.getById.invalidate({ id });
      utils.crm.booking.list.invalidate();
      setEditing(false);
    },
  });

  const cloneMutation = trpc.crm.booking.clone.useMutation({
    onSuccess: (clone) => {
      utils.crm.booking.list.invalidate();
      router.push(`/crm/bookings/${clone.id}`);
    },
  });

  const deleteMutation = trpc.crm.booking.delete.useMutation({
    onSuccess: () => {
      utils.crm.booking.list.invalidate();
      router.push("/crm/bookings");
    },
  });

  const transitionMutation = trpc.crm.booking.transition.useMutation({
    onSuccess: () => {
      toast.success(t("bookingStatus"));
      utils.crm.booking.getById.invalidate({ id });
      utils.crm.booking.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editTravelDate, setEditTravelDate] = useState("");
  const [editPaxAdults, setEditPaxAdults] = useState(1);
  const [editPaxChildren, setEditPaxChildren] = useState(0);
  const [editPaxInfants, setEditPaxInfants] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState<EditItem[]>([]);

  const enterEditMode = useCallback(() => {
    if (!booking) return;
    setEditTravelDate(new Date(booking.travelDate).toISOString().split("T")[0]);
    setEditPaxAdults(booking.paxAdults);
    setEditPaxChildren(booking.paxChildren);
    setEditPaxInfants(booking.paxInfants);
    setEditNotes(booking.notes ?? "");
    setEditItems(
      booking.items.map((item) => ({
        excursionId: item.excursion.id,
        excursionCode: item.excursion.code,
        excursionName: item.excursion.name,
        costSheetId: (item as Record<string, unknown>).costSheetId as string ?? "",
        label: item.label,
        quantity: item.quantity,
        unitCost: Number(item.unitCost),
        unitPrice: Number(item.unitPrice),
        totalCost: Number(item.totalCost),
        totalPrice: Number(item.totalPrice),
      })),
    );
    setEditing(true);
  }, [booking]);

  const updateEditItem = (index: number, field: keyof EditItem, value: string | number) => {
    setEditItems((prev) => {
      const items = [...prev];
      const item = { ...items[index] };
      (item as Record<string, unknown>)[field] = value;

      // Recalculate totals
      if (field === "quantity" || field === "unitCost" || field === "unitPrice") {
        item.totalCost = item.quantity * item.unitCost;
        item.totalPrice = item.quantity * item.unitPrice;
      }

      items[index] = item;
      return items;
    });
  };

  const removeEditItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addBlankItem = () => {
    setEditItems((prev) => [
      ...prev,
      {
        excursionId: "",
        excursionCode: "",
        excursionName: "",
        costSheetId: "",
        label: "",
        quantity: 1,
        unitCost: 0,
        unitPrice: 0,
        totalCost: 0,
        totalPrice: 0,
      },
    ]);
  };

  const saveEdit = () => {
    if (editItems.length === 0) return;
    updateWithItemsMutation.mutate({
      id,
      data: {
        travelDate: editTravelDate,
        paxAdults: editPaxAdults,
        paxChildren: editPaxChildren,
        paxInfants: editPaxInfants,
        notes: editNotes,
      },
      items: editItems.map((item) => ({
        excursionId: item.excursionId,
        costSheetId: item.costSheetId || "",
        label: item.label,
        quantity: item.quantity,
        unitCost: item.unitCost,
        unitPrice: item.unitPrice,
        totalCost: item.totalCost,
        totalPrice: item.totalPrice,
      })),
    });
  };

  // Activities
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const activityForm = useForm<ActivityFormValues>({
    resolver: zodResolver(activityCreateSchema),
    defaultValues: { type: "NOTE", subject: "", description: "", bookingId: id },
  });
  const createActivity = trpc.crm.activity.create.useMutation({
    onSuccess: () => {
      utils.crm.booking.getById.invalidate({ id });
      setActivityDialogOpen(false);
      activityForm.reset({ type: "NOTE", subject: "", description: "", dueDate: "", bookingId: id });
    },
  });

  const deleteActivityMutation = trpc.crm.activity.delete.useMutation({
    onSuccess: () => utils.crm.booking.getById.invalidate({ id }),
  });

  const updateActivityMutation = trpc.crm.activity.update.useMutation({
    onSuccess: () => {
      utils.crm.booking.getById.invalidate({ id });
      setEditingActivityId(null);
    },
  });

  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editActSubject, setEditActSubject] = useState("");
  const [editActDescription, setEditActDescription] = useState("");
  const [editActDueDate, setEditActDueDate] = useState("");

  // Excursion list for edit mode
  const { data: excursions } = trpc.crm.excursion.list.useQuery(undefined, { enabled: editing });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!booking) return <p>{t("booking")} not found</p>;

  const totalCost = editing
    ? editItems.reduce((s, i) => s + i.totalCost, 0)
    : Number(booking.totalCost ?? 0);
  const totalSelling = editing
    ? editItems.reduce((s, i) => s + i.totalPrice, 0)
    : Number(booking.totalSelling ?? 0);
  const margin = totalSelling > 0 ? ((totalSelling - totalCost) / totalSelling * 100) : 0;
  const totalPax = editing
    ? editPaxAdults + editPaxChildren + editPaxInfants
    : booking.paxAdults + booking.paxChildren + booking.paxInfants;

  return (

    <PermissionGuard permission="crm:booking:read">
      <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono">{booking.code}</h1>
            <Badge variant={CRM_BOOKING_STATUS_VARIANTS[booking.status] as "default"}>
              {CRM_BOOKING_STATUS_LABELS[booking.status]}
            </Badge>
            {editing && <Badge variant="secondary">{t("editingMode")}</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {booking.customer && (
              <span>{booking.customer.firstName} {booking.customer.lastName}</span>
            )}
            <span>{new Date(booking.travelDate).toLocaleDateString()}</span>
            <span>{totalPax} pax</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={saveEdit} disabled={updateWithItemsMutation.isPending || editItems.length === 0}>
                {updateWithItemsMutation.isPending ? tc("saving") : t("saveChanges")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="mr-1 h-4 w-4" /> {tc("cancel")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={enterEditMode}>
                <Pencil className="mr-1 h-4 w-4" /> {tc("edit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cloneMutation.mutate({ id })}
                disabled={cloneMutation.isPending}
              >
                <Copy className="mr-1 h-4 w-4" /> {cloneMutation.isPending ? tc("loading") : tc("duplicate")}
              </Button>
              {booking.status === "DRAFT" && (
                <Button size="sm" onClick={() => transitionMutation.mutate({ id, action: "confirm" })} disabled={transitionMutation.isPending}>
                  {tc("confirm")}
                </Button>
              )}
              {(booking.status === "DRAFT" || booking.status === "CONFIRMED") && (
                <Button size="sm" variant="destructive" onClick={() => { if (confirm(tc("confirmDelete"))) transitionMutation.mutate({ id, action: "cancel" }); }} disabled={transitionMutation.isPending}>
                  {tc("cancel")}
                </Button>
              )}
              {booking.status === "CONFIRMED" && (
                <Button size="sm" variant="outline" onClick={() => transitionMutation.mutate({ id, action: "complete" })} disabled={transitionMutation.isPending}>
                  {tc("completed")}
                </Button>
              )}
              {booking.status === "CANCELLED" && (
                <Button size="sm" variant="outline" onClick={() => transitionMutation.mutate({ id, action: "reopen" })} disabled={transitionMutation.isPending}>
                  {tc("open")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const doc = generateBookingVoucher({
                    code: booking.code,
                    status: booking.status,
                    travelDate: booking.travelDate,
                    paxAdults: booking.paxAdults,
                    paxChildren: booking.paxChildren,
                    paxInfants: booking.paxInfants,
                    totalCost: Number(booking.totalCost ?? 0),
                    totalSelling: Number(booking.totalSelling ?? 0),
                    currency: booking.currency,
                    notes: booking.notes,
                    createdAt: booking.createdAt,
                    customer: booking.customer ? {
                      firstName: booking.customer.firstName,
                      lastName: booking.customer.lastName,
                      email: booking.customer.email,
                      phone: booking.customer.phone,
                      nationality: booking.customer.nationality,
                    } : null,
                    bookedBy: booking.bookedBy,
                    items: booking.items.map((item) => ({
                      label: item.label,
                      excursionName: item.excursion.name,
                      excursionCode: item.excursion.code,
                      quantity: item.quantity,
                      unitPrice: Number(item.unitPrice),
                      totalPrice: Number(item.totalPrice),
                    })),
                  });
                  doc.save(`${booking.code}-voucher.pdf`);
                }}
              >
                <Download className="mr-1 h-4 w-4" /> Voucher
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  exportBookingToExcel({
                    code: booking.code,
                    status: booking.status,
                    travelDate: booking.travelDate,
                    paxAdults: booking.paxAdults,
                    paxChildren: booking.paxChildren,
                    paxInfants: booking.paxInfants,
                    totalCost: Number(booking.totalCost ?? 0),
                    totalSelling: Number(booking.totalSelling ?? 0),
                    currency: booking.currency,
                    notes: booking.notes,
                    createdAt: booking.createdAt,
                    customer: booking.customer ? {
                      firstName: booking.customer.firstName,
                      lastName: booking.customer.lastName,
                      email: booking.customer.email,
                      phone: booking.customer.phone,
                      nationality: booking.customer.nationality,
                    } : null,
                    bookedBy: booking.bookedBy,
                    items: booking.items.map((item) => ({
                      label: item.label,
                      excursionName: item.excursion.name,
                      excursionCode: item.excursion.code,
                      quantity: item.quantity,
                      unitCost: Number(item.unitCost),
                      unitPrice: Number(item.unitPrice),
                      totalCost: Number(item.totalCost),
                      totalPrice: Number(item.totalPrice),
                    })),
                    activities: booking.activities?.map((act) => ({
                      type: act.type,
                      subject: act.subject,
                      description: act.description,
                      createdAt: act.createdAt,
                    })),
                  });
                }}
              >
                <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm(tc("confirmDelete"))) deleteMutation.mutate({ id });
                }}
              >
                {tc("delete")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t("totalCost")}</p>
            <p className="text-lg font-bold font-mono">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t("sellingPrice")}</p>
            <p className="text-lg font-bold font-mono text-green-600">${totalSelling.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t("profit")}</p>
            <p className="text-lg font-bold font-mono">${(totalSelling - totalCost).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t("margin")}</p>
            <p className="text-lg font-bold font-mono">{margin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Edit mode: booking details */}
      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("bookingDetails")}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("travelDate")}</label>
                <Input
                  type="date"
                  value={editTravelDate}
                  onChange={(e) => setEditTravelDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("adults")}</label>
                <Input
                  type="number"
                  min={0}
                  value={editPaxAdults}
                  onChange={(e) => setEditPaxAdults(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("children")}</label>
                <Input
                  type="number"
                  min={0}
                  value={editPaxChildren}
                  onChange={(e) => setEditPaxChildren(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("infants")}</label>
                <Input
                  type="number"
                  min={0}
                  value={editPaxInfants}
                  onChange={(e) => setEditPaxInfants(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground">{tc("notes")}</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">{t("bookingItems")} ({editing ? editItems.length : booking.items.length})</TabsTrigger>
          <TabsTrigger value="activities">{t("activities")} ({booking.activities?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {editing ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-2 py-1.5 text-left text-xs font-medium">{t("excursion")}</th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium">{t("bookingItems")}</th>
                          <th className="px-2 py-1.5 text-right text-xs font-medium w-16">Qty</th>
                          <th className="px-2 py-1.5 text-right text-xs font-medium w-24">{t("unitCost")}</th>
                          <th className="px-2 py-1.5 text-right text-xs font-medium w-24">{t("unitPrice")}</th>
                          <th className="px-2 py-1.5 text-right text-xs font-medium w-24">{t("totalCost")}</th>
                          <th className="px-2 py-1.5 text-right text-xs font-medium w-24">{t("totalPrice")}</th>
                          <th className="px-2 py-1.5 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {editItems.map((item, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="px-2 py-1">
                              {item.excursionId ? (
                                <span className="text-xs">
                                  <span className="font-mono">{item.excursionCode}</span>
                                  <span className="ml-1 text-muted-foreground">{item.excursionName}</span>
                                </span>
                              ) : (
                                <Select
                                  value={item.excursionId}
                                  onValueChange={(val) => {
                                    const exc = excursions?.find((e) => e.id === val);
                                    if (exc) {
                                      setEditItems((prev) => {
                                        const items = [...prev];
                                        items[idx] = {
                                          ...items[idx],
                                          excursionId: exc.id,
                                          excursionCode: exc.code,
                                          excursionName: exc.name,
                                          label: exc.name,
                                        };
                                        return items;
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Select excursion" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {excursions?.map((exc) => (
                                      <SelectItem key={exc.id} value={exc.id}>
                                        {exc.code} — {exc.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                className="h-7 text-xs"
                                value={item.label}
                                onChange={(e) => updateEditItem(idx, "label", e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                className="h-7 text-xs text-right"
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => updateEditItem(idx, "quantity", Number(e.target.value))}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                className="h-7 text-xs text-right"
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.unitCost}
                                onChange={(e) => updateEditItem(idx, "unitCost", Number(e.target.value))}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                className="h-7 text-xs text-right"
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.unitPrice}
                                onChange={(e) => updateEditItem(idx, "unitPrice", Number(e.target.value))}
                              />
                            </td>
                            <td className="px-2 py-1 text-right font-mono text-xs">${item.totalCost.toFixed(2)}</td>
                            <td className="px-2 py-1 text-right font-mono text-xs text-green-600">${item.totalPrice.toFixed(2)}</td>
                            <td className="px-2 py-1 text-center">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeEditItem(idx)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30">
                          <td colSpan={5} className="px-2 py-1.5 text-right text-xs font-semibold">{t("totals")}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-xs font-semibold">${totalCost.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-xs font-semibold text-green-600">${totalSelling.toFixed(2)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <Button variant="outline" size="sm" onClick={addBlankItem}>
                    <Plus className="mr-1 h-4 w-4" /> {t("addItem")}
                  </Button>
                </div>
              ) : booking.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noItems")}</p>
              ) : (
                <div className="overflow-hidden rounded border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-1.5 text-left text-xs font-medium">{t("bookingItems")}</th>
                        <th className="px-3 py-1.5 text-left text-xs font-medium">{t("excursion")}</th>
                        <th className="px-3 py-1.5 text-right text-xs font-medium">Qty</th>
                        <th className="px-3 py-1.5 text-right text-xs font-medium">{t("unitCost")}</th>
                        <th className="px-3 py-1.5 text-right text-xs font-medium">{t("unitPrice")}</th>
                        <th className="px-3 py-1.5 text-right text-xs font-medium">{t("totalCost")}</th>
                        <th className="px-3 py-1.5 text-right text-xs font-medium">{t("totalPrice")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {booking.items.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="px-3 py-1.5 font-medium">{item.label}</td>
                          <td className="px-3 py-1.5">
                            <span className="font-mono text-xs">{item.excursion.code}</span>
                            <span className="ml-1 text-muted-foreground">{item.excursion.name}</span>
                          </td>
                          <td className="px-3 py-1.5 text-right">{item.quantity}</td>
                          <td className="px-3 py-1.5 text-right font-mono">${Number(item.unitCost).toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right font-mono">${Number(item.unitPrice).toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right font-mono">${Number(item.totalCost).toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold text-green-600">
                            ${Number(item.totalPrice).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={5} className="px-3 py-1.5 text-right text-xs font-semibold">{t("totals")}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs font-semibold">${Number(booking.totalCost ?? 0).toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs font-semibold text-green-600">${Number(booking.totalSelling ?? 0).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" /> {t("addActivity")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t("newActivity")}</DialogTitle></DialogHeader>
                  <Form {...activityForm}>
                    <form onSubmit={activityForm.handleSubmit((v) => createActivity.mutate(v))} className="space-y-4">
                      <FormField control={activityForm.control} name="type" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tc("type")}</FormLabel>
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
                        <FormItem><FormLabel>{t("subject")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={activityForm.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>{tc("description")}</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={activityForm.control} name="dueDate" render={({ field }) => (
                        <FormItem><FormLabel>{t("dueDate")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                      )} />
                      <Button type="submit" disabled={createActivity.isPending}>
                        {createActivity.isPending ? tc("saving") : t("addActivity")}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {(booking.activities?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noActivities")}</p>
            ) : (
              <div className="space-y-2">
                {booking.activities.map((act) => (
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
                          {act.completedAt && <Badge variant="default" className="text-xs">{tc("completed")}</Badge>}
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

      {/* Notes & Meta */}
      {!editing && booking.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">{tc("notes")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        {booking.bookedBy && <p>Booked by: {booking.bookedBy.name}</p>}
        {booking.opportunity && <p>Linked opportunity: {booking.opportunity.title}</p>}
        <p>Created: {new Date(booking.createdAt).toLocaleString()}</p>
      </div>
    </div>
  

    </PermissionGuard>

  );
}
