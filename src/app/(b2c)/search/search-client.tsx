"use client";

import {
  Baby,
  BedDouble,
  Building2,
  CalendarDays,
  Globe,
  MapPin,
  Minus,
  Plus,
  Search,
  Users,
} from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";

import { DateRangePicker } from "@/components/b2c/date-range-picker";
import { SearchFilters } from "@/components/b2c/search-filters";
import { HotelResultCard } from "@/components/b2c/hotel-result-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Destination {
  id: string;
  name: string;
}

interface SearchClientProps {
  destinations: Destination[];
  countries: { id: string; code: string; name: string }[];
  initialParams: {
    destination: string;
    nationality: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    childAges: number[];
    rooms?: number;
    star: string;
    sort: string;
  };
}

interface SearchState {
  hotels: any[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  searched: boolean;
}

// ---------------------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]";

const labelCls =
  "mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500";

function fmtParam(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
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
      <span className="min-w-[2rem] text-center text-sm font-bold text-gray-900">
        {value}
      </span>
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

export function SearchClient({ destinations, countries, initialParams }: SearchClientProps) {
  // Search criteria state
  const [dest, setDest] = useState(initialParams.destination);
  const [nationality, setNationality] = useState(initialParams.nationality);
  const [natSearch, setNatSearch] = useState("");
  const [natOpen, setNatOpen] = useState(false);
  const natRef = useRef<HTMLDivElement>(null);
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

  const [startDate, setStartDate] = useState<Date | null>(
    initialParams.checkIn ? new Date(initialParams.checkIn + "T00:00:00") : null,
  );
  const [endDate, setEndDate] = useState<Date | null>(
    initialParams.checkOut ? new Date(initialParams.checkOut + "T00:00:00") : null,
  );
  const [rooms, setRooms] = useState(initialParams.rooms ?? 1);
  const [adults, setAdults] = useState(initialParams.adults);
  const [childCount, setChildCount] = useState(initialParams.children);
  const [childDobs, setChildDobs] = useState<(Date | null)[]>(
    initialParams.childAges.map(() => null),
  );

  // Guest dropdown
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

  // Filters
  const [star, setStar] = useState(initialParams.star);
  const [sort, setSort] = useState(initialParams.sort);

  // Results
  const [state, setState] = useState<SearchState>({
    hotels: [],
    total: 0,
    page: 1,
    totalPages: 0,
    isLoading: false,
    searched: false,
  });

  // Child count helpers
  function updateChildCount(n: number) {
    setChildCount(n);
    setChildDobs((prev) => {
      if (n > prev.length) return [...prev, ...Array(n - prev.length).fill(null)];
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

  // Search API call
  const doSearch = useCallback(
    async (
      searchDest: string,
      searchNationality: string,
      checkIn: string,
      checkOut: string,
      searchAdults: number,
      searchChildren: number,
      searchChildAges: number[],
      starFilter: string,
      sortBy: string,
      page = 1,
    ) => {
      if (!checkIn || !checkOut) return;

      setState((s) => ({ ...s, isLoading: true }));

      const sp = new URLSearchParams();
      sp.set("checkIn", checkIn);
      sp.set("checkOut", checkOut);
      sp.set("adults", String(searchAdults));
      if (searchChildren > 0) {
        sp.set("children", String(searchChildren));
        if (searchChildAges.length > 0) {
          sp.set("childAges", searchChildAges.join(","));
        }
      }
      if (searchDest) sp.set("destination", searchDest);
      if (searchNationality) sp.set("nationality", searchNationality);
      if (starFilter) sp.set("star", starFilter);
      sp.set("sort", sortBy);
      sp.set("page", String(page));

      try {
        const res = await fetch(`/api/b2c/search?${sp.toString()}`);
        const data = await res.json();

        // Update URL without reload
        const url = new URL(window.location.href);
        url.search = sp.toString();
        window.history.replaceState({}, "", url.toString());

        setState({
          hotels: data.hotels || [],
          total: data.total || 0,
          page: data.page || 1,
          totalPages: data.totalPages || 0,
          isLoading: false,
          searched: true,
        });
      } catch {
        setState((s) => ({ ...s, isLoading: false, searched: true }));
      }
    },
    [],
  );

  // Compute child ages from DOBs or use initial
  function getChildAges(): number[] {
    if (childCount === 0) return [];
    return childDobs.map((dob) => {
      if (!dob) return 0;
      const ageDays = Date.now() - dob.getTime();
      return Math.floor(ageDays / (365.25 * 86400000));
    });
  }

  // Auto-search on mount if URL has dates
  const hasAutoSearched = useRef(false);
  useEffect(() => {
    if (hasAutoSearched.current) return;
    if (initialParams.checkIn && initialParams.checkOut) {
      hasAutoSearched.current = true;
      doSearch(
        initialParams.destination,
        initialParams.nationality,
        initialParams.checkIn,
        initialParams.checkOut,
        initialParams.adults,
        initialParams.children,
        initialParams.childAges,
        initialParams.star,
        initialParams.sort,
      );
    }
  }, [initialParams, doSearch]);

  // Form submit
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) return;
    const ages = getChildAges();
    doSearch(dest, nationality, fmtParam(startDate), fmtParam(endDate), adults, childCount, ages, star, sort);
  }

  // Filter changes
  function handleStarChange(newStar: string) {
    setStar(newStar);
    if (state.searched && startDate && endDate) {
      doSearch(dest, nationality, fmtParam(startDate), fmtParam(endDate), adults, childCount, getChildAges(), newStar, sort);
    }
  }

  function handleSortChange(newSort: string) {
    setSort(newSort);
    if (state.searched && startDate && endDate) {
      doSearch(dest, nationality, fmtParam(startDate), fmtParam(endDate), adults, childCount, getChildAges(), star, newSort);
    }
  }

  function handlePageChange(newPage: number) {
    if (startDate && endDate) {
      doSearch(dest, nationality, fmtParam(startDate), fmtParam(endDate), adults, childCount, getChildAges(), star, sort, newPage);
    }
  }

  // Deep link params for hotel detail & booking
  const searchParamsStr = new URLSearchParams({
    checkIn: startDate ? fmtParam(startDate) : initialParams.checkIn,
    checkOut: endDate ? fmtParam(endDate) : initialParams.checkOut,
    adults: String(adults),
    ...(childCount > 0 ? { children: String(childCount) } : {}),
    ...(nationality ? { nationality } : {}),
  }).toString();

  const guestSummary = `${rooms} Room${rooms > 1 ? "s" : ""}, ${adults} Ad${childCount > 0 ? `, ${childCount} Ch` : ""}`;

  return (
    <div className="pub-section">
      <div className="pub-container">
        <h1
          className="mb-6 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Search Hotels & Availability
        </h1>

        {/* ── Search Form (identical to homepage hotel tab) ── */}
        <form onSubmit={handleSubmit} className="pub-card p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
            {/* Nationality */}
            <div className="lg:col-span-2" ref={natRef}>
              <label className={labelCls}>
                <Globe className="h-3.5 w-3.5" /> Nationality
              </label>
              <button
                type="button"
                onClick={() => { setNatOpen(!natOpen); setNatSearch(""); }}
                className={`${inputCls} text-left flex items-center justify-between`}
              >
                <span className="truncate">{selectedCountry ? selectedCountry.name : "Select…"}</span>
                <svg
                  className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${natOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {natOpen && natPos && createPortal(
                <div
                  ref={natDropRef}
                  className="fixed z-[70] rounded-xl border border-gray-100 bg-white shadow-2xl animate-in fade-in-0 slide-in-from-top-1 duration-150"
                  style={{ top: natPos.top, left: natPos.left, width: natPos.width, maxHeight: 280 }}
                >
                  <div className="sticky top-0 border-b border-gray-100 bg-white p-2">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search country…"
                      value={natSearch}
                      onChange={(e) => setNatSearch(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]"
                    />
                  </div>
                  <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                    {filteredCountries.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-gray-400">No countries found</p>
                    ) : (
                      filteredCountries.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setNationality(c.code); setNatOpen(false); }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${c.code === nationality ? "bg-[var(--pub-primary)]/10 font-semibold text-[var(--pub-primary)]" : "text-gray-700"}`}
                        >
                          {c.name}
                          <span className="ml-auto text-[11px] text-gray-400">{c.code}</span>
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

            {/* Guests & Rooms */}
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
                <svg
                  className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${guestOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
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
              <button
                type="submit"
                disabled={state.isLoading}
                className="pub-btn pub-btn-primary w-full justify-center py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {state.isLoading ? (
                  <span className="animate-pulse">Searching...</span>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-1.5" /> Search
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Child DOB row */}
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
                        className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* ── Results ── */}
        {state.searched ? (
          <div className="mt-8 flex flex-col gap-6 lg:flex-row">
            {/* Sidebar filters */}
            <aside className="w-full shrink-0 lg:w-56">
              <div className="pub-card sticky top-20 p-4">
                <SearchFilters
                  currentStar={star}
                  currentSort={sort}
                  onStarChange={handleStarChange}
                  onSortChange={handleSortChange}
                />
              </div>
            </aside>

            {/* Results */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--pub-muted-foreground)]">
                  {state.total} hotel{state.total !== 1 ? "s" : ""} found
                </p>
              </div>

              {state.isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="pub-card h-64 animate-pulse bg-[var(--pub-muted)]" />
                  ))}
                </div>
              ) : state.hotels.length === 0 ? (
                <div className="pub-card py-20 text-center text-[var(--pub-muted-foreground)]">
                  <Search className="mx-auto mb-3 h-10 w-10 opacity-30" />
                  <p className="text-lg">No availability found for your search criteria.</p>
                  <p className="mt-1 text-sm">Try different dates or destinations.</p>
                </div>
              ) : (
                <>
                  {state.hotels.map((hotel: any) => (
                    <HotelResultCard
                      key={hotel.hotelId}
                      hotelId={hotel.hotelId}
                      hotelName={hotel.hotelName}
                      starRating={hotel.starRating}
                      city={hotel.city}
                      destinationName={hotel.destinationName}
                      imageUrl={hotel.imageUrl}
                      amenities={hotel.amenities}
                      currency={hotel.currency}
                      nights={hotel.nights}
                      cheapestTotal={hotel.cheapestTotal}
                      cheapestPerNight={hotel.cheapestPerNight}
                      contractId={hotel.contractId}
                      rooms={hotel.rooms}
                      searchParams={searchParamsStr}
                    />
                  ))}

                  {/* Pagination */}
                  {state.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <button
                        onClick={() => handlePageChange(state.page - 1)}
                        disabled={state.page <= 1}
                        className="pub-btn text-sm disabled:opacity-30"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-[var(--pub-muted-foreground)]">
                        Page {state.page} of {state.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(state.page + 1)}
                        disabled={state.page >= state.totalPages}
                        className="pub-btn text-sm disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-12 py-20 text-center text-[var(--pub-muted-foreground)]">
            <Search className="mx-auto mb-4 h-12 w-12 opacity-30" />
            <p className="text-lg">Select your dates and destination, then search</p>
            <p className="mt-1 text-sm">
              We&apos;ll show you real-time availability and pricing
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guest dropdown (identical to booking engine)
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

      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <Baby className="h-5 w-5 text-gray-400" />
          <div>
            <span className="text-sm font-medium text-gray-700">Children</span>
            <p className="text-[11px] text-gray-400">Age 0 – 11</p>
          </div>
        </div>
        <Stepper value={childCount} onChange={onChildCountChange} min={0} max={6} />
      </div>

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
