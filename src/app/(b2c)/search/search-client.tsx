"use client";

import { useState, useCallback } from "react";
import { Search } from "lucide-react";

import { SearchBar } from "@/components/b2c/search-bar";
import { SearchFilters } from "@/components/b2c/search-filters";
import { HotelResultCard } from "@/components/b2c/hotel-result-card";

interface Destination {
  id: string;
  name: string;
}

interface SearchClientProps {
  destinations: Destination[];
  initialParams: {
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    childAges: number[];
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

export function SearchClient({ destinations, initialParams }: SearchClientProps) {
  const [params, setParams] = useState(initialParams);
  const [star, setStar] = useState(initialParams.star);
  const [sort, setSort] = useState(initialParams.sort);
  const [state, setState] = useState<SearchState>({
    hotels: [],
    total: 0,
    page: 1,
    totalPages: 0,
    isLoading: false,
    searched: false,
  });

  const doSearch = useCallback(
    async (searchParams: typeof params, starFilter: string, sortBy: string, page = 1) => {
      if (!searchParams.checkIn || !searchParams.checkOut) return;

      setState((s) => ({ ...s, isLoading: true }));

      const sp = new URLSearchParams();
      sp.set("checkIn", searchParams.checkIn);
      sp.set("checkOut", searchParams.checkOut);
      sp.set("adults", String(searchParams.adults));
      if (searchParams.children > 0) {
        sp.set("children", String(searchParams.children));
        if (searchParams.childAges.length > 0) {
          sp.set("childAges", searchParams.childAges.join(","));
        }
      }
      if (searchParams.destination) sp.set("destination", searchParams.destination);
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

  const handleSearch = (newParams: {
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    childAges: number[];
  }) => {
    setParams((prev) => ({ ...prev, ...newParams }));
    doSearch({ ...params, ...newParams }, star, sort);
  };

  const handleStarChange = (newStar: string) => {
    setStar(newStar);
    if (state.searched) doSearch(params, newStar, sort);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    if (state.searched) doSearch(params, star, newSort);
  };

  const handlePageChange = (newPage: number) => {
    doSearch(params, star, sort, newPage);
  };

  // Build search params string for deep-linking into hotel detail
  const searchParamsStr = new URLSearchParams({
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults: String(params.adults),
    ...(params.children > 0 ? { children: String(params.children) } : {}),
    ...(params.childAges.length > 0 ? { childAges: params.childAges.join(",") } : {}),
  }).toString();

  return (
    <div className="pub-section">
      <div className="pub-container">
        <h1
          className="mb-6 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Search Hotels & Availability
        </h1>

        {/* Search Bar */}
        <SearchBar
          destinations={destinations}
          initialValues={params}
          onSearch={handleSearch}
          isLoading={state.isLoading}
        />

        {/* Results area */}
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
