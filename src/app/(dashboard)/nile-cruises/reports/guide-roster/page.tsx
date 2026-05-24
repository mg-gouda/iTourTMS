"use client";

import { useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const today = new Date();

export default function GuideRosterPage() {
  const [dateFrom, setDateFrom] = useState(format(today, "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(addMonths(today, 1), "yyyy-MM-dd"));
  const [boatId, setBoatId] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: boats } = trpc.nileCruises.boat.list.useQuery();
  const { data: rawData, isLoading } = trpc.nileCruises.reports.guideRoster.useQuery({
    dateFrom,
    dateTo,
    boatId: boatId === "all" ? undefined : boatId,
  });
  const data = rawData as any[] | undefined;

  const totalPax = data?.reduce((sum: number, dep: any) =>
    sum + (dep.bookings as any[]).reduce((s: number, b: any) => s + b.passengers.length, 0), 0) ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Guide Roster</h1>
          <p className="text-sm text-muted-foreground">Passenger manifest per departure for guide planning</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>Print</Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-4 pt-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Boat</label>
            <Select value={boatId} onValueChange={setBoatId}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boats</SelectItem>
                {boats?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {data && (
            <div className="ml-auto flex items-center gap-4 text-sm self-center">
              <span className="text-muted-foreground">{data.length} departure{data.length !== 1 ? "s" : ""}</span>
              <span className="font-medium">{totalPax} total passengers</span>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : !data?.length ? (
        <div className="py-12 text-center text-muted-foreground">No upcoming departures found for the selected period</div>
      ) : (
        <div className="space-y-4">
          {data.map((dep: any) => {
            const allPassengers = (dep.bookings as any[]).flatMap((b: any) =>
              (b.passengers as any[]).map((p: any) => ({
                ...p,
                bookingCode: b.code,
                cabinLines: b.cabinLines,
              }))
            );
            const isExpanded = expandedId === dep.id;

            return (
              <Card key={dep.id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : dep.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">{dep.boat.name}</CardTitle>
                        <span className="font-mono text-sm text-muted-foreground">{dep.code}</span>
                        <Badge variant="outline">{dep.cruiseType.name}</Badge>
                        <Badge variant={dep.status === "SAILING" ? "default" : "secondary"}>{dep.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(dep.embarkDate), "dd MMM yyyy")} → {format(new Date(dep.disembarkDate), "dd MMM yyyy")}
                        <span className="mx-2">·</span>
                        <span className="font-medium text-foreground">{allPassengers.length} passenger{allPassengers.length !== 1 ? "s" : ""}</span>
                        <span className="mx-2">·</span>
                        {(dep.bookings as any[]).length} booking{(dep.bookings as any[]).length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{isExpanded ? "▲ Collapse" : "▼ Expand"}</span>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    {allPassengers.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No passengers registered yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">#</th>
                              <th className="px-3 py-2 text-left font-medium">Last Name</th>
                              <th className="px-3 py-2 text-left font-medium">First Name</th>
                              <th className="px-3 py-2 text-left font-medium">Nationality</th>
                              <th className="px-3 py-2 text-left font-medium">Passport</th>
                              <th className="px-3 py-2 text-left font-medium">DOB</th>
                              <th className="px-3 py-2 text-left font-medium">Type</th>
                              <th className="px-3 py-2 text-left font-medium">Booking</th>
                              <th className="px-3 py-2 text-left font-medium">Cabin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {allPassengers.map((pax: any, idx: number) => {
                              const cabin = pax.cabinLines?.[0]?.cabinCategory;
                              return (
                                <tr key={pax.id} className="hover:bg-muted/30">
                                  <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                                  <td className="px-3 py-2 font-medium">{pax.lastName?.toUpperCase()}</td>
                                  <td className="px-3 py-2">{pax.firstName}</td>
                                  <td className="px-3 py-2">{pax.nationality?.name ?? "—"}</td>
                                  <td className="px-3 py-2 font-mono text-xs">{pax.passportNumber ?? "—"}</td>
                                  <td className="px-3 py-2">{pax.dateOfBirth ? format(new Date(pax.dateOfBirth), "dd/MM/yyyy") : "—"}</td>
                                  <td className="px-3 py-2">
                                    <Badge variant={pax.passengerType === "ADULT" ? "default" : "secondary"} className="text-xs">
                                      {pax.passengerType}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 font-mono text-xs">{pax.bookingCode}</td>
                                  <td className="px-3 py-2">{cabin ? `${cabin.code}` : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
