"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MANIFEST_STATUS_LABELS, MANIFEST_STATUS_VARIANTS } from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";

const today = new Date();
const DEFAULT_FROM = format(subMonths(today, 3), "yyyy-MM-dd");
const DEFAULT_TO = format(today, "yyyy-MM-dd");

export default function CruiseReportsPage() {
  const [dateFrom, setDateFrom] = useState(DEFAULT_FROM);
  const [dateTo, setDateTo] = useState(DEFAULT_TO);
  const [groupBy, setGroupBy] = useState<"boat" | "cruise_type" | "month">("month");

  const { data: occupancy } = trpc.nileCruises.reports.occupancySummary.useQuery({ dateFrom, dateTo });
  const { data: revenue } = trpc.nileCruises.reports.revenueSummary.useQuery({ dateFrom, dateTo, groupBy });
  const { data: nationalities } = trpc.nileCruises.reports.passengerNationalities.useQuery({ dateFrom, dateTo });
  const { data: agentPerf } = trpc.nileCruises.reports.agentPerformance.useQuery({ dateFrom, dateTo });
  const { data: manifests } = trpc.nileCruises.reports.manifestReport.useQuery({ dateFrom, dateTo });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Cruise Reports</h1>
        <p className="text-sm text-muted-foreground">Occupancy, revenue, and manifest analytics</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-4 pt-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">From:</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">To:</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="occupancy">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="nationalities">Nationalities</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="manifests">Manifests</TabsTrigger>
        </TabsList>

        <TabsContent value="occupancy">
          <Card>
            <CardHeader><CardTitle className="text-base">Departure Occupancy</CardTitle></CardHeader>
            <CardContent>
              {!occupancy?.length ? (
                <p className="text-sm text-muted-foreground py-4">No data for selected period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left pb-2">Departure</th>
                        <th className="text-left pb-2">Boat</th>
                        <th className="text-left pb-2">Date</th>
                        <th className="text-right pb-2">Bookings</th>
                        <th className="text-right pb-2">Pax</th>
                        <th className="text-right pb-2">Revenue</th>
                        <th className="text-right pb-2">Occ%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {occupancy.map((d) => (
                        <tr key={d.departureId}>
                          <td className="py-2 font-mono text-xs">{d.code}</td>
                          <td className="py-2">{d.boat.name}</td>
                          <td className="py-2 text-xs">{format(new Date(d.embarkDate), "dd MMM yyyy")}</td>
                          <td className="py-2 text-right">{d.bookings}</td>
                          <td className="py-2 text-right">{d.totalPax}</td>
                          <td className="py-2 text-right font-mono">${d.totalRevenue.toLocaleString()}</td>
                          <td className="py-2 text-right">
                            <span className={d.occupancyRate >= 80 ? "text-green-600 font-medium" : d.occupancyRate >= 50 ? "text-amber-600" : "text-red-500"}>
                              {d.occupancyRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Revenue Summary</CardTitle>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">By Month</SelectItem>
                  <SelectItem value="boat">By Boat</SelectItem>
                  <SelectItem value="cruise_type">By Cruise Type</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {!revenue?.length ? (
                <p className="text-sm text-muted-foreground py-4">No data</p>
              ) : (
                <div className="space-y-2">
                  {revenue.map((r) => (
                    <div key={r.key} className="flex items-center justify-between rounded border p-3">
                      <div>
                        <p className="text-sm font-medium">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.bookings} bookings · {r.pax} pax</p>
                      </div>
                      <p className="font-mono font-semibold">${r.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nationalities">
          <Card>
            <CardHeader><CardTitle className="text-base">Passenger Nationalities</CardTitle></CardHeader>
            <CardContent>
              {!nationalities?.length ? (
                <p className="text-sm text-muted-foreground py-4">No data</p>
              ) : (
                <div className="divide-y">
                  {nationalities.slice(0, 20).map((n, idx) => (
                    <div key={n.countryId} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6 text-right">{idx + 1}.</span>
                        <p className="text-sm">{n.countryName}</p>
                      </div>
                      <Badge variant="outline">{n.count} pax</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card>
            <CardHeader><CardTitle className="text-base">Agent Performance</CardTitle></CardHeader>
            <CardContent>
              {!agentPerf?.length ? (
                <p className="text-sm text-muted-foreground py-4">No bookings from agents in this period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left pb-2">Agent</th>
                        <th className="text-right pb-2">Bookings</th>
                        <th className="text-right pb-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {agentPerf.map((a) => (
                        <tr key={a.toId}>
                          <td className="py-2">{a.toName}</td>
                          <td className="py-2 text-right">{a.bookings}</td>
                          <td className="py-2 text-right font-mono">${a.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manifests">
          <Card>
            <CardHeader><CardTitle className="text-base">Manifest Status</CardTitle></CardHeader>
            <CardContent>
              {!manifests?.length ? (
                <p className="text-sm text-muted-foreground py-4">No manifests in this period</p>
              ) : (
                <div className="divide-y">
                  {manifests.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">{m.departure.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.departure.boat.name} · {format(new Date(m.departure.embarkDate), "dd MMM yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{m.totalPax} pax</span>
                        <Badge variant={MANIFEST_STATUS_VARIANTS[m.status as keyof typeof MANIFEST_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline"}>
                          {MANIFEST_STATUS_LABELS[m.status as keyof typeof MANIFEST_STATUS_LABELS]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
