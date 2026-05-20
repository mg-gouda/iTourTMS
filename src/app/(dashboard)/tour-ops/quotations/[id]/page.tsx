"use client";

import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, CheckCircle, Send, XCircle, Lock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  OPS_CLIENT_TYPE_LABELS,
  OPS_COMPONENT_TYPE_LABELS,
  OPS_MARKUP_TYPE_LABELS,
  OPS_QUOTATION_STATUS_LABELS,
  OPS_QUOTATION_STATUS_VARIANTS,
} from "@/lib/constants/tour-ops";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: quotation, isLoading } = trpc.tourOps.quotation.getById.useQuery({ id });

  const updateStatus = trpc.tourOps.quotation.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); utils.tourOps.quotation.getById.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });

  const finalize = trpc.tourOps.quotation.finalize.useMutation({
    onSuccess: () => { toast.success("Quotation finalized — file confirmed"); utils.tourOps.quotation.getById.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!quotation) return <div className="p-6">Quotation not found.</div>;

  const totalCost = Number(quotation.totalCost);
  const totalSelling = Number(quotation.totalSelling);
  const margin = Number(quotation.margin);
  const marginPct = Number(quotation.marginPct);

  return (

    <PermissionGuard permission="tour-ops:quotation:read">
      <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/tour-ops/files/${quotation.fileId}`}><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold font-mono">{quotation.code}</h1>
              {quotation.isFinal && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" /> Finalized</Badge>}
              <Badge variant={OPS_QUOTATION_STATUS_VARIANTS[quotation.status as keyof typeof OPS_QUOTATION_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                {OPS_QUOTATION_STATUS_LABELS[quotation.status as keyof typeof OPS_QUOTATION_STATUS_LABELS]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              File: <Link href={`/tour-ops/files/${quotation.fileId}`} className="underline">{quotation.file.code}</Link>
              {" · "}Package: {quotation.package.name}
            </p>
          </div>
        </div>

        {!quotation.isFinal && (
          <div className="flex items-center gap-2">
            {quotation.status === "DRAFT" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id, status: "SENT" })} disabled={updateStatus.isPending}>
                <Send className="mr-1.5 h-3.5 w-3.5" /> Mark Sent
              </Button>
            )}
            {quotation.status === "SENT" && (
              <>
                <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id, status: "ACCEPTED" })} disabled={updateStatus.isPending}>
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id, status: "REJECTED" })} disabled={updateStatus.isPending}>
                  <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                </Button>
              </>
            )}
            {quotation.status === "ACCEPTED" && (
              <Button size="sm" onClick={() => finalize.mutate({ id })} disabled={finalize.isPending}>
                <Lock className="mr-1.5 h-3.5 w-3.5" /> Finalize & Confirm File
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Cost", value: `$${totalCost.toLocaleString()}`, className: "" },
          { label: "Total Selling", value: `$${totalSelling.toLocaleString()}`, className: "text-green-600" },
          { label: "Margin", value: `$${margin.toLocaleString()}`, className: margin >= 0 ? "text-green-600" : "text-red-600" },
          { label: "Margin %", value: `${marginPct.toFixed(1)}%`, className: marginPct >= 0 ? "text-green-600" : "text-red-600" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-xl font-bold ${item.className}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quotation details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client Type</span>
              <span>{OPS_CLIENT_TYPE_LABELS[quotation.clientType as keyof typeof OPS_CLIENT_TYPE_LABELS]}</span>
            </div>
            {quotation.validUntil && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid Until</span>
                <span>{format(new Date(quotation.validUntil), "dd MMM yyyy")}</span>
              </div>
            )}
            {quotation.packageMarkupType && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Package Markup</span>
                <span>
                  {OPS_MARKUP_TYPE_LABELS[quotation.packageMarkupType as keyof typeof OPS_MARKUP_TYPE_LABELS]}: {quotation.packageMarkupValue?.toString()}
                  {quotation.packageMarkupType === "PERCENTAGE" ? "%" : ""}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{format(new Date(quotation.createdAt), "dd MMM yyyy")}</span>
            </div>
          </CardContent>
        </Card>
        {quotation.notes && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent><p className="text-sm whitespace-pre-line">{quotation.notes}</p></CardContent>
          </Card>
        )}
      </div>

      {/* Component breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Component Breakdown</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="py-2 text-left font-medium text-muted-foreground">Type</th>
                <th className="py-2 text-left font-medium text-muted-foreground">Description</th>
                <th className="py-2 text-right font-medium text-muted-foreground">Qty</th>
                <th className="py-2 text-right font-medium text-muted-foreground">Unit Cost</th>
                <th className="py-2 text-right font-medium text-muted-foreground">Total Cost</th>
                <th className="py-2 text-right font-medium text-muted-foreground">Markup</th>
                <th className="py-2 text-right font-medium text-muted-foreground">Selling</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotation.package.components.map((c) => (
                <tr key={c.id}>
                  <td className="py-2">
                    <Badge variant="outline" className="text-[10px]">
                      {OPS_COMPONENT_TYPE_LABELS[c.type as keyof typeof OPS_COMPONENT_TYPE_LABELS]}
                    </Badge>
                  </td>
                  <td className="py-2">{c.description}</td>
                  <td className="py-2 text-right">{Number(c.qty)}</td>
                  <td className="py-2 text-right">{c.currency} {Number(c.unitCost).toLocaleString()}</td>
                  <td className="py-2 text-right">${Number(c.totalCost).toLocaleString()}</td>
                  <td className="py-2 text-right text-muted-foreground">
                    {Number(c.markupValue)}{c.markupType === "PERCENTAGE" ? "%" : " fixed"}
                  </td>
                  <td className="py-2 text-right font-medium text-green-600">${Number(c.sellingPrice).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t">
              <tr>
                <td colSpan={4} className="py-2 font-medium">Total</td>
                <td className="py-2 text-right font-medium">${totalCost.toLocaleString()}</td>
                <td></td>
                <td className="py-2 text-right font-bold text-green-600">${totalSelling.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  

    </PermissionGuard>

  );
}
