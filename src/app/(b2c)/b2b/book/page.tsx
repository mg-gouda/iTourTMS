"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";

export default function B2bBookPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const hotelId = searchParams.get("hotelId") ?? "";
  const contractId = searchParams.get("contractId") ?? "";
  const roomTypeId = searchParams.get("roomTypeId") ?? "";
  const mealBasisId = searchParams.get("mealBasisId") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const adults = Number(searchParams.get("adults") ?? 2);
  const children = Number(searchParams.get("children") ?? 0);

  const nights = checkIn && checkOut
    ? differenceInDays(new Date(checkOut), new Date(checkIn))
    : 0;

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [flightNo, setFlightNo] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingCode, setBookingCode] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/b2c/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          contractId,
          roomTypeId,
          mealCode: mealBasisId,
          checkIn,
          checkOut,
          adults,
          children,
          childAges: [],
          firstName: guestName.split(" ")[0] || guestName,
          lastName: guestName.split(" ").slice(1).join(" ") || "-",
          email: guestEmail,
          phone: guestPhone || undefined,
          specialRequests: specialRequests || undefined,
          total: 0, // Net rate — actual rate calculated server-side
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Booking failed");
      }

      const data = await res.json();
      setBookingCode(data.bookingCode ?? data.code ?? "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (bookingCode) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="pub-card max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h2 className="mb-2 text-xl font-bold" style={{ fontFamily: "var(--pub-heading-font)" }}>
            Booking Confirmed
          </h2>
          <p className="mb-4 text-[var(--pub-muted-foreground)]">
            Your booking reference is:
          </p>
          <p className="mb-6 text-2xl font-mono font-bold text-[var(--pub-primary)]">
            {bookingCode}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/b2b/reservations" className="pub-btn pub-btn-primary">
              View Reservations
            </Link>
            <Link href="/b2b/search" className="pub-btn border border-[var(--pub-border)] hover:bg-[var(--pub-muted)]">
              New Search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hotelId || !checkIn || !checkOut) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="pub-card p-8 text-center">
          <p className="text-[var(--pub-muted-foreground)]">
            Missing booking details. Please{" "}
            <Link href="/b2b/search" className="text-[var(--pub-primary)] underline">search for a hotel</Link>{" "}
            first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/b2b/search" className="text-sm text-[var(--pub-muted-foreground)] hover:text-[var(--pub-primary)]">
          &larr; Back to Search
        </Link>
        <h1 className="mt-1 text-2xl font-bold" style={{ fontFamily: "var(--pub-heading-font)" }}>
          Complete Booking
        </h1>
      </div>

      {/* Booking Summary */}
      <div className="pub-card p-4">
        <h2 className="mb-3 font-semibold">Booking Summary</h2>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <span className="text-[var(--pub-muted-foreground)]">Check-in</span>
            <p className="font-medium">{checkIn ? format(new Date(checkIn), "dd MMM yyyy") : "—"}</p>
          </div>
          <div>
            <span className="text-[var(--pub-muted-foreground)]">Check-out</span>
            <p className="font-medium">{checkOut ? format(new Date(checkOut), "dd MMM yyyy") : "—"}</p>
          </div>
          <div>
            <span className="text-[var(--pub-muted-foreground)]">Nights</span>
            <p className="font-medium">{nights}</p>
          </div>
          <div>
            <span className="text-[var(--pub-muted-foreground)]">Guests</span>
            <p className="font-medium">{adults} Adult(s){children > 0 ? `, ${children} Child(ren)` : ""}</p>
          </div>
        </div>
      </div>

      {/* Guest Form */}
      <form onSubmit={handleSubmit} className="pub-card space-y-4 p-4">
        <h2 className="font-semibold">Guest Details</h2>

        {error && (
          <div className="rounded-[var(--pub-radius)] border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Guest Name *</label>
            <input
              type="text"
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email *</label>
            <input
              type="email"
              required
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input
              type="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Flight No</label>
            <input
              type="text"
              value={flightNo}
              onChange={(e) => setFlightNo(e.target.value)}
              placeholder="e.g. EK123"
              className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Special Requests</label>
          <textarea
            rows={3}
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
            placeholder="Any special requirements..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || !guestName || !guestEmail}
          className="pub-btn pub-btn-primary w-full justify-center sm:w-auto disabled:opacity-50"
        >
          {loading ? "Submitting Booking..." : "Confirm Booking"}
        </button>
      </form>
    </div>
  );
}
