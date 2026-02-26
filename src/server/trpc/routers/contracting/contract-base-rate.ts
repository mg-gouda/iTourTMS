import { z } from "zod";

import { contractBaseRateBulkSaveSchema } from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { logContractAction } from "@/server/services/contracting/audit-logger";
import { maybeDispatchContractWebhook } from "@/server/services/contracting/webhook-dispatcher";

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
          season: { select: { id: true, dateFrom: true, dateTo: true } },
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

      await logContractAction(ctx.db, {
        contractId: input.contractId,
        action: "UPDATE",
        entity: "BASE_RATE",
        summary: `Updated base rates`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      maybeDispatchContractWebhook(ctx.db, ctx.companyId, input.contractId, "rates.updated");

      return { success: true };
    }),
});
