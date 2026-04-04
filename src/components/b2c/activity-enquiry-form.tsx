"use client";

import { FormEvent, useState } from "react";
import { format, addDays } from "date-fns";

interface Props {
  excursionId: string;
  excursionName: string;
  maxPax: number | null;
  onClose: () => void;
}

export function ActivityEnquiryForm({ excursionId, excursionName, maxPax, onClose }: Props) {
  const [date, setDate] = useState(format(addDays(new Date(), 3), "yyyy-MM-dd"));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
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

    try {
      const res = await fetch("/api/b2c/activity-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excursionId,
          date,
          adults,
          children,
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
      <div className="space-y-3 p-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <p className="font-semibold">Enquiry Submitted!</p>
        <p className="text-sm text-[var(--pub-muted-foreground)]">
          We&apos;ll confirm availability and contact you shortly.
        </p>
        <button onClick={onClose} className="text-sm text-[var(--pub-primary)] hover:underline">
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4">
      <h4 className="font-semibold">Book: {excursionName}</h4>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-0.5 block text-xs font-medium">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-0.5 block text-xs font-medium">Adults</label>
            <input
              type="number"
              min={1}
              max={maxPax ?? 50}
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-0.5 block text-xs font-medium">Children</label>
            <input
              type="number"
              min={0}
              max={20}
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-0.5 block text-xs font-medium">First Name</label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium">Last Name</label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-0.5 block text-xs font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-0.5 block text-xs font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-2 py-1.5 text-sm"
          placeholder="Any special requirements..."
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="pub-btn pub-btn-primary flex-1 justify-center text-sm disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit Enquiry"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-1.5 text-sm hover:bg-[var(--pub-muted)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
