"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import {
  Baby,
  Calendar,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  User,
  Users,
  Hotel,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const TITLE_OPTIONS = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof"];

interface GuestEntry {
  title: string;
  firstName: string;
  lastName: string;
}

function BookingFlow() {
  const searchParams = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const hotelName = searchParams.get("hotelName") ?? "Selected Hotel";
  const roomType = searchParams.get("roomType") ?? "";
  const roomTypeId = searchParams.get("roomTypeId") ?? "";
  const mealCode = searchParams.get("mealCode") ?? "";
  const mealName = searchParams.get("mealName") ?? mealCode;
  const contractId = searchParams.get("contractId") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const adults = searchParams.get("adults") ?? "2";
  const children = searchParams.get("children") ?? "0";
  const total = searchParams.get("total") ?? "0";
  const currency = searchParams.get("currency") ?? "USD";
  const nationalityParam = searchParams.get("nationality") ?? "";

  const adultCount = Number(adults) || 2;
  const childCount = Number(children) || 0;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const [error, setError] = useState("");

  // Section 1: General info
  const [contactInfo, setContactInfo] = useState({
    email: "",
    phone: "",
    nationality: nationalityParam,
  });

  // Section 2: Guest names — one per adult + one per child
  const [adultGuests, setAdultGuests] = useState<GuestEntry[]>(
    Array.from({ length: adultCount }, () => ({ title: "Mr", firstName: "", lastName: "" })),
  );
  const [childGuests, setChildGuests] = useState<GuestEntry[]>(
    Array.from({ length: childCount }, () => ({ title: "Miss", firstName: "", lastName: "" })),
  );

  // Section 3: Special requests
  const [specialRequests, setSpecialRequests] = useState("");

  function updateAdultGuest(index: number, field: keyof GuestEntry, value: string) {
    setAdultGuests((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function updateChildGuest(index: number, field: keyof GuestEntry, value: string) {
    setChildGuests((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  const steps = [
    { num: 1, label: "Review", icon: Hotel },
    { num: 2, label: "Guest Details", icon: Users },
    { num: 3, label: "Payment", icon: CreditCard },
    { num: 4, label: "Confirmation", icon: CheckCircle },
  ];

  // Lead guest is always the first adult
  const leadGuest = adultGuests[0];

  async function submitBooking() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/b2c/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          roomTypeId,
          mealCode,
          contractId,
          checkIn,
          checkOut,
          adults: adultCount,
          children: childCount,
          childAges: [],
          firstName: leadGuest.firstName,
          lastName: leadGuest.lastName,
          email: contactInfo.email,
          phone: contactInfo.phone,
          nationality: contactInfo.nationality,
          specialRequests,
          total: Number(total),
          guests: [...adultGuests, ...childGuests].map((g, i) => ({
            title: g.title,
            firstName: g.firstName,
            lastName: g.lastName,
            isChild: i >= adultCount,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit booking");
        return;
      }

      setBookingCode(data.bookingCode);
      setStep(4);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const nights =
    checkIn && checkOut
      ? Math.ceil(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            86400000
        )
      : 0;

  return (
    <div className="pub-section">
      <div className="pub-container max-w-3xl">
        <h1
          className="mb-2 text-3xl font-bold"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Book Your Stay
        </h1>
        <p className="mb-8 text-[var(--pub-muted-foreground)]">
          Complete your reservation in a few simple steps
        </p>

        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  step >= s.num
                    ? "bg-[var(--pub-primary)] text-white"
                    : "bg-[var(--pub-muted)] text-[var(--pub-muted-foreground)]"
                }`}
              >
                {step > s.num ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <s.icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={`ml-2 hidden text-sm font-medium sm:inline ${
                  step >= s.num
                    ? "text-[var(--pub-foreground)]"
                    : "text-[var(--pub-muted-foreground)]"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`mx-3 h-px w-8 sm:w-12 ${
                    step > s.num
                      ? "bg-[var(--pub-primary)]"
                      : "bg-[var(--pub-border)]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Review */}
        {step === 1 && (
          <div className="pub-card p-6">
            <h2
              className="mb-4 text-xl font-semibold"
              style={{ fontFamily: "var(--pub-heading-font)" }}
            >
              Booking Summary
            </h2>

            {!hotelId ? (
              <div className="text-center py-8">
                <Hotel className="mx-auto mb-4 h-12 w-12 text-[var(--pub-muted-foreground)]" />
                <p className="mb-4 text-[var(--pub-muted-foreground)]">
                  No hotel selected. Please search and select a room first.
                </p>
                <Link
                  href="/search"
                  className="pub-btn pub-btn-primary inline-block"
                >
                  Search Hotels
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-[var(--pub-muted)]/30 p-4">
                  <p className="text-xs font-medium uppercase text-[var(--pub-muted-foreground)]">
                    Hotel
                  </p>
                  <p className="text-lg font-semibold">{hotelName}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-[var(--pub-muted)]/30 p-4">
                    <p className="text-xs font-medium uppercase text-[var(--pub-muted-foreground)]">
                      Check-in
                    </p>
                    <p className="flex items-center gap-2 text-lg font-semibold">
                      <Calendar className="h-4 w-4 text-[var(--pub-primary)]" />
                      {checkIn || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--pub-muted)]/30 p-4">
                    <p className="text-xs font-medium uppercase text-[var(--pub-muted-foreground)]">
                      Check-out
                    </p>
                    <p className="flex items-center gap-2 text-lg font-semibold">
                      <Calendar className="h-4 w-4 text-[var(--pub-primary)]" />
                      {checkOut || "—"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-[var(--pub-muted)]/30 p-4">
                    <p className="text-xs font-medium uppercase text-[var(--pub-muted-foreground)]">
                      Guests
                    </p>
                    <p className="flex items-center gap-2 text-lg font-semibold">
                      <Users className="h-4 w-4 text-[var(--pub-primary)]" />
                      {adults} Adult{Number(adults) !== 1 ? "s" : ""}
                      {Number(children) > 0 &&
                        `, ${children} Child${Number(children) !== 1 ? "ren" : ""}`}
                    </p>
                  </div>

                  {roomType && (
                    <div className="rounded-lg bg-[var(--pub-muted)]/30 p-4">
                      <p className="text-xs font-medium uppercase text-[var(--pub-muted-foreground)]">
                        Room Type
                      </p>
                      <p className="text-lg font-semibold">{roomType}</p>
                      {mealName && (
                        <p className="text-sm text-[var(--pub-muted-foreground)]">{mealName}</p>
                      )}
                    </div>
                  )}
                </div>

                {Number(total) > 0 && (
                  <div className="rounded-lg border-2 border-[var(--pub-primary)]/20 bg-[var(--pub-primary)]/5 p-4">
                    <p className="text-xs font-medium uppercase text-[var(--pub-muted-foreground)]">
                      Total ({nights} night{nights !== 1 ? "s" : ""})
                    </p>
                    <p className="text-2xl font-bold text-[var(--pub-primary)]">
                      {currency} {Number(total).toFixed(2)}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setStep(2)}
                  className="pub-btn pub-btn-primary flex w-full items-center justify-center gap-2"
                >
                  Continue to Guest Details <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Guest Details */}
        {step === 2 && (
          <div className="space-y-6">
            {/* ── Section 1: General Information ── */}
            <div className="pub-card p-6">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pub-primary)]/10">
                  <Mail className="h-4 w-4 text-[var(--pub-primary)]" />
                </div>
                <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--pub-heading-font)" }}>
                  General Information
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--pub-muted-foreground)]" />
                    <input
                      type="email"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                      placeholder="guest@email.com"
                      className="w-full rounded-lg border border-[var(--pub-border)] bg-[var(--pub-background)] pl-10 pr-3 py-2.5 text-sm focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--pub-muted-foreground)]" />
                    <input
                      type="tel"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                      placeholder="+1 234 567 890"
                      className="w-full rounded-lg border border-[var(--pub-border)] bg-[var(--pub-background)] pl-10 pr-3 py-2.5 text-sm focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Nationality
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--pub-muted-foreground)]" />
                    <input
                      type="text"
                      value={contactInfo.nationality}
                      readOnly
                      className="w-full rounded-lg border border-[var(--pub-border)] bg-[var(--pub-muted)]/30 pl-10 pr-3 py-2.5 text-sm text-[var(--pub-muted-foreground)] cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 2: Guest Names ── */}
            <div className="pub-card p-6">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pub-primary)]/10">
                  <Users className="h-4 w-4 text-[var(--pub-primary)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--pub-heading-font)" }}>
                    Guest Names
                  </h2>
                  <p className="text-xs text-[var(--pub-muted-foreground)]">
                    Please enter names as they appear on identification documents
                  </p>
                </div>
              </div>

              {/* Adults */}
              <div className="space-y-4">
                {adultGuests.map((guest, i) => (
                  <div key={`adult-${i}`} className="rounded-lg border border-[var(--pub-border)] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-[var(--pub-primary)]" />
                      <span className="text-sm font-semibold">
                        Adult {i + 1}
                        {i === 0 && <span className="ml-1.5 rounded bg-[var(--pub-primary)]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--pub-primary)]">Lead Guest</span>}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[120px_1fr_1fr]">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--pub-muted-foreground)]">Title</label>
                        <select
                          value={guest.title}
                          onChange={(e) => updateAdultGuest(i, "title", e.target.value)}
                          className="w-full rounded-lg border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2.5 text-sm focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]"
                        >
                          {TITLE_OPTIONS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--pub-muted-foreground)]">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={guest.firstName}
                          onChange={(e) => updateAdultGuest(i, "firstName", e.target.value)}
                          placeholder="First name"
                          className="w-full rounded-lg border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2.5 text-sm focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--pub-muted-foreground)]">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={guest.lastName}
                          onChange={(e) => updateAdultGuest(i, "lastName", e.target.value)}
                          placeholder="Last name"
                          className="w-full rounded-lg border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2.5 text-sm focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Children */}
              {childCount > 0 && (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pub-muted-foreground)]">
                    <Baby className="h-4 w-4" />
                    Children
                  </div>
                  {childGuests.map((guest, i) => (
                    <div key={`child-${i}`} className="rounded-lg border border-dashed border-[var(--pub-primary)]/30 bg-[var(--pub-primary)]/[0.02] p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Baby className="h-4 w-4 text-[var(--pub-primary)]" />
                        <span className="text-sm font-semibold">Child {i + 1}</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[120px_1fr_1fr]">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--pub-muted-foreground)]">Title</label>
                          <select
                            value={guest.title}
                            onChange={(e) => updateChildGuest(i, "title", e.target.value)}
                            className="w-full rounded-lg border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2.5 text-sm focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]"
                          >
                            {TITLE_OPTIONS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--pub-muted-foreground)]">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={guest.firstName}
                            onChange={(e) => updateChildGuest(i, "firstName", e.target.value)}
                            placeholder="First name"
                            className="w-full rounded-lg border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2.5 text-sm focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--pub-muted-foreground)]">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={guest.lastName}
                            onChange={(e) => updateChildGuest(i, "lastName", e.target.value)}
                            placeholder="Last name"
                            className="w-full rounded-lg border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2.5 text-sm focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 3: Special Requests ── */}
            <div className="pub-card p-6">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pub-primary)]/10">
                  <MessageSquare className="h-4 w-4 text-[var(--pub-primary)]" />
                </div>
                <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--pub-heading-font)" }}>
                  Special Requests
                </h2>
              </div>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2.5 text-sm focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]"
                placeholder="Early check-in, extra bed, dietary requirements, airport transfer..."
              />
              <p className="mt-2 text-xs text-[var(--pub-muted-foreground)]">
                Special requests are subject to availability and cannot be guaranteed.
              </p>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="pub-btn flex items-center gap-2 border border-[var(--pub-border)]"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => {
                  if (!contactInfo.email) {
                    alert("Please enter your email address");
                    return;
                  }
                  const allGuests = [...adultGuests, ...childGuests];
                  const incomplete = allGuests.find((g) => !g.firstName || !g.lastName);
                  if (incomplete) {
                    alert("Please enter the first and last name for all guests");
                    return;
                  }
                  setStep(3);
                }}
                className="pub-btn pub-btn-primary flex flex-1 items-center justify-center gap-2"
              >
                Continue to Payment <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="pub-card p-6">
            <h2
              className="mb-4 text-xl font-semibold"
              style={{ fontFamily: "var(--pub-heading-font)" }}
            >
              Payment
            </h2>
            <div className="rounded-lg border border-[var(--pub-border)] bg-[var(--pub-muted)]/20 p-8 text-center">
              <CreditCard className="mx-auto mb-4 h-12 w-12 text-[var(--pub-muted-foreground)]" />
              <p className="mb-2 font-semibold">Online Payment</p>
              <p className="mb-6 text-sm text-[var(--pub-muted-foreground)]">
                Online payment integration will be available soon. For now,
                please submit your booking request and our team will contact you
                with payment details.
              </p>

              {error && (
                <p className="mb-4 text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setStep(2)}
                  disabled={submitting}
                  className="pub-btn flex items-center gap-2 border border-[var(--pub-border)]"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={submitBooking}
                  disabled={submitting}
                  className="pub-btn pub-btn-primary flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      Submit Booking Request <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="pub-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2
              className="mb-2 text-2xl font-bold"
              style={{ fontFamily: "var(--pub-heading-font)" }}
            >
              Booking Request Submitted
            </h2>
            <p className="mb-2 text-[var(--pub-muted-foreground)]">
              Thank you, {leadGuest.firstName}! Your booking request has been
              received.
            </p>
            {bookingCode && (
              <p className="mb-4 text-lg">
                Your booking reference:{" "}
                <span className="font-mono font-bold text-[var(--pub-primary)]">
                  {bookingCode}
                </span>
              </p>
            )}
            <p className="mb-6 text-sm text-[var(--pub-muted-foreground)]">
              Our team will review and confirm your reservation shortly. A
              confirmation email will be sent to{" "}
              <strong>{contactInfo.email}</strong>.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/my-bookings/login`}
                className="pub-btn pub-btn-primary inline-flex items-center justify-center gap-2"
              >
                View My Bookings
              </Link>
              <Link
                href="/search"
                className="pub-btn inline-flex items-center justify-center gap-2 border border-[var(--pub-border)]"
              >
                Search More Hotels
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="pub-section">
          <div className="pub-container max-w-3xl text-center">
            <p className="text-[var(--pub-muted-foreground)]">Loading...</p>
          </div>
        </div>
      }
    >
      <BookingFlow />
    </Suspense>
  );
}
