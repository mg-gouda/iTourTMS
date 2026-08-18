"use client";

import { BedDouble, Search as SearchIcon, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { MAX_STAY_NIGHTS } from "@/lib/b2b/limits";
import { trpc } from "@/lib/trpc";

/**
 * Availability as the partner sees it: only their hotels, at their net rate,
 * with their own selling price beside it so an agent can quote on the phone
 * without opening a spreadsheet.
 */

const todayIso = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * 86_400_000).toISOString().slice(0, 10);

export default function PartnerSearchPage() {
  const router = useRouter();
  const { data: destinations } = trpc.partner.search.destinations.useQuery();

  const [form, setForm] = useState({
    destinationId: "",
    checkIn: addDays(todayIso(), 14),
    checkOut: addDays(todayIso(), 21),
    adults: 2,
    children: 0,
    infants: 0,
  });
  const [childAges, setChildAges] = useState<number[]>([]);
  const [query, setQuery] = useState<typeof form | null>(null);
  const [page, setPage] = useState(1);

  const search = trpc.partner.search.availability.useQuery(
    { ...(query ?? form), childAges, page },
    { enabled: !!query?.destinationId },
  );

  const nights = Math.max(
    0,
    Math.round(
      (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86_400_000,
    ),
  );
  const tooLong = nights > MAX_STAY_NIGHTS;

  function setChildren(count: number) {
    setForm({ ...form, children: count });
    setChildAges((ages) =>
      Array.from({ length: count }, (_, i) => ages[i] ?? 7),
    );
  }

  const money = (n: number, currency: string) =>
    `${currency} ${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search &amp; book</h1>
        <p className="text-muted-foreground">
          Live availability from your contracted hotels.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-3 md:grid-cols-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.destinationId || tooLong) return;
              setPage(1);
              setQuery({ ...form });
            }}
          >
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Destination</Label>
              <Select
                value={form.destinationId}
                onValueChange={(v) => v && setForm({ ...form, destinationId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a destination" />
                </SelectTrigger>
                <SelectContent>
                  {(destinations ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Check in</Label>
              <Input
                type="date"
                value={form.checkIn}
                onChange={(e) => {
                  const checkIn = e.target.value;
                  setForm((f) => ({
                    ...f,
                    checkIn,
                    // A stay cannot end before it starts.
                    checkOut: f.checkOut <= checkIn ? addDays(checkIn, 1) : f.checkOut,
                  }));
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Check out</Label>
              <Input
                type="date"
                min={addDays(form.checkIn, 1)}
                value={form.checkOut}
                onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Adults</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.adults}
                onChange={(e) => setForm({ ...form, adults: Number(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Children</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={form.children}
                onChange={(e) => setChildren(Number(e.target.value) || 0)}
              />
            </div>

            {childAges.length > 0 && (
              <div className="space-y-1.5 md:col-span-6">
                <Label className="text-xs">Child ages at check-in</Label>
                <div className="flex flex-wrap gap-2">
                  {childAges.map((age, i) => (
                    <Input
                      key={i}
                      type="number"
                      min={0}
                      max={17}
                      value={age}
                      className="w-20"
                      onChange={(e) => {
                        const next = [...childAges];
                        next[i] = Number(e.target.value) || 0;
                        setChildAges(next);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-end md:col-span-6">
              <Button type="submit" disabled={!form.destinationId || tooLong}>
                <SearchIcon className="mr-2 size-4" />
                Search {nights > 0 && `· ${nights} night${nights === 1 ? "" : "s"}`}
              </Button>
              {tooLong && (
                <p className="text-destructive ml-3 text-xs">
                  Stays longer than {MAX_STAY_NIGHTS} nights go through your account manager.
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {search.isFetching && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {search.error && (
        <Card>
          <CardContent className="text-destructive py-6 text-sm">
            {search.error.message}
          </CardContent>
        </Card>
      )}

      {!search.isFetching && search.data && search.data.hotels.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            Nothing available for those dates. Try a different date range, or ask your account
            manager whether the hotel you want is on your contract.
          </CardContent>
        </Card>
      )}

      {!search.isFetching &&
        search.data?.hotels.map((hotel) => (
          <Card key={hotel.hotelId}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{hotel.hotelName}</CardTitle>
                <p className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-0.5">
                    <Star className="size-3 fill-current" />
                    {hotel.starRating?.replace(/_/g, " ").toLowerCase()}
                  </span>
                  · {hotel.city} · {hotel.nights} night{hotel.nights === 1 ? "" : "s"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs">from</p>
                <p className="text-lg font-semibold">
                  {money(hotel.cheapestTotal, hotel.currency)}
                </p>
                <p className="text-muted-foreground text-xs">your net</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {hotel.rooms.map((room) => (
                <div
                  key={`${room.roomTypeId}-${room.mealBasisId}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <BedDouble className="text-muted-foreground size-4" />
                      {room.roomTypeName}
                      <Badge variant="outline">{room.mealName}</Badge>
                      {room.availability === "on_request" && (
                        <Badge variant="secondary">On request</Badge>
                      )}
                      {room.availability === "limited" && (
                        <Badge variant="secondary">{room.remainingRooms} left</Badge>
                      )}
                    </p>
                    {room.appliedOffer && (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        {room.appliedOffer.name} — saves{" "}
                        {money(room.appliedOffer.saving, hotel.currency)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{money(room.net, hotel.currency)}</p>
                      <p className="text-muted-foreground text-xs">your net</p>
                    </div>
                    {room.partnerMarkup > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {money(room.clientPrice, hotel.currency)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          your client price (+{money(room.markupPppn, hotel.currency)} pppn)
                        </p>
                      </div>
                    )}
                    <Button
                      size="sm"
                      disabled={room.availability === "sold_out"}
                      onClick={() => {
                        const params = new URLSearchParams({
                          contractId: hotel.contractId,
                          hotelId: hotel.hotelId,
                          roomTypeId: room.roomTypeId,
                          mealBasisId: room.mealBasisId,
                          checkIn: query!.checkIn,
                          checkOut: query!.checkOut,
                          adults: String(query!.adults),
                          children: String(query!.children),
                          infants: String(query!.infants),
                          childAges: childAges.join(","),
                        });
                        router.push(`/b2b/book?${params.toString()}`);
                      }}
                    >
                      Book
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

      {!search.isFetching && (search.data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {search.data?.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (search.data?.totalPages ?? 1)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
