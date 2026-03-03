import { MapPin, Building2, Star, Users, ChevronRight } from "lucide-react";
import Link from "next/link";

import { getBranding, getCompanyInfo } from "@/lib/b2c/get-branding";
import { db } from "@/server/db";

export default async function HomePage() {
  const branding = await getBranding();
  const company = await getCompanyInfo();
  const companyName = company?.name || "iTourTMS";

  // Fetch hero slides
  const heroSlides = company
    ? await db.heroSlide.findMany({
        where: { companyId: company.id, active: true },
        orderBy: { sortOrder: "asc" },
        take: 5,
      })
    : [];

  // Fetch featured destinations
  const destinations = company
    ? await db.destination.findMany({
        where: { companyId: company.id, featured: true, active: true },
        include: {
          country: { select: { name: true } },
          _count: { select: { hotels: true } },
        },
        take: 6,
      })
    : [];

  // Fetch featured hotels
  const hotels = company
    ? await db.hotel.findMany({
        where: { companyId: company.id, featured: true, publicVisible: true, active: true },
        include: {
          destination: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
        take: 8,
      })
    : [];

  // Fetch featured testimonials
  const testimonials = branding.enableReviews && company
    ? await db.testimonial.findMany({
        where: { companyId: company.id, featured: true, active: true },
        take: 6,
      })
    : [];

  // Stats
  const stats = company
    ? {
        destinations: await db.destination.count({ where: { companyId: company.id, active: true } }),
        hotels: await db.hotel.count({ where: { companyId: company.id, active: true, publicVisible: true } }),
        yearsInBusiness: branding.yearsInBusiness || 10,
        happyGuests: branding.happyGuests || 5000,
      }
    : { destinations: 0, hotels: 0, yearsInBusiness: 10, happyGuests: 5000 };

  return (
    <>
      {/* Hero Section */}
      <section className="relative flex min-h-[600px] items-center justify-center overflow-hidden bg-[var(--pub-foreground)]">
        {/* Background */}
        {heroSlides.length > 0 ? (
          <img
            src={heroSlides[0].imageUrl}
            alt={heroSlides[0].title || "Hero"}
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--pub-primary)] to-[var(--pub-foreground)]" />
        )}
        <div className="absolute inset-0 bg-black/40" />

        <div className="pub-container relative z-10 py-20 text-center text-white">
          <h1
            className="pub-animate-in mb-4 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            {heroSlides[0]?.title || `Discover ${companyName}`}
          </h1>
          <p className="pub-animate-in pub-animate-delay-1 mx-auto mb-8 max-w-2xl text-lg text-white/90 md:text-xl">
            {heroSlides[0]?.subtitle ||
              "Unforgettable destinations, handpicked hotels, and seamless travel experiences"}
          </p>
          <div className="pub-animate-in pub-animate-delay-2 flex flex-wrap items-center justify-center gap-3">
            <Link href="/search" className="pub-btn pub-btn-primary text-base">
              Search Hotels
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href="/destinations" className="pub-btn pub-btn-outline border-white text-white hover:bg-white hover:text-[var(--pub-foreground)]">
              Explore Destinations
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Badges / Stats */}
      <section className="border-b border-[var(--pub-border)] bg-[var(--pub-card)]">
        <div className="pub-container grid grid-cols-2 gap-4 py-8 md:grid-cols-4">
          <StatBadge icon={<MapPin className="h-6 w-6" />} value={stats.destinations} label="Destinations" />
          <StatBadge icon={<Building2 className="h-6 w-6" />} value={stats.hotels} label="Hotels" />
          <StatBadge icon={<Star className="h-6 w-6" />} value={stats.yearsInBusiness} label="Years Experience" />
          <StatBadge icon={<Users className="h-6 w-6" />} value={stats.happyGuests.toLocaleString()} label="Happy Guests" />
        </div>
      </section>

      {/* Featured Destinations */}
      {destinations.length > 0 && (
        <section className="pub-section">
          <div className="pub-container">
            <SectionHeader
              title="Popular Destinations"
              subtitle="Explore our most sought-after travel destinations"
              href="/destinations"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {destinations.map((dest) => (
                <Link
                  key={dest.id}
                  href={`/destination/${dest.id}`}
                  className="pub-card group relative h-64 overflow-hidden"
                >
                  {dest.imageUrl ? (
                    <img
                      src={dest.imageUrl}
                      alt={dest.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[var(--pub-primary)] to-[var(--pub-accent)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="text-lg font-bold" style={{ fontFamily: "var(--pub-heading-font)" }}>
                      {dest.name}
                    </h3>
                    <p className="text-sm text-white/80">
                      {dest.country.name} &middot; {dest._count.hotels} hotels
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Hotels */}
      {hotels.length > 0 && (
        <section className="pub-section pub-section-alt">
          <div className="pub-container">
            <SectionHeader
              title="Featured Hotels"
              subtitle="Handpicked properties for an exceptional stay"
              href="/hotels"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {hotels.map((hotel) => (
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
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="pub-section">
          <div className="pub-container">
            <SectionHeader
              title="What Our Guests Say"
              subtitle="Real reviews from real travelers"
              href={branding.enableReviews ? "/reviews" : undefined}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.id} className="pub-card p-6">
                  <div className="pub-stars mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--pub-muted-foreground)]">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    {t.avatar ? (
                      <img src={t.avatar} alt={t.guestName} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pub-primary)] text-sm font-bold text-white">
                        {t.guestName.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-medium">{t.guestName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      {branding.enableNewsletter && (
        <section className="bg-[var(--pub-primary)] py-16 text-white">
          <div className="pub-container text-center">
            <h2
              className="mb-2 text-2xl font-bold md:text-3xl"
              style={{ fontFamily: "var(--pub-heading-font)" }}
            >
              Stay Updated
            </h2>
            <p className="mx-auto mb-6 max-w-lg text-white/80">
              Subscribe to our newsletter for exclusive deals and travel inspiration.
            </p>
            <form className="mx-auto flex max-w-md gap-2" action="/api/b2c/newsletter" method="POST">
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                required
                className="flex-1 rounded-md border-0 bg-white/20 px-4 py-2.5 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <button type="submit" className="pub-btn bg-white text-[var(--pub-primary)] font-semibold hover:bg-white/90">
                Subscribe
              </button>
            </form>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="pub-section pub-section-alt">
        <div className="pub-container text-center">
          <h2
            className="mb-2 text-2xl font-bold md:text-3xl"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            Ready to Plan Your Trip?
          </h2>
          <p className="mx-auto mb-6 max-w-lg text-[var(--pub-muted-foreground)]">
            Search hotels, compare rates, and book your perfect getaway in just a few clicks.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/search" className="pub-btn pub-btn-primary">
              Search Hotels
            </Link>
            <Link href="/contact" className="pub-btn pub-btn-outline">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function StatBadge({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="text-[var(--pub-primary)]">{icon}</div>
      <span className="text-2xl font-bold" style={{ fontFamily: "var(--pub-heading-font)" }}>
        {value}+
      </span>
      <span className="text-xs text-[var(--pub-muted-foreground)]">{label}</span>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between">
      <div>
        <h2
          className="mb-1 text-2xl font-bold md:text-3xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          {title}
        </h2>
        <p className="text-[var(--pub-muted-foreground)]">{subtitle}</p>
      </div>
      {href && (
        <Link
          href={href}
          className="hidden items-center gap-1 text-sm font-medium text-[var(--pub-primary)] hover:underline sm:flex"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function starCount(rating: string): number {
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
    FIVE_DELUXE: 5,
  };
  return map[rating] || 3;
}
