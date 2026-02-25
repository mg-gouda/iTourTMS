import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  contractSeasonCreateSchema,
  contractSeasonUpdateSchema,
} from "@/lib/validations/contracting";
import { createTRPCRouter, moduleProcedure } from "@/server/trpc";
import { logContractAction } from "@/server/services/contracting/audit-logger";

const proc = moduleProcedure("contracting");

export const contractSeasonRouter = createTRPCRouter({
  list: proc
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify contract belongs to company
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      return ctx.db.contractSeason.findMany({
        where: { contractId: input.contractId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: proc
    .input(contractSeasonCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      // Validate season dates within contract range
      const dateFrom = new Date(input.dateFrom);
      const dateTo = new Date(input.dateTo);
      const contractFrom = new Date(contract.validFrom);
      const contractTo = new Date(contract.validTo);

      if (dateFrom < contractFrom || dateTo > contractTo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Season dates must be within contract date range",
        });
      }

      const season = await ctx.db.contractSeason.create({
        data: {
          contractId: input.contractId,
          name: input.name,
          code: input.code,
          dateFrom,
          dateTo,
          sortOrder: input.sortOrder,
          releaseDays: input.releaseDays,
          minimumStay: input.minimumStay ?? null,
        },
      });

      await logContractAction(ctx.db, {
        contractId: input.contractId,
        action: "CREATE",
        entity: "SEASON",
        entityId: season.id,
        summary: `Added season "${input.name}" (${input.code})`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      return season;
    }),

  update: proc
    .input(z.object({ id: z.string(), contractId: z.string(), data: contractSeasonUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      const data: Record<string, unknown> = { ...input.data };
      if (input.data.dateFrom) {
        const dateFrom = new Date(input.data.dateFrom);
        if (dateFrom < new Date(contract.validFrom)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Season start date must be within contract range",
          });
        }
        data.dateFrom = dateFrom;
      }
      if (input.data.dateTo) {
        const dateTo = new Date(input.data.dateTo);
        if (dateTo > new Date(contract.validTo)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Season end date must be within contract range",
          });
        }
        data.dateTo = dateTo;
      }

      const updated = await ctx.db.contractSeason.update({
        where: { id: input.id },
        data,
      });

      await logContractAction(ctx.db, {
        contractId: input.contractId,
        action: "UPDATE",
        entity: "SEASON",
        entityId: input.id,
        summary: `Updated season "${input.data.name ?? 'season'}"`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      return updated;
    }),

  delete: proc
    .input(z.object({ id: z.string(), contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contract.findFirstOrThrow({
        where: { id: input.contractId, companyId: ctx.companyId },
      });

      const deleted = await ctx.db.contractSeason.delete({ where: { id: input.id } });

      await logContractAction(ctx.db, {
        contractId: input.contractId,
        action: "DELETE",
        entity: "SEASON",
        entityId: input.id,
        summary: `Deleted season`,
        userId: ctx.session.user.id,
        userName: ctx.session.user.name ?? "",
      });

      return deleted;
    }),
});
