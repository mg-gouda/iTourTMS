"use client";

import { FormEvent, useState } from "react";
import { format, addDays } from "date-fns";

interface Props {
  airports: Array<{ id: string; name: string; code: string }>;
  vehicleTypes: Array<{ id: string; name: string; capacity: number }>;
}

export function TransferBookingForm({ airports, vehicleTypes }: Props) {
  const [type, setType] = useState<"ARR" | "DEP" | "ARR_DEP">("ARR");
  const [airportId, setAirportId] = useState(airports[0]?.id ?? "");
  const [hotelName, setHotelName] = useState("");
  const [date, setDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [flightNo, setFlightNo] = useState("");
  const [flightTime, setFlightTime] = useState("");
  const [passengers, setPassengers] = useState(2);
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/b2c/transfer-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          airportId,
          hotelName,
          date,
          flightNo: flightNo || undefined,
          flightTime: flightTime || undefined,
          passengers,
          vehicleTypeId: vehicleTypeId || undefined,
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Submission failed");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="pub-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h3 className="mb-2 text-xl font-bold" style={{ fontFamily: "var(--pub-heading-font)" }}>
          Enquiry Submitted!
        </h3>
        <p className="text-[var(--pub-muted-foreground)]">
          We&apos;ll review your request and get back to you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="pub-card space-y-4 p-6">
      <h2
        className="text-xl font-bold"
        style={{ fontFamily: "var(--pub-heading-font)" }}
      >
        Book a Transfer
      </h2>

      {error && (
        <div className="rounded-[var(--pub-radius)] border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Transfer Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
          >
            <option value="ARR">Airport Arrival (Pickup)</option>
            <option value="DEP">Airport Departure (Drop-off)</option>
            <option value="ARR_DEP">Return (Both Ways)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Airport</label>
          <select
            required
            value={airportId}
            onChange={(e) => setAirportId(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
          >
            <option value="">Select airport...</option>
            {airports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Hotel / Destination</label>
          <input
            type="text"
            required
            value={hotelName}
            onChange={(e) => setHotelName(e.target.value)}
            placeholder="Hotel name or address"
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Flight Number</label>
          <input
            type="text"
            value={flightNo}
            onChange={(e) => setFlightNo(e.target.value)}
            placeholder="e.g. EK123"
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Flight Time</label>
          <input
            type="time"
            value={flightTime}
            onChange={(e) => setFlightTime(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Passengers</label>
          <input
            type="number"
            required
            min={1}
            max={50}
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value))}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
          />
        </div>

        {vehicleTypes.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium">Vehicle Preference</label>
            <select
              value={vehicleTypeId}
              onChange={(e) => setVehicleTypeId(e.target.value)}
              className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
            >
              <option value="">No preference</option>
              {vehicleTypes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} (up to {v.capacity} pax)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <hr className="border-[var(--pub-border)]" />

      <h3 className="text-sm font-semibold">Contact Details</h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium">First Name</label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Last Name</label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Special Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-2 text-sm"
          placeholder="Child seats, extra luggage, wheelchair access, etc."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="pub-btn pub-btn-primary w-full justify-center sm:w-auto disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Transfer Enquiry"}
      </button>
    </form>
  );
}
