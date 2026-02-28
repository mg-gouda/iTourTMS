"use client";

import { format } from "date-fns";
import { FileDown } from "lucide-react";
import { useState } from "react";
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
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          {/* KPI Summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <SummaryCard
              label="Selling Total"
              value={revenue?.totalSelling}
              isLoading={revenueLoading}
              isCurrency
            />
            <SummaryCard
              label="Buying Total"
              value={revenue?.totalBuying}
              isLoading={revenueLoading}
              isCurrency
            />
            <SummaryCard
              label="Margin"
              value={revenue?.totalMargin}
              isLoading={revenueLoading}
              isCurrency
            />
            <SummaryCard
              label="Total Paid"
              value={revenue?.totalPaid}
              isLoading={revenueLoading}
              isCurrency
            />
            <SummaryCard
              label="Outstanding"
              value={revenue?.totalOutstanding}
              isLoading={revenueLoading}
              isCurrency
            />
          </div>

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
                        return item?.name ?? "";
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
                      <TableHead className="text-right">Selling</TableHead>
                      <TableHead className="text-right">Buying</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(revenue?.bySource ?? []).map((s) => (
                      <TableRow key={s.source}>
                        <TableCell className="font-medium">{s.source}</TableCell>
                        <TableCell className="text-right">{s.count}</TableCell>
                        <TableCell className="text-right font-mono">
                          {s.selling.toLocaleString("en", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {s.buying.toLocaleString("en", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(s.selling - s.buying).toLocaleString("en", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
