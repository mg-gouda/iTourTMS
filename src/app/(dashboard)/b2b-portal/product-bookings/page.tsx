"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/shared/permission-guard";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

const STATUSES = ["REQUESTED", "CONFIRMED", "DECLINED", "CANCELLED"] as const;

const STATUS_VARIANT: Record<string, "warning" | "success" | "destructive" | "secondary"> = {
  REQUESTED: "warning",
  CONFIRMED: "success",
  DECLINED: "destructive",
  CANCELLED: "secondary",
};

const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const money = (n: number | string, currency: string) =>
  `${currency} ${Number(n).toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Partner requests for excursions, transfers and packages.
 *
 * None of these confirms itself — somebody has to check a guide is free or a
 * vehicle exists — so this is the queue where that answer is given. Both our
 * cost and the partner's price are shown, because the person answering needs
 * to see the margin they are committing to.
 */
export default function ProductBookingsPage() {
  const [status, setStatus] = useState<string>("REQUESTED");
  const [answering, setAnswering] = useState<{ id: string; code: string } | null>(null);
  const [decision, setDecision] = useState<"CONFIRMED" | "DECLINED">("CONFIRMED");
  const [note, setNote] = useState("");

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.b2bPortal.productBooking.list.useQuery({
    status: status === "ALL" ? undefined : (status as never),
  });

  const answer = trpc.b2bPortal.productBooking.answer.useMutation({
    onSuccess: (r) => {
      void utils.b2bPortal.productBooking.list.invalidate();
      setAnswering(null);
      setNote("");
      toast.success(`${r.code} ${r.status.toLowerCase()}. The partner has been told.`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <PermissionGuard permission="b2b-portal:reservation:read">
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Product requests</h1>
            <p className="text-muted-foreground">
              Excursions, transfers and packages partners have asked for. Answer each one and
              they are notified.
            </p>
          </div>
          <Select value={status} onValueChange={(v) => v && setStatus(v)}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isLoading ? "Loading…" : `${data?.length ?? 0} request(s)`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <Skeleton className="h-40" />
              </div>
            ) : !data?.length ? (
              <p className="text-muted-foreground py-12 text-center text-sm">
                Nothing here right now.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b text-xs">
                    <tr>
                      <th className="p-3 text-left font-medium">Reference</th>
                      <th className="p-3 text-left font-medium">Partner</th>
                      <th className="p-3 text-left font-medium">Product</th>
                      <th className="p-3 text-left font-medium">Date</th>
                      <th className="p-3 text-left font-medium">Pax</th>
                      <th className="p-3 text-right font-medium">Our cost</th>
                      <th className="p-3 text-right font-medium">Partner pays</th>
                      <th className="p-3 text-left font-medium">Status</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 align-top">
                        <td className="p-3 whitespace-nowrap">
                          <p className="font-medium">{r.code}</p>
                          {r.partnerReference && (
                            <p className="text-muted-foreground text-xs">{r.partnerReference}</p>
                          )}
                        </td>
                        <td className="p-3">{r.tourOperator?.name}</td>
                        <td className="p-3">
                          <p>{r.productName}</p>
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            {r.productType}
                          </Badge>
                          {r.notes && (
                            <p className="text-muted-foreground mt-1 max-w-xs text-xs">{r.notes}</p>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">{date(r.serviceDate)}</td>
                        <td className="p-3 whitespace-nowrap">
                          {r.adults}
                          {r.children ? ` + ${r.children}` : ""}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {money(Number(r.staffPrice), r.currency)}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <p className="font-medium">{money(Number(r.net), r.currency)}</p>
                          <p className="text-muted-foreground text-xs">
                            +{money(Number(r.markupAmount), r.currency)}
                          </p>
                        </td>
                        <td className="p-3">
                          <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
                            {r.status}
                          </Badge>
                          {r.staffNote && (
                            <p className="text-muted-foreground mt-1 max-w-xs text-xs">
                              {r.staffNote}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {r.status === "REQUESTED" && (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                aria-label={`Confirm ${r.code}`}
                                onClick={() => {
                                  setDecision("CONFIRMED");
                                  setNote("");
                                  setAnswering({ id: r.id, code: r.code });
                                }}
                              >
                                <Check className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                aria-label={`Decline ${r.code}`}
                                onClick={() => {
                                  setDecision("DECLINED");
                                  setNote("");
                                  setAnswering({ id: r.id, code: r.code });
                                }}
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!answering} onOpenChange={(o) => !o && setAnswering(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {decision === "CONFIRMED" ? "Confirm" : "Decline"} {answering?.code}
              </DialogTitle>
              <DialogDescription>
                The partner is emailed either way, and your note goes with it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Note to the partner {decision === "DECLINED" ? "(say why)" : "(optional)"}
              </Label>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  decision === "CONFIRMED"
                    ? "Pick-up at 08:00 from reception…"
                    : "Fully booked that day — 12 September has space."
                }
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAnswering(null)}>
                Cancel
              </Button>
              <Button
                variant={decision === "DECLINED" ? "destructive" : "default"}
                disabled={answer.isPending}
                onClick={() =>
                  answering &&
                  answer.mutate({
                    id: answering.id,
                    status: decision,
                    staffNote: note.trim() || undefined,
                  })
                }
              >
                {answer.isPending
                  ? "Saving..."
                  : decision === "CONFIRMED"
                    ? "Confirm request"
                    : "Decline request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
