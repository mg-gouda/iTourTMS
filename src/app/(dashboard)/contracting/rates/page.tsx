"use client";

import { format } from "date-fns";
import { Calculator, FileDown, FileSpreadsheet, Filter } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  CHILD_AGE_CATEGORY_LABELS,
  RATE_BASIS_LABELS,
} from "@/lib/constants/contracting";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";

/** Format a season's dates as "dd MMM — dd MMM yyyy" */
function fmtSeasonDates(dateFrom: string, dateTo: string): string {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  return `${format(from, "dd MMM")} — ${format(to, "dd MMM yyyy")}`;
}

export default function RatesPage() {
  const [contractId, setContractId] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("__all__");
  const [roomFilter, setRoomFilter] = useState("__all__");
  const [mealFilter, setMealFilter] = useState("__all__");
  const [exporting, setExporting] = useState(false);

  const { data: contracts, isLoading: loadingContracts } =
    trpc.contracting.contract.list.useQuery();

  const { data: grid, isLoading: loadingGrid } =
    trpc.contracting.rateCalculator.getFullRateGrid.useQuery(
      { contractId },
      { enabled: !!contractId },
    );

  // Selected contract info
  const selectedContract = contracts?.find((c) => c.id === contractId);

  // Reset filters when contract changes
  const handleContractChange = (id: string) => {
    setContractId(id);
    setSeasonFilter("__all__");
    setRoomFilter("__all__");
    setMealFilter("__all__");
  };

  // Filtered cells
  const filteredCells = useMemo(() => {
    if (!grid) return [];
    return grid.cells.filter((cell) => {
      if (seasonFilter !== "__all__" && cell.seasonId !== seasonFilter) return false;
      if (roomFilter !== "__all__" && cell.roomTypeId !== roomFilter) return false;
      if (mealFilter !== "__all__" && cell.mealBasisId !== mealFilter) return false;
      return true;
    });
  }, [grid, seasonFilter, roomFilter, mealFilter]);

  // Filtered child rates
  const filteredChildRates = useMemo(() => {
    if (!grid) return [];
    return grid.childRates.filter((cr) => {
      if (seasonFilter !== "__all__" && cr.seasonId !== seasonFilter) return false;
      if (mealFilter !== "__all__" && cr.mealBasisId !== mealFilter) return false;
      return true;
    });
  }, [grid, seasonFilter, mealFilter]);

  // Build lookup for main grid: "roomTypeId:occLabel:seasonId:mealBasisId" -> cell
  const gridLookup = useMemo(() => {
    const map = new Map<string, (typeof filteredCells)[number]>();
    for (const cell of filteredCells) {
      map.set(`${cell.roomTypeId}:${cell.occupancyLabel}:${cell.seasonId}:${cell.mealBasisId}`, cell);
    }
    return map;
  }, [filteredCells]);

  // Visible meal bases (after filter)
  const visibleMeals = useMemo(() => {
    if (!grid) return [];
    if (mealFilter !== "__all__") return grid.mealBases.filter((mb) => mb.id === mealFilter);
    return grid.mealBases;
  }, [grid, mealFilter]);

  // Visible room types (after filter)
  const visibleRooms = useMemo(() => {
    if (!grid) return [];
    if (roomFilter !== "__all__") return grid.roomTypes.filter((rt) => rt.id === roomFilter);
    return grid.roomTypes;
  }, [grid, roomFilter]);

  // Visible occupancy variants
  const visibleOccupancies = grid?.occupancyVariants ?? [];

  // Unique child rate row keys
  const childRowKeys = useMemo(() => {
    const keys: { category: string; bedding: string; ageRange: string }[] = [];
    const seen = new Set<string>();
    for (const cr of filteredChildRates) {
      const key = `${cr.category}|${cr.bedding}`;
      if (!seen.has(key)) {
        seen.add(key);
        keys.push({ category: cr.category, bedding: cr.bedding, ageRange: cr.ageRange });
      }
    }
    return keys;
  }, [filteredChildRates]);

  const handleExportExcel = async () => {
    if (!grid || !selectedContract) return;
    setExporting(true);
    try {
      const { exportRatesGridToExcel } = await import("@/lib/export/rates-excel");
      await exportRatesGridToExcel(grid, selectedContract.code ?? selectedContract.name);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Calculated Rates
          </h1>
          <p className="page-description">
            Full rate grid with all occupancy variations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={!contractId || loadingGrid}
            onClick={() =>
              window.open(`/api/export/rates-pdf/${contractId}`, "_blank")
            }
          >
            <FileDown className="mr-1 h-4 w-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            disabled={!contractId || loadingGrid || exporting}
            onClick={handleExportExcel}
          >
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>
        </div>
      </div>

      {/* Contract Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Select Contract</label>
              <Select value={contractId} onValueChange={handleContractChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a contract..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingContracts ? (
                    <SelectItem value="__loading__" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    contracts?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.hotel?.name ?? "No Hotel"} ({c.baseCurrency?.code ?? "?"})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {contractId && loadingGrid && (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-[200px] w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* No contract selected */}
      {!contractId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a contract above to view the full rate grid.
          </CardContent>
        </Card>
      )}

      {/* Grid loaded but empty */}
      {grid && grid.seasons.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            This contract has no seasons or base rates configured. Please set up seasons and base rates on the contract detail page first.
          </CardContent>
        </Card>
      )}

      {/* Filters + Info Strip + Grid */}
      {grid && grid.seasons.length > 0 && (
        <>
          {/* Filter Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filters</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Season</label>
                  <Select value={seasonFilter} onValueChange={setSeasonFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Seasons</SelectItem>
                      {grid.seasons.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {fmtSeasonDates(s.dateFrom, s.dateTo)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Room Type</label>
                  <Select value={roomFilter} onValueChange={setRoomFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Room Types</SelectItem>
                      {grid.roomTypes.map((rt) => (
                        <SelectItem key={rt.id} value={rt.id}>
                          {rt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Meal Plan</label>
                  <Select value={mealFilter} onValueChange={setMealFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Meal Plans</SelectItem>
                      {grid.mealBases.map((mb) => (
                        <SelectItem key={mb.id} value={mb.id}>
                          {mb.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Strip */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedContract && (
              <Badge variant="outline">
                {selectedContract.hotel?.name ?? "No Hotel"}
              </Badge>
            )}
            <Badge variant="outline">
              {RATE_BASIS_LABELS[grid.rateBasis] ?? grid.rateBasis}
            </Badge>
            {selectedContract?.baseCurrency && (
              <Badge variant="outline">
                {selectedContract.baseCurrency.code}
              </Badge>
            )}
            {seasonFilter !== "__all__" && (() => {
              const s = grid.seasons.find((s) => s.id === seasonFilter);
              return s ? (
                <Badge variant="secondary">
                  {fmtSeasonDates(s.dateFrom, s.dateTo)}
                </Badge>
              ) : null;
            })()}
          </div>

          {/* Main Rate Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Grid</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCells.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No rates match the current filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[160px]">Room Type</TableHead>
                        <TableHead className="min-w-[60px]">Occ</TableHead>
                        {seasonFilter === "__all__" && (
                          <TableHead className="min-w-[100px]">Season</TableHead>
                        )}
                        {visibleMeals.map((mb) => (
                          <TableHead key={mb.id} className="text-right min-w-[120px]">
                            <div>{mb.name}</div>
                            {mb.suppLabel && (
                              <div className="text-xs font-normal text-muted-foreground">
                                {mb.suppLabel}
                              </div>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleRooms.map((rt) => {
                        const visibleSeasons = seasonFilter !== "__all__"
                          ? grid.seasons.filter((s) => s.id === seasonFilter)
                          : grid.seasons;

                        return (
                          <Fragment key={rt.id}>
                            {/* Room type header row */}
                            <TableRow className="bg-muted/50">
                              <TableCell
                                colSpan={2 + (seasonFilter === "__all__" ? 1 : 0) + visibleMeals.length}
                                className="font-semibold"
                              >
                                {rt.name}
                                {rt.isBase ? (
                                  <Badge variant="secondary" className="ml-2">Base</Badge>
                                ) : rt.suppLabel ? (
                                  <span className="ml-2 text-xs text-muted-foreground">{rt.suppLabel}</span>
                                ) : null}
                              </TableCell>
                            </TableRow>

                            {/* Occupancy × Season rows */}
                            {visibleOccupancies.map((variant) =>
                              visibleSeasons.map((season, sIdx) => {
                                const hasAnyCells = visibleMeals.some((mb) =>
                                  gridLookup.has(`${rt.id}:${variant.label}:${season.id}:${mb.id}`),
                                );
                                if (!hasAnyCells) return null;

                                return (
                                  <TableRow key={`${rt.id}:${variant.label}:${season.id}`}>
                                    {sIdx === 0 ? (
                                      <TableCell
                                        className="pl-8 font-medium"
                                        rowSpan={seasonFilter === "__all__" ? visibleSeasons.length : 1}
                                      >
                                        {variant.label}
                                      </TableCell>
                                    ) : seasonFilter !== "__all__" ? (
                                      <TableCell className="pl-8 font-medium">
                                        {variant.label}
                                      </TableCell>
                                    ) : null}
                                    {seasonFilter === "__all__" && (
                                      <TableCell className="text-xs text-muted-foreground">
                                        {fmtSeasonDates(season.dateFrom, season.dateTo)}
                                      </TableCell>
                                    )}
                                    {visibleMeals.map((mb) => {
                                      const cell = gridLookup.get(
                                        `${rt.id}:${variant.label}:${season.id}:${mb.id}`,
                                      );
                                      return (
                                        <TableCell key={mb.id} className="text-right font-mono text-sm">
                                          {cell ? (
                                            <div>
                                              <span>{formatCurrency(cell.adultRate)}</span>
                                              {cell.childRate > 0 && (
                                                <div className="text-xs text-muted-foreground">
                                                  +{formatCurrency(cell.childRate)} child
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </TableCell>
                                      );
                                    })}
                                  </TableRow>
                                );
                              }),
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Child Rates Table */}
          {childRowKeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Child Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Category</TableHead>
                        <TableHead className="min-w-[80px]">Age</TableHead>
                        <TableHead className="min-w-[100px]">Bedding</TableHead>
                        {seasonFilter === "__all__" && (
                          <TableHead className="min-w-[100px]">Season</TableHead>
                        )}
                        {visibleMeals.map((mb) => (
                          <TableHead key={mb.id} className="text-right min-w-[100px]">
                            {mb.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {childRowKeys.map((row) => {
                        const key = `${row.category}|${row.bedding}`;
                        const visibleSeasons = seasonFilter !== "__all__"
                          ? grid.seasons.filter((s) => s.id === seasonFilter)
                          : grid.seasons;

                        return visibleSeasons.map((season, sIdx) => (
                          <TableRow key={`${key}:${season.id}`}>
                            {sIdx === 0 ? (
                              <>
                                <TableCell
                                  className="font-medium"
                                  rowSpan={seasonFilter === "__all__" ? visibleSeasons.length : 1}
                                >
                                  {CHILD_AGE_CATEGORY_LABELS[row.category] ?? row.category}
                                </TableCell>
                                <TableCell
                                  className="text-muted-foreground"
                                  rowSpan={seasonFilter === "__all__" ? visibleSeasons.length : 1}
                                >
                                  {row.ageRange}
                                </TableCell>
                                <TableCell
                                  className="text-muted-foreground"
                                  rowSpan={seasonFilter === "__all__" ? visibleSeasons.length : 1}
                                >
                                  {row.bedding}
                                </TableCell>
                              </>
                            ) : null}
                            {seasonFilter === "__all__" && (
                              <TableCell className="text-xs text-muted-foreground">
                                {fmtSeasonDates(season.dateFrom, season.dateTo)}
                              </TableCell>
                            )}
                            {visibleMeals.map((mb) => {
                              const matchCr = filteredChildRates.find(
                                (c) =>
                                  c.category === row.category &&
                                  c.bedding === row.bedding &&
                                  c.mealBasisId === mb.id &&
                                  c.seasonId === season.id,
                              );
                              return (
                                <TableCell key={mb.id} className="text-right font-mono text-sm">
                                  {matchCr ? (
                                    matchCr.isFree ? (
                                      <Badge variant="secondary" className="font-normal">
                                        FREE
                                      </Badge>
                                    ) : (
                                      formatCurrency(matchCr.rate)
                                    )
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ));
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
