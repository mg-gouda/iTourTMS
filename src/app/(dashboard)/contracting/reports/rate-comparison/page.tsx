"use client";

import { format } from "date-fns";
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
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_VARIANTS,
} from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";

export default function RateComparisonPage() {
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");

  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data, isLoading } =
    trpc.contracting.reports.rateComparison.useQuery(
      { hotelId: selectedHotelId },
      { enabled: !!selectedHotelId },
    );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">
            Rate Comparison
          </h1>
          <p className="text-muted-foreground">
            Compare base rates across contracts for the same hotel
          </p>
        </div>
        <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select a hotel..." />
          </SelectTrigger>
          <SelectContent>
            {(hotels ?? []).map((h: { id: string; name: string }) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedHotelId && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Select a hotel to compare rates across its contracts.
          </CardContent>
        </Card>
      )}

      {selectedHotelId && isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {data && data.contracts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No contracts found for {data.hotelName}.
          </CardContent>
        </Card>
      )}

      {data && data.contracts.length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {data.hotelName} — {data.contracts.length} contract
                {data.contracts.length !== 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">
                        Season
                      </TableHead>
                      {data.contracts.map((c) => (
                        <TableHead
                          key={c.id}
                          className="text-center min-w-[120px]"
                        >
                          <div>
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {c.code}
                            </div>
                            <Badge
                              variant={
                                (CONTRACT_STATUS_VARIANTS[c.status] as
                                  | "default"
                                  | "secondary") ?? "secondary"
                              }
                              className="mt-1 text-[10px]"
                            >
                              {CONTRACT_STATUS_LABELS[c.status] ?? c.status}
                            </Badge>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Collect all unique season names */}
                    {(() => {
                      const allSeasons = new Map<
                        string,
                        { name: string; dateFrom?: string; dateTo?: string }
                      >();
                      for (const c of data.contracts) {
                        for (const s of c.seasons) {
                          if (!allSeasons.has(s.code)) {
                            allSeasons.set(s.code, {
                              name: s.name,
                              dateFrom: s.dateFrom
                                ? format(
                                    new Date(s.dateFrom),
                                    "dd MMM",
                                  )
                                : undefined,
                              dateTo: s.dateTo
                                ? format(new Date(s.dateTo), "dd MMM")
                                : undefined,
                            });
                          }
                        }
                      }
                      return Array.from(allSeasons.entries()).map(
                        ([seasonCode, season]) => (
                          <TableRow key={seasonCode}>
                            <TableCell className="sticky left-0 bg-background z-10 font-medium">
                              <div>{season.name}</div>
                              {season.dateFrom && (
                                <div className="text-xs text-muted-foreground">
                                  {season.dateFrom} — {season.dateTo}
                                </div>
                              )}
                            </TableCell>
                            {data.contracts.map((c) => {
                              const cSeason = c.seasons.find(
                                (s) => s.code === seasonCode,
                              );
                              const rate = cSeason
                                ? c.baseRates.find(
                                    (r) => r.season?.id === cSeason.id,
                                  )
                                : null;
                              return (
                                <TableCell
                                  key={c.id}
                                  className="text-center font-mono"
                                >
                                  {rate ? (
                                    <div>
                                      <div className="font-medium">
                                        {Number(rate.rate).toFixed(2)}
                                      </div>
                                      {rate.singleRate && (
                                        <div className="text-xs text-muted-foreground">
                                          SGL:{" "}
                                          {Number(rate.singleRate).toFixed(2)}
                                        </div>
                                      )}
                                      {rate.doubleRate && (
                                        <div className="text-xs text-muted-foreground">
                                          DBL:{" "}
                                          {Number(rate.doubleRate).toFixed(2)}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ),
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
