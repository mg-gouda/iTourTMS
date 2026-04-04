"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";

interface BookingDetail {
  id: string;
  code: string;
  status: string;
  leadGuestName: string | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  arrivalFlightNo: string | null;
  arrivalFlightTime: string | null;
  departureFlightNo: string | null;
  departureFlightTime: string | null;
  specialRequests: string | null;
  sellingTotal: number;
  buyingTotal: number;
  hotel: { name: string; code: string } | null;
  currency: { code: string; symbol: string } | null;
  contract: { code: string; name: string } | null;
  rooms: Array<{
    id: string;
    roomType: { name: string } | null;
    mealBasis: { name: string } | null;
    sellingRate: number;
    guests: Array<{
      guest: { firstName: string; lastName: string; guestType: string };
    }>;
  }>;
  vouchers: Array<{
    id: string;
    code: string;
    status: string;
    createdAt: string;
  }>;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CHECKED_IN: "bg-blue-100 text-blue-700",
  CHECKED_OUT: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

export default function B2bReservationDetailPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/b2c/b2b-portal?action=reservation-detail&id=${bookingId}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-[var(--pub-muted-foreground)]">
        Loading booking details...
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="pub-card p-6 text-center">
        <p className="text-[var(--pub-muted-foreground)]">Booking not found.</p>
        <Link href="/b2b/reservations" className="mt-2 text-sm text-[var(--pub-primary)] hover:underline">
          Back to reservations
        </Link>
      </div>
    );
  }

  const sym = booking.currency?.symbol ?? "";
  const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/b2b/reservations"
            className="text-sm text-[var(--pub-muted-foreground)] hover:text-[var(--pub-primary)]"
          >
            &larr; Back to Reservations
          </Link>
          <h1
            className="mt-1 text-2xl font-bold"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            {booking.code}
          </h1>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {booking.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Info */}
        <div className="pub-card p-4 space-y-3">
          <h2 className="font-semibold">Booking Details</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-[var(--pub-muted-foreground)]">Hotel</div>
            <div className="font-medium">{booking.hotel?.name ?? "—"}</div>

            <div className="text-[var(--pub-muted-foreground)]">Check-in</div>
            <div>{format(new Date(booking.checkIn), "dd MMM yyyy")}</div>

            <div className="text-[var(--pub-muted-foreground)]">Check-out</div>
            <div>{format(new Date(booking.checkOut), "dd MMM yyyy")}</div>

            <div className="text-[var(--pub-muted-foreground)]">Nights</div>
            <div>{nights}</div>

            <div className="text-[var(--pub-muted-foreground)]">Guests</div>
            <div>
              {booking.adults} Adult(s)
              {booking.children > 0 && `, ${booking.children} Child(ren)`}
              {booking.infants > 0 && `, ${booking.infants} Infant(s)`}
            </div>

            <div className="text-[var(--pub-muted-foreground)]">Lead Guest</div>
            <div>{booking.leadGuestName ?? "—"}</div>

            <div className="text-[var(--pub-muted-foreground)]">Created</div>
            <div>{format(new Date(booking.createdAt), "dd MMM yyyy HH:mm")}</div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="pub-card p-4 space-y-3">
          <h2 className="font-semibold">Financial Summary</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-[var(--pub-muted-foreground)]">Net Total</div>
            <div className="text-lg font-bold">
              {sym} {Number(booking.sellingTotal ?? 0).toFixed(2)}
            </div>

            <div className="text-[var(--pub-muted-foreground)]">Contract</div>
            <div>{booking.contract?.code ?? "—"}</div>

            <div className="text-[var(--pub-muted-foreground)]">Currency</div>
            <div>{booking.currency?.code ?? "—"}</div>
          </div>

          {/* Flight Info */}
          {(booking.arrivalFlightNo || booking.departureFlightNo) && (
            <>
              <h3 className="mt-4 text-sm font-semibold">Flight Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {booking.arrivalFlightNo && (
                  <>
                    <div className="text-[var(--pub-muted-foreground)]">Arrival</div>
                    <div>
                      {booking.arrivalFlightNo}
                      {booking.arrivalFlightTime && ` at ${booking.arrivalFlightTime}`}
                    </div>
                  </>
                )}
                {booking.departureFlightNo && (
                  <>
                    <div className="text-[var(--pub-muted-foreground)]">Departure</div>
                    <div>
                      {booking.departureFlightNo}
                      {booking.departureFlightTime && ` at ${booking.departureFlightTime}`}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rooms */}
      {booking.rooms.length > 0 && (
        <div className="pub-card p-4">
          <h2 className="mb-3 font-semibold">Rooms</h2>
          <div className="space-y-3">
            {booking.rooms.map((room) => (
              <div key={room.id} className="rounded-lg border border-[var(--pub-border)] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{room.roomType?.name ?? "Room"}</span>
                    <span className="ml-2 text-sm text-[var(--pub-muted-foreground)]">
                      {room.mealBasis?.name ?? "—"}
                    </span>
                  </div>
                  <span className="font-semibold">
                    {sym} {Number(room.sellingRate ?? 0).toFixed(2)}
                  </span>
                </div>
                {room.guests.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {room.guests.map((rg, i) => (
                      <span
                        key={i}
                        className="inline-flex rounded-full bg-[var(--pub-muted)] px-2 py-0.5 text-xs"
                      >
                        {rg.guest.firstName} {rg.guest.lastName}
                        <span className="ml-1 text-[var(--pub-muted-foreground)]">
                          ({rg.guest.guestType})
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special Requests */}
      {booking.specialRequests && (
        <div className="pub-card p-4">
          <h2 className="mb-2 font-semibold">Special Requests</h2>
          <p className="text-sm text-[var(--pub-muted-foreground)]">
            {booking.specialRequests}
          </p>
        </div>
      )}

      {/* Vouchers */}
      {booking.vouchers.length > 0 && (
        <div className="pub-card p-4">
          <h2 className="mb-3 font-semibold">Vouchers</h2>
          <div className="space-y-2">
            {booking.vouchers.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-[var(--pub-border)] p-3 text-sm"
              >
                <div>
                  <span className="font-medium">{v.code}</span>
                  <span className="ml-2 text-[var(--pub-muted-foreground)]">
                    {format(new Date(v.createdAt), "dd MMM yyyy")}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    v.status === "ISSUED"
                      ? "bg-blue-100 text-blue-700"
                      : v.status === "USED"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
