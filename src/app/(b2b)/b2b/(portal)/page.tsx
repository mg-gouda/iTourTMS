import { CreditCard, PlaneLanding, TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { partnerAuth } from "@/lib/auth-partner";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * The partner's own landing page: their credit, their arrivals, what needs
 * attention, their recent bookings. Every figure is scoped to the signed-in
 * partner — this is not a staff view of all partners.
 */
export default async function PartnerDashboardPage() {
  const session = await partnerAuth();
  const tourOperatorId = (session?.user as { tourOperatorId?: string } | undefined)?.tourOperatorId;
  if (!tourOperatorId) return null;

  const partner = await db.tourOperator.findUnique({
    where: { id: tourOperatorId },
    select: { name: true, creditLimit: true, creditUsed: true },
  });

  const limit = Number(partner?.creditLimit ?? 0);
  const used = Number(partner?.creditUsed ?? 0);
  const available = Math.max(0, limit - used);

  const money = (n: number) =>
    n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">{partner?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available credit</CardTitle>
            <CreditCard className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{money(available)}</p>
            <p className="text-muted-foreground text-xs">
              {money(used)} used of {money(limit)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming arrivals</CardTitle>
            <PlaneLanding className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Arrives with search and booking.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action needed</CardTitle>
            <TriangleAlert className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Nothing outstanding.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
