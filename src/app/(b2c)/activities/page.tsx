import Link from "next/link";
import { Compass } from "lucide-react";

import { getCompanyInfo } from "@/lib/b2c/get-branding";
import { db } from "@/server/db";
import { ActivityCard } from "@/components/b2c/activity-card";

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
              <ActivityCard
                key={exc.id}
                excursion={{
                  id: exc.id,
                  name: exc.name,
                  description: exc.description,
                  duration: exc.duration,
                  maxPax: exc.maxPax,
                  productType: exc.productType,
                  category: exc.category,
                  programCount: exc._count.programs,
                }}
                typeLabel={typeLabels[exc.productType] ?? exc.productType}
                categoryLabel={categoryLabels[exc.category] ?? exc.category}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
