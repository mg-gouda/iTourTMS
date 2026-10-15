"use client";

import { ArrowLeft, CalendarDays, Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

type ProductType = "EXCURSION" | "TRANSFER" | "PACKAGE";

const BACK: Record<ProductType, { href: string; label: string }> = {
  EXCURSION: { href: "/b2b/excursions", label: "Excursions" },
  TRANSFER: { href: "/b2b/transfers", label: "Transfers" },
  PACKAGE: { href: "/b2b/packages", label: "Tour packages" },
};

const money = (n: number, currency: string | null) =>
  `${currency ? `${currency} ` : ""}${n.toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * One product in full, with the form that asks for it.
 *
 * Shared by all three types: they differ in what they describe, not in how a
 * partner reads it or requests it, and three copies of this would drift.
 *
 * The price shown is what the partner owes us. Nothing here is confirmed on
 * the spot — none of these products has an availability engine, so the button
 * raises a request and says so, rather than implying a booking.
 */
export function ProductDetail({
  productType,
  productId,
}: {
  productType: ProductType;
  productId: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<{ code: string } | null>(null);
  const [form, setForm] = useState({
    serviceDate: "",
    adults: 2,
    children: 0,
    units: 1,
    leadGuestName: "",
    partnerReference: "",
    notes: "",
  });

  const { data, isLoading } = trpc.partner.products.detail.useQuery({ productType, productId });

  const request = trpc.partner.products.request.useMutation({
    onSuccess: (r) => {
      setDone({ code: r.code });
      toast.success(`Request ${r.code} sent.`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const perVehicle = data.unitLabel === "per vehicle";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={BACK[productType].href}>
            <ArrowLeft className="mr-1 size-4" /> {BACK[productType].label}
          </Link>
        </Button>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
            {data.subtitle && <p className="text-muted-foreground">{data.subtitle}</p>}
          </div>
          <Button
            onClick={() => {
              setDone(null);
              setOpen(true);
            }}
          >
            <CalendarDays className="mr-2 size-4" /> Request a booking
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.facts.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your price</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.prices.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No current price. Ask your account manager for a quote.
            </p>
          ) : (
            data.prices.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{p.label}</span>
                <span className="font-medium">{money(p.net, p.currency)}</span>
              </div>
            ))
          )}
          <p className="text-muted-foreground border-t pt-2 text-xs">
            Prices are {data.unitLabel} and are what you pay us. Add your own margin before
            quoting your traveller.
          </p>
        </CardContent>
      </Card>

      {(data.description || data.inclusions || data.exclusions) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {data.description && <p className="whitespace-pre-wrap">{data.description}</p>}
            {data.inclusions && (
              <div>
                <p className="mb-1 text-xs font-semibold tracking-wider uppercase">Included</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{data.inclusions}</p>
              </div>
            )}
            {data.exclusions && (
              <div>
                <p className="mb-1 text-xs font-semibold tracking-wider uppercase">Not included</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{data.exclusions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.programme.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {productType === "PACKAGE" ? "What is in it" : "Programme"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {data.programme.map((item) => (
                <li key={item.id} className="flex gap-3 border-l-2 pl-4">
                  <div>
                    <p className="text-sm font-medium">
                      {item.time ? `${item.time} · ` : ""}
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-muted-foreground text-xs">{item.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{done ? "Request sent" : `Request ${data.title}`}</DialogTitle>
            <DialogDescription>
              {done
                ? "We will confirm or come back to you shortly."
                : "We check availability by hand for these, so this raises a request rather than confirming on the spot."}
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
                <Check className="size-4" /> Reference {done.code}
              </div>
              <p className="text-muted-foreground text-xs">
                You can follow it under Requests in the menu.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date of service</Label>
                <Input
                  type="date"
                  min={today}
                  value={form.serviceDate}
                  onChange={(e) => setForm((f) => ({ ...f, serviceDate: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(["adults", "children"] as const).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs capitalize">{field}</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            [field]: Math.max(field === "adults" ? 1 : 0, f[field] - 1),
                          }))
                        }
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{form[field]}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setForm((f) => ({ ...f, [field]: f[field] + 1 }))}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {perVehicle && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Vehicles</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.units}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, units: Math.max(1, Number(e.target.value) || 1) }))
                    }
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Lead guest</Label>
                  <Input
                    value={form.leadGuestName}
                    onChange={(e) => setForm((f) => ({ ...f, leadGuestName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Your reference</Label>
                  <Input
                    value={form.partnerReference}
                    onChange={(e) => setForm((f) => ({ ...f, partnerReference: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Anything we should know</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Pick-up point, flight number, dietary needs…"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {done ? "Close" : "Cancel"}
            </Button>
            {!done && (
              <Button
                disabled={!form.serviceDate || request.isPending}
                onClick={() =>
                  request.mutate({
                    productType,
                    productId,
                    serviceDate: form.serviceDate,
                    adults: form.adults,
                    children: form.children,
                    units: form.units,
                    leadGuestName: form.leadGuestName.trim() || undefined,
                    partnerReference: form.partnerReference.trim() || undefined,
                    notes: form.notes.trim() || undefined,
                  })
                }
              >
                {request.isPending ? "Sending..." : "Send request"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
