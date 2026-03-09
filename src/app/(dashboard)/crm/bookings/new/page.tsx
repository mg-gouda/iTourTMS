"use client";

import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CRM_BOOKING_STATUS_LABELS } from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";

type BookingItem = {
  excursionId: string;
  excursionName: string;
  costSheetId: string;
  label: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
};

export default function NewBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();

  const prefilledCustomerId = searchParams.get("customerId") ?? "";
  const prefilledOpportunityId = searchParams.get("opportunityId") ?? "";

  const { data: customers } = trpc.crm.customer.list.useQuery();
  const { data: excursions } = trpc.crm.excursion.list.useQuery();

  const [customerId, setCustomerId] = useState(prefilledCustomerId);
  const [opportunityId] = useState(prefilledOpportunityId);
  const [status, setStatus] = useState("DRAFT");
  const [travelDate, setTravelDate] = useState("");
  const [paxAdults, setPaxAdults] = useState(1);
  const [paxChildren, setPaxChildren] = useState(0);
  const [paxInfants, setPaxInfants] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<BookingItem[]>([]);
  const [selectedExcursion, setSelectedExcursion] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [newCustFirst, setNewCustFirst] = useState("");
  const [newCustLast, setNewCustLast] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");

  const quickCreateCustomer = trpc.crm.customer.create.useMutation({
    onSuccess: (data) => {
      utils.crm.customer.list.invalidate();
      setCustomerId(data.id);
      setQuickCustomerOpen(false);
      setNewCustFirst("");
      setNewCustLast("");
      setNewCustEmail("");
      setNewCustPhone("");
    },
  });

  const addItem = useCallback(async () => {
    if (!selectedExcursion) return;
    const exc = excursions?.find((e) => e.id === selectedExcursion);
    if (!exc) return;

    setAddingItem(true);
    try {
      const pricing = await utils.crm.booking.getExcursionPricing.fetch({ excursionId: exc.id });
      const sheet = pricing.costSheets[0]; // use first/latest cost sheet

      if (sheet && sheet.sellingPrices.length > 0) {
        // Create one line item per selling price entry
        const newItems: BookingItem[] = sheet.sellingPrices.map((sp) => {
          const cost = Number(sp.costPerPerson);
          const price = Number(sp.sellingPrice);
          const qty = sp.label.toLowerCase().includes("infant") ? paxInfants
            : sp.label.toLowerCase().includes("child") ? paxChildren
            : paxAdults || 1;
          return {
            excursionId: exc.id,
            excursionName: exc.name,
            costSheetId: sheet.id,
            label: `${exc.name} — ${sp.label}`,
            quantity: qty > 0 ? qty : 1,
            unitCost: cost,
            unitPrice: price,
            totalCost: cost * (qty > 0 ? qty : 1),
            totalPrice: price * (qty > 0 ? qty : 1),
          };
        });
        setItems((prev) => [...prev, ...newItems]);
      } else {
        // No selling prices — add a blank item with cost from sheet
        const cost = sheet ? Number(sheet.totalCost ?? 0) : 0;
        setItems((prev) => [
          ...prev,
          {
            excursionId: exc.id,
            excursionName: exc.name,
            costSheetId: sheet?.id ?? "",
            label: `${exc.name} — Adult`,
            quantity: paxAdults || 1,
            unitCost: cost,
            unitPrice: 0,
            totalCost: cost * (paxAdults || 1),
            totalPrice: 0,
          },
        ]);
      }
    } catch {
      // Fallback if pricing fetch fails
      setItems((prev) => [
        ...prev,
        {
          excursionId: exc.id,
          excursionName: exc.name,
          costSheetId: "",
          label: `${exc.name} — Adult`,
          quantity: paxAdults || 1,
          unitCost: 0,
          unitPrice: 0,
          totalCost: 0,
          totalPrice: 0,
        },
      ]);
    }
    setAddingItem(false);
    setSelectedExcursion("");
  }, [selectedExcursion, excursions, paxAdults, paxChildren, paxInfants, utils]);

  const updateItem = useCallback((index: number, field: keyof BookingItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (row as any)[field] = value;
      if (field === "unitCost" || field === "quantity") {
        row.totalCost = row.unitCost * row.quantity;
      }
      if (field === "unitPrice" || field === "quantity") {
        row.totalPrice = row.unitPrice * row.quantity;
      }
      updated[index] = row;
      return updated;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const totalCost = items.reduce((s, i) => s + i.totalCost, 0);
  const totalPrice = items.reduce((s, i) => s + i.totalPrice, 0);
  const margin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice * 100) : 0;

  const createMutation = trpc.crm.booking.create.useMutation({
    onSuccess: (data) => {
      utils.crm.booking.list.invalidate();
      router.push(`/crm/bookings/${data.id}`);
    },
  });

  function onSubmit() {
    if (!travelDate) { alert("Travel date is required"); return; }
    if (items.length === 0) { alert("Add at least one item"); return; }

    createMutation.mutate({
      customerId,
      opportunityId,
      status: status as "DRAFT",
      travelDate,
      paxAdults,
      paxChildren,
      paxInfants,
      currency,
      notes,
      items: items.map((item, i) => ({
        excursionId: item.excursionId,
        costSheetId: item.costSheetId,
        label: item.label,
        quantity: item.quantity,
        unitCost: item.unitCost,
        unitPrice: item.unitPrice,
        totalCost: item.totalCost,
        totalPrice: item.totalPrice,
        sortOrder: i,
      })),
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Booking</h1>
        <p className="text-muted-foreground">Create a new excursion booking</p>
        {opportunityId && (
          <Badge variant="outline" className="mt-2">Linked to opportunity</Badge>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Booking Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <div className="flex gap-2">
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {(customers ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={quickCustomerOpen} onOpenChange={setQuickCustomerOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0" title="Quick-create customer">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Quick-Create Customer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>First Name *</Label>
                          <Input value={newCustFirst} onChange={(e) => setNewCustFirst(e.target.value)} placeholder="First name" />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name *</Label>
                          <Input value={newCustLast} onChange={(e) => setNewCustLast(e.target.value)} placeholder="Last name" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} placeholder="email@example.com" />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} placeholder="+1 234 567 890" />
                      </div>
                      {quickCreateCustomer.error && (
                        <p className="text-sm text-destructive">{quickCreateCustomer.error.message}</p>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setQuickCustomerOpen(false)}>Cancel</Button>
                        <Button
                          disabled={!newCustFirst || !newCustLast || quickCreateCustomer.isPending}
                          onClick={() => quickCreateCustomer.mutate({
                            firstName: newCustFirst,
                            lastName: newCustLast,
                            email: newCustEmail,
                            phone: newCustPhone,
                          })}
                        >
                          {quickCreateCustomer.isPending ? "Creating..." : "Create & Select"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CRM_BOOKING_STATUS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Travel Date</Label>
              <Input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Adults</Label>
              <Input type="number" min={0} value={paxAdults} onChange={(e) => setPaxAdults(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Children</Label>
              <Input type="number" min={0} value={paxChildren} onChange={(e) => setPaxChildren(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Infants</Label>
              <Input type="number" min={0} value={paxInfants} onChange={(e) => setPaxInfants(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Booking Items</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedExcursion} onValueChange={setSelectedExcursion}>
                <SelectTrigger className="h-9 w-[250px]"><SelectValue placeholder="Select excursion..." /></SelectTrigger>
                <SelectContent>
                  {(excursions ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.code} — {e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={addItem} disabled={!selectedExcursion || addingItem}>
                {addingItem ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                {addingItem ? "Loading..." : "Add"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No items added yet. Select an excursion above.</p>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 py-1.5 text-left text-xs font-medium">Item</th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium w-[60px]">Qty</th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium w-[90px]">Unit Cost</th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium w-[90px]">Unit Price</th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium w-[90px]">Total</th>
                      <th className="w-[36px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-1 py-1">
                          <Input
                            className="h-8 text-xs"
                            value={item.label}
                            onChange={(e) => updateItem(idx, "label", e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            min={1}
                            className="h-8 text-xs text-right"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 text-xs text-right"
                            value={item.unitCost}
                            onChange={(e) => updateItem(idx, "unitCost", Number(e.target.value))}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 text-xs text-right"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                          />
                        </td>
                        <td className="px-2 py-1 text-right font-mono text-xs font-semibold">
                          ${item.totalPrice.toFixed(2)}
                        </td>
                        <td className="px-1 py-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeItem(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30">
                      <td colSpan={2} className="px-2 py-1.5 text-right text-xs font-semibold">Totals</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">${totalCost.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">${totalPrice.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">
                        <Badge variant="outline" className="text-xs">{margin.toFixed(1)}% margin</Badge>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {createMutation.error && (
        <p className="text-sm text-destructive">{createMutation.error.message}</p>
      )}

      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "Create Booking"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/crm/bookings")}>Cancel</Button>
      </div>
    </div>
  );
}
