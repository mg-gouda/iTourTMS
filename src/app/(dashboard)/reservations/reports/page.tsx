"use client";

import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, FileDown, FileSpreadsheet } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
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
import { Combobox } from "@/components/ui/combobox";
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
import { exportReportToExcel } from "@/lib/export/report-excel";
import { exportReportToPdf } from "@/lib/export/report-pdf";
import { trpc } from "@/lib/trpc";

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [hotelId, setHotelId] = useState("");

  // Arrival List filters
  const [alDateFrom, setAlDateFrom] = useState("");
  const [alDateTo, setAlDateTo] = useState("");
  const [alCityId, setAlCityId] = useState("");
  const [alStatus, setAlStatus] = useState("");

  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data: destinations } = trpc.contracting.destination.list.useQuery();
  const { data: allCities } = trpc.contracting.destination.listAllCities.useQuery();

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

  const alFiltersReady = !!alDateFrom && !!alDateTo;
  const { data: arrivalList, isLoading: arrivalListLoading } =
    trpc.reservations.reports.arrivalList.useQuery(
      {
        dateFrom: alDateFrom,
        dateTo: alDateTo,
        cityId: alCityId || undefined,
        status: (alStatus || undefined) as
          | "NEW_BOOKING" | "DRAFT" | "CONFIRMED" | "CHECKED_IN"
          | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW"
          | undefined,
      },
      { enabled: alFiltersReady },
    );

  // Materialization filters
  const [matHotelId, setMatHotelId] = useState("");
  const [matDateFrom, setMatDateFrom] = useState("");
  const [matDateTo, setMatDateTo] = useState("");
  const matFiltersReady = !!matHotelId && !!matDateFrom && !!matDateTo;
  const { data: matData, isLoading: matLoading } =
    trpc.reservations.reports.materialization.useQuery(
      { hotelId: matHotelId, dateFrom: matDateFrom, dateTo: matDateTo },
      { enabled: matFiltersReady },
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
          <TabsTrigger value="materialization">Materialization</TabsTrigger>
          <TabsTrigger value="production-to">Production by TO</TabsTrigger>
          <TabsTrigger value="cancellation">Cancellations</TabsTrigger>
          <TabsTrigger value="no-show">No-Shows</TabsTrigger>
          <TabsTrigger value="lead-time">Lead Time</TabsTrigger>
          <TabsTrigger value="market-mix">Market Mix</TabsTrigger>
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
                  <Label>City</Label>
                  <Combobox
                    options={(allCities ?? []).map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    value={alCityId}
                    onValueChange={setAlCityId}
                    placeholder="All Cities"
                    searchPlaceholder="Search city…"
                    className="w-[200px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Booking Status</Label>
                  <Select
                    value={alStatus || "__all__"}
                    onValueChange={(v) =>
                      setAlStatus(v === "__all__" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Statuses</SelectItem>
                      {Object.entries(BOOKING_STATUS_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {(alDateFrom || alDateTo || alCityId || alStatus) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAlDateFrom("");
                      setAlDateTo("");
                      setAlCityId("");
                      setAlStatus("");
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
                {podFiltersReady && podData && podRows.length > 0 && (
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const headers = [
                          "Booking Ref",
                          "T/O BKG Ref",
                          "Arr Date",
                          "Dep Date",
                          "Hotel Name",
                          ...podCurrencies.map((c) => `Cost ${c}`),
                          "P. Option Date",
                        ];
                        const rows = podRows.map((r) => [
                          r.bookingCode,
                          r.externalRef,
                          format(new Date(r.checkIn), "dd-MMM-yy"),
                          format(new Date(r.checkOut), "dd-MMM-yy"),
                          r.hotelName,
                          ...podCurrencies.map((c) =>
                            r.currencyCode === c ? r.cost : "",
                          ),
                          r.paymentOptionDate
                            ? format(new Date(r.paymentOptionDate), "dd-MMM-yy")
                            : "",
                        ]);
                        // Totals row
                        const totalsRow: (string | number)[] = [
                          "",
                          "",
                          "",
                          "",
                          "Total",
                          ...podCurrencies.map((c) => {
                            const ct = podData.currencyTotals.find(
                              (t) => t.code === c,
                            );
                            return ct?.total ?? 0;
                          }),
                          "",
                        ];
                        exportReportToExcel({
                          title: "Payment_Option_Date",
                          sheetName: "Payment Option Date",
                          headers,
                          rows: [
                            ...rows.map((r) =>
                              r.map((v) =>
                                typeof v === "number" ? v : String(v),
                              ),
                            ),
                            totalsRow,
                          ],
                        });
                      }}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export Excel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const headers = [
                          "Booking Ref",
                          "T/O BKG Ref",
                          "Arr Date",
                          "Dep Date",
                          "Hotel Name",
                          ...podCurrencies.map((c) => `Cost ${c}`),
                          "P. Option Date",
                        ];
                        const fmtAmt = (v: number) =>
                          v.toLocaleString("en", { minimumFractionDigits: 2 });
                        const rows = podRows.map((r) => [
                          r.bookingCode,
                          r.externalRef,
                          format(new Date(r.checkIn), "dd-MMM-yy"),
                          format(new Date(r.checkOut), "dd-MMM-yy"),
                          r.hotelName,
                          ...podCurrencies.map((c) =>
                            r.currencyCode === c
                              ? `${r.currencySymbol} ${fmtAmt(r.cost)}`
                              : "",
                          ),
                          r.paymentOptionDate
                            ? format(new Date(r.paymentOptionDate), "dd-MMM-yy")
                            : "",
                        ]);
                        // Totals row
                        rows.push([
                          "",
                          "",
                          "",
                          "",
                          "Total",
                          ...podCurrencies.map((c) => {
                            const ct = podData.currencyTotals.find(
                              (t) => t.code === c,
                            );
                            return ct
                              ? `${ct.symbol} ${fmtAmt(ct.total)}`
                              : "";
                          }),
                          "",
                        ]);
                        const costStartIdx = 5;
                        const colStyles: Record<
                          number,
                          { halign?: "left" | "center" | "right" }
                        > = {};
                        podCurrencies.forEach((_, i) => {
                          colStyles[costStartIdx + i] = { halign: "right" };
                        });
                        exportReportToPdf({
                          title: "PAYMENT OPTION DATE",
                          subtitle: `${format(new Date(podDateFrom), "dd MMM yyyy")}  —  ${format(new Date(podDateTo), "dd MMM yyyy")}`,
                          headers,
                          rows,
                          columnStyles: colStyles,
                        });
                      }}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
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
                                  ? `${r.currencySymbol} ${r.cost.toLocaleString("en", { minimumFractionDigits: 2 })}`
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
                                {ct
                                  ? `${ct.symbol} ${ct.total.toLocaleString("en", { minimumFractionDigits: 2 })}`
                                  : "0.00"}
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

        {/* Materialization Tab */}
        <TabsContent value="materialization" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label>Hotel *</Label>
                  <Combobox
                    options={(hotels ?? []).map((h) => ({
                      value: h.id,
                      label: h.name,
                    }))}
                    value={matHotelId}
                    onValueChange={setMatHotelId}
                    placeholder="Select hotel…"
                    searchPlaceholder="Search hotel…"
                    className="w-[220px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date From *</Label>
                  <Input
                    type="date"
                    className="w-[160px]"
                    value={matDateFrom}
                    onChange={(e) => setMatDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date To *</Label>
                  <Input
                    type="date"
                    className="w-[160px]"
                    value={matDateTo}
                    onChange={(e) => setMatDateTo(e.target.value)}
                  />
                </div>
                {(matHotelId || matDateFrom || matDateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMatHotelId("");
                      setMatDateFrom("");
                      setMatDateTo("");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
                {matFiltersReady && matData && matData.roomTypes.length > 0 && (
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportMaterializationExcel(matData, matDateFrom, matDateTo, hotels?.find((h) => h.id === matHotelId)?.name ?? "Hotel")}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export Excel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => exportMaterializationPdf(matData, matDateFrom, matDateTo, hotels?.find((h) => h.id === matHotelId)?.name ?? "Hotel")}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {!matFiltersReady ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-sm text-muted-foreground">
                  Select a hotel and date range to view the materialization
                  report.
                </p>
              </CardContent>
            </Card>
          ) : matLoading ? (
            <Card>
              <CardContent className="py-12">
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ) : matData &&
            matData.roomTypes.length > 0 &&
            matData.dates.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Materialization Report
                  <Badge variant="secondary" className="ml-2">
                    {matData.roomTypes.length} room type
                    {matData.roomTypes.length !== 1 ? "s" : ""} &middot;{" "}
                    {matData.dates.length} day
                    {matData.dates.length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="sticky left-0 z-10 bg-background px-2 py-1.5 text-left font-semibold min-w-[140px]">
                          Room Type
                        </th>
                        <th className="px-2 py-1.5 text-center font-semibold min-w-[60px]">
                          TTL Allot
                        </th>
                        <th className="px-2 py-1.5 text-center font-semibold min-w-[60px]">
                          TTL Sold
                        </th>
                        <th className="px-2 py-1.5 text-center font-semibold min-w-[50px]">
                          Mat%
                        </th>
                        <th className="px-2 py-1.5 text-center font-semibold min-w-[40px]">
                          Row
                        </th>
                        {matData.dates.map((d, i) => (
                          <th
                            key={d}
                            className="px-1.5 py-1.5 text-center font-semibold min-w-[32px]"
                          >
                            {i + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matData.roomTypes.map((rt) => (
                        <Fragment key={rt.id}>
                          {/* Alloc row */}
                          <tr className="border-b border-muted/30">
                            <td
                              rowSpan={3}
                              className="sticky left-0 z-10 bg-background px-2 py-1 font-medium align-top border-b"
                            >
                              {rt.name}
                            </td>
                            <td
                              rowSpan={3}
                              className="px-2 py-1 text-center font-mono align-top border-b"
                            >
                              {rt.ttlAllot}
                            </td>
                            <td
                              rowSpan={3}
                              className="px-2 py-1 text-center font-mono align-top border-b"
                            >
                              {rt.ttlSold}
                            </td>
                            <td
                              rowSpan={3}
                              className="px-2 py-1 text-center font-mono align-top border-b"
                            >
                              {rt.matPct}%
                            </td>
                            <td className="px-2 py-1 text-center text-muted-foreground">
                              Alloc
                            </td>
                            {rt.days.map((day, i) => (
                              <td
                                key={i}
                                className="relative px-1.5 py-1 text-center font-mono"
                              >
                                {day.ss > 0 && <span className="absolute top-0 right-0 border-t-[8px] border-r-[8px] border-t-red-500 border-r-transparent rotate-90" />}
                                {day.alloc}
                              </td>
                            ))}
                          </tr>
                          {/* Sold row */}
                          <tr className="border-b border-muted/30">
                            <td className="px-2 py-1 text-center text-muted-foreground">
                              Sold
                            </td>
                            {rt.days.map((day, i) => (
                              <td
                                key={i}
                                className={`relative px-1.5 py-1 text-center font-mono ${day.sold > 0 ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""}`}
                              >
                                {day.ss > 0 && <span className="absolute top-0 right-0 border-t-[8px] border-r-[8px] border-t-red-500 border-r-transparent rotate-90" />}
                                {day.sold}
                              </td>
                            ))}
                          </tr>
                          {/* Avail row */}
                          <tr className="border-b">
                            <td className="px-2 py-1 text-center text-muted-foreground">
                              Avail
                            </td>
                            {rt.days.map((day, i) => (
                              <td
                                key={i}
                                className="relative px-1.5 py-1 text-center font-mono"
                              >
                                {day.ss > 0 && <span className="absolute top-0 right-0 border-t-[8px] border-r-[8px] border-t-red-500 border-r-transparent rotate-90" />}
                                {day.avail}
                              </td>
                            ))}
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                    {/* Hotel Total */}
                    <tfoot>
                      {/* Total Alloc */}
                      <tr className="border-t-2 border-b border-muted/30">
                        <td
                          rowSpan={3}
                          className="sticky left-0 z-10 bg-muted/50 px-2 py-1 font-bold align-top"
                        >
                          Hotel Total
                        </td>
                        <td
                          rowSpan={3}
                          className="bg-muted/50 px-2 py-1 text-center font-mono font-bold align-top"
                        >
                          {matData.hotelTotal.ttlAllot}
                        </td>
                        <td
                          rowSpan={3}
                          className="bg-muted/50 px-2 py-1 text-center font-mono font-bold align-top"
                        >
                          {matData.hotelTotal.ttlSold}
                        </td>
                        <td
                          rowSpan={3}
                          className="bg-muted/50 px-2 py-1 text-center font-mono font-bold align-top"
                        >
                          {matData.hotelTotal.matPct}%
                        </td>
                        <td className="bg-muted/50 px-2 py-1 text-center text-muted-foreground font-semibold">
                          Alloc
                        </td>
                        {matData.hotelTotal.days.map((day, i) => (
                          <td
                            key={i}
                            className="bg-muted/50 px-1.5 py-1 text-center font-mono font-semibold"
                          >
                            {day.alloc}
                          </td>
                        ))}
                      </tr>
                      {/* Total Sold */}
                      <tr className="border-b border-muted/30">
                        <td className="bg-muted/50 px-2 py-1 text-center text-muted-foreground font-semibold">
                          Sold
                        </td>
                        {matData.hotelTotal.days.map((day, i) => (
                          <td
                            key={i}
                            className={`bg-muted/50 px-1.5 py-1 text-center font-mono font-semibold ${day.sold > 0 ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""}`}
                          >
                            {day.sold}
                          </td>
                        ))}
                      </tr>
                      {/* Total Avail */}
                      <tr className="border-b">
                        <td className="bg-muted/50 px-2 py-1 text-center text-muted-foreground font-semibold">
                          Avail
                        </td>
                        {matData.hotelTotal.days.map((day, i) => (
                          <td
                            key={i}
                            className="bg-muted/50 px-1.5 py-1 text-center font-mono font-semibold"
                          >
                            {day.avail}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {/* Legend */}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-3.5 w-6 rounded-sm bg-green-500/10 border border-green-500/30" />
                    Sold &gt; 0
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="relative inline-block h-3.5 w-6 rounded-sm border">
                      <span className="absolute top-0 right-0 border-t-[8px] border-r-[8px] border-t-red-500 border-r-transparent rotate-90" />
                    </span>
                    Stop Sale
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-3.5 w-6 rounded-sm bg-muted/50 border" />
                    Hotel Total
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-sm text-muted-foreground">
                  No data found for the selected hotel and date range.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Production by TO */}
        <TabsContent value="production-to" className="space-y-4">
          <ProductionByToReport />
        </TabsContent>

        {/* Cancellation Report */}
        <TabsContent value="cancellation" className="space-y-4">
          <CancellationReport />
        </TabsContent>

        {/* No-Show Report */}
        <TabsContent value="no-show" className="space-y-4">
          <NoShowReport />
        </TabsContent>

        {/* Lead Time Report */}
        <TabsContent value="lead-time" className="space-y-4">
          <LeadTimeReport />
        </TabsContent>

        {/* Market Mix Report */}
        <TabsContent value="market-mix" className="space-y-4">
          <MarketMixReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductionByToReport() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data, isLoading } = trpc.reservations.reports.productionByTO.useQuery(
    { dateFrom, dateTo },
    { enabled: !!dateFrom && !!dateTo },
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : data ? (
        <Card><CardContent className="pt-4">
          <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left pb-2">Tour Operator</th><th className="text-right pb-2">Bookings</th><th className="text-right pb-2">Room Nights</th><th className="text-right pb-2">Revenue</th></tr></thead>
          <tbody>{data.map((r, i) => (
            <tr key={i} className="border-b"><td className="py-1.5">{r.name}</td><td className="py-1.5 text-right">{r.bookingCount}</td><td className="py-1.5 text-right">{r.roomNights}</td><td className="py-1.5 text-right font-medium">{Number(r.totalSelling).toFixed(2)}</td></tr>
          ))}</tbody></table>
        </CardContent></Card>
      ) : <p className="text-sm text-muted-foreground">Select a date range to generate the report.</p>}
    </div>
  );
}

function CancellationReport() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data, isLoading } = trpc.reservations.reports.cancellationReport.useQuery(
    { dateFrom, dateTo },
    { enabled: !!dateFrom && !!dateTo },
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : data ? (
        <Card><CardContent className="pt-4">
          <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left pb-2">Booking</th><th className="text-left pb-2">Hotel</th><th className="text-left pb-2">Guest</th><th className="text-left pb-2">Cancelled</th><th className="text-right pb-2">Selling Total</th></tr></thead>
          <tbody>{data.map((r, i) => (
            <tr key={i} className="border-b"><td className="py-1.5 font-mono">{r.code}</td><td className="py-1.5">{r.hotelName}</td><td className="py-1.5">{r.guestName}</td><td className="py-1.5">{r.cancelledAt ? new Date(r.cancelledAt).toLocaleDateString() : "—"}</td><td className="py-1.5 text-right">{Number(r.sellingTotal).toFixed(2)}</td></tr>
          ))}</tbody></table>
        </CardContent></Card>
      ) : <p className="text-sm text-muted-foreground">Select a date range.</p>}
    </div>
  );
}

function NoShowReport() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data, isLoading } = trpc.reservations.reports.noShowReport.useQuery(
    { dateFrom, dateTo },
    { enabled: !!dateFrom && !!dateTo },
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : data ? (
        <Card><CardContent className="pt-4">
          <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left pb-2">Booking</th><th className="text-left pb-2">Hotel</th><th className="text-left pb-2">Guest</th><th className="text-left pb-2">Check-in</th></tr></thead>
          <tbody>{data.map((r, i) => (
            <tr key={i} className="border-b"><td className="py-1.5 font-mono">{r.code}</td><td className="py-1.5">{r.hotelName}</td><td className="py-1.5">{r.guestName}</td><td className="py-1.5">{new Date(r.checkIn).toLocaleDateString()}</td></tr>
          ))}</tbody></table>
        </CardContent></Card>
      ) : <p className="text-sm text-muted-foreground">Select a date range.</p>}
    </div>
  );
}

function LeadTimeReport() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data, isLoading } = trpc.reservations.reports.bookingLeadTime.useQuery(
    { dateFrom, dateTo },
    { enabled: !!dateFrom && !!dateTo },
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : data ? (
        <Card><CardContent className="pt-4">
          <p className="mb-3 text-sm font-medium">Average Lead Time: {data.averageLeadDays} days</p>
          <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left pb-2">Hotel</th><th className="text-right pb-2">Avg Lead Days</th><th className="text-right pb-2">Bookings</th></tr></thead>
          <tbody>{data.byHotel.map((r, i) => (
            <tr key={i} className="border-b"><td className="py-1.5">{r.hotelName}</td><td className="py-1.5 text-right">{r.avgLeadDays}</td><td className="py-1.5 text-right">{r.bookingCount}</td></tr>
          ))}</tbody></table>
        </CardContent></Card>
      ) : <p className="text-sm text-muted-foreground">Select a date range.</p>}
    </div>
  );
}

function MarketMixReport() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data, isLoading } = trpc.reservations.reports.marketMix.useQuery(
    { dateFrom, dateTo },
    { enabled: !!dateFrom && !!dateTo },
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : data ? (
        <Card><CardContent className="pt-4">
          {data.bySource.length > 0 && (
            <>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">By Source</p>
              <table className="mb-4 w-full text-sm"><thead><tr className="border-b"><th className="text-left pb-2">Source</th><th className="text-right pb-2">Bookings</th><th className="text-right pb-2">Revenue</th></tr></thead>
              <tbody>{data.bySource.map((r, i) => (
                <tr key={i} className="border-b"><td className="py-1.5">{r.source}</td><td className="py-1.5 text-right">{r.count}</td><td className="py-1.5 text-right font-medium">{Number(r.revenue).toFixed(2)}</td></tr>
              ))}</tbody></table>
            </>
          )}
          {data.byMarket.length > 0 && (
            <>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">By Market</p>
              <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left pb-2">Market</th><th className="text-right pb-2">Bookings</th><th className="text-right pb-2">Revenue</th></tr></thead>
              <tbody>{data.byMarket.map((r, i) => (
                <tr key={i} className="border-b"><td className="py-1.5">{r.marketName}</td><td className="py-1.5 text-right">{r.count}</td><td className="py-1.5 text-right font-medium">{Number(r.revenue).toFixed(2)}</td></tr>
              ))}</tbody></table>
            </>
          )}
        </CardContent></Card>
      ) : <p className="text-sm text-muted-foreground">Select a date range.</p>}
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

// ── Materialization export types & helpers ──

type MatData = {
  dates: string[];
  roomTypes: {
    id: string;
    name: string;
    ttlAllot: number;
    ttlSold: number;
    matPct: number;
    days: { alloc: number; sold: number; ss: number; avail: number }[];
  }[];
  hotelTotal: {
    ttlAllot: number;
    ttlSold: number;
    matPct: number;
    days: { alloc: number; sold: number; avail: number }[];
  };
};

function buildMatRows(data: MatData) {
  const dayNums = data.dates.map((_, i) => i + 1);
  const headers: string[] = [
    "Room Type",
    "TTL Allot",
    "TTL Sold",
    "Mat%",
    "Row",
    ...dayNums.map(String),
  ];

  const rows: (string | number)[][] = [];
  for (const rt of data.roomTypes) {
    rows.push([rt.name, rt.ttlAllot, rt.ttlSold, `${rt.matPct}%`, "Alloc", ...rt.days.map((d) => d.alloc)]);
    rows.push(["", "", "", "", "Sold", ...rt.days.map((d) => d.sold)]);
    rows.push(["", "", "", "", "Avail", ...rt.days.map((d) => d.avail)]);
  }
  // Hotel total
  rows.push(["Hotel Total", data.hotelTotal.ttlAllot, data.hotelTotal.ttlSold, `${data.hotelTotal.matPct}%`, "Alloc", ...data.hotelTotal.days.map((d) => d.alloc)]);
  rows.push(["", "", "", "", "Sold", ...data.hotelTotal.days.map((d) => d.sold)]);
  rows.push(["", "", "", "", "Avail", ...data.hotelTotal.days.map((d) => d.avail)]);

  return { headers, rows };
}

function exportMaterializationExcel(
  data: MatData,
  dateFrom: string,
  dateTo: string,
  hotelName: string,
) {
  const { headers, rows } = buildMatRows(data);
  exportReportToExcel({
    title: `Materialization_${hotelName.replace(/\s+/g, "_")}`,
    sheetName: "Materialization",
    headers,
    rows,
  });
}

function exportMaterializationPdf(
  data: MatData,
  dateFrom: string,
  dateTo: string,
  hotelName: string,
) {
  const { headers, rows } = buildMatRows(data);
  const fromLabel = format(new Date(dateFrom), "dd MMM yyyy");
  const toLabel = format(new Date(dateTo), "dd MMM yyyy");
  exportReportToPdf({
    title: `MATERIALIZATION — ${hotelName.toUpperCase()}`,
    subtitle: `${fromLabel}  —  ${toLabel}`,
    headers,
    rows: rows.map((r) => r.map(String)),
    columnStyles: {
      0: { cellWidth: 28 },
      1: { halign: "center", cellWidth: 14 },
      2: { halign: "center", cellWidth: 14 },
      3: { halign: "center", cellWidth: 12 },
      4: { halign: "center", cellWidth: 12 },
    },
  });
}
