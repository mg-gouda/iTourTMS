"use client";

import { FormEvent, useState } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import Link from "next/link";

interface RoomResult {
  roomTypeName: string;
  mealBasisName: string;
  total: number;
  pricePerNight: number;
  allotmentStatus: string;
  contractId: string;
  roomTypeId: string;
  mealBasisId: string;
}

interface HotelResult {
  hotelId: string;
  hotelName: string;
  destinationName: string;
  starRating: number;
  nights: number;
  cheapestTotal: number;
  cheapestPerNight: number;
  rooms: RoomResult[];
}

interface SearchResponse {
  hotels: HotelResult[];
  total: number;
  page: number;
  pageSize: number;
}

export default function B2bSearchPage() {
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const dayAfter = format(addDays(new Date(), 3), "yyyy-MM-dd");

  const [checkIn, setCheckIn] = useState(tomorrow);
  const [checkOut, setCheckOut] = useState(dayAfter);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResults(null);

    try {
      const params = new URLSearchParams({
        checkIn,
        checkOut,
        adults: String(adults),
        children: String(children),
      });
      if (childAges.length > 0) {
        childAges.forEach((age) => params.append("childAges", String(age)));
      }

      const res = await fetch(`/api/b2c/search?${params}&b2b=true`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Search failed");
      }
      const data: SearchResponse = await res.json();
      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  const nights = differenceInDays(new Date(checkOut), new Date(checkIn));

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Search & Book
        </h1>
        <p className="text-sm text-[var(--pub-muted-foreground)]">
          Search for hotel availability at net rates.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="pub-card space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-medium">Check-in</label>
            <input
              type="date"
              required
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Check-out</label>
            <input
              type="date"
              required
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn}
              className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Adults</label>
            <input
              type="number"
              min={1}
              max={10}
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Children</label>
            <input
              type="number"
              min={0}
              max={6}
              value={children}
              onChange={(e) => {
                const val = Number(e.target.value);
                setChildren(val);
                setChildAges((prev) => {
                  if (val > prev.length) return [...prev, ...Array(val - prev.length).fill(5)];
                  return prev.slice(0, val);
                });
              }}
              className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || nights < 1}
              className="pub-btn pub-btn-primary w-full justify-center disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {/* Child ages */}
        {children > 0 && (
          <div className="flex flex-wrap gap-2">
            {childAges.map((age, i) => (
              <div key={i} className="flex items-center gap-1">
                <label className="text-xs text-[var(--pub-muted-foreground)]">
                  Child {i + 1} age:
                </label>
                <input
                  type="number"
                  min={0}
                  max={17}
                  value={age}
                  onChange={(e) => {
                    const newAges = [...childAges];
                    newAges[i] = Number(e.target.value);
                    setChildAges(newAges);
                  }}
                  className="w-14 rounded border border-[var(--pub-border)] px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
        )}
      </form>

      {error && (
        <div className="rounded-[var(--pub-radius)] border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--pub-muted-foreground)]">
            {results.total} hotel(s) found for {nights} night(s)
          </p>

          {results.hotels.length === 0 && (
            <div className="pub-card p-6 text-center text-[var(--pub-muted-foreground)]">
              No availability found for the selected dates.
            </div>
          )}

          {results.hotels.map((hotel) => (
            <div key={hotel.hotelId} className="pub-card overflow-hidden">
              <div
                className="flex cursor-pointer items-center justify-between p-4"
                onClick={() =>
                  setExpandedHotel(expandedHotel === hotel.hotelId ? null : hotel.hotelId)
                }
              >
                <div>
                  <h3 className="text-lg font-semibold">{hotel.hotelName}</h3>
                  <p className="text-sm text-[var(--pub-muted-foreground)]">
                    {hotel.destinationName} | {"*".repeat(hotel.starRating)} |{" "}
                    {hotel.nights} night(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[var(--pub-primary)]">
                    From {hotel.cheapestTotal.toFixed(2)}
                  </p>
                  <p className="text-xs text-[var(--pub-muted-foreground)]">
                    {hotel.cheapestPerNight.toFixed(2)} / night (net)
                  </p>
                </div>
              </div>

              {expandedHotel === hotel.hotelId && (
                <div className="border-t border-[var(--pub-border)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--pub-muted)] text-left text-xs uppercase text-[var(--pub-muted-foreground)]">
                        <th className="px-4 py-2">Room Type</th>
                        <th className="px-4 py-2">Meal Plan</th>
                        <th className="px-4 py-2">Availability</th>
                        <th className="px-4 py-2 text-right">Net / Night</th>
                        <th className="px-4 py-2 text-right">Net Total</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {hotel.rooms.map((room, idx) => (
                        <tr key={idx} className="border-t border-[var(--pub-border)]">
                          <td className="px-4 py-3">{room.roomTypeName}</td>
                          <td className="px-4 py-3">{room.mealBasisName}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                room.allotmentStatus === "FREESALE"
                                  ? "bg-green-100 text-green-700"
                                  : room.allotmentStatus === "ON_REQUEST"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {room.allotmentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {room.pricePerNight.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {room.total.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/b2b/book?hotelId=${hotel.hotelId}&contractId=${room.contractId}&roomTypeId=${room.roomTypeId}&mealBasisId=${room.mealBasisId}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}${childAges.map((a) => `&childAges=${a}`).join("")}`}
                              className="pub-btn pub-btn-primary inline-flex px-4 py-1.5 text-xs"
                            >
                              Book
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
