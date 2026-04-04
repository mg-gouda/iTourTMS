"use client";

import { Hotel, Search, Star, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc";

const AVAILABILITY_LABELS: Record<string, string> = {
  available: "Available",
  on_request: "On Request",
  limited: "Limited",
  sold_out: "Sold Out",
};

const AVAILABILITY_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  available: "default",
  on_request: "outline",
  limited: "secondary",
  sold_out: "destructive",
};

export default function SearchAndBookPage() {
  const { data: operators, isLoading: loadingOperators } =
    trpc.b2bPortal.tourOperator.list.useQuery();

  const [operatorId, setOperatorId] = useState("");
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [searchParams, setSearchParams] = useState<{
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    tourOperatorId?: string;
  } | null>(null);

  const { data: results, isLoading: searching } =
    trpc.b2bPortal.search.availability.useQuery(
      {
        checkIn: searchParams?.checkIn ?? "",
        checkOut: searchParams?.checkOut ?? "",
        adults: searchParams?.adults ?? 2,
        children: searchParams?.children ?? 0,
        childAges: [],
        tourOperatorId: searchParams?.tourOperatorId,
      },
      { enabled: !!searchParams }
    );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!operatorId) {
      toast.error("Please select a tour operator");
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
      toast.error("Check-out must be after check-in");
      return;
    }
    setSearchParams({
      checkIn,
      checkOut,
      adults,
      children,
      tourOperatorId: operatorId,
    });
  }

  function handleReset() {
    setOperatorId("");
    setDestination("");
    setCheckIn("");
    setCheckOut("");
    setAdults(2);
    setChildren(0);
    setSearchParams(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search & Book</h1>
        <p className="text-muted-foreground">Search availability and create partner bookings</p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            Search Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Tour Operator</Label>
                {loadingOperators ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select value={operatorId} onValueChange={setOperatorId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select operator..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(operators ?? []).map((op: { id: string; name: string }) => (
                        <SelectItem key={op.id} value={op.id}>
                          {op.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input
                  placeholder="City or region (optional)"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-in</Label>
                <Input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-out</Label>
                <Input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Adults</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Children</Label>
                <Input
                  type="number"
                  min={0}
                  max={6}
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={searching}>
                {searching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Search
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {!searchParams ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Hotel className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              Select a partner and dates to search availability
            </h3>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Choose a tour operator, set your travel dates, and click Search
            </p>
          </CardContent>
        </Card>
      ) : searching ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Skeleton className="h-32 w-48 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : results && results.hotels.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {results.total} hotel{results.total !== 1 ? "s" : ""} found &middot;{" "}
            {results.hotels[0]?.nights} night{(results.hotels[0]?.nights ?? 0) !== 1 ? "s" : ""}
          </p>
          {results.hotels.map((hotel) => (
            <Card key={hotel.hotelId}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  {/* Hotel info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{hotel.hotelName}</h3>
                      {hotel.starRating && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: Number(hotel.starRating) || 0 }).map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {hotel.city}
                      {hotel.destinationName ? ` · ${hotel.destinationName}` : ""}
                      {" · "}
                      <span className="font-mono text-xs">{hotel.hotelCode}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Contract: {hotel.contractName} · {hotel.currency} · {hotel.rateBasis}
                    </p>
                  </div>

                  {/* Price summary */}
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      ${hotel.cheapestTotal.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${hotel.cheapestPerNight.toFixed(2)} / night (net)
                    </p>
                  </div>
                </div>

                {/* Room results */}
                <div className="mt-4 divide-y rounded-lg border">
                  {hotel.rooms.map((room, ri) => (
                    <div
                      key={ri}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{room.roomTypeName}</span>
                          <span className="font-mono text-xs text-muted-foreground">{room.roomTypeCode}</span>
                          <Badge variant={AVAILABILITY_VARIANTS[room.availability]}>
                            {AVAILABILITY_LABELS[room.availability]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {room.mealName}
                          {room.appliedOffer && (
                            <span className="ml-2 text-green-600">
                              {room.appliedOffer.name} (-${room.appliedOffer.saving.toFixed(2)})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold">${room.total.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">${room.pricePerNight.toFixed(2)}/night</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={room.availability === "sold_out"}
                          onClick={() => {
                            const params = new URLSearchParams({
                              hotelId: hotel.hotelId,
                              contractId: hotel.contractId ?? "",
                              roomTypeId: room.roomTypeId ?? "",
                              mealCode: room.mealCode ?? "",
                              checkIn,
                              checkOut,
                              adults: String(adults),
                              children: String(children),
                            });
                            window.open(`/b2b/book?${params}`, "_blank");
                          }}
                        >
                          Book
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Hotel className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              No hotels found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Try different dates or remove filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
