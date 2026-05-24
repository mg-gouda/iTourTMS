import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseBulkSaveAllotmentsSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseAllotmentRouter = createTRPCRouter({
  listByContract: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseAllotment.findMany({
        where: { contractId: input.contractId },
        include: {
          cabinCategory: true,
          departure: { select: { id: true, code: true, embarkDate: true } },
          season: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  listByDeparture: p("nile-cruises:departure:read")
    .input(z.object({ departureId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseAllotment.findMany({
        where: { departureId: input.departureId },
        include: { cabinCategory: true },
      });
    }),

  bulkSave: p("nile-cruises:contract:update")
    .input(cruiseBulkSaveAllotmentsSchema)
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const item of input.items) {
        const existing = await ctx.db.cruiseAllotment.findFirst({
          where: {
            contractId: item.contractId,
            departureId: item.departureId ?? null,
            cabinCategoryId: item.cabinCategoryId,
          },
        });
        if (existing) {
          results.push(
            await ctx.db.cruiseAllotment.update({
              where: { id: existing.id },
              data: item,
            })
          );
        } else {
          results.push(await ctx.db.cruiseAllotment.create({ data: item }));
        }
      }
      return results;
    }),

  getMatrix: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [allotments, categories, departures] = await Promise.all([
        ctx.db.cruiseAllotment.findMany({ where: { contractId: input.contractId } }),
        ctx.db.cruiseCabinCategory.findMany({
          where: { boat: { contracts: { some: { id: input.contractId } } } },
          orderBy: { sortOrder: "asc" },
        }),
        ctx.db.cruiseDeparture.findMany({
          where: { contractId: input.contractId },
          orderBy: { embarkDate: "asc" },
          select: { id: true, code: true, embarkDate: true },
        }),
      ]);
      return { allotments, categories, departures };
    }),
});
