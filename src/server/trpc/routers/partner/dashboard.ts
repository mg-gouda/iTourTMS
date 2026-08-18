import { createTRPCRouter, partnerProcedure } from "@/server/trpc";

/**
 * The landing page a partner sees when they sign in: what needs them today,
 * who arrives next, and how much credit is left. Everything is scoped to the
 * signed-in partner by the middleware, not by anything the page asks for.
 */
export const partnerDashboardRouter = createTRPCRouter({
  stats: partnerProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in30Days = new Date(today.getTime() + 30 * 86_400_000);
    const scope = {
      companyId: ctx.partner.companyId,
      tourOperatorId: ctx.partner.tourOperatorId,
    };

    const [partner, confirmed, onRequest, pending, arrivals, upcoming, spend] = await Promise.all([
      ctx.db.tourOperator.findUniqueOrThrow({
        where: { id: ctx.partner.tourOperatorId },
        select: {
          name: true,
          creditLimit: true,
          creditUsed: true,
          accountManager: { select: { name: true, email: true } },
          partner: { select: { creditCurrency: true } },
        },
      }),
      ctx.db.booking.count({ where: { ...scope, status: "CONFIRMED" } }),
      ctx.db.booking.count({ where: { ...scope, status: "ON_REQUEST" } }),
      ctx.db.booking.count({ where: { ...scope, status: "PENDING_APPROVAL" } }),
      ctx.db.booking.count({
        where: { ...scope, status: "CONFIRMED", checkIn: { gte: today, lt: in30Days } },
      }),
      ctx.db.booking.findMany({
        where: { ...scope, checkIn: { gte: today }, status: { in: ["CONFIRMED", "ON_REQUEST"] } },
        select: {
          id: true,
          code: true,
          status: true,
          checkIn: true,
          checkOut: true,
          leadGuestFirstName: true,
          leadGuestLastName: true,
          partnerReference: true,
          hotel: { select: { name: true } },
        },
        orderBy: { checkIn: "asc" },
        take: 8,
      }),
      // What they have committed to this year, at net.
      ctx.db.booking.aggregate({
        where: {
          ...scope,
          status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
          checkIn: { gte: new Date(now.getFullYear(), 0, 1) },
        },
        _sum: { buyingTotal: true },
      }),
    ]);

    const limitValue = Number(partner.creditLimit ?? 0);
    const creditLimit = limitValue > 0 ? limitValue : null;
    const creditUsed = Number(partner.creditUsed ?? 0);

    return {
      partnerName: partner.name,
      accountManager: partner.accountManager,
      credit: {
        limit: creditLimit,
        used: creditUsed,
        available: creditLimit === null ? null : Math.max(creditLimit - creditUsed, 0),
        currency: partner.partner?.creditCurrency ?? null,
      },
      bookings: { confirmed, onRequest, pending, arrivingIn30Days: arrivals },
      yearToDateNet: Number(spend._sum.buyingTotal ?? 0),
      upcoming,
    };
  }),
});
