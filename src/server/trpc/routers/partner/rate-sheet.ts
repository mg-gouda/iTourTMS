import { createTRPCRouter, partnerProcedure } from "@/server/trpc";
import { partnerHotelIds } from "@/server/services/b2b/partner-search";

/**
 * The rate sheets a partner may take away: one per published contract on a
 * hotel they are allowed to sell. The allowlist decides what is listed, so a
 * partner cannot discover a hotel — or a rate — that is not theirs.
 */
export const partnerRateSheetRouter = createTRPCRouter({
  list: partnerProcedure.query(async ({ ctx }) => {
    const allowed = await partnerHotelIds(ctx.partner.tourOperatorId);
    if (allowed.length === 0) return [];

    const contracts = await ctx.db.contract.findMany({
      where: {
        companyId: ctx.partner.companyId,
        hotelId: { in: allowed },
        status: "PUBLISHED",
        // A contract that has already run out is not a rate sheet, it is history.
        validTo: { gte: new Date() },
      },
      select: {
        id: true,
        code: true,
        name: true,
        validFrom: true,
        validTo: true,
        rateBasis: true,
        hotel: { select: { id: true, name: true, city: true, starRating: true } },
        baseCurrency: { select: { code: true } },
        _count: { select: { roomTypes: true, seasons: true, specialOffers: true } },
      },
      orderBy: [{ hotel: { name: "asc" } }, { validFrom: "asc" }],
    });

    return contracts;
  }),
});
