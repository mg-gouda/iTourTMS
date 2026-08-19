"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/shared/permission-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MARKUP_TYPE_LABELS } from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";

const TYPES = [
  { value: "EXCURSION", label: "Excursions" },
  { value: "TRANSFER", label: "Transfers" },
  { value: "PACKAGE", label: "Tour Packages" },
] as const;

type ProductType = (typeof TYPES)[number]["value"];

const MARKUP_TYPES = [
  "PERCENTAGE",
  "FIXED_PER_NIGHT",
  "FIXED_PER_BOOKING",
  "PER_PERSON_PER_NIGHT",
] as const;

/**
 * Trade margin on the products that are not hotel stays.
 *
 * One screen for all three: they differ in what they sell, not in how a margin
 * is set, and three near-identical pages would drift apart within a month.
 */
export default function ProductMarkupsPage() {
  const [tab, setTab] = useState<ProductType>("EXCURSION");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tourOperatorId: "",
    productId: "" as string,
    markupType: "PERCENTAGE" as string,
    value: "0",
  });

  const utils = trpc.useUtils();
  const { data: rules, isLoading } = trpc.b2bPortal.productMarkup.list.useQuery({
    productType: tab,
  });
  const { data: partners } = trpc.b2bPortal.tourOperator.list.useQuery();
  const { data: products } = trpc.b2bPortal.productMarkup.products.useQuery({ productType: tab });

  const save = trpc.b2bPortal.productMarkup.save.useMutation({
    onSuccess: () => {
      void utils.b2bPortal.productMarkup.list.invalidate();
      setOpen(false);
      toast.success("Markup saved.");
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.b2bPortal.productMarkup.delete.useMutation({
    onSuccess: () => {
      void utils.b2bPortal.productMarkup.list.invalidate();
      toast.success("Markup removed.");
    },
    onError: (e) => toast.error(e.message),
  });

  const productLabel = (id: string | null) =>
    id ? (products?.find((p) => p.id === id)?.label ?? id) : "All products";

  return (
    <PermissionGuard permission="b2b-portal:markup:read">
      <div className="animate-fade-in space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Product markups</h1>
            <p className="text-muted-foreground">
              What each partner pays above our quoted price for excursions, transfers and
              packages. Hotel margin is set separately, under Markup Rules.
            </p>
          </div>
          <Button
            onClick={() => {
              setForm({ tourOperatorId: "", productId: "", markupType: "PERCENTAGE", value: "0" });
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" /> New markup
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => v && setTab(v as ProductType)}>
          <TabsList>
            {TYPES.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TYPES.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-40" />
                  ) : !rules?.length ? (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                      No markups set. Partners see our quoted price unchanged until one is.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-muted-foreground border-b text-xs">
                        <tr>
                          <th className="p-2 text-left font-medium">Partner</th>
                          <th className="p-2 text-left font-medium">Applies to</th>
                          <th className="p-2 text-left font-medium">Type</th>
                          <th className="p-2 text-right font-medium">Value</th>
                          <th className="p-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map((r) => (
                          <tr key={r.id} className="border-b last:border-0">
                            <td className="p-2">{r.tourOperator?.name}</td>
                            <td className="p-2">
                              {r.productId ? (
                                productLabel(r.productId)
                              ) : (
                                <Badge variant="secondary">All products</Badge>
                              )}
                            </td>
                            <td className="p-2">
                              {MARKUP_TYPE_LABELS[r.markupType] ?? r.markupType}
                            </td>
                            <td className="p-2 text-right">{Number(r.value)}</td>
                            <td className="p-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => remove.mutate({ id: r.id })}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                New markup — {TYPES.find((t) => t.value === tab)?.label}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Partner</Label>
                <Combobox
                  options={(partners ?? []).map((p) => ({ value: p.id, label: p.name }))}
                  value={form.tourOperatorId || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, tourOperatorId: v }))}
                  placeholder="Select a partner"
                  searchPlaceholder="Search partners…"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Applies to</Label>
                <Combobox
                  options={[
                    { value: "", label: "All products of this type" },
                    ...(products ?? []).map((p) => ({ value: p.id, label: p.label })),
                  ]}
                  value={form.productId}
                  onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}
                  placeholder="All products of this type"
                  searchPlaceholder="Search products…"
                />
                <p className="text-muted-foreground text-xs">
                  A rule for one product overrides the partner&apos;s default for the type.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={form.markupType}
                    onValueChange={(v) => v && setForm((f) => ({ ...f, markupType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKUP_TYPES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {MARKUP_TYPE_LABELS[m] ?? m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Value</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!form.tourOperatorId || save.isPending}
                onClick={() =>
                  save.mutate({
                    tourOperatorId: form.tourOperatorId,
                    productType: tab,
                    productId: form.productId || null,
                    markupType: form.markupType as never,
                    value: Number(form.value) || 0,
                    active: true,
                  })
                }
              >
                {save.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
