"use client";

import { format } from "date-fns";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc";

const BASIS_LABELS: Record<string, string> = {
  FREESALE: "Free Sale",
  ON_REQUEST: "On Request",
  COMMITMENT: "Commitment",
  ALLOCATION: "Allocation",
};

const BASIS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  FREESALE: "default",
  ON_REQUEST: "secondary",
  COMMITMENT: "outline",
  ALLOCATION: "default",
};

export default function AllotmentsPage() {
  const [hotelId, setHotelId] = useState("ALL");

  const { data: hotels } = trpc.contracting.hotel.list.useQuery();

  // Get calendar for next 12 months
  const dateFrom = new Date().toISOString().slice(0, 10);
  const dateTo = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  const { data, isLoading } = trpc.contracting.contractAllotment.calendar.useQuery({
    hotelId: hotelId === "ALL" ? undefined : hotelId,
    dateFrom,
    dateTo,
  });

  // Group allotments by contract
  const grouped = useMemo(() => {
    if (!data) return [];

    const contractMap = new Map<
      string,
      {
        contract: (typeof data.contracts)[0];
        allotments: (typeof data.allotments)[0][];
        stopSales: (typeof data.stopSales)[0][];
      }
    >();

    for (const c of data.contracts) {
      contractMap.set(c.id, { contract: c, allotments: [], stopSales: [] });
    }

    for (const a of data.allotments) {
      const entry = contractMap.get(a.contractId);
      if (entry) entry.allotments.push(a);
    }

    for (const ss of data.stopSales) {
      const entry = contractMap.get(ss.contractId);
      if (entry) entry.stopSales.push(ss);
    }

    return Array.from(contractMap.values()).filter(
      (e) => e.allotments.length > 0 || e.stopSales.length > 0,
    );
  }, [data]);

  // Summary stats
  const totalAllotments = data?.allotments.length ?? 0;
  const totalStopSales = data?.stopSales.length ?? 0;
  const freeSaleCount = data?.allotments.filter((a) => a.freeSale).length ?? 0;
  const totalRooms = data?.allotments.reduce((sum, a) => sum + a.totalRooms, 0) ?? 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">Allotments</h1>
          <p className="text-muted-foreground">
            Cross-contract allotment overview with availability status
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={hotelId} onValueChange={setHotelId}>
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue placeholder="Filter by hotel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Hotels</SelectItem>
            {hotels?.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Allotments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAllotments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRooms}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Free Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{freeSaleCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Stop Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totalStopSales}</div>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No allotments found for the selected period.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ contract, allotments, stopSales }) => (
            <Card key={contract.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {contract.name}{" "}
                    <span className="text-muted-foreground font-normal">
                      — {contract.hotel.name}
                    </span>
                  </CardTitle>
                  {stopSales.length > 0 && (
                    <Badge variant="destructive">
                      {stopSales.length} Stop Sale{stopSales.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room Type</TableHead>
                      <TableHead>Basis</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Sold</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allotments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.roomType.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={BASIS_COLORS[a.basis] ?? "secondary"}>
                            {BASIS_LABELS[a.basis] ?? a.basis}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {a.freeSale ? "∞" : a.totalRooms}
                        </TableCell>
                        <TableCell className="text-right">{a.soldRooms}</TableCell>
                        <TableCell className="text-right">
                          {a.freeSale ? "∞" : Math.max(0, a.totalRooms - a.soldRooms)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {stopSales.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-sm font-medium text-destructive mb-2">
                      Stop Sales
                    </p>
                    <div className="space-y-1">
                      {stopSales.map((ss) => (
                        <div
                          key={ss.id}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <span>
                            {format(new Date(ss.dateFrom), "dd MMM yyyy")} —{" "}
                            {format(new Date(ss.dateTo), "dd MMM yyyy")}
                          </span>
                          {ss.roomType && (
                            <Badge variant="outline" className="text-xs">
                              {ss.roomType.name}
                            </Badge>
                          )}
                          {!ss.roomType && (
                            <Badge variant="destructive" className="text-xs">
                              All Rooms
                            </Badge>
                          )}
                          {ss.reason && <span className="italic">— {ss.reason}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
