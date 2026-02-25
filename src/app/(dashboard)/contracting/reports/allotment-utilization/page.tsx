"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

const BASIS_LABELS: Record<string, string> = {
  FREESALE: "Free Sale",
  ON_REQUEST: "On Request",
  COMMITMENT: "Commitment",
  ALLOCATION: "Allocation",
};

function UtilizationBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percent >= 80 ? "bg-destructive" : percent >= 50 ? "bg-amber-500" : "bg-emerald-500",
          )}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-xs font-mono w-10 text-right">{percent}%</span>
    </div>
  );
}

export default function AllotmentUtilizationPage() {
  const [hotelId, setHotelId] = useState("ALL");

  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data, isLoading } =
    trpc.contracting.reports.allotmentUtilization.useQuery(
      hotelId === "ALL" ? {} : { hotelId },
    );

  const totalRooms = data?.reduce((s, c) => s + c.totalRooms, 0) ?? 0;
  const totalSold = data?.reduce((s, c) => s + c.soldRooms, 0) ?? 0;
  const avgUtilization = totalRooms > 0 ? Math.round((totalSold / totalRooms) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">
            Allotment Utilization
          </h1>
          <p className="text-muted-foreground">
            Room allocation usage across contracts
          </p>
        </div>
        <Select value={hotelId} onValueChange={setHotelId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Hotels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Hotels</SelectItem>
            {(hotels ?? []).map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.length ?? 0}</div>
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
              Sold Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSold}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUtilization}%</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {data.map((contract) => (
            <Card key={contract.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {contract.name}{" "}
                    <span className="text-muted-foreground font-normal">
                      — {contract.hotelName}
                    </span>
                  </CardTitle>
                  <UtilizationBar percent={contract.utilization} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room Type</TableHead>
                      <TableHead>Season</TableHead>
                      <TableHead>Basis</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Sold</TableHead>
                      <TableHead>Utilization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contract.allotments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.roomTypeName}
                        </TableCell>
                        <TableCell>{a.seasonName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {BASIS_LABELS[a.basis] ?? a.basis}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {a.freeSale ? "∞" : a.totalRooms}
                        </TableCell>
                        <TableCell className="text-right">{a.soldRooms}</TableCell>
                        <TableCell>
                          {a.freeSale ? (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          ) : (
                            <UtilizationBar percent={a.utilization} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No contracts with allotments found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
