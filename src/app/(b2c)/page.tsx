import { MapPin, Building2, Star, ChevronRight, Percent, Sparkles, Trophy, Palmtree, Compass, Bus } from "lucide-react";
import Link from "next/link";

import { BookingEngine } from "@/components/b2c/booking-engine";
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

  // Fetch countries for nationality dropdown
  const countries = await db.country.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });

  // Fetch last-minute deals: hotels with active special offers on PUBLISHED contracts
  const now = new Date();
  const lastMinuteDeals = company
    ? await db.hotel.findMany({
        where: {
          companyId: company.id,
          active: true,
          publicVisible: true,
          contracts: {
            some: {
              status: "PUBLISHED",
              specialOffers: {
                some: {
                  OR: [
                    { validTo: { gte: now } },
                    { validTo: null },
                  ],
                },
              },
            },
          },
        },
        include: {
          destination: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1 },
          contracts: {
            where: {
              status: "PUBLISHED",
              specialOffers: {
                some: {
                  OR: [
                    { validTo: { gte: now } },
                    { validTo: null },
                  ],
                },
              },
            },
            select: {
              specialOffers: {
                where: {
                  OR: [
                    { validTo: { gte: now } },
                    { validTo: null },
                  ],
                },
                select: {
                  name: true,
                  offerType: true,
                  discountType: true,
                  discountValue: true,
                  validTo: true,
                },
                take: 1,
              },
            },
            take: 1,
          },
        },
        take: 9,
      })
    : [];

  // Fetch hot holiday destinations with counts
  const hotDestinations = company
    ? await db.destination.findMany({
        where: { companyId: company.id, active: true },
        include: {
          country: { select: { name: true } },
          _count: {
            select: {
              hotels: { where: { active: true, publicVisible: true } },
            },
          },
        },
        orderBy: { featured: "desc" },
        take: 6,
      })
    : [];

  // Company-wide counts for packages, activities, transfers
  const [packagesCount, activitiesCount, transfersCount] = company
    ? await Promise.all([
        db.contract.count({
          where: {
            companyId: company.id,
            status: "PUBLISHED",
            specialOffers: { some: {} },
          },
        }),
        db.crmExcursion.count({
          where: { companyId: company.id, active: true },
        }),
        db.ttVehicleType.count({
          where: { companyId: company.id, isActive: true },
        }),
      ])
    : [0, 0, 0];

  return (
    <>
      {/* Hero Section */}
      <section className="relative flex min-h-[600px] items-center justify-center bg-[var(--pub-foreground)]">
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

        <div className="pub-container relative z-10 py-16 text-center text-white">
          <h1
            className="pub-animate-in mb-3 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            {heroSlides[0]?.title || `Discover ${companyName}`}
          </h1>
          <p className="pub-animate-in pub-animate-delay-1 mx-auto mb-8 max-w-2xl text-lg text-white/90 md:text-xl">
            {heroSlides[0]?.subtitle ||
              "Unforgettable destinations, handpicked hotels, and seamless travel experiences"}
          </p>
          <div className="pub-animate-in pub-animate-delay-2">
            <BookingEngine destinations={destinations.map((d) => ({ id: d.id, name: d.name }))} countries={countries} />
          </div>
        </div>
      </section>

      {/* Last Minute Deals */}
      {lastMinuteDeals.length > 0 && (
        <section className="border-b border-[var(--pub-border)] bg-[var(--pub-card)] py-[50px]">
          <div className="pub-container">
            <SectionHeader
              title="Last Minute Deals"
              subtitle="Special offers on handpicked hotels — book before they expire"
              href="/packages"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lastMinuteDeals.map((hotel) => {
                const offer = hotel.contracts[0]?.specialOffers[0];
                return (
                  <Link key={hotel.id} href={`/hotel/${hotel.id}`} className="pub-card group overflow-hidden">
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
                      {/* Offer badge */}
                      {offer && (
                        <div className="absolute left-3 top-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                          {offer.discountType === "PERCENTAGE"
                            ? `${Number(offer.discountValue)}% OFF`
                            : `Save ${Number(offer.discountValue)}`}
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
                      <p className="mb-2 text-sm text-[var(--pub-muted-foreground)]">
                        <MapPin className="mr-1 inline h-3 w-3" />
                        {hotel.destination?.name || hotel.city}
                      </p>
                      {offer && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-red-600">
                            {offer.name}
                          </span>
                          {offer.validTo && (
                            <span className="text-[10px] text-[var(--pub-muted-foreground)]">
                              Ends {formatB2cDate(offer.validTo)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
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
        <section className="py-[50px]">
          <div className="pub-container">
            <div className="overflow-hidden rounded-2xl border border-[var(--pub-border)] shadow-lg md:grid md:grid-cols-5">
              {/* Left panel — dark branded image */}
              <div className="relative flex min-h-[300px] items-center justify-center bg-[var(--pub-foreground)] md:col-span-2">
                {branding.newsletterImageUrl ? (
                  <img
                    src={branding.newsletterImageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--pub-primary)] via-[var(--pub-foreground)] to-[var(--pub-accent)] opacity-90" />
                )}
                <div className="relative z-10 p-8 text-center text-white">
                  <h3
                    className="text-3xl font-extrabold italic leading-tight md:text-4xl"
                    style={{ fontFamily: "var(--pub-heading-font)" }}
                  >
                    {branding.newsletterHeading || "Stay Updated"}
                  </h3>
                  {branding.newsletterSubheading && (
                    <p className="mt-3 text-sm text-white/80">{branding.newsletterSubheading}</p>
                  )}
                </div>
              </div>

              {/* Right panel — features + form */}
              <div className="flex flex-col justify-center bg-[var(--pub-card)] p-8 md:col-span-3">
                <h2
                  className="mb-6 text-xl font-bold md:text-2xl"
                  style={{ fontFamily: "var(--pub-heading-font)" }}
                >
                  {branding.newsletterHeading || "Stay Updated"}
                </h2>

                {/* Feature list */}
                <div className="mb-6 space-y-5">
                  {branding.newsletterFeature1Title && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pub-primary)]/10">
                        <Percent className="h-5 w-5 text-[var(--pub-primary)]" />
                      </div>
                      <div>
                        <p className="font-semibold">{branding.newsletterFeature1Title}</p>
                        {branding.newsletterFeature1Desc && (
                          <p className="text-sm text-[var(--pub-muted-foreground)]">{branding.newsletterFeature1Desc}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {branding.newsletterFeature2Title && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pub-secondary)]/10">
                        <Sparkles className="h-5 w-5 text-[var(--pub-secondary)]" />
                      </div>
                      <div>
                        <p className="font-semibold">{branding.newsletterFeature2Title}</p>
                        {branding.newsletterFeature2Desc && (
                          <p className="text-sm text-[var(--pub-muted-foreground)]">{branding.newsletterFeature2Desc}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {branding.newsletterFeature3Title && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pub-accent)]/10">
                        <Trophy className="h-5 w-5 text-[var(--pub-accent)]" />
                      </div>
                      <div>
                        <p className="font-semibold">{branding.newsletterFeature3Title}</p>
                        {branding.newsletterFeature3Desc && (
                          <p className="text-sm text-[var(--pub-muted-foreground)]">{branding.newsletterFeature3Desc}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subscribe form */}
                <form className="flex max-w-md gap-2" action="/api/b2c/newsletter" method="POST">
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    required
                    className="flex-1 rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pub-primary)]"
                  />
                  <button
                    type="submit"
                    className="pub-btn pub-btn-primary font-semibold"
                  >
                    {branding.newsletterCtaText || "Subscribe"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Hot Holiday Destinations */}
      {hotDestinations.length > 0 && (
        <section className="pub-section">
          <div className="pub-container">
            <SectionHeader
              title="Hot Holiday Destinations"
              subtitle="Explore our most popular destinations with the best deals"
              href="/destinations"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hotDestinations.map((dest) => (
                <Link
                  key={dest.id}
                  href={`/destination/${dest.id}`}
                  className="pub-card group overflow-hidden"
                >
                  <div className="relative h-52 overflow-hidden">
                    {dest.imageUrl ? (
                      <img
                        src={dest.imageUrl}
                        alt={dest.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--pub-primary)] to-[var(--pub-accent)]">
                        <Palmtree className="h-12 w-12 text-white/60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3
                        className="text-lg font-bold"
                        style={{ fontFamily: "var(--pub-heading-font)" }}
                      >
                        {dest.name}
                      </h3>
                      <p className="text-xs text-white/70">{dest.country.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 text-xs text-[var(--pub-muted-foreground)]">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {dest._count.hotels} Hotels
                    </span>
                    <span className="flex items-center gap-1">
                      <Palmtree className="h-3 w-3" />
                      {packagesCount} Packages
                    </span>
                    <span className="flex items-center gap-1">
                      <Compass className="h-3 w-3" />
                      {activitiesCount} Activities
                    </span>
                    <span className="flex items-center gap-1">
                      <Bus className="h-3 w-3" />
                      {transfersCount} Transfers
                    </span>
                  </div>
                </Link>
              ))}
            </div>
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

function formatB2cDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const yr = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${yr}`;
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
