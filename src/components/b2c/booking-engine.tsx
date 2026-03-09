"use client";

import {
  Baby,
  BedDouble,
  Building2,
  CalendarDays,
  Clock,
  Globe,
  MapPin,
  Minus,
  Palmtree,
  Plane,
  Plus,
  Search,
  Users,
  Car,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";

import { DateRangePicker } from "@/components/b2c/date-range-picker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ServiceTab = "hotels" | "activities" | "tours" | "transfers";

interface BookingEngineProps {
  destinations: { id: string; name: string }[];
  countries: { id: string; code: string; name: string }[];
}

// ---------------------------------------------------------------------------
// Shared UI pieces
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]";

const labelCls =
  "mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500";

const searchBtnCls =
  "pub-btn pub-btn-primary w-full justify-center py-2.5 text-sm font-semibold";

function fmtParam(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** +/- stepper control */
function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-[var(--pub-primary)] hover:text-[var(--pub-primary)] disabled:opacity-30 disabled:pointer-events-none"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-[2.5rem] text-center">
        <span className="text-sm font-bold text-gray-900">{value}</span>
        {label && (
          <span className="ml-1 text-xs text-gray-400">{label}</span>
        )}
      </div>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-[var(--pub-primary)] hover:text-[var(--pub-primary)] disabled:opacity-30 disabled:pointer-events-none"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BookingEngine({ destinations, countries }: BookingEngineProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ServiceTab>("hotels");

  const tabs: { key: ServiceTab; label: string; icon: React.ReactNode }[] = [
    { key: "hotels", label: "Hotels", icon: <Building2 className="h-4 w-4" /> },
    { key: "activities", label: "Activities", icon: <Palmtree className="h-4 w-4" /> },
    { key: "tours", label: "Tours", icon: <Plane className="h-4 w-4" /> },
    { key: "transfers", label: "Transfers", icon: <Car className="h-4 w-4" /> },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Tabs */}
      <div className="flex rounded-t-xl overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-white/95 text-[var(--pub-primary)]"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Form body */}
      <div className="rounded-b-xl bg-white/95 backdrop-blur-sm p-5 shadow-xl">
        {activeTab === "hotels" && (
          <HotelForm destinations={destinations} countries={countries} router={router} />
        )}
        {activeTab === "activities" && <ActivityForm router={router} />}
        {activeTab === "tours" && (
          <TourForm destinations={destinations} router={router} />
        )}
        {activeTab === "transfers" && <TransferForm router={router} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hotels — with rooms +/-, adults +/-, children +/- & child DOBs
// ---------------------------------------------------------------------------

function HotelForm({
  destinations,
  countries,
  router,
}: {
  destinations: { id: string; name: string }[];
  countries: { id: string; code: string; name: string }[];
  router: ReturnType<typeof useRouter>;
}) {
  const [dest, setDest] = useState("");
  const [nationality, setNationality] = useState("");
  const [natSearch, setNatSearch] = useState("");
  const [natOpen, setNatOpen] = useState(false);
  const natRef = useRef<HTMLDivElement>(null);
  const natInputRef = useRef<HTMLInputElement>(null);
  const natDropRef = useRef<HTMLDivElement>(null);
  const [natPos, setNatPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(natSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(natSearch.toLowerCase()),
  );

  const selectedCountry = countries.find((c) => c.code === nationality);

  const updateNatPos = useCallback(() => {
    if (!natRef.current) return;
    const rect = natRef.current.getBoundingClientRect();
    setNatPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!natOpen) return;
    updateNatPos();
    window.addEventListener("scroll", updateNatPos, true);
    window.addEventListener("resize", updateNatPos);
    return () => {
      window.removeEventListener("scroll", updateNatPos, true);
      window.removeEventListener("resize", updateNatPos);
    };
  }, [natOpen, updateNatPos]);

  useEffect(() => {
    if (!natOpen) return;
    function handler(e: MouseEvent) {
      if (
        natDropRef.current && !natDropRef.current.contains(e.target as Node) &&
        natRef.current && !natRef.current.contains(e.target as Node)
      ) {
        setNatOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [natOpen]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [childCount, setChildCount] = useState(0);
  const [childDobs, setChildDobs] = useState<(Date | null)[]>([]);
  const [guestOpen, setGuestOpen] = useState(false);
  const guestTriggerRef = useRef<HTMLButtonElement>(null);
  const guestDropdownRef = useRef<HTMLDivElement>(null);
  const [guestPos, setGuestPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const updateGuestPos = useCallback(() => {
    if (!guestTriggerRef.current) return;
    const rect = guestTriggerRef.current.getBoundingClientRect();
    const w = Math.max(rect.width, 320);
    let left = rect.left;
    if (left + w > window.innerWidth - 16) left = window.innerWidth - 16 - w;
    setGuestPos({ top: rect.bottom + 4, left, width: w });
  }, []);

  useEffect(() => {
    if (!guestOpen) return;
    updateGuestPos();
    window.addEventListener("scroll", updateGuestPos, true);
    window.addEventListener("resize", updateGuestPos);
    return () => {
      window.removeEventListener("scroll", updateGuestPos, true);
      window.removeEventListener("resize", updateGuestPos);
    };
  }, [guestOpen, updateGuestPos]);

  useEffect(() => {
    if (!guestOpen) return;
    function handler(e: MouseEvent) {
      if (
        guestDropdownRef.current && !guestDropdownRef.current.contains(e.target as Node) &&
        guestTriggerRef.current && !guestTriggerRef.current.contains(e.target as Node)
      ) {
        setGuestOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [guestOpen]);

  function updateChildCount(n: number) {
    setChildCount(n);
    setChildDobs((prev) => {
      if (n > prev.length) {
        return [...prev, ...Array(n - prev.length).fill(null)];
      }
      return prev.slice(0, n);
    });
  }

  function setChildDob(index: number, date: Date | null) {
    setChildDobs((prev) => {
      const next = [...prev];
      next[index] = date;
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) return;
    const params = new URLSearchParams();
    if (dest) params.set("destination", dest);
    if (nationality) params.set("nationality", nationality);
    params.set("checkIn", fmtParam(startDate));
    params.set("checkOut", fmtParam(endDate));
    params.set("rooms", String(rooms));
    params.set("adults", String(adults));
    if (childCount > 0) {
      params.set("children", String(childCount));
      const ages = childDobs.map((dob) => {
        if (!dob) return "0";
        const ageDays = Date.now() - dob.getTime();
        return String(Math.floor(ageDays / (365.25 * 86400000)));
      });
      params.set("childAges", ages.join(","));
    }
    router.push(`/search?${params.toString()}`);
  }

  const guestSummary = `${rooms} Room${rooms > 1 ? "s" : ""}, ${adults} Ad${childCount > 0 ? `, ${childCount} Ch` : ""}`;

  return (
    <form onSubmit={handleSubmit}>
      {/* Row 1: main fields */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
        {/* Nationality — searchable dropdown */}
        <div className="lg:col-span-2" ref={natRef}>
          <label className={labelCls}>
            <Globe className="h-3.5 w-3.5" /> Nationality
          </label>
          <div className="relative">
            <input
              ref={natInputRef}
              type="text"
              value={natOpen ? natSearch : (selectedCountry?.name ?? "")}
              placeholder="Select country"
              onChange={(e) => {
                setNatSearch(e.target.value);
                if (!natOpen) setNatOpen(true);
              }}
              onFocus={() => {
                setNatOpen(true);
                setNatSearch("");
              }}
              className={inputCls}
            />
            {nationality && !natOpen && (
              <button
                type="button"
                onClick={() => { setNationality(""); setNatSearch(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {natOpen && natPos && createPortal(
            <div
              ref={natDropRef}
              className="fixed z-[70] rounded-xl border border-gray-100 bg-white shadow-2xl animate-in fade-in-0 slide-in-from-top-1 duration-100"
              style={{ top: natPos.top, left: natPos.left, width: natPos.width }}
            >
              <div className="max-h-52 overflow-y-auto py-1">
                {filteredCountries.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">No countries found</div>
                ) : (
                  filteredCountries.slice(0, 50).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setNationality(c.code);
                        setNatSearch("");
                        setNatOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--pub-primary)]/5 transition-colors ${
                        nationality === c.code ? "bg-[var(--pub-primary)]/10 text-[var(--pub-primary)] font-medium" : "text-gray-700"
                      }`}
                    >
                      {c.name} <span className="text-xs text-gray-400">({c.code})</span>
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )}
        </div>

        {/* Destination */}
        <div className="lg:col-span-2">
          <label className={labelCls}>
            <MapPin className="h-3.5 w-3.5" /> Destination
          </label>
          <select
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            className={inputCls}
          >
            <option value="">All Destinations</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="lg:col-span-3">
          <label className={labelCls}>
            <CalendarDays className="h-3.5 w-3.5" /> Dates
          </label>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
            startLabel="Check-in"
            endLabel="Check-out"
          />
        </div>

        {/* Guests popover trigger */}
        <div className="lg:col-span-3">
          <label className={labelCls}>
            <Users className="h-3.5 w-3.5" /> Guests & Rooms
          </label>
          <button
            ref={guestTriggerRef}
            type="button"
            onClick={() => setGuestOpen(!guestOpen)}
            className={`${inputCls} text-left flex items-center justify-between`}
          >
            <span className="truncate">{guestSummary}</span>
            <svg className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${guestOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Guests dropdown — portaled to body */}
          {guestOpen && guestPos && createPortal(
            <GuestDropdown
              ref={guestDropdownRef}
              pos={guestPos}
              rooms={rooms}
              adults={adults}
              childCount={childCount}
              onRoomsChange={setRooms}
              onAdultsChange={setAdults}
              onChildCountChange={updateChildCount}
              onClose={() => setGuestOpen(false)}
            />,
            document.body,
          )}
        </div>

        {/* Search */}
        <div className="lg:col-span-2 flex items-end">
          <button type="submit" className={searchBtnCls}>
            <Search className="h-4 w-4 mr-1.5" /> Search
          </button>
        </div>
      </div>

      {/* Row 2: Child DOB inputs (appear when children > 0) */}
      {childCount > 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--pub-primary)]/30 bg-[var(--pub-primary)]/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--pub-primary)]">
            <Baby className="h-3.5 w-3.5" />
            Children Date of Birth
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: childCount }).map((_, i) => (
              <div key={i}>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Child {i + 1} <span className="text-gray-400 font-normal">(age 0–11)</span>
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--pub-primary)] pointer-events-none" />
                  <input
                    type="date"
                    value={childDobs[i] ? fmtParam(childDobs[i]!) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setChildDob(i, val ? new Date(val + "T00:00:00") : null);
                    }}
                    max={fmtParam(new Date())}
                    min="2014-01-01"
                    placeholder="YYYY-MM-DD"
                    className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Guest dropdown with steppers
// ---------------------------------------------------------------------------

const GuestDropdown = forwardRef<
  HTMLDivElement,
  {
    pos: { top: number; left: number; width: number };
    rooms: number;
    adults: number;
    childCount: number;
    onRoomsChange: (v: number) => void;
    onAdultsChange: (v: number) => void;
    onChildCountChange: (v: number) => void;
    onClose: () => void;
  }
>(function GuestDropdown(
  { pos, rooms, adults, childCount, onRoomsChange, onAdultsChange, onChildCountChange, onClose },
  ref,
) {
  return (
    <div
      ref={ref}
      className="fixed z-[70] rounded-xl border border-gray-100 bg-white p-5 shadow-2xl animate-in fade-in-0 slide-in-from-top-1 duration-150"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      {/* Rooms */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <BedDouble className="h-5 w-5 text-gray-400" />
          <div>
            <span className="text-sm font-medium text-gray-700">Rooms</span>
            <p className="text-[11px] text-gray-400">Max 4 rooms per booking</p>
          </div>
        </div>
        <Stepper value={rooms} onChange={onRoomsChange} min={1} max={4} />
      </div>
      <div className="border-t border-gray-100" />

      {/* Adults */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-gray-400" />
          <div>
            <span className="text-sm font-medium text-gray-700">Adults</span>
            <p className="text-[11px] text-gray-400">Age 12+</p>
          </div>
        </div>
        <Stepper value={adults} onChange={onAdultsChange} min={1} max={12} />
      </div>
      <div className="border-t border-gray-100" />

      {/* Children */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <Baby className="h-5 w-5 text-gray-400" />
          <div>
            <span className="text-sm font-medium text-gray-700">Children</span>
            <p className="text-[11px] text-gray-400">Age 0 – 11</p>
          </div>
        </div>
        <Stepper
          value={childCount}
          onChange={onChildCountChange}
          min={0}
          max={6}
        />
      </div>

      {/* Done button */}
      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full rounded-lg bg-[var(--pub-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--pub-primary)]/90 transition-colors"
      >
        Done
      </button>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

const activityCategories = [
  "Day Trip",
  "Water Sports",
  "Adventure",
  "Cultural",
  "Nature & Wildlife",
  "Food & Drink",
  "Nightlife",
  "Wellness & Spa",
];

function ActivityForm({
  router,
}: {
  router: ReturnType<typeof useRouter>;
}) {
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [pax, setPax] = useState("2");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (date) params.set("date", fmtParam(date));
    params.set("participants", pax);
    router.push(`/activities?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelCls}>
            <Palmtree className="h-3.5 w-3.5" /> Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            <option value="">All Categories</option>
            {activityCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>
            <CalendarDays className="h-3.5 w-3.5" /> Date
          </label>
          <DateRangePicker
            startDate={date}
            endDate={null}
            onChange={(s) => setDate(s)}
            single
            placeholder="Select date"
          />
        </div>
        <div>
          <label className={labelCls}>
            <Users className="h-3.5 w-3.5" /> Participants
          </label>
          <select
            value={pax}
            onChange={(e) => setPax(e.target.value)}
            className={inputCls}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "Person" : "People"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className={searchBtnCls}>
            <Search className="h-4 w-4 mr-1.5" /> Find Activities
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tours
// ---------------------------------------------------------------------------

function TourForm({
  destinations,
  router,
}: {
  destinations: { id: string; name: string }[];
  router: ReturnType<typeof useRouter>;
}) {
  const [dest, setDest] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [travelers, setTravelers] = useState("2");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (dest) params.set("destination", dest);
    if (startDate) params.set("dateFrom", fmtParam(startDate));
    if (endDate) params.set("dateTo", fmtParam(endDate));
    params.set("travelers", travelers);
    router.push(`/packages?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className={labelCls}>
            <MapPin className="h-3.5 w-3.5" /> Destination
          </label>
          <select
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            className={inputCls}
          >
            <option value="">All Destinations</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className={labelCls}>
            <CalendarDays className="h-3.5 w-3.5" /> Travel Dates
          </label>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
            startLabel="From"
            endLabel="To"
          />
        </div>
        <div>
          <label className={labelCls}>
            <Users className="h-3.5 w-3.5" /> Travelers
          </label>
          <select
            value={travelers}
            onChange={(e) => setTravelers(e.target.value)}
            className={inputCls}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "Traveler" : "Travelers"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className={searchBtnCls}>
            <Search className="h-4 w-4 mr-1.5" /> Find Tours
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

function TransferForm({
  router,
}: {
  router: ReturnType<typeof useRouter>;
}) {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState("12:00");
  const [pax, setPax] = useState("2");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (pickup) params.set("pickup", pickup);
    if (dropoff) params.set("dropoff", dropoff);
    if (date) params.set("date", fmtParam(date));
    if (time) params.set("time", time);
    params.set("passengers", pax);
    router.push(`/transfers?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label className={labelCls}>
            <Plane className="h-3.5 w-3.5" /> Pickup
          </label>
          <input
            type="text"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="Airport, hotel..."
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            <MapPin className="h-3.5 w-3.5" /> Drop-off
          </label>
          <input
            type="text"
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
            placeholder="Hotel, address..."
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            <CalendarDays className="h-3.5 w-3.5" /> Date
          </label>
          <DateRangePicker
            startDate={date}
            endDate={null}
            onChange={(s) => setDate(s)}
            single
            placeholder="Select date"
          />
        </div>
        <div>
          <label className={labelCls}>
            <Clock className="h-3.5 w-3.5" /> Time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            <Users className="h-3.5 w-3.5" /> Passengers
          </label>
          <select
            value={pax}
            onChange={(e) => setPax(e.target.value)}
            className={inputCls}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n} Pax</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className={searchBtnCls}>
            <Search className="h-4 w-4 mr-1.5" /> Get Quote
          </button>
        </div>
      </div>
    </form>
  );
}
