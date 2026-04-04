"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface BookingItem {
  id: string;
  code: string;
  status: string;
  leadGuestName: string | null;
  checkIn: string;
  checkOut: string;
  hotel: { name: string } | null;
  sellingTotal: number;
  currency: { code: string } | null;
}

export default function B2bDashboardPage() {
  const { data: session } = useSession();
  const [recentBookings, setRecentBookings] = useState<BookingItem[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/b2c/b2b-portal?action=dashboard");
        if (res.ok) {
          const data = await res.json();
          setRecentBookings(data.recentBookings ?? []);
          setStats(data.stats ?? stats);
        }
      } catch {
        // Silently handle — dashboard shows empty state
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Welcome back, {session?.user?.name ?? "Partner"}
        </h1>
        <p className="text-sm text-[var(--pub-muted-foreground)]">
          Manage your bookings and search for availability.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/b2b/search"
          className="pub-card flex flex-col items-center gap-2 p-6 text-center transition-shadow hover:shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--pub-primary)]"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span className="font-semibold">Search & Book</span>
          <span className="text-xs text-[var(--pub-muted-foreground)]">
            Find hotels and rates
          </span>
        </Link>

        <Link
          href="/b2b/reservations"
          className="pub-card flex flex-col items-center gap-2 p-6 text-center transition-shadow hover:shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--pub-primary)]"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <span className="font-semibold">Reservations</span>
          <span className="text-xs text-[var(--pub-muted-foreground)]">
            View all bookings
          </span>
        </Link>

        <Link
          href="/b2b/account"
          className="pub-card flex flex-col items-center gap-2 p-6 text-center transition-shadow hover:shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--pub-primary)]"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span className="font-semibold">Account</span>
          <span className="text-xs text-[var(--pub-muted-foreground)]">
            Profile & credit
          </span>
        </Link>

        <Link
          href="/b2b/search"
          className="pub-card flex flex-col items-center gap-2 p-6 text-center transition-shadow hover:shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--pub-primary)]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span className="font-semibold">Rate Sheets</span>
          <span className="text-xs text-[var(--pub-muted-foreground)]">
            View available rates
          </span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Bookings", value: stats.totalBookings },
          { label: "Confirmed", value: stats.confirmedBookings },
          { label: "Pending", value: stats.pendingBookings },
        ].map((stat) => (
          <div key={stat.label} className="pub-card p-4">
            <p className="text-sm text-[var(--pub-muted-foreground)]">{stat.label}</p>
            <p className="text-2xl font-bold">{loading ? "—" : stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="pub-card p-4">
        <h2 className="mb-4 text-lg font-semibold">Recent Bookings</h2>
        {loading ? (
          <p className="text-sm text-[var(--pub-muted-foreground)]">Loading...</p>
        ) : recentBookings.length === 0 ? (
          <p className="text-sm text-[var(--pub-muted-foreground)]">
            No bookings yet.{" "}
            <Link href="/b2b/search" className="text-[var(--pub-primary)] underline">
              Search for hotels
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[var(--pub-muted-foreground)]">
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 font-medium">Guest</th>
                  <th className="pb-2 font-medium">Hotel</th>
                  <th className="pb-2 font-medium">Check-in</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((bk) => (
                  <tr key={bk.id} className="border-b last:border-0">
                    <td className="py-2">
                      <Link href={`/b2b/reservations/${bk.id}`} className="text-[var(--pub-primary)] hover:underline">
                        {bk.code}
                      </Link>
                    </td>
                    <td className="py-2">{bk.leadGuestName ?? "—"}</td>
                    <td className="py-2">{bk.hotel?.name ?? "—"}</td>
                    <td className="py-2">{format(new Date(bk.checkIn), "dd MMM yyyy")}</td>
                    <td className="py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        bk.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                        bk.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {bk.status}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {bk.currency?.code ?? ""} {Number(bk.sellingTotal ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
