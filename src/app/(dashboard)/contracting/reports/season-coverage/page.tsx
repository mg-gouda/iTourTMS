"use client";

import {
  differenceInDays,
  eachMonthOfInterval,
  endOfYear,
  format,
  isWithinInterval,
  startOfYear,
} from "date-fns";
import { useState } from "react";

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
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export default function SeasonCoveragePage() {
  const [selectedHotelId, setSelectedHotelId] = useState<string>("ALL");
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data, isLoading } =
    trpc.contracting.reports.seasonCoverage.useQuery(
      selectedHotelId === "ALL" ? {} : { hotelId: selectedHotelId },
    );

  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
  const totalDays = differenceInDays(yearEnd, yearStart) + 1;

  // Build coverage data per contract
  const coverageData = (data ?? []).map((contract) => {
    const seasons = (contract.seasons ?? []).map((s) => ({
      name: s.name,
      code: s.code,
      dateFrom: new Date(s.dateFrom),
      dateTo: new Date(s.dateTo),
    }));

    // Calculate covered days in this year
    const coveredDays = new Set<number>();
    for (const season of seasons) {
      const start = season.dateFrom < yearStart ? yearStart : season.dateFrom;
      const end = season.dateTo > yearEnd ? yearEnd : season.dateTo;
      if (start <= end) {
        for (let d = start.getTime(); d <= end.getTime(); d += 86400000) {
          coveredDays.add(
            differenceInDays(new Date(d), yearStart),
          );
        }
      }
    }

    return {
      id: contract.id,
      name: contract.name,
      code: contract.code,
      hotelName: contract.hotel?.name ?? "—",
      seasons,
      coveragePercent: Math.round((coveredDays.size / totalDays) * 100),
      coveredDays,
    };
  });

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">
            Season Coverage
          </h1>
          <p className="text-muted-foreground">
            Visualize date coverage across contract seasons
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Hotels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Hotels</SelectItem>
              {(hotels ?? []).map((h: { id: string; name: string }) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : coverageData.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No contracts found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {year} Coverage — {coverageData.length} contract
              {coverageData.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Month header */}
            <div className="flex items-center mb-2">
              <div className="w-48 shrink-0" />
              <div className="flex flex-1">
                {months.map((m) => (
                  <div
                    key={m.toISOString()}
                    className="flex-1 text-center text-xs text-muted-foreground"
                  >
                    {format(m, "MMM")}
                  </div>
                ))}
              </div>
              <div className="w-16 text-center text-xs text-muted-foreground">
                Coverage
              </div>
            </div>

            {/* Contract rows */}
            <div className="space-y-1">
              {coverageData.map((contract) => (
                <div key={contract.id} className="flex items-center">
                  <div className="w-48 shrink-0 pr-3">
                    <div className="text-sm font-medium truncate">
                      {contract.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {contract.hotelName}
                    </div>
                  </div>
                  <div className="flex flex-1 h-6 rounded overflow-hidden bg-muted/30 border">
                    {/* Render colored segments for each season */}
                    {contract.seasons.map((season, idx) => {
                      const sStart =
                        season.dateFrom < yearStart
                          ? yearStart
                          : season.dateFrom;
                      const sEnd =
                        season.dateTo > yearEnd ? yearEnd : season.dateTo;
                      if (sStart > yearEnd || sEnd < yearStart) return null;

                      const leftPct =
                        (differenceInDays(sStart, yearStart) / totalDays) * 100;
                      const widthPct =
                        ((differenceInDays(sEnd, sStart) + 1) / totalDays) *
                        100;

                      const colors = [
                        "bg-blue-500/70",
                        "bg-emerald-500/70",
                        "bg-amber-500/70",
                        "bg-violet-500/70",
                        "bg-rose-500/70",
                        "bg-cyan-500/70",
                      ];

                      return (
                        <div
                          key={season.code}
                          className={cn(
                            "absolute h-full",
                            colors[idx % colors.length],
                          )}
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                          }}
                          title={`${season.name}: ${format(season.dateFrom, "dd MMM")} — ${format(season.dateTo, "dd MMM")}`}
                        />
                      );
                    })}
                  </div>
                  <div className="w-16 text-center text-xs font-mono">
                    {contract.coveragePercent}%
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                Hover over colored segments to see season details. Gaps indicate
                dates without season coverage.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
