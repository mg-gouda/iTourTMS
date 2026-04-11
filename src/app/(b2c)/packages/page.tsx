import Link from "next/link";
import { MapPin, Calendar, Users, Star } from "lucide-react";

import { getCompanyInfo } from "@/lib/b2c/get-branding";
import { db } from "@/server/db";

export const metadata = { title: "Tour Packages" };

export default async function PackagesPage() {
  const company = await getCompanyInfo();
  if (!company)
    return <div className="pub-section pub-container">Not configured</div>;

  // Pull published contracts that have special offers as "packages"
  const contracts = await db.contract.findMany({
    where: {
      companyId: company.id,
      status: "PUBLISHED",
      specialOffers: { some: {} },
    },
    include: {
      hotel: {
        select: {
          id: true,
          name: true,
          code: true,
          starRating: true,
          images: { take: 1, select: { url: true } },
          destination: { select: { name: true } },
        },
      },
      specialOffers: {
        where: { active: true },
        select: { id: true, name: true, offerType: true, description: true },
        take: 3,
      },
      seasons: {
        orderBy: { dateFrom: "asc" },
        take: 1,
        select: { dateFrom: true, dateTo: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const starMap: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };

  return (
    <div className="pub-section">
      <div className="pub-container">
        <h1
          className="mb-2 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Tour Packages
        </h1>
        <p className="mb-8 text-[var(--pub-muted-foreground)]">
          Special offers and curated travel deals
        </p>

        {contracts.length === 0 ? (
          <div className="rounded-xl border border-[var(--pub-border)] bg-[var(--pub-card)] p-12 text-center">
            <MapPin className="mx-auto mb-4 h-12 w-12 text-[var(--pub-muted-foreground)]" />
            <h2
              className="mb-2 text-xl font-semibold"
              style={{ fontFamily: "var(--pub-heading-font)" }}
            >
              Packages Coming Soon
            </h2>
            <p className="text-[var(--pub-muted-foreground)]">
              We&apos;re preparing exciting travel packages. Check back soon!
            </p>
            <Link
              href="/search"
              className="pub-btn pub-btn-primary mt-6 inline-block"
            >
              Search Hotels
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {contracts.map((c) => {
              const img = c.hotel.images[0]?.url;
              const stars = starMap[c.hotel.starRating] ?? 0;
              const season = c.seasons[0];
              return (
                <Link
                  key={c.id}
                  href={`/hotel/${c.hotel.id}`}
                  className="pub-card group overflow-hidden"
                >
                  <div className="relative h-48 overflow-hidden">
                    {img ? (
                      <img
                        src={img}
                        alt={c.hotel.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--pub-primary)] to-[var(--pub-accent)]">
                        <MapPin className="h-10 w-10 text-white/50" />
                      </div>
                    )}
                    <span className="absolute right-2 top-2 rounded-full bg-[var(--pub-secondary)] px-3 py-1 text-xs font-medium text-white">
                      Special Offer
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="mb-1 flex items-center gap-1 text-[var(--pub-secondary)]">
                      {Array.from({ length: stars }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <h3
                      className="text-lg font-bold"
                      style={{ fontFamily: "var(--pub-heading-font)" }}
                    >
                      {c.hotel.name}
                    </h3>
                    <p className="mb-3 flex items-center gap-1 text-sm text-[var(--pub-muted-foreground)]">
                      <MapPin className="h-3.5 w-3.5" />
                      {c.hotel.destination?.name}
                    </p>

                    {c.specialOffers.map((offer) => (
                      <span
                        key={offer.id}
                        className="mb-1 mr-1 inline-block rounded-full bg-[var(--pub-accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--pub-accent)]"
                      >
                        {offer.name}
                      </span>
                    ))}

                    {season && (
                      <p className="mt-3 flex items-center gap-1 text-xs text-[var(--pub-muted-foreground)]">
                        <Calendar className="h-3 w-3" />
                        {formatB2cDate(season.dateFrom)} –{" "}
                        {formatB2cDate(season.dateTo)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatB2cDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const yr = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${yr}`;
}
