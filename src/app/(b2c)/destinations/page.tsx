import Link from "next/link";
import { MapPin, Building2 } from "lucide-react";

import { getCompanyInfo } from "@/lib/b2c/get-branding";
import { getB2cDestinations } from "@/server/services/b2c/destination-queries";

export const metadata = { title: "Destinations" };

export default async function DestinationsPage() {
  const company = await getCompanyInfo();
  if (!company) return <div className="pub-section pub-container">Not configured</div>;

  const destinations = await getB2cDestinations(company.id);

  // Group by country
  const byCountry = destinations.reduce<
    Record<string, { countryName: string; items: typeof destinations }>
  >((acc, d) => {
    const key = d.country.id;
    if (!acc[key]) acc[key] = { countryName: d.country.name, items: [] };
    acc[key].items.push(d);
    return acc;
  }, {});

  return (
    <div className="pub-section">
      <div className="pub-container">
        <h1
          className="mb-2 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Destinations
        </h1>
        <p className="mb-8 text-[var(--pub-muted-foreground)]">
          Explore our travel destinations
        </p>

        {Object.keys(byCountry).length === 0 ? (
          <p className="text-center text-[var(--pub-muted-foreground)]">No destinations available.</p>
        ) : (
          <div className="space-y-10">
            {Object.entries(byCountry).map(([countryId, { countryName, items }]) => (
              <div key={countryId}>
                <h2
                  className="mb-4 text-xl font-semibold"
                  style={{ fontFamily: "var(--pub-heading-font)" }}
                >
                  {countryName}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((dest) => (
                    <Link
                      key={dest.id}
                      href={`/destination/${dest.id}`}
                      className="pub-card group relative h-56 overflow-hidden"
                    >
                      {dest.imageUrl ? (
                        <img
                          src={dest.imageUrl}
                          alt={dest.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--pub-primary)] to-[var(--pub-accent)]">
                          <MapPin className="h-10 w-10 text-white/50" />
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
                        <p className="flex items-center gap-1 text-sm text-white/80">
                          <Building2 className="h-3.5 w-3.5" />
                          {dest._count.hotels} hotel{dest._count.hotels !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {dest.featured && (
                        <span className="absolute right-2 top-2 rounded-full bg-[var(--pub-secondary)] px-2 py-0.5 text-xs font-medium text-white">
                          Featured
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
