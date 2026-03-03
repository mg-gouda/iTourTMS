import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Bed,
  Users,
  ArrowLeft,
  Check,
} from "lucide-react";

import { getCompanyInfo, getBranding } from "@/lib/b2c/get-branding";
import { getB2cHotelById } from "@/server/services/b2c/hotel-queries";
import { HotelAvailabilityWidget } from "@/components/b2c/hotel-availability-widget";

const MEAL_LABELS: Record<string, string> = {
  RO: "Room Only",
  BB: "Bed & Breakfast",
  HB: "Half Board",
  FB: "Full Board",
  AI: "All Inclusive",
  UAI: "Ultra All Inclusive",
  PRAI: "Premium All Inclusive",
  SC: "Self Catering",
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    adults?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompanyInfo();
  if (!company) return {};

  const hotel = await getB2cHotelById(company.id, id);
  if (!hotel) return {};

  return {
    title: `${hotel.name} — ${starCountStr(hotel.starRating)} Star Hotel`,
    description: hotel.shortDescription || hotel.description?.substring(0, 160),
    openGraph: {
      images: hotel.images[0]?.url ? [hotel.images[0].url] : undefined,
    },
  };
}

export default async function HotelDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const company = await getCompanyInfo();
  if (!company) notFound();

  const hotel = await getB2cHotelById(company.id, id);
  if (!hotel) notFound();

  const branding = await getBranding();
  const stars = starCount(hotel.starRating);

  // Group amenities by category
  const amenitiesByCategory = hotel.amenities.reduce<Record<string, typeof hotel.amenities>>(
    (acc, a) => {
      const cat = a.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(a);
      return acc;
    },
    {},
  );

  return (
    <>
      {/* Hero */}
      <section className="relative h-[400px] overflow-hidden bg-[var(--pub-foreground)]">
        {hotel.images[0]?.url ? (
          <img
            src={hotel.images[0].url}
            alt={hotel.name}
            className="h-full w-full object-cover opacity-60"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[var(--pub-primary)] to-[var(--pub-foreground)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30" />
        <div className="pub-container absolute inset-0 flex flex-col justify-end pb-8">
          <Link
            href="/hotels"
            className="mb-4 inline-flex w-fit items-center gap-1 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Hotels
          </Link>
          <div className="pub-stars mb-2">
            {Array.from({ length: stars }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-current" />
            ))}
          </div>
          <h1
            className="mb-1 text-3xl font-bold text-white md:text-4xl"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            {hotel.name}
          </h1>
          <p className="flex items-center gap-1 text-white/80">
            <MapPin className="h-4 w-4" />
            {[hotel.destination?.name, hotel.city, hotel.country.name].filter(Boolean).join(", ")}
          </p>
        </div>
      </section>

      <div className="pub-section">
        <div className="pub-container">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main content */}
            <div className="space-y-8 lg:col-span-2">
              {/* Image gallery */}
              {hotel.images.length > 1 && (
                <div className="grid gap-2 sm:grid-cols-3">
                  {hotel.images.slice(1, 7).map((img) => (
                    <div key={img.id} className="aspect-video overflow-hidden rounded-[var(--pub-radius)]">
                      <img src={img.url} alt={img.caption || hotel.name} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Description */}
              {hotel.description && (
                <div>
                  <h2 className="mb-3 text-xl font-bold" style={{ fontFamily: "var(--pub-heading-font)" }}>
                    About This Hotel
                  </h2>
                  <p className="leading-relaxed text-[var(--pub-muted-foreground)]">
                    {hotel.description}
                  </p>
                </div>
              )}

              {/* Amenities */}
              {Object.keys(amenitiesByCategory).length > 0 && (
                <div>
                  <h2 className="mb-3 text-xl font-bold" style={{ fontFamily: "var(--pub-heading-font)" }}>
                    Amenities & Facilities
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Object.entries(amenitiesByCategory).map(([cat, items]) => (
                      <div key={cat}>
                        <h3 className="mb-2 text-sm font-semibold text-[var(--pub-muted-foreground)]">{cat}</h3>
                        <ul className="space-y-1">
                          {items.map((a) => (
                            <li key={a.id} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-[var(--pub-primary)]" />
                              {a.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Room Types */}
              {hotel.roomTypes.length > 0 && (
                <div>
                  <h2 className="mb-3 text-xl font-bold" style={{ fontFamily: "var(--pub-heading-font)" }}>
                    Room Types
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {hotel.roomTypes.map((rt) => (
                      <div key={rt.id} className="pub-card p-4">
                        <h3 className="mb-1 font-semibold">{rt.name}</h3>
                        {rt.description && (
                          <p className="mb-2 text-sm text-[var(--pub-muted-foreground)]">{rt.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-[var(--pub-muted-foreground)]">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            Max {rt.maxAdults} adult{rt.maxAdults !== 1 ? "s" : ""}
                          </span>
                          {rt.maxChildren > 0 && (
                            <span className="flex items-center gap-1">
                              +{rt.maxChildren} child{rt.maxChildren !== 1 ? "ren" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meal Options */}
              {hotel.mealBasis.length > 0 && (
                <div>
                  <h2 className="mb-3 text-xl font-bold" style={{ fontFamily: "var(--pub-heading-font)" }}>
                    Meal Options
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {hotel.mealBasis.map((mb) => (
                      <span
                        key={mb.mealCode}
                        className="rounded-full bg-[var(--pub-muted)] px-3 py-1 text-sm"
                      >
                        {MEAL_LABELS[mb.mealCode] || mb.mealCode}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Quick Info Card */}
              <div className="pub-card p-5">
                <h3 className="mb-3 font-semibold" style={{ fontFamily: "var(--pub-heading-font)" }}>
                  Hotel Info
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-[var(--pub-muted-foreground)]">Check-in</span>
                    <span className="font-medium">{hotel.checkInTime}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-[var(--pub-muted-foreground)]">Check-out</span>
                    <span className="font-medium">{hotel.checkOutTime}</span>
                  </li>
                  {hotel.totalRooms && (
                    <li className="flex items-center justify-between">
                      <span className="text-[var(--pub-muted-foreground)]">Total Rooms</span>
                      <span className="font-medium">{hotel.totalRooms}</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Contact Card */}
              <div className="pub-card p-5">
                <h3 className="mb-3 font-semibold" style={{ fontFamily: "var(--pub-heading-font)" }}>
                  Contact
                </h3>
                <ul className="space-y-2 text-sm">
                  {hotel.phone && (
                    <li className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[var(--pub-primary)]" />
                      <a href={`tel:${hotel.phone}`} className="hover:text-[var(--pub-primary)]">{hotel.phone}</a>
                    </li>
                  )}
                  {hotel.email && (
                    <li className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[var(--pub-primary)]" />
                      <a href={`mailto:${hotel.email}`} className="hover:text-[var(--pub-primary)]">{hotel.email}</a>
                    </li>
                  )}
                  {hotel.website && (
                    <li className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-[var(--pub-primary)]" />
                      <a href={hotel.website} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--pub-primary)]">
                        Website
                      </a>
                    </li>
                  )}
                </ul>
              </div>

              {/* Availability Widget */}
              <HotelAvailabilityWidget
                hotelId={hotel.id}
                initialCheckIn={sp.checkIn}
                initialCheckOut={sp.checkOut}
                initialAdults={sp.adults ? parseInt(sp.adults) : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function starCount(rating: string): number {
  const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, FIVE_DELUXE: 5 };
  return map[rating] || 3;
}

function starCountStr(rating: string): string {
  return String(starCount(rating));
}
