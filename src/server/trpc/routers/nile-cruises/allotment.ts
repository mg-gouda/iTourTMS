import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";
import { cruiseBulkSaveAllotmentsSchema } from "@/lib/validations/nile-cruises";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseAllotmentRouter = createTRPCRouter({
  listByContract: p("nile-cruises:contract:read")
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cruiseAllotment.findMany({
        // CruiseAllotment has no companyId — scope through its contract
        where: { contractId: input.contractId, contract: { companyId: ctx.companyId } },
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
        where: { departureId: input.departureId, departure: { companyId: ctx.companyId } },
        include: { cabinCategory: true },
      });
    }),

  bulkSave: p("nile-cruises:contract:update")
    .input(cruiseBulkSaveAllotmentsSchema)
    .mutation(async ({ ctx, input }) => {
      const results = [];
      const checkedContracts = new Set<string>();
      const checkedDepartures = new Set<string>();
      const checkedCategories = new Set<string>();
      for (const item of input.items) {
        // Assert the parent contract (and departure, when given) belong to this company
        if (!checkedContracts.has(item.contractId)) {
          const contract = await ctx.db.cruiseContract.findFirst({
            where: { id: item.contractId, companyId: ctx.companyId },
            select: { id: true },
          });
          if (!contract) throw new TRPCError({ code: "NOT_FOUND" });
          checkedContracts.add(item.contractId);
        }
        if (item.departureId && !checkedDepartures.has(item.departureId)) {
          const departure = await ctx.db.cruiseDeparture.findFirst({
            where: { id: item.departureId, companyId: ctx.companyId },
            select: { id: true },
          });
          if (!departure) throw new TRPCError({ code: "NOT_FOUND" });
          checkedDepartures.add(item.departureId);
        }
        if (!checkedCategories.has(item.cabinCategoryId)) {
          // CruiseCabinCategory has no companyId — scope through its boat
          const category = await ctx.db.cruiseCabinCategory.findFirst({
            where: { id: item.cabinCategoryId, boat: { companyId: ctx.companyId } },
            select: { id: true },
          });
          if (!category) throw new TRPCError({ code: "NOT_FOUND" });
          checkedCategories.add(item.cabinCategoryId);
        }
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
      const contract = await ctx.db.cruiseContract.findFirst({
        where: { id: input.contractId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!contract) throw new TRPCError({ code: "NOT_FOUND" });
      const [allotments, categories, departures] = await Promise.all([
        ctx.db.cruiseAllotment.findMany({
          where: { contractId: input.contractId, contract: { companyId: ctx.companyId } },
        }),
        ctx.db.cruiseCabinCategory.findMany({
          where: {
            boat: { companyId: ctx.companyId, contracts: { some: { id: input.contractId } } },
          },
          orderBy: { sortOrder: "asc" },
        }),
        ctx.db.cruiseDeparture.findMany({
          where: { contractId: input.contractId, companyId: ctx.companyId },
          orderBy: { embarkDate: "asc" },
          select: { id: true, code: true, embarkDate: true },
        }),
      ]);
      return { allotments, categories, departures };
    }),
});
