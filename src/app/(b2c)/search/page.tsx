import { getCompanyInfo } from "@/lib/b2c/get-branding";
import { db } from "@/server/db";
import { SearchClient } from "./search-client";

export const metadata = { title: "Search Hotels & Availability" };

interface Props {
  searchParams: Promise<{
    destination?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    childAges?: string;
    star?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const company = await getCompanyInfo();
  if (!company) return <div className="pub-section pub-container">Not configured</div>;

  // Destinations for search form
  const destinations = await db.destination.findMany({
    where: { companyId: company.id, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Default dates: tomorrow → day after
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const childAgesStr = sp.childAges ?? "";
  const childAges = childAgesStr
    ? childAgesStr.split(",").map((a) => parseInt(a.trim(), 10)).filter((n) => !isNaN(n))
    : [];

  return (
    <SearchClient
      destinations={destinations}
      initialParams={{
        destination: sp.destination ?? "",
        checkIn: sp.checkIn ?? tomorrow.toISOString().split("T")[0],
        checkOut: sp.checkOut ?? dayAfter.toISOString().split("T")[0],
        adults: parseInt(sp.adults ?? "2") || 2,
        children: parseInt(sp.children ?? "0") || 0,
        childAges,
        star: sp.star ?? "",
        sort: sp.sort ?? "price_asc",
      }}
    />
  );
}
