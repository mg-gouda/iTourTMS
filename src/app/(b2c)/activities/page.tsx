import Link from "next/link";
import { Compass, Clock, Users } from "lucide-react";

import { getCompanyInfo } from "@/lib/b2c/get-branding";
import { db } from "@/server/db";

export const metadata = { title: "Activities & Excursions" };

export default async function ActivitiesPage() {
  const company = await getCompanyInfo();
  if (!company)
    return <div className="pub-section pub-container">Not configured</div>;

  const excursions = await db.crmExcursion.findMany({
    where: { companyId: company.id, active: true },
    include: {
      ageGroups: { select: { id: true, label: true } },
      _count: { select: { programs: true } },
    },
    orderBy: { name: "asc" },
  });

  const typeLabels: Record<string, string> = {
    FULL_DAY: "Full Day",
    HALF_DAY: "Half Day",
    MULTI_DAY: "Multi Day",
    EVENING: "Evening",
    TRANSFER: "Transfer",
  };

  const categoryLabels: Record<string, string> = {
    SIGHTSEEING: "Sightseeing",
    ADVENTURE: "Adventure",
    CULTURAL: "Cultural",
    NATURE: "Nature",
    FOOD_DRINK: "Food & Drink",
    WATER_SPORTS: "Water Sports",
    DESERT: "Desert",
    CRUISE: "Cruise",
    CITY_TOUR: "City Tour",
    THEME_PARK: "Theme Park",
    SHOPPING: "Shopping",
    OTHER: "Other",
  };

  return (
    <div className="pub-section">
      <div className="pub-container">
        <h1
          className="mb-2 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Activities & Excursions
        </h1>
        <p className="mb-8 text-[var(--pub-muted-foreground)]">
          Discover amazing experiences and excursions
        </p>

        {excursions.length === 0 ? (
          <div className="rounded-xl border border-[var(--pub-border)] bg-[var(--pub-card)] p-12 text-center">
            <Compass className="mx-auto mb-4 h-12 w-12 text-[var(--pub-muted-foreground)]" />
            <h2
              className="mb-2 text-xl font-semibold"
              style={{ fontFamily: "var(--pub-heading-font)" }}
            >
              Activities Coming Soon
            </h2>
            <p className="text-[var(--pub-muted-foreground)]">
              We&apos;re curating the best activities for you. Check back soon!
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
            {excursions.map((exc) => (
              <div key={exc.id} className="pub-card overflow-hidden">
                <div className="relative h-40 bg-gradient-to-br from-[var(--pub-primary)] to-[var(--pub-accent)]">
                  <div className="flex h-full items-center justify-center">
                    <Compass className="h-12 w-12 text-white/30" />
                  </div>
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-[var(--pub-foreground)]">
                    {categoryLabels[exc.category] ?? exc.category}
                  </span>
                  <span className="absolute right-2 top-2 rounded-full bg-[var(--pub-secondary)] px-2 py-0.5 text-xs font-medium text-white">
                    {typeLabels[exc.productType] ?? exc.productType}
                  </span>
                </div>

                <div className="p-4">
                  <h3
                    className="mb-1 text-lg font-bold"
                    style={{ fontFamily: "var(--pub-heading-font)" }}
                  >
                    {exc.name}
                  </h3>

                  {exc.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-[var(--pub-muted-foreground)]">
                      {exc.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-[var(--pub-muted-foreground)]">
                    {exc.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {exc.duration}
                      </span>
                    )}
                    {exc.maxPax && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Max {exc.maxPax}
                      </span>
                    )}
                  </div>

                  {exc._count.programs > 0 && (
                    <p className="mt-3 text-xs text-[var(--pub-accent)]">
                      {exc._count.programs} day program
                      {exc._count.programs > 1 ? "s" : ""}
                    </p>
                  )}

                  <Link
                    href="/contact"
                    className="pub-btn pub-btn-primary mt-4 block w-full text-center text-sm"
                  >
                    Enquire Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
