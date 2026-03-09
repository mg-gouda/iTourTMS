"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function GuestLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }

    const params = new URLSearchParams({ email: trimmed });
    if (code.trim()) {
      params.set("code", code.trim());
    }
    router.push(`/my-bookings?${params.toString()}`);
  }

  return (
    <div className="pub-section">
      <div className="pub-container max-w-md">
        <div className="pub-card p-8">
          <h1
            className="mb-2 text-center text-2xl font-bold"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            Find Your Booking
          </h1>
          <p className="mb-6 text-center text-sm text-[var(--pub-muted-foreground)]">
            Enter your email to look up your bookings. Optionally add a booking
            code to find a specific reservation.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)]"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Booking Code{" "}
                <span className="text-[var(--pub-muted-foreground)]">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)]"
                placeholder="e.g. BK-24-001"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              className="pub-btn pub-btn-primary w-full justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              Look Up Bookings
            </button>
          </form>

          <div className="mt-6 text-center">
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
    </div>
  );
}
