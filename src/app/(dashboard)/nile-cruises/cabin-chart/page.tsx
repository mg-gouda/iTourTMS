"use client";

import { useState } from "react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function CabinChartPage() {
  const [departureId, setDepartureId] = useState<string>("");

  const { data: departures } = trpc.nileCruises.departure.list.useQuery({ status: "OPEN" });
  const { data: assignments, isLoading } = trpc.nileCruises.cabinAssignment.listByDeparture.useQuery(
    { departureId },
    { enabled: !!departureId }
  );
  const { data: cabins } = trpc.nileCruises.cabin.listByBoat.useQuery(
    { boatId: departures?.find((d) => d.id === departureId)?.boat.id ?? "" },
    { enabled: !!departureId }
  );

  const assignedCabinIds = new Set((assignments ?? []).map((a) => a.cabinId));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Cabin Chart</h1>
        <p className="text-sm text-muted-foreground">Visual cabin availability by departure</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Select value={departureId} onValueChange={setDepartureId}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Select a departure" />
            </SelectTrigger>
            <SelectContent>
              {departures?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.code} · {d.boat.name} · {format(new Date(d.embarkDate), "dd MMM yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {departureId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-3">
              Cabin Status
              <div className="flex gap-3 text-xs font-normal">
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-500 inline-block" /> Available</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-500 inline-block" /> Occupied</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-gray-300 inline-block" /> Out of Order</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-2 grid-cols-6 sm:grid-cols-8 md:grid-cols-10">
                {[...Array(20)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : !cabins?.length ? (
              <p className="text-sm text-muted-foreground py-4">No cabins registered for this boat</p>
            ) : (
              <div className="grid gap-2 grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
                {cabins.map((cabin) => {
                  const isOccupied = assignedCabinIds.has(cabin.id);
                  const isOoo = !cabin.active;
                  const assignment = assignments?.find((a) => a.cabinId === cabin.id);
                  return (
                    <div
                      key={cabin.id}
                      title={isOccupied && assignment ? assignment.booking.leadGuestName : cabin.cabinNumber}
                      className={`relative flex flex-col items-center justify-center rounded border p-2 cursor-default text-center ${
                        isOoo ? "bg-gray-100 border-gray-200 text-gray-400" :
                        isOccupied ? "bg-blue-50 border-blue-300 text-blue-700" :
                        "bg-green-50 border-green-300 text-green-700"
                      }`}
                    >
                      <p className="text-xs font-bold">{cabin.cabinNumber}</p>
                      <p className="text-[10px] opacity-70">{cabin.deck.name}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {departureId && assignments && assignments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Assigned Cabins ({assignments.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium w-12">{a.cabin.cabinNumber}</span>
                    <div>
                      <p className="text-sm">{a.booking.leadGuestName}</p>
                      <p className="text-xs text-muted-foreground">{a.booking.code}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
