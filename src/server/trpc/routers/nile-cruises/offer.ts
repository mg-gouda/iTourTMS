import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseOfferCreateSchema, cruiseOfferUpdateSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseOfferRouter = createTRPCRouter({
  listByContract: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseOffer.findMany({
        where: { contractId: input.contractId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  getById: p("nile-cruises:contract:read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseOffer.findFirstOrThrow({ where: { id: input.id } });
    }),

  create: p("nile-cruises:contract:update")
    .input(cruiseOfferCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseOffer.create({
        data: {
          ...input,
          bookingFromDate: input.bookingFromDate ? new Date(input.bookingFromDate) : null,
          bookingToDate: input.bookingToDate ? new Date(input.bookingToDate) : null,
          travelFromDate: input.travelFromDate ? new Date(input.travelFromDate) : null,
          travelToDate: input.travelToDate ? new Date(input.travelToDate) : null,
        },
      });
    }),

  update: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string(), data: cruiseOfferUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (data.bookingFromDate) data.bookingFromDate = new Date(data.bookingFromDate as string);
      if (data.bookingToDate) data.bookingToDate = new Date(data.bookingToDate as string);
      if (data.travelFromDate) data.travelFromDate = new Date(data.travelFromDate as string);
      if (data.travelToDate) data.travelToDate = new Date(data.travelToDate as string);
      return ctx.db.cruiseOffer.update({ where: { id: input.id }, data });
    }),

  delete: p("nile-cruises:contract:update")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cruiseOffer.delete({ where: { id: input.id } });
    }),

  evaluateCombinability: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string(), offerIds: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      const offers = await ctx.db.cruiseOffer.findMany({
        where: { contractId: input.contractId, id: { in: input.offerIds } },
      });
      const conflicts: { offerId: string; conflictsWith: string }[] = [];
      for (const offer of offers) {
        for (const nc of offer.notCombinableWith) {
          if (input.offerIds.includes(nc)) {
            conflicts.push({ offerId: offer.id, conflictsWith: nc });
          }
        }
      }
      return { conflicts, isCompatible: conflicts.length === 0 };
    }),
});
