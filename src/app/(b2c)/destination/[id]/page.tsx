import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Building2, MapPin, Star } from "lucide-react";

import { getCompanyInfo } from "@/lib/b2c/get-branding";
import { getB2cDestinationById } from "@/server/services/b2c/destination-queries";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompanyInfo();
  if (!company) return {};

  const dest = await getB2cDestinationById(company.id, id);
  return {
    title: dest?.name,
    description: dest?.description?.substring(0, 160) || undefined,
    openGraph: dest?.imageUrl ? { images: [dest.imageUrl] } : undefined,
  };
}

export default async function DestinationDetailPage({ params }: Props) {
  const { id } = await params;
  const company = await getCompanyInfo();
  if (!company) notFound();

  const dest = await getB2cDestinationById(company.id, id);
  if (!dest) notFound();

  return (
    <>
      {/* Hero */}
      <section className="relative h-[350px] overflow-hidden bg-[var(--pub-foreground)]">
        {dest.imageUrl ? (
          <img src={dest.imageUrl} alt={dest.name} className="h-full w-full object-cover opacity-60" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[var(--pub-primary)] to-[var(--pub-foreground)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30" />
        <div className="pub-container absolute inset-0 flex flex-col justify-end pb-8">
          <Link
            href="/destinations"
            className="mb-4 inline-flex w-fit items-center gap-1 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> All Destinations
          </Link>
          <h1
            className="mb-1 text-3xl font-bold text-white md:text-4xl"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            {dest.name}
          </h1>
          <p className="text-white/80">{dest.country.name}</p>
        </div>
      </section>

      <div className="pub-section">
        <div className="pub-container">
          {dest.description && (
            <p className="mb-8 max-w-3xl leading-relaxed text-[var(--pub-muted-foreground)]">
              {dest.description}
            </p>
          )}

          <h2
            className="mb-4 text-xl font-bold"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            Hotels in {dest.name}
            <span className="ml-2 text-base font-normal text-[var(--pub-muted-foreground)]">
              ({dest.hotels.length})
            </span>
          </h2>

          {dest.hotels.length === 0 ? (
            <p className="text-[var(--pub-muted-foreground)]">No hotels available in this destination yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dest.hotels.map((hotel) => (
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
                    <h3 className="mb-1 font-semibold" style={{ fontFamily: "var(--pub-heading-font)" }}>
                      {hotel.name}
                    </h3>
                    <p className="text-sm text-[var(--pub-muted-foreground)]">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {hotel.city}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function starCount(rating: string): number {
  const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, FIVE_DELUXE: 5 };
  return map[rating] || 3;
}
