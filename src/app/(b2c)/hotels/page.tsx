import Link from "next/link";
import { Building2, MapPin, Star, ChevronLeft, ChevronRight } from "lucide-react";

import { getCompanyInfo } from "@/lib/b2c/get-branding";
import { getB2cHotels } from "@/server/services/b2c/hotel-queries";
import { db } from "@/server/db";

export const metadata = { title: "Hotels" };

interface Props {
  searchParams: Promise<{
    page?: string;
    destination?: string;
    star?: string;
    q?: string;
  }>;
}

export default async function HotelsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const company = await getCompanyInfo();
  if (!company) return <div className="pub-section pub-container">Not configured</div>;

  const page = parseInt(sp.page ?? "1") || 1;
  const result = await getB2cHotels({
    companyId: company.id,
    destinationId: sp.destination || undefined,
    starRating: sp.star || undefined,
    search: sp.q || undefined,
    page,
  });

  // Get destinations for filter
  const destinations = await db.destination.findMany({
    where: { companyId: company.id, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="pub-section">
      <div className="pub-container">
        <h1
          className="mb-2 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Hotels
        </h1>
        <p className="mb-6 text-[var(--pub-muted-foreground)]">
          {result.total} hotel{result.total !== 1 ? "s" : ""} found
        </p>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <FilterLink href="/hotels" active={!sp.destination && !sp.star}>All</FilterLink>
          {destinations.map((d) => (
            <FilterLink
              key={d.id}
              href={`/hotels?destination=${d.id}`}
              active={sp.destination === d.id}
            >
              {d.name}
            </FilterLink>
          ))}
          <span className="mx-2 border-l border-[var(--pub-border)]" />
          {["THREE", "FOUR", "FIVE"].map((s) => (
            <FilterLink
              key={s}
              href={`/hotels?star=${s}${sp.destination ? `&destination=${sp.destination}` : ""}`}
              active={sp.star === s}
            >
              {s === "THREE" ? "3" : s === "FOUR" ? "4" : "5"}★
            </FilterLink>
          ))}
        </div>

        {/* Grid */}
        {result.hotels.length === 0 ? (
          <div className="py-20 text-center text-[var(--pub-muted-foreground)]">
            No hotels match your filters.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.hotels.map((hotel) => (
              <Link key={hotel.id} href={`/hotel/${hotel.id}`} className="pub-card group">
                <div className="relative h-48 overflow-hidden">
                  {hotel.images[0]?.url ? (
                    <img
                      src={hotel.images[0].url}
                      alt={hotel.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--pub-muted)]">
                      <Building2 className="h-8 w-8 text-[var(--pub-muted-foreground)]" />
                    </div>
                  )}
                  {hotel.featured && (
                    <span className="absolute left-2 top-2 rounded-full bg-[var(--pub-secondary)] px-2 py-0.5 text-xs font-medium text-white">
                      Featured
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="pub-stars mb-1">
                    {Array.from({ length: starCount(hotel.starRating) }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <h3
                    className="mb-1 font-semibold leading-snug"
                    style={{ fontFamily: "var(--pub-heading-font)" }}
                  >
                    {hotel.name}
                  </h3>
                  <p className="text-sm text-[var(--pub-muted-foreground)]">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    {hotel.destination?.name || hotel.city}
                  </p>
                  {hotel.amenities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {hotel.amenities.slice(0, 3).map((a) => (
                        <span
                          key={a.id}
                          className="rounded-full bg-[var(--pub-muted)] px-2 py-0.5 text-[10px] text-[var(--pub-muted-foreground)]"
                        >
                          {a.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {result.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/hotels?page=${page - 1}${sp.destination ? `&destination=${sp.destination}` : ""}${sp.star ? `&star=${sp.star}` : ""}`}
                className="pub-btn pub-btn-outline text-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
            )}
            <span className="px-4 text-sm text-[var(--pub-muted-foreground)]">
              Page {page} of {result.totalPages}
            </span>
            {page < result.totalPages && (
              <Link
                href={`/hotels?page=${page + 1}${sp.destination ? `&destination=${sp.destination}` : ""}${sp.star ? `&star=${sp.star}` : ""}`}
                className="pub-btn pub-btn-outline text-sm"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-[var(--pub-primary)] text-white"
          : "bg-[var(--pub-muted)] text-[var(--pub-muted-foreground)] hover:bg-[var(--pub-primary)] hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

function starCount(rating: string): number {
  const map: Record<string, number> = {
    ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, FIVE_DELUXE: 5,
  };
  return map[rating] || 3;
}
