import { z } from "zod";

import { contractBaseRateBulkSaveSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";

const proc = moduleProcedure("contracting");

export const contractBaseRateRouter = createTRPCRouter({
  listByContract: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      return ctx.db.contractBaseRate.findMany({
        where: { contractId: input.contractId },
        include: {
          season: { select: { id: true, name: true, code: true } },
        },
      });
    }),

  bulkSave: proc
    .input(contractBaseRateBulkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      await ctx.db.$transaction(
        input.rates.map((rate) =>
          ctx.db.contractBaseRate.upsert({
            where: {
              contractId_seasonId: {
                contractId: input.contractId,
                seasonId: rate.seasonId,
              },
            },
            create: {
              contractId: input.contractId,
              seasonId: rate.seasonId,
              rate: rate.rate,
              singleRate: rate.singleRate ?? null,
              doubleRate: rate.doubleRate ?? null,
              tripleRate: rate.tripleRate ?? null,
            },
            update: {
              rate: rate.rate,
              singleRate: rate.singleRate ?? null,
              doubleRate: rate.doubleRate ?? null,
              tripleRate: rate.tripleRate ?? null,
            },
          }),
        ),
      );

      return { success: true };
    }),
});
