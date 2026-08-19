"use client";

import { CheckCircle2, Clock, Plus, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

/**
 * The booking form. Prices are deliberately not carried through from search:
 * the server re-prices from the contract when this is submitted, so what the
 * partner is charged cannot be edited in a browser.
 */

type GuestName = { firstName: string; lastName: string };
type RoomForm = {
  roomTypeId: string;
  mealBasisId: string;
  adults: number;
  children: number;
  infants: number;
  childAges: number[];
  guestNames: GuestName[];
  specialRequests: string;
};

const emptyGuests = (count: number, existing: GuestName[] = []): GuestName[] =>
  Array.from({ length: count }, (_, i) => existing[i] ?? { firstName: "", lastName: "" });

function BookingForm() {
  const params = useSearchParams();
  const router = useRouter();

  const contractId = params.get("contractId") ?? "";
  const hotelId = params.get("hotelId") ?? "";
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  const adults = Number(params.get("adults") ?? 2);
  const children = Number(params.get("children") ?? 0);
  const infants = Number(params.get("infants") ?? 0);
  const childAges = (params.get("childAges") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);

  const [rooms, setRooms] = useState<RoomForm[]>([
    {
      roomTypeId: params.get("roomTypeId") ?? "",
      mealBasisId: params.get("mealBasisId") ?? "",
      adults,
      children,
      infants,
      childAges,
      guestNames: emptyGuests(adults + children),
      specialRequests: "",
    },
  ]);

  const [lead, setLead] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [reference, setReference] = useState("");
  const [arrival, setArrival] = useState({ flightNo: "", time: "", originApt: "", destApt: "" });
  const [departure, setDeparture] = useState({ flightNo: "", time: "", originApt: "", destApt: "" });
  const [notes, setNotes] = useState("");

  const create = trpc.partner.booking.create.useMutation();

  if (!contractId || !hotelId || !checkIn || !checkOut) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm">
          <p className="text-muted-foreground">
            Start from a search result so we know which room and dates you mean.
          </p>
          <Button asChild className="mt-4">
            <Link href="/b2b/search">Go to search</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (create.data) {
    const result = create.data;
    const confirmed = result.status === "CONFIRMED";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {confirmed ? (
              <CheckCircle2 className="size-5 text-emerald-500" />
            ) : (
              <Clock className="size-5 text-amber-500" />
            )}
            {confirmed ? "Booking confirmed" : "Booking received"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-2xl font-semibold">{result.code}</p>
          <Badge variant={confirmed ? "default" : "secondary"}>
            {result.status.replace(/_/g, " ").toLowerCase()}
          </Badge>

          {result.reason && (
            <div className="flex gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              <TriangleAlert className="size-4 shrink-0" />
              <div>
                <p>{result.reason}</p>
                {result.onRequestDeadline && (
                  <p className="mt-1 text-xs">
                    We will come back to you by{" "}
                    {new Date(result.onRequestDeadline).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    .
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">Your net</p>
              <p className="font-medium">{result.sellingTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Your client price</p>
              <p className="font-medium">{result.clientPrice.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => router.push("/b2b/bookings")}>See my bookings</Button>
            <Button variant="outline" onClick={() => router.push("/b2b/search")}>
              Book another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function updateRoom(index: number, patch: Partial<RoomForm>) {
    setRooms((current) =>
      current.map((room, i) => {
        if (i !== index) return room;
        const next = { ...room, ...patch };
        // The name slots follow the occupancy, so a fourth guest cannot be
        // added by typing into a box that was never meant to exist.
        if (patch.adults !== undefined || patch.children !== undefined) {
          next.guestNames = emptyGuests(next.adults + next.children, room.guestNames);
          next.childAges = Array.from(
            { length: next.children },
            (_, c) => room.childAges[c] ?? 7,
          );
        }
        return next;
      }),
    );
  }

  const totalGuests = rooms.reduce((n, r) => n + r.adults + r.children + r.infants, 0);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate({
          contractId,
          hotelId,
          checkIn,
          checkOut,
          rooms: rooms.map((room) => ({
            roomTypeId: room.roomTypeId,
            mealBasisId: room.mealBasisId,
            adults: room.adults,
            children: room.children,
            infants: room.infants,
            childAges: room.childAges,
            guestNames: room.guestNames.filter((g) => g.firstName && g.lastName),
            specialRequests: room.specialRequests || undefined,
          })),
          leadGuestFirstName: lead.firstName,
          leadGuestLastName: lead.lastName,
          leadGuestEmail: lead.email || undefined,
          leadGuestPhone: lead.phone || undefined,
          partnerReference: reference || undefined,
          arrival: arrival.flightNo ? arrival : undefined,
          departure: departure.flightNo ? departure : undefined,
          specialRequests: notes || undefined,
        });
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead guest</CardTitle>
          <p className="text-muted-foreground text-xs">
            The name the hotel will have at the desk. {checkIn} → {checkOut}, {totalGuests}{" "}
            guest{totalGuests === 1 ? "" : "s"}.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">First name</Label>
            <Input
              required
              value={lead.firstName}
              onChange={(e) => setLead({ ...lead, firstName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Last name</Label>
            <Input
              required
              value={lead.lastName}
              onChange={(e) => setLead({ ...lead, lastName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email (optional)</Label>
            <Input
              type="email"
              value={lead.email}
              onChange={(e) => setLead({ ...lead, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone (optional)</Label>
            <Input
              value={lead.phone}
              onChange={(e) => setLead({ ...lead, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Your reference</Label>
            <Input
              placeholder="Your own booking number"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Shown on everything we send you, so you can match it to your file.
            </p>
          </div>
        </CardContent>
      </Card>

      {rooms.map((room, index) => (
        <Card key={index}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Room {index + 1}</CardTitle>
            {rooms.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRooms(rooms.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Adults</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={room.adults}
                  onChange={(e) => updateRoom(index, { adults: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Children</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={room.children}
                  onChange={(e) => updateRoom(index, { children: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Infants</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={room.infants}
                  onChange={(e) => updateRoom(index, { infants: Number(e.target.value) || 0 })}
                />
              </div>
            </div>

            {room.childAges.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Child ages at check-in</Label>
                <div className="flex flex-wrap gap-2">
                  {room.childAges.map((age, c) => (
                    <Input
                      key={c}
                      type="number"
                      min={0}
                      max={17}
                      className="w-20"
                      value={age}
                      onChange={(e) => {
                        const next = [...room.childAges];
                        next[c] = Number(e.target.value) || 0;
                        updateRoom(index, { childAges: next });
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Guest names</Label>
              {room.guestNames.map((guest, g) => (
                <div key={g} className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder={`Guest ${g + 1} first name`}
                    value={guest.firstName}
                    onChange={(e) => {
                      const next = [...room.guestNames];
                      next[g] = { ...guest, firstName: e.target.value };
                      updateRoom(index, { guestNames: next });
                    }}
                  />
                  <Input
                    placeholder={`Guest ${g + 1} last name`}
                    value={guest.lastName}
                    onChange={(e) => {
                      const next = [...room.guestNames];
                      next[g] = { ...guest, lastName: e.target.value };
                      updateRoom(index, { guestNames: next });
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Requests for this room (optional)</Label>
              <Input
                placeholder="High floor, twin beds..."
                value={room.specialRequests}
                onChange={(e) => updateRoom(index, { specialRequests: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setRooms([
            ...rooms,
            {
              ...rooms[0],
              guestNames: emptyGuests(rooms[0].adults + rooms[0].children),
              specialRequests: "",
            },
          ])
        }
      >
        <Plus className="mr-2 size-4" /> Add another room
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flights (optional)</CardTitle>
          <p className="text-muted-foreground text-xs">
            Telling us the flights means transfers and arrival times are already right.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["Arrival", arrival, setArrival],
              ["Departure", departure, setDeparture],
            ] as const
          ).map(([label, value, set]) => (
            <div key={label} className="space-y-2">
              <p className="text-sm font-medium">{label}</p>
              <Input
                placeholder="Flight number"
                value={value.flightNo}
                onChange={(e) => set({ ...value, flightNo: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Time"
                  value={value.time}
                  onChange={(e) => set({ ...value, time: e.target.value })}
                />
                <Input
                  placeholder="From"
                  value={value.originApt}
                  onChange={(e) => set({ ...value, originApt: e.target.value })}
                />
                <Input
                  placeholder="To"
                  value={value.destApt}
                  onChange={(e) => set({ ...value, destApt: e.target.value })}
                />
              </div>
            </div>
          ))}

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Anything else the hotel should know</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {create.error && (
        <div className="text-destructive rounded-md bg-red-500/10 p-3 text-sm">
          {create.error.message}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Booking..." : "Confirm booking"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Back to results
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        The price is taken from your contract when you confirm, so it is always the rate you
        are entitled to on the day.
      </p>
    </form>
  );
}

export default function PartnerBookPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Complete your booking</h1>
        <p className="text-muted-foreground">Who is travelling, and how to reach them.</p>
      </div>
      <Suspense fallback={null}>
        <BookingForm />
      </Suspense>
    </div>
  );
}
