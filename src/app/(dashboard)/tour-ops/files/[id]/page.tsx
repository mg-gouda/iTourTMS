"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ChevronLeft,
  Plus,
  Send,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { QuotationCalculator } from "@/components/tour-ops/quotation-calculator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OPS_CLIENT_TYPE_LABELS,
  OPS_COMPONENT_TYPE_LABELS,
  OPS_FILE_STATUS_LABELS,
  OPS_FILE_STATUS_TRANSITIONS,
  OPS_FILE_STATUS_VARIANTS,
  OPS_QUOTATION_STATUS_LABELS,
  OPS_QUOTATION_STATUS_VARIANTS,
} from "@/lib/constants/tour-ops";
import { trpc } from "@/lib/trpc";
import type { OpsFileStatus } from "@prisma/client";

export default function OpsFileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: file, isLoading } = trpc.tourOps.file.getById.useQuery({ id });

  const updateStatus = trpc.tourOps.file.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); utils.tourOps.file.getById.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });

  const dispatchFile = trpc.tourOps.dispatch.dispatchFile.useMutation({
    onSuccess: () => { toast.success("File dispatched to execution modules"); utils.tourOps.file.getById.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });

  const deleteFile = trpc.tourOps.file.delete.useMutation({
    onSuccess: () => { toast.success("File deleted"); router.push("/tour-ops/files"); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!file) return <div className="p-6">File not found.</div>;

  const clientName =
    file.customer
      ? `${file.customer.firstName} ${file.customer.lastName}`
      : file.tourOperator?.name ?? file.guestName ?? "—";

  const allowedTransitions = OPS_FILE_STATUS_TRANSITIONS[file.status as OpsFileStatus] ?? [];
  const finalQuotation = file.quotations.find((q) => q.isFinal);

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tour-ops/files"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold font-mono">{file.code}</h1>
              <Badge variant={OPS_FILE_STATUS_VARIANTS[file.status as keyof typeof OPS_FILE_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                {OPS_FILE_STATUS_LABELS[file.status as keyof typeof OPS_FILE_STATUS_LABELS]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{clientName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(file.status === "CONFIRMED" || file.status === "IN_PROGRESS") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatchFile.mutate({ fileId: id })}
              disabled={dispatchFile.isPending}
            >
              <Zap className="mr-1 h-3.5 w-3.5" />
              Dispatch
            </Button>
          )}
          {allowedTransitions.length > 0 && (
            <Select
              onValueChange={(status) => updateStatus.mutate({ id, status })}
              disabled={updateStatus.isPending}
            >
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Change Status" />
              </SelectTrigger>
              <SelectContent>
                {allowedTransitions.map((s) => (
                  <SelectItem key={s} value={s}>→ {OPS_FILE_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="packages">Packages ({file.packages.length})</TabsTrigger>
          <TabsTrigger value="quotations">Quotations ({file.quotations.length})</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="pnl">P&L</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Client Information</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{OPS_CLIENT_TYPE_LABELS[file.clientType as keyof typeof OPS_CLIENT_TYPE_LABELS]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span>{clientName}</span>
                </div>
                {file.guestEmail && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span>{file.guestEmail}</span>
                  </div>
                )}
                {file.guestPhone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{file.guestPhone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Travel Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span>{format(new Date(file.travelFrom), "dd MMM yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span>{format(new Date(file.travelTo), "dd MMM yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adults / Children / Infants</span>
                  <span>{file.adults} / {file.children} / {file.infants}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          {file.notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-line">{file.notes}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Tour packages for this file</p>
            <Button size="sm" asChild>
              <Link href={`/tour-ops/files/${id}/packages/new`}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Package
              </Link>
            </Button>
          </div>
          {file.packages.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <p className="text-sm">No packages yet. Add a package or clone from a template.</p>
              </CardContent>
            </Card>
          ) : (
            file.packages.map((pkg) => (
              <Card key={pkg.id}>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <div>
                    <CardTitle className="text-sm">{pkg.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{pkg.components.length} components · {pkg.baseCurrency} {Number(pkg.totalCost).toLocaleString()} cost</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tour-ops/templates/${pkg.id}`}>Edit</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {pkg.components.map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {OPS_COMPONENT_TYPE_LABELS[c.type as keyof typeof OPS_COMPONENT_TYPE_LABELS]}
                          </Badge>
                          <span>{c.description}</span>
                        </div>
                        <div className="text-right text-muted-foreground">
                          <span className="font-medium text-foreground">${Number(c.sellingPrice).toLocaleString()}</span>
                          {" "}/ cost ${Number(c.totalCost).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Quotations Tab */}
        <TabsContent value="quotations" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Pricing quotations issued to the client</p>
            {file.packages.length > 0 && (
              <Button size="sm" asChild>
                <Link href={`/tour-ops/quotations/new?fileId=${id}`}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> New Quotation
                </Link>
              </Button>
            )}
          </div>
          {file.quotations.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <p className="text-sm">No quotations yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Package</th>
                    <th className="px-3 py-2 text-right">Cost</th>
                    <th className="px-3 py-2 text-right">Selling</th>
                    <th className="px-3 py-2 text-right">Margin</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {file.quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono">{q.code}{q.isFinal && " 🔒"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{q.package.name}</td>
                      <td className="px-3 py-2 text-right">${Number(q.totalCost).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium">${Number(q.totalSelling).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-green-600">{Number(q.marginPct).toFixed(1)}%</td>
                      <td className="px-3 py-2">
                        <Badge variant={OPS_QUOTATION_STATUS_VARIANTS[q.status as keyof typeof OPS_QUOTATION_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                          {OPS_QUOTATION_STATUS_LABELS[q.status as keyof typeof OPS_QUOTATION_STATUS_LABELS]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/tour-ops/quotations/${q.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Calculator Tab */}
        <TabsContent value="calculator" className="mt-4">
          <QuotationCalculator
            fileId={id}
            packages={file.packages.map((p) => ({ id: p.id, name: p.name }))}
            defaultPax={file.adults + file.children}
            travelDate={new Date(file.travelFrom).toISOString().split("T")[0]}
          />
        </TabsContent>

        {/* P&L Tab */}
        <TabsContent value="pnl" className="mt-4">
          <PnLTab fileId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PnLTab({ fileId }: { fileId: string }) {
  const { data: pnl, isLoading } = trpc.tourOps.pnl.getByFileId.useQuery({ fileId });
  const utils = trpc.useUtils();
  const recalc = trpc.tourOps.pnl.recalculate.useMutation({
    onSuccess: () => { toast.success("P&L recalculated"); utils.tourOps.pnl.getByFileId.invalidate({ fileId }); },
    onError: (e) => toast.error(e.message),
  });
  const closePnl = trpc.tourOps.pnl.close.useMutation({
    onSuccess: () => { toast.success("P&L closed"); utils.tourOps.pnl.getByFileId.invalidate({ fileId }); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!pnl) return <div className="text-sm text-muted-foreground">P&L will appear once the file is confirmed.</div>;

  const rows = [
    { label: "Budgeted Revenue", value: Number(pnl.budgetedRevenue), className: "" },
    { label: "Budgeted Cost", value: Number(pnl.budgetedCost), className: "text-red-600" },
    { label: "Budgeted Margin", value: Number(pnl.budgetedRevenue) - Number(pnl.budgetedCost), className: "font-semibold text-green-600" },
    { label: "Actual Revenue", value: Number(pnl.actualRevenue), className: "" },
    { label: "Actual Cost", value: Number(pnl.actualCost), className: "text-red-600" },
    { label: "Actual Margin", value: Number(pnl.actualRevenue) - Number(pnl.actualCost), className: "font-semibold text-green-600" },
    { label: "Variance", value: Number(pnl.variance), className: Number(pnl.variance) >= 0 ? "text-green-600" : "text-red-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Badge variant={pnl.status === "CLOSED" ? "secondary" : "outline"}>{pnl.status}</Badge>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => recalc.mutate({ fileId })} disabled={recalc.isPending}>
            Recalculate
          </Button>
          {pnl.status === "OPEN" && (
            <Button variant="outline" size="sm" onClick={() => closePnl.mutate({ fileId })} disabled={closePnl.isPending}>
              Close P&L
            </Button>
          )}
        </div>
      </div>
      <Card>
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="py-2 text-muted-foreground">{row.label}</td>
                  <td className={`py-2 text-right ${row.className}`}>
                    ${row.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
