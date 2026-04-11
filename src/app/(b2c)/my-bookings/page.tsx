"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Hotel,
  Loader2,
  Search,
  Star,
  Users,
} from "lucide-react";

/* ---------- types ---------- */
interface BookingRoom {
  roomType: { name: string };
  mealBasis: { name: string };
  adults: number;
  children: number;
}

interface BookingResult {
  id: string;
  code: string;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  leadGuestName: string | null;
  sellingTotal: number | string;
  paymentStatus: string;
  specialRequests: string | null;
  createdAt: string;
  hotel: { id: string; name: string; starRating: string; city: string };
  rooms: BookingRoom[];
}

/* ---------- helpers ---------- */
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  NEW_BOOKING: { bg: "bg-blue-100", text: "text-blue-800", label: "New" },
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
  CONFIRMED: { bg: "bg-green-100", text: "text-green-800", label: "Confirmed" },
  CHECKED_IN: { bg: "bg-amber-100", text: "text-amber-800", label: "Checked In" },
  CHECKED_OUT: { bg: "bg-gray-200", text: "text-gray-600", label: "Checked Out" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-800", label: "Cancelled" },
  NO_SHOW: { bg: "bg-orange-100", text: "text-orange-800", label: "No Show" },
  PENDING_APPROVAL: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
};

const STAR_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const yr = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${yr}`;
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

function Stars({ rating }: { rating: string }) {
  const count = STAR_MAP[rating] ?? 3;
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
        />
      ))}
    </span>
  );
}

/* ---------- inner component (uses useSearchParams) ---------- */
function MyBookingsContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const code = searchParams.get("code");

  const [bookings, setBookings] = useState<BookingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ email });
    if (code) params.set("code", code);

    fetch(`/api/b2c/my-bookings?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to fetch bookings");
        }
        return res.json();
      })
      .then((data) => setBookings(data.bookings ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [email, code]);

  /* No email — redirect to login */
  if (!email) {
    return (
      <div className="pub-section">
        <div className="pub-container max-w-md text-center">
          <div className="pub-card p-8">
            <h1
              className="mb-2 text-2xl font-bold"
              style={{ fontFamily: "var(--pub-heading-font)" }}
            >
              My Bookings
            </h1>
            <p className="mb-6 text-[var(--pub-muted-foreground)]">
              Please provide your email to look up your bookings.
            </p>
            <Link
              href="/my-bookings/login"
              className="pub-btn pub-btn-primary"
            >
              Look Up Bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Loading */
  if (loading) {
    return (
      <div className="pub-section">
        <div className="pub-container flex items-center justify-center gap-3 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--pub-primary)]" />
          <span className="text-[var(--pub-muted-foreground)]">
            Loading bookings...
          </span>
        </div>
      </div>
    );
  }

  /* Error */
  if (error) {
    return (
      <div className="pub-section">
        <div className="pub-container max-w-md text-center">
          <div className="pub-card p-8">
            <p className="mb-4 text-red-500">{error}</p>
            <Link
              href="/my-bookings/login"
              className="pub-btn pub-btn-primary"
            >
              Try Again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pub-section">
      <div className="pub-container max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--pub-heading-font)" }}
            >
              My Bookings
            </h1>
            <p className="mt-1 text-sm text-[var(--pub-muted-foreground)]">
              Showing results for{" "}
              <span className="font-medium text-[var(--pub-foreground)]">
                {email}
              </span>
              {code && (
                <>
                  {" "}
                  &middot; Code:{" "}
                  <span className="font-mono font-medium">{code}</span>
                </>
              )}
            </p>
          </div>
          <Link
            href="/my-bookings/login"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--pub-primary)] hover:underline"
          >
            <Search className="h-3.5 w-3.5" />
            Search Again
          </Link>
        </div>

        {/* No results */}
        {bookings.length === 0 && (
          <div className="pub-card p-8 text-center">
            <Hotel className="mx-auto mb-3 h-10 w-10 text-[var(--pub-muted-foreground)]" />
            <p className="mb-1 font-medium">No bookings found</p>
            <p className="mb-6 text-sm text-[var(--pub-muted-foreground)]">
              We couldn&apos;t find any bookings matching your details. Please
              check your email and booking code.
            </p>
            <Link
              href="/my-bookings/login"
              className="pub-btn pub-btn-primary"
            >
              Search Again
            </Link>
          </div>
        )}

        {/* Booking cards */}
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="pub-card p-5">
              {/* Top row: code + status */}
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-base font-bold">
                  {b.code}
                </span>
                <StatusBadge status={b.status} />
              </div>

              {/* Hotel */}
              <div className="mb-3 flex items-center gap-2">
                <Hotel className="h-4 w-4 text-[var(--pub-muted-foreground)]" />
                <span className="font-medium">{b.hotel.name}</span>
                <Stars rating={b.hotel.starRating} />
                <span className="text-sm text-[var(--pub-muted-foreground)]">
                  &middot; {b.hotel.city}
                </span>
              </div>

              {/* Dates + guests row */}
              <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--pub-muted-foreground)]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(b.checkIn)} &rarr; {formatDate(b.checkOut)}{" "}
                  <span className="text-xs">
                    ({b.nights} night{b.nights !== 1 ? "s" : ""})
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {b.adults} adult{b.adults !== 1 ? "s" : ""}
                  {b.children > 0 &&
                    `, ${b.children} child${b.children !== 1 ? "ren" : ""}`}
                </span>
              </div>

              {/* Rooms */}
              {b.rooms.length > 0 && (
                <div className="mb-3 space-y-1">
                  {b.rooms.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="rounded bg-[var(--pub-muted)] px-1.5 py-0.5 text-xs font-medium">
                        Room {i + 1}
                      </span>
                      <span>{r.roomType.name}</span>
                      <span className="text-[var(--pub-muted-foreground)]">
                        &middot; {r.mealBasis.name}
                      </span>
                      <span className="text-xs text-[var(--pub-muted-foreground)]">
                        ({r.adults}A
                        {r.children > 0 && ` + ${r.children}C`})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Special requests */}
              {b.specialRequests && (
                <p className="mb-3 rounded bg-[var(--pub-muted)] px-3 py-2 text-sm italic text-[var(--pub-muted-foreground)]">
                  {b.specialRequests}
                </p>
              )}

              {/* Footer: total */}
              <div className="flex items-center justify-between border-t border-[var(--pub-border)] pt-3">
                <span className="text-sm text-[var(--pub-muted-foreground)]">
                  Total
                </span>
                <span className="text-lg font-bold text-[var(--pub-primary)]">
                  {Number(b.sellingTotal).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Back to home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--pub-primary)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------- page with Suspense boundary ---------- */
export default function MyBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="pub-section">
          <div className="pub-container flex items-center justify-center gap-3 py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--pub-primary)]" />
            <span className="text-[var(--pub-muted-foreground)]">
              Loading...
            </span>
          </div>
        </div>
      }
    >
      <MyBookingsContent />
    </Suspense>
  );
}
