"use client";

import { useState } from "react";
import { CalendarDays, Users, Search, Bed, UtensilsCrossed, Tag } from "lucide-react";
import { AvailabilityBadge } from "./availability-badge";

interface HotelAvailabilityWidgetProps {
  hotelId: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
}

interface RoomResult {
  roomTypeName: string;
  mealName: string;
  mealCode: string;
  availability: "available" | "on_request" | "limited" | "sold_out";
  remainingRooms: number;
  total: number;
  pricePerNight: number;
  totalBeforeOffer: number;
  appliedOffer: { name: string; saving: number } | null;
}

interface AvailabilityResult {
  currency: string;
  nights: number;
  rooms: RoomResult[];
}

export function HotelAvailabilityWidget({
  hotelId,
  initialCheckIn,
  initialCheckOut,
  initialAdults,
}: HotelAvailabilityWidgetProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const [checkIn, setCheckIn] = useState(
    initialCheckIn || tomorrow.toISOString().split("T")[0],
  );
  const [checkOut, setCheckOut] = useState(
    initialCheckOut || dayAfter.toISOString().split("T")[0],
  );
  const [adults, setAdults] = useState(initialAdults || 2);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!checkIn || !checkOut) return;
    setIsLoading(true);

    try {
      const sp = new URLSearchParams({
        hotelId,
        checkIn,
        checkOut,
        adults: String(adults),
      });
      const res = await fetch(`/api/b2c/search?${sp.toString()}`);
      const data = await res.json();

      if (data.hotels && data.hotels.length > 0) {
        const hotel = data.hotels[0];
        setResult({
          currency: hotel.currency,
          nights: hotel.nights,
          rooms: hotel.rooms,
        });
      } else {
        setResult({ currency: "", nights: 0, rooms: [] });
      }
    } catch {
      setResult({ currency: "", nights: 0, rooms: [] });
    }

    setIsLoading(false);
    setSearched(true);
  };

  return (
    <div className="pub-card p-5">
      <h3
        className="mb-4 text-lg font-semibold"
        style={{ fontFamily: "var(--pub-heading-font)" }}
      >
        Check Availability & Prices
      </h3>

      <div className="space-y-3">
        <div>
          <label className="mb-1 flex items-center gap-1 text-sm font-medium">
            <CalendarDays className="h-3.5 w-3.5" />
            Check-in
          </label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-sm font-medium">
            <CalendarDays className="h-3.5 w-3.5" />
            Check-out
          </label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn || new Date().toISOString().split("T")[0]}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-sm font-medium">
            <Users className="h-3.5 w-3.5" />
            Adults
          </label>
          <select
            value={adults}
            onChange={(e) => setAdults(parseInt(e.target.value))}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} Adult{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="pub-btn pub-btn-primary w-full justify-center disabled:opacity-50"
        >
          {isLoading ? (
            <span className="animate-pulse">Checking...</span>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Check Availability
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {searched && result && (
        <div className="mt-4 border-t border-[var(--pub-border)] pt-4">
          {result.rooms.length === 0 ? (
            <p className="text-center text-sm text-[var(--pub-muted-foreground)]">
              No availability for these dates.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[var(--pub-muted-foreground)]">
                {result.rooms.length} room option{result.rooms.length > 1 ? "s" : ""} &middot;{" "}
                {result.nights} night{result.nights > 1 ? "s" : ""}
              </p>
              {result.rooms.slice(0, 5).map((room, i) => (
                <div
                  key={i}
                  className="space-y-1 rounded-[var(--pub-radius)] border border-[var(--pub-border)] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Bed className="h-3.5 w-3.5" />
                      {room.roomTypeName}
                    </div>
                    <AvailabilityBadge status={room.availability} remaining={room.remainingRooms} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--pub-muted-foreground)]">
                    <UtensilsCrossed className="h-3 w-3" />
                    {room.mealName}
                  </div>
                  {room.appliedOffer && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600">
                      <Tag className="h-3 w-3" />
                      {room.appliedOffer.name}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[var(--pub-muted-foreground)]">
                      {result.currency} {room.pricePerNight.toFixed(0)} / night
                    </span>
                    <div className="text-right">
                      {room.appliedOffer && (
                        <span className="mr-2 text-xs text-[var(--pub-muted-foreground)] line-through">
                          {result.currency} {room.totalBeforeOffer.toFixed(0)}
                        </span>
                      )}
                      <span className="font-bold" style={{ color: "var(--pub-primary)" }}>
                        {result.currency} {room.total.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {result.rooms.length > 5 && (
                <p className="text-center text-xs text-[var(--pub-muted-foreground)]">
                  +{result.rooms.length - 5} more options
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
