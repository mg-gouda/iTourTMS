"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  OPS_CLIENT_TYPE_LABELS,
  OPS_FILE_STATUS_LABELS,
  OPS_FILE_STATUS_VARIANTS,
} from "@/lib/constants/tour-ops";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function OpsFilesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [clientType, setClientType] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.tourOps.file.list.useQuery({
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
    clientType: clientType === "ALL" ? undefined : clientType,
    page,
    pageSize: 50,
  });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Files</h1>
        <Button asChild>
          <Link href="/tour-ops/files/new">
            <Plus className="mr-2 h-4 w-4" /> New File
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search code, guest name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-64"
        />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {(["DRAFT", "QUOTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((s) => (
              <SelectItem key={s} value={s}>{OPS_FILE_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={clientType} onValueChange={(v) => { setClientType(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Client Types" />
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
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Travel From</TableHead>
              <TableHead>Pax</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No files found.{" "}
                  <Link href="/tour-ops/files/new" className="underline">Create your first file</Link>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((file) => {
                const clientName =
                  file.customer
                    ? `${file.customer.firstName} ${file.customer.lastName}`
                    : file.tourOperator?.name ?? file.guestName ?? "—";
                const revenue = file.quotations[0] ? Number(file.quotations[0].totalSelling) : null;
                return (
                  <PermissionGuard permission="tour-ops:file:read">
                    <TableRow
                    key={file.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => (window.location.href = `/tour-ops/files/${file.id}`)}
                  >
                    <TableCell className="font-mono font-medium">{file.code}</TableCell>
                    <TableCell>{clientName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {OPS_CLIENT_TYPE_LABELS[file.clientType as keyof typeof OPS_CLIENT_TYPE_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(file.travelFrom), "dd MMM yyyy")}</TableCell>
                    <TableCell>{file.adults + file.children + file.infants}</TableCell>
                    <TableCell className="text-right">
                      {revenue !== null ? `$${revenue.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={OPS_FILE_STATUS_VARIANTS[file.status as keyof typeof OPS_FILE_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                        {OPS_FILE_STATUS_LABELS[file.status as keyof typeof OPS_FILE_STATUS_LABELS]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  </PermissionGuard>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.total > 50 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="flex items-center text-sm text-muted-foreground">Page {page} of {Math.ceil(data.total / 50)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.total / 50)} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
