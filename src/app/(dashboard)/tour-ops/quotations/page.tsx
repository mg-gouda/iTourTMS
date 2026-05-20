"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  OPS_CLIENT_TYPE_LABELS,
  OPS_QUOTATION_STATUS_LABELS,
  OPS_QUOTATION_STATUS_VARIANTS,
} from "@/lib/constants/tour-ops";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function QuotationsPage() {
  const [status, setStatus] = useState("ALL");
  const [clientType, setClientType] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.tourOps.quotation.list.useQuery({
    status: status === "ALL" ? undefined : status,
    clientType: clientType === "ALL" ? undefined : clientType,
    page,
    pageSize: 50,
  });

  return (

    <PermissionGuard permission="tour-ops:quotation:read">
      <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quotations</h1>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const).map((s) => (
              <SelectItem key={s} value={s}>{OPS_QUOTATION_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={clientType} onValueChange={(v) => { setClientType(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {(["B2C", "TOUR_OPERATOR", "TRAVEL_AGENT"] as const).map((t) => (
              <SelectItem key={t} value={t}>{OPS_CLIENT_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Selling</TableHead>
              <TableHead className="text-right">Margin %</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(9)].map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                  No quotations found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((q) => (
                <TableRow
                  key={q.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => (window.location.href = `/tour-ops/quotations/${q.id}`)}
                >
                  <TableCell className="font-mono font-medium">
                    {q.code}{q.isFinal && " 🔒"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/tour-ops/files/${q.file.id}`} onClick={(e) => e.stopPropagation()} className="underline-offset-2 hover:underline">
                      {q.file.code}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{q.package.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {OPS_CLIENT_TYPE_LABELS[q.clientType as keyof typeof OPS_CLIENT_TYPE_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">${Number(q.totalCost).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">${Number(q.totalSelling).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-green-600">{Number(q.marginPct).toFixed(1)}%</TableCell>
                  <TableCell className="text-xs">{q.validUntil ? format(new Date(q.validUntil), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={OPS_QUOTATION_STATUS_VARIANTS[q.status as keyof typeof OPS_QUOTATION_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                      {OPS_QUOTATION_STATUS_LABELS[q.status as keyof typeof OPS_QUOTATION_STATUS_LABELS]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.total > 50 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="flex items-center text-sm text-muted-foreground">Page {page}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.total / 50)} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  

    </PermissionGuard>

  );
}
