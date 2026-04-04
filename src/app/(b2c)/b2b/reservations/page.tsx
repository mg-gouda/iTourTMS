"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";

interface Booking {
  id: string;
  code: string;
  status: string;
  leadGuestName: string | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  hotel: { name: string } | null;
  sellingTotal: number;
  currency: { code: string } | null;
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

export default function B2bReservationsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchBookings() {
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        if (search) params.set("search", search);

        const res = await fetch(`/api/b2c/b2b-portal?action=reservations&${params}`);
        if (res.ok) {
          const data = await res.json();
          setBookings(data.items ?? []);
        }
      } catch {
        // Silent fail — shows empty
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, [statusFilter, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Reservations
        </h1>
        <p className="text-sm text-[var(--pub-muted-foreground)]">
          View and manage your bookings.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by code or guest name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="CHECKED_OUT">Checked Out</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="pub-card overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center text-[var(--pub-muted-foreground)]">
            Loading reservations...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-6 text-center text-[var(--pub-muted-foreground)]">
            No reservations found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-[var(--pub-muted-foreground)]">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Hotel</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Pax</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((bk) => (
                <tr key={bk.id} className="border-b last:border-0 hover:bg-[var(--pub-muted)]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/b2b/reservations/${bk.id}`}
                      className="font-medium text-[var(--pub-primary)] hover:underline"
                    >
                      {bk.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{bk.leadGuestName ?? "—"}</td>
                  <td className="px-4 py-3">{bk.hotel?.name ?? "—"}</td>
                  <td className="px-4 py-3">{format(new Date(bk.checkIn), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3">{format(new Date(bk.checkOut), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3">
                    {bk.adults}A{bk.children > 0 ? ` + ${bk.children}C` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[bk.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {bk.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {bk.currency?.code ?? ""} {Number(bk.sellingTotal ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
