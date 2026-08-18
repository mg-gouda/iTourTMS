"use client";

import { Minus, Plus, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAX_STAY_NIGHTS } from "@/lib/b2b/limits";
import { trpc } from "@/lib/trpc";

const iso = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

const money = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface RoomDraft {
  roomTypeId: string;
  mealBasisId: string;
  adults: number;
  children: number;
  infants: number;
  childAges: number[];
}

interface BookingLike {
  id: string;
  checkIn: Date | string;
  checkOut: Date | string;
  rooms: {
    id: string;
    adults: number;
    children: number;
    infants: number;
    roomType: { id: string; name: string } | null;
    mealBasis: { id: string; name: string } | null;
  }[];
}

/**
 * Changing dates, rooms or occupancy. Nothing is applied until the partner has
 * seen the re-quoted price and said yes to it — an increase is theirs to
 * absorb, so it is never a surprise.
 */
export function BookingAmendDialog({
  booking,
  open,
  onOpenChange,
  onApplied,
}: {
  booking: BookingLike;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
}) {
  const [checkIn, setCheckIn] = useState(iso(booking.checkIn));
  const [checkOut, setCheckOut] = useState(iso(booking.checkOut));
  const [rooms, setRooms] = useState<RoomDraft[]>([]);

  const { data: options } = trpc.partner.booking.roomOptions.useQuery(
    { id: booking.id },
    { enabled: open },
  );

  // Reset to what is on the booking each time it opens, so an abandoned edit
  // does not reappear as if it were the current state.
  useEffect(() => {
    if (!open) return;
    setCheckIn(iso(booking.checkIn));
    setCheckOut(iso(booking.checkOut));
    setRooms(
      booking.rooms.map((r) => ({
        roomTypeId: r.roomType?.id ?? "",
        mealBasisId: r.mealBasis?.id ?? "",
        adults: r.adults,
        children: r.children,
        infants: r.infants,
        childAges: Array.from({ length: r.children }, () => 8),
      })),
    );
  }, [open, booking]);

  const quote = trpc.partner.booking.quoteAmendment.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const amend = trpc.partner.booking.amend.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.status === "applied"
          ? "Booking changed."
          : "Change requested — your existing booking is unchanged until we answer.",
      );
      quote.reset();
      onOpenChange(false);
      onApplied();
    },
    onError: (e) => toast.error(e.message),
  });

  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
  );
  const datesValid = nights >= 1 && nights <= MAX_STAY_NIGHTS;
  const roomsValid = rooms.length > 0 && rooms.every((r) => r.roomTypeId && r.mealBasisId);

  const update = (i: number, patch: Partial<RoomDraft>) =>
    setRooms((prev) =>
      prev.map((room, index) => {
        if (index !== i) return room;
        const next = { ...room, ...patch };
        // Ages ride along with the count, or the re-quote prices a child who
        // is not there — or misses one who is.
        if (patch.children !== undefined) {
          next.childAges = Array.from({ length: patch.children }, (_, k) => room.childAges[k] ?? 8);
        }
        return next;
      }),
    );

  const proposal = {
    id: booking.id,
    checkIn,
    checkOut,
    rooms,
  };

  const result = quote.data;
  const canApply = result?.outcome === "self_service";
  const willRequest = result?.outcome === "needs_approval" || result?.outcome === "on_request";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Change dates or rooms</DialogTitle>
          <DialogDescription>
            We re-price the stay from the contract. If it comes out higher, the difference is
            yours — you will see it here before anything changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="amend-in" className="text-xs">
                Check in
              </Label>
              <Input
                id="amend-in"
                type="date"
                value={checkIn}
                min={iso(new Date())}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  quote.reset();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amend-out" className="text-xs">
                Check out
              </Label>
              <Input
                id="amend-out"
                type="date"
                value={checkOut}
                min={checkIn}
                onChange={(e) => {
                  setCheckOut(e.target.value);
                  quote.reset();
                }}
              />
            </div>
          </div>
          {!datesValid && (
            <p className="text-destructive text-xs">
              Choose a departure after arrival, up to {MAX_STAY_NIGHTS} nights.
            </p>
          )}

          <div className="space-y-3">
            {rooms.map((room, i) => (
              <div key={i} className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Room {i + 1}</p>
                  {rooms.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRooms((prev) => prev.filter((_, index) => index !== i));
                        quote.reset();
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Room type</Label>
                    <Select
                      value={room.roomTypeId}
                      onValueChange={(v) => {
                        if (!v) return;
                        update(i, { roomTypeId: v });
                        quote.reset();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        {options?.roomTypes.map((rt) => (
                          <SelectItem key={rt.id} value={rt.id}>
                            {rt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Board</Label>
                    <Select
                      value={room.mealBasisId}
                      onValueChange={(v) => {
                        if (!v) return;
                        update(i, { mealBasisId: v });
                        quote.reset();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        {options?.mealBases.map((mb) => (
                          <SelectItem key={mb.id} value={mb.id}>
                            {mb.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {(["adults", "children", "infants"] as const).map((field) => (
                    <div key={field} className="space-y-1.5">
                      <Label className="text-xs capitalize">{field}</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            update(i, {
                              [field]: Math.max(field === "adults" ? 1 : 0, room[field] - 1),
                            } as Partial<RoomDraft>);
                            quote.reset();
                          }}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{room[field]}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            update(i, { [field]: room[field] + 1 } as Partial<RoomDraft>);
                            quote.reset();
                          }}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {room.children > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {room.childAges.map((age, k) => (
                      <div key={k} className="space-y-1.5">
                        <Label className="text-xs">Child {k + 1} age</Label>
                        <Input
                          type="number"
                          min={0}
                          max={17}
                          value={age}
                          className="w-20"
                          onChange={(e) => {
                            const ages = [...room.childAges];
                            ages[k] = Number(e.target.value);
                            update(i, { childAges: ages });
                            quote.reset();
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRooms((prev) => [
                  ...prev,
                  {
                    roomTypeId: prev[0]?.roomTypeId ?? "",
                    mealBasisId: prev[0]?.mealBasisId ?? "",
                    adults: 2,
                    children: 0,
                    infants: 0,
                    childAges: [],
                  },
                ]);
                quote.reset();
              }}
            >
              <Plus className="mr-1 size-3" /> Add room
            </Button>
          </div>

          {result && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current net</span>
                <span>{money(result.currentTotal, result.currencyCode)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New net</span>
                <span>{money(result.newTotal, result.currencyCode)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Difference</span>
                <span className={result.difference > 0 ? "text-destructive" : "text-emerald-600"}>
                  {result.difference > 0 ? "+" : ""}
                  {money(result.difference, result.currencyCode)}
                </span>
              </div>
              {result.reason && (
                <div className="flex items-start gap-2 border-t pt-2 text-xs">
                  {result.outcome !== "self_service" && (
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  )}
                  <p>{result.reason}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!result ? (
            <Button
              disabled={!datesValid || !roomsValid || quote.isPending}
              onClick={() => quote.mutate(proposal)}
            >
              {quote.isPending ? "Pricing..." : "Price this change"}
            </Button>
          ) : (
            <Button
              disabled={amend.isPending || result.outcome === "blocked"}
              onClick={() => amend.mutate({ ...proposal, acceptedTotal: result.newTotal })}
            >
              {amend.isPending
                ? "Working..."
                : willRequest
                  ? "Send request"
                  : canApply
                    ? "Confirm change"
                    : "Not available"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
