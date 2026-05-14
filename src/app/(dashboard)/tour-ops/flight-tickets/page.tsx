"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";

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
  OPS_FLIGHT_TICKET_STATUS_LABELS,
  OPS_FLIGHT_TICKET_STATUS_VARIANTS,
  OPS_FLIGHT_TYPE_LABELS,
} from "@/lib/constants/tour-ops";
import { trpc } from "@/lib/trpc";

export default function FlightTicketFilesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [flightType, setFlightType] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.tourOps.flightTicket.list.useQuery({
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
    flightType: flightType === "ALL" ? undefined : flightType,
    page,
    pageSize: 50,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Flight Ticket Files</h1>
        <Button asChild>
          <Link href="/tour-ops/flight-tickets/new">
            <Plus className="mr-2 h-4 w-4" /> New Flight Ticket
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search code, route, airline, ticket#..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-8 w-64 text-sm"
        />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="POSTED">Posted</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={flightType} onValueChange={(v) => { setFlightType(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="ONE_WAY">One Way</SelectItem>
            <SelectItem value="RETURN">Return</SelectItem>
            <SelectItem value="MULTI_LEG">Multiple Legs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Ticket #</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground text-sm">
                    No flight ticket files found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30" onClick={() => window.location.href = `/tour-ops/flight-tickets/${t.id}`}>
                    <TableCell className="font-mono text-xs">{t.code}</TableCell>
                    <TableCell className="text-xs">{(t as any).clientName ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs">{OPS_FLIGHT_TYPE_LABELS[t.flightType]}</TableCell>
                    <TableCell className="text-xs font-medium">{t.origin} → {t.destination}</TableCell>
                    <TableCell className="text-xs">{format(new Date(t.departureDate), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{t.ticketNumber ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs">${Number(t.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={`text-right text-xs font-medium ${Number(t.profit) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ${Number(t.profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.opsFile ? (
                        <Link href={`/tour-ops/files/${t.opsFile.id}`} className="font-mono hover:underline" onClick={(e) => e.stopPropagation()}>
                          {t.opsFile.code}
                        </Link>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={OPS_FLIGHT_TICKET_STATUS_VARIANTS[t.status] as "default" | "secondary" | "destructive" | "outline"}>
                        {OPS_FLIGHT_TICKET_STATUS_LABELS[t.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {total > 50 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {Math.min(page * 50, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * 50 >= total}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
