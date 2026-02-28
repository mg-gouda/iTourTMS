"use client";

import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANTS,
} from "@/lib/constants/reservations";
import { exportArrivalListPdf } from "@/lib/export/arrival-list-pdf";
import { trpc } from "@/lib/trpc";

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [hotelId, setHotelId] = useState("");

  // Arrival List filters
  const [alDateFrom, setAlDateFrom] = useState("");
  const [alDateTo, setAlDateTo] = useState("");
  const [alDestinationId, setAlDestinationId] = useState("");
  const [alZoneId, setAlZoneId] = useState("");

  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data: destinations } = trpc.contracting.destination.list.useQuery();

  const filterInput = {
    hotelId: hotelId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data: revenue, isLoading: revenueLoading } =
    trpc.reservations.reports.revenue.useQuery(filterInput);
  const { data: occupancy, isLoading: occupancyLoading } =
    trpc.reservations.reports.occupancy.useQuery(filterInput);
  const { data: arrivals, isLoading: arrivalsLoading } =
    trpc.reservations.reports.upcomingArrivals.useQuery();
  const { data: departures, isLoading: departuresLoading } =
    trpc.reservations.reports.upcomingDepartures.useQuery();

  // Arrival List data — get cities for the destination, then zones for the first city
  const { data: destCities } =
    trpc.contracting.destination.listCities.useQuery(
      { destinationId: alDestinationId },
      { enabled: !!alDestinationId },
    );
  const firstCityId = destCities?.[0]?.id;
  const { data: cityZones } =
    trpc.contracting.destination.listZones.useQuery(
      { cityId: firstCityId! },
      { enabled: !!firstCityId },
    );
  const destinationZones = cityZones ?? [];

  const alFiltersReady = !!alDateFrom && !!alDateTo;
  const { data: arrivalList, isLoading: arrivalListLoading } =
    trpc.reservations.reports.arrivalList.useQuery(
      {
        dateFrom: alDateFrom,
        dateTo: alDateTo,
        destinationId: alDestinationId || undefined,
        zoneId: alZoneId || undefined,
      },
      { enabled: alFiltersReady },
    );

  // Payment Option Date filters
  const [podDateFrom, setPodDateFrom] = useState("");
  const [podDateTo, setPodDateTo] = useState("");
  const podFiltersReady = !!podDateFrom && !!podDateTo;
  const { data: podData, isLoading: podLoading } =
    trpc.reservations.reports.paymentOptionDate.useQuery(
      { dateFrom: podDateFrom, dateTo: podDateTo },
      { enabled: podFiltersReady },
    );
  const [podSort, setPodSort] = useState<"asc" | "desc" | null>(null);
  const podCurrencies = useMemo(() => {
    if (!podData?.currencyTotals) return [];
    return podData.currencyTotals.map((ct) => ct.code);
  }, [podData?.currencyTotals]);
  const podRows = useMemo(() => {
    if (!podData?.rows) return [];
    if (!podSort) return podData.rows;
    return [...podData.rows].sort((a, b) => {
      const aTime = a.paymentOptionDate
        ? new Date(a.paymentOptionDate).getTime()
        : 0;
      const bTime = b.paymentOptionDate
        ? new Date(b.paymentOptionDate).getTime()
        : 0;
      return podSort === "asc" ? aTime - bTime : bTime - aTime;
    });
  }, [podData?.rows, podSort]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Revenue, occupancy, and operational reports
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Hotel</Label>
              <Select
                value={hotelId || "__all__"}
                onValueChange={(v) => setHotelId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All hotels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Hotels</SelectItem>
                  {(hotels ?? []).map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input
                type="date"
                className="w-[160px]"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input
                type="date"
                className="w-[160px]"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            {(hotelId || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setHotelId("");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="arrivals">Arrivals & Departures</TabsTrigger>
          <TabsTrigger value="arrival-list">Arrival List</TabsTrigger>
          <TabsTrigger value="payment-option">Payment Option Date</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          {/* KPI Summary — grouped by currency */}
          {revenueLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <SummaryCard label="Selling Total" isLoading />
              <SummaryCard label="Buying Total" isLoading />
              <SummaryCard label="Margin" isLoading />
              <SummaryCard label="Total Paid" isLoading />
              <SummaryCard label="Outstanding" isLoading />
            </div>
          ) : (
            (revenue?.currencies ?? []).map((ct) => (
              <div key={ct.currencyCode}>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                  {ct.currencyCode} ({ct.bookingCount}{" "}
                  {ct.bookingCount === 1 ? "booking" : "bookings"})
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <SummaryCard
                    label={`Selling (${ct.currencySymbol})`}
                    value={ct.totalSelling}
                    isLoading={false}
                    isCurrency
                  />
                  <SummaryCard
                    label={`Buying (${ct.currencySymbol})`}
                    value={ct.totalBuying}
                    isLoading={false}
                    isCurrency
                  />
                  <SummaryCard
                    label={`Margin (${ct.currencySymbol})`}
                    value={ct.totalMargin}
                    isLoading={false}
                    isCurrency
                  />
                  <SummaryCard
                    label={`Paid (${ct.currencySymbol})`}
                    value={ct.totalPaid}
                    isLoading={false}
                    isCurrency
                  />
                  <SummaryCard
                    label={`Outstanding (${ct.currencySymbol})`}
                    value={ct.totalOutstanding}
                    isLoading={false}
                    isCurrency
                  />
                </div>
              </div>
            ))
          )}

          {/* By Hotel Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Hotel</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenue?.byHotel ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hotelId"
                      tick={false}
                      label={{ value: "Hotels", position: "bottom" }}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(_, payload) => {
                        const item = payload?.[0]?.payload;
                        return item?.name
                          ? `${item.name} (${item.currencyCode})`
                          : "";
                      }}
                    />
                    <Bar
                      dataKey="selling"
                      fill="#3b82f6"
                      name="Selling"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="buying"
                      fill="#94a3b8"
                      name="Buying"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* By Source Table */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Source</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-[120px] w-full" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Bookings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(revenue?.bySource ?? []).map((s) => (
                        <TableRow key={s.source}>
                          <TableCell className="font-medium">
                            {s.source}
                          </TableCell>
                          <TableCell className="text-right">{s.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* By Tour Operator Table */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Tour Operator</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-[120px] w-full" />
                ) : (revenue?.byTourOperator ?? []).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tour Operator</TableHead>
                        <TableHead className="text-center">Currency</TableHead>
                        <TableHead className="text-right">Bookings</TableHead>
                        <TableHead className="text-right">Selling</TableHead>
                        <TableHead className="text-right">Buying</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(revenue?.byTourOperator ?? []).map((t) => (
                        <TableRow key={`${t.tourOperatorId}-${t.currencyCode}`}>
                          <TableCell className="font-medium">
                            {t.name}
                          </TableCell>
                          <TableCell className="text-center">
                            {t.currencyCode}
                          </TableCell>
                          <TableCell className="text-right">{t.count}</TableCell>
                          <TableCell className="text-right font-mono">
                            {t.selling.toLocaleString("en", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {t.buying.toLocaleString("en", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(t.selling - t.buying).toLocaleString("en", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No tour operator bookings found.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Occupancy Tab */}
        <TabsContent value="occupancy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hotel Occupancy</CardTitle>
            </CardHeader>
            <CardContent>
              {occupancyLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : occupancy?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hotel</TableHead>
                      <TableHead className="text-right">Total Rooms</TableHead>
                      <TableHead className="text-right">Room Nights Booked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {occupancy.map((o) => (
                      <TableRow key={o.hotelId}>
                        <TableCell className="font-medium">{o.hotelName}</TableCell>
                        <TableCell className="text-right">{o.totalRooms}</TableCell>
                        <TableCell className="text-right font-mono">
                          {o.roomNightsBooked}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No occupancy data for the selected filters.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Arrivals & Departures Tab */}
        <TabsContent value="arrivals" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Upcoming Arrivals */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Arrivals (7 days)</CardTitle>
              </CardHeader>
              <CardContent>
                {arrivalsLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : arrivals?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking</TableHead>
                        <TableHead>Hotel</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Rooms</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {arrivals.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono font-medium">
                            {a.code}
                          </TableCell>
                          <TableCell>{a.hotel.name}</TableCell>
                          <TableCell>
                            {format(new Date(a.checkIn), "dd MMM")}
                          </TableCell>
                          <TableCell>{a._count.rooms}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No upcoming arrivals.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Departures */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Departures (7 days)</CardTitle>
              </CardHeader>
              <CardContent>
                {departuresLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : departures?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking</TableHead>
                        <TableHead>Hotel</TableHead>
                        <TableHead>Check-out</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departures.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono font-medium">
                            {d.code}
                          </TableCell>
                          <TableCell>{d.hotel.name}</TableCell>
                          <TableCell>
                            {format(new Date(d.checkOut), "dd MMM")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No upcoming departures.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Arrival List Tab */}
        <TabsContent value="arrival-list" className="space-y-4">
          {/* Arrival List Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label>Date From *</Label>
                  <Input
                    type="date"
                    className="w-[160px]"
                    value={alDateFrom}
                    onChange={(e) => setAlDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date To *</Label>
                  <Input
                    type="date"
                    className="w-[160px]"
                    value={alDateTo}
                    onChange={(e) => setAlDateTo(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Destination</Label>
                  <Select
                    value={alDestinationId || "__all__"}
                    onValueChange={(v) => {
                      setAlDestinationId(v === "__all__" ? "" : v);
                      setAlZoneId("");
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Destinations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Destinations</SelectItem>
                      {(destinations ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {alDestinationId && destinationZones.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Zone</Label>
                    <Select
                      value={alZoneId || "__all__"}
                      onValueChange={(v) =>
                        setAlZoneId(v === "__all__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Zones" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Zones</SelectItem>
                        {destinationZones.map(
                          (z: { id: string; name: string }) => (
                            <SelectItem key={z.id} value={z.id}>
                              {z.name}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(alDateFrom || alDateTo || alDestinationId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAlDateFrom("");
                      setAlDateTo("");
                      setAlDestinationId("");
                      setAlZoneId("");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
                {alFiltersReady && arrivalList && (
                  <Button
                    size="sm"
                    className="ml-auto"
                    onClick={() =>
                      exportArrivalListPdf({
                        dateFrom: alDateFrom,
                        dateTo: alDateTo,
                        rows: arrivalList.rows,
                        summary: arrivalList.summary,
                      })
                    }
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {!alFiltersReady ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-sm text-muted-foreground">
                  Select a date range to view the arrival list.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <SummaryCard
                  label="Total Room/Nights"
                  value={arrivalList?.summary.totalRoomNights}
                  isLoading={arrivalListLoading}
                />
                <SummaryCard
                  label="TTL No Rooms"
                  value={arrivalList?.summary.totalRooms}
                  isLoading={arrivalListLoading}
                />
                <SummaryCard
                  label="TTL Adult"
                  value={arrivalList?.summary.totalAdults}
                  isLoading={arrivalListLoading}
                />
                <SummaryCard
                  label="TTL CHD"
                  value={arrivalList?.summary.totalChildren}
                  isLoading={arrivalListLoading}
                />
                <SummaryCard
                  label="TTL INF"
                  value={arrivalList?.summary.totalInfants}
                  isLoading={arrivalListLoading}
                />
              </div>

              {/* Data table */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Arrival List
                    {arrivalList && (
                      <Badge variant="secondary" className="ml-2">
                        {arrivalList.rows.length} rows
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {arrivalListLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : arrivalList?.rows.length ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Market</TableHead>
                            <TableHead className="text-center">
                              No RMS
                            </TableHead>
                            <TableHead>Hotel Name</TableHead>
                            <TableHead>Room Type</TableHead>
                            <TableHead>Guest Name</TableHead>
                            <TableHead className="text-center">
                              Arr Date
                            </TableHead>
                            <TableHead className="text-center">
                              Dep Date
                            </TableHead>
                            <TableHead className="text-center">NTS</TableHead>
                            <TableHead className="text-center">MB</TableHead>
                            <TableHead className="text-center">AD</TableHead>
                            <TableHead className="text-center">CH</TableHead>
                            <TableHead className="text-center">INF</TableHead>
                            <TableHead className="text-center">
                              1st CHD Age
                            </TableHead>
                            <TableHead className="text-center">
                              2nd CHD Age
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {arrivalList.rows.map((r, idx) => (
                            <TableRow key={`${r.bookingId}-${idx}`}>
                              <TableCell>{r.market}</TableCell>
                              <TableCell className="text-center">
                                {r.noOfRooms}
                              </TableCell>
                              <TableCell className="font-medium">
                                {r.hotelName}
                              </TableCell>
                              <TableCell>{r.roomType}</TableCell>
                              <TableCell>{r.guestName}</TableCell>
                              <TableCell className="text-center">
                                {format(new Date(r.checkIn), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell className="text-center">
                                {format(new Date(r.checkOut), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.nights}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.mealBasis}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.adults}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.children}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.infants}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.child1Age ?? ""}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.child2Age ?? ""}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No arrivals found for the selected date range.
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Payment Option Date Tab */}
        <TabsContent value="payment-option" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label>Date From *</Label>
                  <Input
                    type="date"
                    className="w-[160px]"
                    value={podDateFrom}
                    onChange={(e) => setPodDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date To *</Label>
                  <Input
                    type="date"
                    className="w-[160px]"
                    value={podDateTo}
                    onChange={(e) => setPodDateTo(e.target.value)}
                  />
                </div>
                {/* Currency totals inline */}
                {podData &&
                  podData.currencyTotals.map((ct) => (
                    <div
                      key={ct.code}
                      className="ml-auto flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold"
                    >
                      <span className="text-muted-foreground">
                        TTL Hotel Payment in {ct.symbol}:
                      </span>
                      <span className="font-mono">
                        {ct.symbol}{" "}
                        {ct.total.toLocaleString("en", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ))}
                {(podDateFrom || podDateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPodDateFrom("");
                      setPodDateTo("");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {!podFiltersReady ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-sm text-muted-foreground">
                  Select a date range to view the payment option date report.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  Payment Option Date
                  {podData && (
                    <Badge variant="secondary" className="ml-2">
                      {podData.rows.length} bookings
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {podLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : podRows.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Booking Ref</TableHead>
                          <TableHead>T/O BKG Ref</TableHead>
                          <TableHead className="text-center">
                            Arr Date
                          </TableHead>
                          <TableHead className="text-center">
                            Dep Date
                          </TableHead>
                          <TableHead>Hotel Name</TableHead>
                          {podCurrencies.map((code) => (
                            <TableHead
                              key={code}
                              className="text-right"
                            >
                              Cost {code}
                            </TableHead>
                          ))}
                          <TableHead
                            className="cursor-pointer select-none text-center"
                            onClick={() =>
                              setPodSort((prev) =>
                                prev === null
                                  ? "asc"
                                  : prev === "asc"
                                    ? "desc"
                                    : null,
                              )
                            }
                          >
                            <span className="inline-flex items-center gap-1">
                              P. Option Date
                              {podSort === null && (
                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              {podSort === "asc" && (
                                <ArrowUp className="h-3.5 w-3.5" />
                              )}
                              {podSort === "desc" && (
                                <ArrowDown className="h-3.5 w-3.5" />
                              )}
                            </span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {podRows.map((r) => (
                          <TableRow key={r.bookingId}>
                            <TableCell className="font-mono font-medium">
                              {r.bookingCode}
                            </TableCell>
                            <TableCell className="font-mono">
                              {r.externalRef}
                            </TableCell>
                            <TableCell className="text-center">
                              {format(new Date(r.checkIn), "dd-MMM-yy")}
                            </TableCell>
                            <TableCell className="text-center">
                              {format(new Date(r.checkOut), "dd-MMM-yy")}
                            </TableCell>
                            <TableCell className="font-medium">
                              {r.hotelName}
                            </TableCell>
                            {podCurrencies.map((code) => (
                              <TableCell
                                key={code}
                                className="text-right font-mono"
                              >
                                {r.currencyCode === code
                                  ? r.cost.toLocaleString("en", {
                                      minimumFractionDigits: 2,
                                    })
                                  : ""}
                              </TableCell>
                            ))}
                            <TableCell className="text-center">
                              {r.paymentOptionDate
                                ? format(
                                    new Date(r.paymentOptionDate),
                                    "dd-MMM-yy",
                                  )
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      {/* Totals row */}
                      <tfoot>
                        <TableRow className="border-t-2 font-semibold">
                          <TableCell
                            colSpan={5}
                            className="text-right"
                          >
                            Total
                          </TableCell>
                          {podCurrencies.map((code) => {
                            const ct = podData?.currencyTotals.find(
                              (c) => c.code === code,
                            );
                            return (
                              <TableCell
                                key={code}
                                className="text-right font-mono"
                              >
                                {(ct?.total ?? 0).toLocaleString("en", {
                                  minimumFractionDigits: 2,
                                })}
                              </TableCell>
                            );
                          })}
                          <TableCell />
                        </TableRow>
                      </tfoot>
                    </Table>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No bookings found for the selected date range.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  isLoading,
  isCurrency,
}: {
  label: string;
  value?: number;
  isLoading: boolean;
  isCurrency?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLoading ? (
          <Skeleton className="mt-1 h-6 w-16" />
        ) : (
          <p className="text-lg font-bold font-mono tabular-nums">
            {isCurrency
              ? Number(value ?? 0).toLocaleString("en", {
                  minimumFractionDigits: 2,
                })
              : (value ?? 0)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
