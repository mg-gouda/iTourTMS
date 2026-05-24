import { z } from "zod";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

const p = (code: string) => modulePermissionProcedure("nile-cruises", code);

export const cruiseTemplateRouter = createTRPCRouter({
  cloneContract: p("nile-cruises:contract:create")
    .input(z.object({
      sourceContractId: z.string(),
      newName: z.string().min(1),
      newValidFrom: z.string(),
      newValidTo: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.cruiseContract.findFirstOrThrow({
        where: { id: input.sourceContractId, companyId: ctx.companyId },
        include: {
          seasons: true,
          baseRates: true,
          supplements: true,
          childPolicies: true,
          offers: true,
          galaMeals: true,
          marketAssignments: true,
          tourOperators: true,
        },
      });

      const seq = await ctx.db.sequence.upsert({
        where: { companyId_code: { companyId: ctx.companyId, code: "cruise_contract" } },
        update: { nextNumber: { increment: 1 } },
        create: { companyId: ctx.companyId, code: "cruise_contract", prefix: "NC-CT", nextNumber: 2, padding: 5 },
      });
      const contractCode = `${seq.prefix}-${String(seq.nextNumber - 1).padStart(seq.padding, "0")}`;

      const newContract = await ctx.db.cruiseContract.create({
        data: {
          companyId: ctx.companyId,
          boatId: source.boatId,
          ownershipMode: source.ownershipMode,
          code: contractCode,
          name: input.newName,
          validFrom: new Date(input.newValidFrom),
          validTo: new Date(input.newValidTo),
          baseCurrency: source.baseCurrency,
          cancellationPolicyId: source.cancellationPolicyId,
          status: "DRAFT",
          seasons: {
            create: source.seasons.map((s) => ({
              name: s.name,
              code: s.code,
              dateFrom: s.dateFrom,
              dateTo: s.dateTo,
              releaseDays: s.releaseDays,
              sortOrder: s.sortOrder,
            })),
          },
        },
      });

      if (source.baseRates.length > 0) {
        await ctx.db.cruiseBaseRate.createMany({
          data: source.baseRates.map((r) => ({
            contractId: newContract.id,
            seasonId: r.seasonId,
            cabinCategoryId: r.cabinCategoryId,
            ratePerPaxPerNight: r.ratePerPaxPerNight,
            currency: r.currency,
          })),
        });
      }

      if (source.supplements.length > 0) {
        await ctx.db.cruiseSupplement.createMany({
          data: source.supplements.map((s) => ({
            contractId: newContract.id,
            seasonId: s.seasonId,
            cabinCategoryId: s.cabinCategoryId,
            type: s.type,
            valueType: s.valueType,
            value: s.value,
            perPaxPerNight: s.perPaxPerNight,
          })),
        });
      }

      if (source.childPolicies.length > 0) {
        await ctx.db.cruiseChildPolicy.createMany({
          data: source.childPolicies.map((cp) => ({
            contractId: newContract.id,
            category: cp.category,
            ageFrom: cp.ageFrom,
            ageTo: cp.ageTo,
            bedding: cp.bedding,
            isFree: cp.isFree,
            discountPercent: cp.discountPercent,
            fixedRate: cp.fixedRate,
            maxFreeChildren: cp.maxFreeChildren,
            sortOrder: cp.sortOrder,
          })),
        });
      }

      if (source.marketAssignments.length > 0) {
        await ctx.db.cruiseContractMarket.createMany({
          data: source.marketAssignments.map((m) => ({
            contractId: newContract.id,
            marketId: m.marketId,
            markup: m.markup,
          })),
        });
      }

      if (source.tourOperators.length > 0) {
        await ctx.db.cruiseContractTourOperator.createMany({
          data: source.tourOperators.map((to) => ({
            contractId: newContract.id,
            tourOperatorId: to.tourOperatorId,
            markup: to.markup,
            commissionPercent: to.commissionPercent,
          })),
        });
      }

      return newContract;
    }),

  cloneDeparture: p("nile-cruises:departure:create")
    .input(z.object({
      sourceDepartureId: z.string(),
      newEmbarkDate: z.string(),
      newDisembarkDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.cruiseDeparture.findFirstOrThrow({
        where: { id: input.sourceDepartureId, companyId: ctx.companyId },
      });

      const seq = await ctx.db.sequence.upsert({
        where: { companyId_code: { companyId: ctx.companyId, code: "cruise_departure" } },
        update: { nextNumber: { increment: 1 } },
        create: { companyId: ctx.companyId, code: "cruise_departure", prefix: "NC-DEP", nextNumber: 2, padding: 5 },
      });
      const code = `${seq.prefix}-${String(seq.nextNumber - 1).padStart(seq.padding, "0")}`;

      return ctx.db.cruiseDeparture.create({
        data: {
          companyId: ctx.companyId,
          boatId: source.boatId,
          cruiseTypeId: source.cruiseTypeId,
          contractId: source.contractId,
          code,
          embarkDate: new Date(input.newEmbarkDate),
          disembarkDate: new Date(input.newDisembarkDate),
          embarkPort: source.embarkPort,
          disembarkPort: source.disembarkPort,
          totalCabins: source.totalCabins,
          totalPaxCapacity: source.totalPaxCapacity,
          status: "SCHEDULED",
        },
      });
    }),
});
